//! Current account, session, grant and control checks use the existing
//! operational tables outside gameplay checkpoints.

use crate::store::{CommitError, Store, StoreError};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio_postgres::Row;
use uuid::Uuid;

const LOCAL_ISSUER: &str = "https://local.openlegend.invalid";
const LOCAL_SUBJECT: &str = "local-player";
const CHARACTERLESS: &str = "#characterless:";
const TOKEN_CACHE_LIMIT: usize = 4096;

#[derive(Debug)]
pub enum AccessError {
    Session,
    Forbidden,
    Changed,
    Busy,
    Availability,
    Read(StoreError),
    Write(CommitError),
}

impl From<StoreError> for AccessError {
    fn from(error: StoreError) -> Self {
        Self::Read(error)
    }
}
impl From<CommitError> for AccessError {
    fn from(error: CommitError) -> Self {
        Self::Write(error)
    }
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Capability {
    Play,
    Spectate,
    Create,
    Inspect,
    Save,
    ManageAccess,
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Audience {
    Embodied,
    AuthorizedInspection,
}

// The browser's existing scope digest hashes these fields in this order.
#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestScope {
    pub account_id: String,
    pub session_id: String,
    pub session_revision: u64,
    pub world_id: String,
    pub timeline_id: String,
    pub grant_revision: u64,
    pub actor_id: String,
    pub control_generation: u64,
    pub connection_id: String,
    audience: Audience,
}

impl RequestScope {
    pub fn key(&self) -> Result<String, serde_json::Error> {
        Ok(openlegend_simulation::encoding::sha256_hex(
            &serde_json::to_vec(self)?,
        ))
    }

    pub fn embodied(&self) -> bool {
        self.audience == Audience::Embodied
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldGrant {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_id: Option<String>,
    pub capabilities: Vec<Capability>,
    #[serde(skip)]
    revision: u64,
}

struct Control {
    generation: u64,
    account_id: String,
    session_id: String,
    connection_id: String,
}

struct Access {
    session: String,
    account: String,
    session_revision: u64,
    expires_at: i64,
    grant: Option<WorldGrant>,
    control: Option<Control>,
    _custody: ByteReservation,
}
type TokenHash = [u8; 32];

struct Cache {
    tokens: HashMap<TokenHash, Arc<Access>>,
    revision: u64,
    revoking: HashSet<TokenHash>,
}

pub struct Authority {
    store: Arc<Store>,
    world_id: String,
    timeline: String,
    duration_ms: i64,
    session_capacity: i64,
    budget: ByteBudget,
    cache: Mutex<Cache>,
    changes: tokio::sync::Mutex<()>,
    local: bool,
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_millis()
        .try_into()
        .unwrap_or(i64::MAX)
}

fn exact_integer(value: i64) -> Result<u64, StoreError> {
    u64::try_from(value)
        .ok()
        .filter(|n| *n <= openlegend_simulation::identity::MAX_SAFE_INTEGER)
        .ok_or(StoreError::InvalidRecord)
}

fn token_hash(token: &str) -> Result<TokenHash, AccessError> {
    if token.len() != 64
        || !token
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(AccessError::Session);
    }
    Ok(Sha256::digest(token.as_bytes()).into())
}

fn digest_text(digest: TokenHash) -> String {
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

impl Authority {
    pub fn new(
        store: Arc<Store>,
        world_id: String,
        timeline: String,
        duration: Duration,
        session_capacity: i64,
        local: bool,
        budget: ByteBudget,
    ) -> Self {
        Self {
            store,
            world_id,
            timeline,
            duration_ms: duration.as_millis().min(i64::MAX as u128) as i64,
            session_capacity,
            local,
            budget,
            cache: Mutex::new(Cache {
                tokens: HashMap::new(),
                revision: 0,
                revoking: HashSet::new(),
            }),
            changes: tokio::sync::Mutex::new(()),
        }
    }

    pub async fn sign_in_local(&self) -> Result<String, AccessError> {
        if !self.local {
            return Err(AccessError::Forbidden);
        }
        self.login(LOCAL_ISSUER, LOCAL_SUBJECT).await
    }

    /// Called only with an identity of the configured, verified issuer. The
    /// account identity and body grant come from SQL, never browser fields.
    pub(crate) async fn login(&self, issuer: &str, subject: &str) -> Result<String, AccessError> {
        let mut bytes = [0_u8; 32];
        getrandom::fill(&mut bytes).map_err(|_| AccessError::Availability)?;
        let token = digest_text(bytes);
        let hash = digest_text(token_hash(&token)?);
        let uuid = Uuid::new_v4().to_string();
        let client_identity = (issuer.to_owned(), subject.to_owned());
        let duration = self.duration_ms;
        let limit = self.session_capacity;
        self.store
            .operational(move |tx| {
                Box::pin(async move {
                    let now = now_ms();
                    let expires = now.checked_add(duration).ok_or(StoreError::InvalidRecord)?;
                    let (issuer, subject) = client_identity;
                    let account = match tx
                        .query_opt(
                            "SELECT id FROM auth_accounts WHERE issuer=$1 AND subject=$2",
                            &[&issuer, &subject],
                        )
                        .await?
                    {
                        Some(row) => row.try_get::<_, String>(0)?,
                        None => {
                            let id = Uuid::new_v4().to_string();
                            tx.execute(
                                "INSERT INTO auth_accounts VALUES ($1,$2,$3)",
                                &[&id, &issuer, &subject],
                            )
                            .await?;
                            id
                        }
                    };
                    tx.execute("DELETE FROM auth_sessions WHERE expires_at <= $1", &[&now])
                        .await?;
                    let count: i64 = tx
                        .query_one("SELECT count(*) FROM auth_sessions", &[])
                        .await?
                        .try_get(0)?;
                    if count >= limit {
                        return Err(StoreError::Capacity);
                    }
                    tx.execute(
                        "INSERT INTO auth_sessions VALUES ($1,$2,$3,1,$4)",
                        &[&uuid, &hash, &account, &expires],
                    )
                    .await?;
                    Ok(())
                })
            })
            .await?;
        Ok(token)
    }

    pub async fn session(&self, token: &str) -> Result<(String, Vec<WorldGrant>), AccessError> {
        let (_key, access) = self.access(token).await?;
        let grants = access.grant.as_ref().filter(|grant| {
            if grant.actor_id.is_some() {
                grant.capabilities.contains(&Capability::Play)
            } else {
                !grant.capabilities.is_empty()
            }
        });
        Ok((
            access.account.clone(),
            grants.cloned().into_iter().collect(),
        ))
    }

    pub async fn scope(
        &self,
        token: &str,
        connection: String,
    ) -> Result<AuthorizedScope, AccessError> {
        let (key, access) = self.access(token).await?;
        let grant = access.grant.as_ref().ok_or(AccessError::Forbidden)?;
        let (actor_id, audience) = match &grant.actor_id {
            Some(actor) if grant.capabilities.contains(&Capability::Play) => {
                (actor.clone(), Audience::Embodied)
            }
            None if !grant.capabilities.is_empty() => {
                (String::new(), Audience::AuthorizedInspection)
            }
            _ => return Err(AccessError::Forbidden),
        };
        let scope = RequestScope {
            account_id: access.account.clone(),
            session_id: access.session.clone(),
            session_revision: access.session_revision,
            world_id: self.world_id.clone(),
            timeline_id: self.timeline.clone(),
            grant_revision: grant.revision,
            actor_id,
            control_generation: access.control.as_ref().map_or(0, |c| c.generation),
            connection_id: connection,
            audience,
        };
        Ok(AuthorizedScope { scope, key })
    }

    /// Reauthorize immediately before the synchronous acceptance/disclosure
    /// callback. Operational mutations fence reads before they await SQL.
    pub fn current<T>(
        &self,
        authorized: &AuthorizedScope,
        capability: Capability,
        controlling: bool,
        use_scope: impl FnOnce(&RequestScope) -> T,
    ) -> Result<T, AccessError> {
        let cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        let scope = &authorized.scope;
        if cache.revoking.contains(&authorized.key)
            || scope.world_id != self.world_id
            || scope.timeline_id != self.timeline
        {
            return Err(AccessError::Changed);
        }
        let current = cache
            .tokens
            .get(&authorized.key)
            .ok_or(AccessError::Changed)?;
        let grant = current.grant.as_ref().ok_or(AccessError::Forbidden)?;
        if current.expires_at <= now_ms()
            || scope.account_id != current.account
            || scope.session_id != current.session
            || scope.session_revision != current.session_revision
            || scope.grant_revision != grant.revision
            || scope.actor_id != grant.actor_id.as_deref().unwrap_or("")
            || !grant.capabilities.contains(&capability)
        {
            return Err(AccessError::Changed);
        }
        if controlling
            && current.control.as_ref().is_none_or(|control| {
                control.generation != scope.control_generation
                    || control.account_id != scope.account_id
                    || control.session_id != scope.session_id
                    || control.connection_id != scope.connection_id
            })
        {
            return Err(AccessError::Changed);
        }
        Ok(use_scope(scope))
    }

    pub async fn logout(&self, token: &str) -> Result<(), AccessError> {
        let (key, access) = self.access(token).await?;
        let _change = self.changes.lock().await;
        let _fence = self.begin_revocation(key)?;
        let session = access.session.clone();
        self.store
            .operational(move |tx| {
                Box::pin(async move {
                    tx.execute(
                        "UPDATE auth_sessions SET revision=revision+1,expires_at=$1 WHERE id=$2",
                        &[&now_ms(), &session],
                    )
                    .await?;
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }

    fn begin_revocation(&self, key: TokenHash) -> Result<AccessChange<'_>, AccessError> {
        let mut cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        cache.revision = cache
            .revision
            .checked_add(1)
            .ok_or(AccessError::Availability)?;
        // This scope loses its ability to publish before the SQL await. Other
        // still-current sessions do not depend on this logout.
        cache.tokens.remove(&key);
        cache.revoking.insert(key);
        Ok(AccessChange {
            cache: &self.cache,
            key,
        })
    }

    async fn access(&self, token: &str) -> Result<(TokenHash, Arc<Access>), AccessError> {
        let key = token_hash(token)?;
        let revision = {
            let cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
            if cache.revoking.contains(&key) {
                return Err(AccessError::Changed);
            }
            if let Some(access) = cache
                .tokens
                .get(&key)
                .filter(|row| row.expires_at > now_ms())
            {
                return Ok((key, Arc::clone(access)));
            }
            cache.revision
        };
        let hash = digest_text(key);
        let world = self.world_id.clone();
        let query_world = world.clone();
        let row = self.store.read_operational(move |tx| {
            Box::pin(async move {
                Ok(tx.query_opt(
                    "SELECT s.id,s.account_id,s.revision,s.expires_at,g.actor_id,g.revision,g.capabilities, \
                            c.generation,c.account_id,c.session_id,c.connection_id \
                     FROM auth_sessions s \
                     LEFT JOIN auth_grants g ON g.world_id=$1 AND g.account_id=s.account_id \
                     LEFT JOIN auth_controls c ON c.world_id=g.world_id AND c.actor_id=g.actor_id \
                     WHERE s.token_hash=$2 AND s.expires_at>$3",
                    &[&query_world, &hash, &now_ms()],
                ).await?)
            })
        }).await?.ok_or(AccessError::Session)?;
        let access = Arc::new(self.decode_access(&row, world)?);
        let mut cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        if cache.revoking.contains(&key)
            || cache.revision != revision
            || access.expires_at <= now_ms()
        {
            return Err(AccessError::Changed);
        }
        if cache.tokens.len() >= TOKEN_CACHE_LIMIT {
            let now = now_ms();
            cache.tokens.retain(|_, value| value.expires_at > now);
            if cache.tokens.len() >= TOKEN_CACHE_LIMIT {
                return Err(AccessError::Busy);
            }
        }
        cache.tokens.insert(key, Arc::clone(&access));
        Ok((key, access))
    }

    fn decode_access(&self, row: &Row, world: String) -> Result<Access, StoreError> {
        // All members are finite identity/control fields with current-format
        // validation. Reserve the retained graph before decoding its text.
        let custody = self
            .budget
            .reserve(4096)
            .map_err(|_| StoreError::Capacity)?;
        let text = |column| -> Result<Option<&str>, StoreError> {
            let text: Option<&str> = row.try_get(column)?;
            if text.is_some_and(|value| value.len() > 512) {
                return Err(StoreError::InvalidRecord);
            }
            Ok(text)
        };
        let required = |column| text(column)?.ok_or(StoreError::InvalidRecord);
        let grant = if let Some(capabilities) = text(6)? {
            let actor = required(4)?;
            let actor_id = (!actor.starts_with(CHARACTERLESS)).then(|| actor.to_owned());
            let capabilities: Vec<Capability> =
                serde_json::from_str(capabilities).map_err(|_| StoreError::InvalidRecord)?;
            if capabilities.len() > 6
                || (actor_id.is_none() && capabilities.contains(&Capability::Play))
            {
                return Err(StoreError::InvalidRecord);
            }
            Some(WorldGrant {
                id: world,
                actor_id,
                revision: exact_integer(row.try_get(5)?)?,
                capabilities,
            })
        } else {
            None
        };
        let control = row
            .try_get::<_, Option<i64>>(7)?
            .map(|generation| {
                Ok::<_, StoreError>(Control {
                    generation: exact_integer(generation)?,
                    account_id: required(8)?.to_owned(),
                    session_id: required(9)?.to_owned(),
                    connection_id: required(10)?.to_owned(),
                })
            })
            .transpose()?;
        Ok(Access {
            session: required(0)?.to_owned(),
            account: required(1)?.to_owned(),
            session_revision: exact_integer(row.try_get(2)?)?,
            expires_at: row.try_get(3)?,
            grant,
            control,
            _custody: custody,
        })
    }
}

struct AccessChange<'a> {
    cache: &'a Mutex<Cache>,
    key: TokenHash,
}
impl Drop for AccessChange<'_> {
    fn drop(&mut self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.revoking.remove(&self.key);
        }
    }
}

pub struct AuthorizedScope {
    pub scope: RequestScope,
    key: TokenHash,
}
