//! Bind a host session to an existing Lab grant for the same verified identity.
//! Each store resolves its own account, session, timeline and controlled actor.
use super::*;

impl Authority {
    /// Hold the host grant and any imported source's privacy witness through
    /// the synchronous handoff to the caller. The Lab lock is always acquired first.
    pub(crate) fn publish_for_lab<T>(
        &self,
        scope: &AuthorizedScope,
        expected: Option<(u64, u64)>,
        publish: impl FnOnce() -> T,
    ) -> Result<T, AccessError> {
        let privacy = expected
            .map(|_| self.evidence.lock().map_err(|_| AccessError::Availability))
            .transpose()?;
        let cache = self.cache.lock().map_err(|_| AccessError::Availability)?;
        if let (Some(guard), Some(epoch)) = (privacy.as_ref(), expected)
            && (guard.1 != 0 || (guard.0, cache.revision) != epoch)
        {
            return Err(AccessError::Changed);
        }
        self.selected(&cache, scope, Capability::Create, false)?;
        Ok(publish())
    }

    pub(crate) fn evidence_epoch(&self) -> Result<(u64, u64), AccessError> {
        let epoch = self
            .evidence
            .lock()
            .map_err(|_| AccessError::Availability)?;
        if epoch.1 != 0 {
            return Err(AccessError::Changed);
        }
        Ok((
            epoch.0,
            self.cache
                .lock()
                .map_err(|_| AccessError::Availability)?
                .revision,
        ))
    }

    pub(crate) fn change_evidence(&self, begin: bool) -> Result<(), AccessError> {
        let mut epoch = self
            .evidence
            .lock()
            .map_err(|_| AccessError::Availability)?;
        epoch.0 = epoch.0.checked_add(1).ok_or(AccessError::Availability)?;
        if begin {
            epoch.1 += 1;
        } else {
            epoch.1 -= 1;
        }
        Ok(())
    }
    /// The ordinary session lookup handles all repeated calls. Only a first
    /// visit reads the account identity and inserts a session in the Lab DB.
    pub(crate) async fn lab_token(
        &self,
        host: &Authority,
        permit: &AuthorizedScope,
        host_token: &str,
    ) -> Result<String, AccessError> {
        let token = digest_text(
            Sha256::new()
                .chain_update(b"OpenLegend isolated lab session\0")
                .chain_update(host_token.as_bytes())
                .finalize()
                .into(),
        );
        match self.access(&token).await {
            Ok(_) => return Ok(token),
            Err(AccessError::Session) => {}
            Err(error) => return Err(error),
        }
        let _initializing = self.changes.lock().await;
        match self.access(&token).await {
            Ok(_) => return Ok(token),
            Err(AccessError::Session) => {}
            Err(error) => return Err(error),
        }
        let host_account = permit.scope.account_id.clone();
        let identity: (String, String) = host
            .store
            .read_operational(move |tx| {
                Box::pin(async move {
                    let row = tx
                        .query_one(
                            "SELECT issuer, subject FROM auth_accounts WHERE id=$1
                 AND octet_length(issuer)<=2048 AND octet_length(subject)<=2048",
                            &[&host_account],
                        )
                        .await?;
                    Ok((row.try_get(0)?, row.try_get(1)?))
                })
            })
            .await?;
        host.current(permit, Capability::Create, false, |_, _| ())?;
        let seed = SessionSeed {
            token: token.clone(),
            hash: digest_text(token_hash(&token)?),
            id: Uuid::new_v4().to_string(),
        };
        let expires = permit.expires_at;
        let limit = self.session_capacity;
        let world = self.world_id.clone();
        let admitted = self
            .store
            .operational(move |tx| {
                Box::pin(async move {
                    let account = tx
                        .query_opt(
                            "SELECT a.id FROM auth_accounts a JOIN auth_grants g
                 ON g.account_id=a.id AND g.world_id=$3 WHERE a.issuer=$1 AND a.subject=$2",
                            &[&identity.0, &identity.1, &world],
                        )
                        .await?;
                    let Some(row) = account else {
                        return Ok(false);
                    };
                    let now = now_ms();
                    if expires <= now {
                        return Ok(false);
                    }
                    seed.insert(tx, row.try_get(0)?, now, expires - now, limit)
                        .await?;
                    Ok(true)
                })
            })
            .await?;
        admitted.then_some(token).ok_or(AccessError::Forbidden)
    }
}
