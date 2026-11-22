//! Issue opaque references only for facts the existing observer read grants.
//! Body, person and historical handles serve different lifetimes and roles.

use crate::authority::RequestScope;
use openlegend_simulation::{
    capture::ContextActionWitness,
    commands::SpeechTargetRole,
    encoding::{append_hex, json_record, sha256_hex, write_json_record},
    host::{ByteBudget, ByteReservation},
    received::TemporalReceiptLocator,
    reception::{EvidenceSource, ObserverSubject},
    runtime::{NativeWorldSession, RuntimeError},
};
use ring::{aead, hmac};
use serde::{Serialize, de::DeserializeOwned};
use std::{
    cell::RefCell,
    io::{self, Write},
};

pub struct ReferenceIssuer {
    body: hmac::Key,
    person: hmac::Key,
    historical: hmac::Key,
    private_cursor: aead::LessSafeKey,
}

const RECENT_CURSOR: &[u8] = b"openlegend-private-recent-cursor";
const RECENT_EDIT: &[u8] = b"openlegend-private-recent-edit";
const PEOPLE_CURSOR: &[u8] = b"openlegend-private-people-cursor";

#[derive(serde::Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct RecentEditReference<Text, Receipt> {
    pub(crate) scope: Text,
    pub(crate) world: Text,
    pub(crate) generation: Text,
    pub(crate) life: u64,
    pub(crate) privacy_revision: u64,
    pub(crate) receipt: Receipt,
}

pub(crate) struct ResolvedContact {
    pub(crate) id: String,
    _custody: ByteReservation,
}

pub(crate) struct ResolvedSpeechTarget {
    pub(crate) id: String,
    pub(crate) role: SpeechTargetRole,
    pub(crate) custody: ByteReservation,
}

pub struct PlayerReferences<'a> {
    issuer: &'a ReferenceIssuer,
    origin: &'a RequestScope,
    scope: String,
    history: String,
}

impl ReferenceIssuer {
    pub fn new() -> Result<Self, getrandom::Error> {
        let mut secret = [0; 32];
        getrandom::fill(&mut secret)?;
        Ok(Self {
            body: random_key()?,
            person: random_key()?,
            historical: random_key()?,
            private_cursor: aead::LessSafeKey::new(
                aead::UnboundKey::new(&aead::AES_256_GCM, &secret)
                    .expect("the private cursor key has the required fixed size"),
            ),
        })
    }

    /// Opaque continuation for a bounded private history read. Internal
    /// positions never leave the server in plaintext. The caller owns the
    /// current grant and query checks, and funds this short encoded token.
    pub(crate) fn seal_recent_cursor(&self, value: &impl Serialize) -> Option<String> {
        self.seal_private(RECENT_CURSOR, value)
    }

    pub(crate) fn open_recent_cursor<T: DeserializeOwned>(&self, token: &str) -> Option<T> {
        self.open_private(RECENT_CURSOR, token)
    }

    /// A previously disclosed receipt is only a candidate for a creator's
    /// protected edit. Scope and native source ownership are checked again.
    pub(crate) fn seal_recent_edit(
        &self,
        reference: &RecentEditReference<&str, &TemporalReceiptLocator>,
    ) -> Option<String> {
        self.seal_private(RECENT_EDIT, reference)
    }

    pub(crate) fn open_recent_edit(
        &self,
        token: &str,
    ) -> Option<RecentEditReference<String, TemporalReceiptLocator>> {
        self.open_private(RECENT_EDIT, token)
    }

    pub(crate) fn seal_people_cursor(&self, value: &impl Serialize) -> Option<String> {
        self.seal_private(PEOPLE_CURSOR, value)
    }

    pub(crate) fn open_people_cursor<T: DeserializeOwned>(&self, token: &str) -> Option<T> {
        self.open_private(PEOPLE_CURSOR, token)
    }

    fn seal_private(&self, purpose: &[u8], value: &impl Serialize) -> Option<String> {
        let mut nonce = [0; aead::NONCE_LEN];
        getrandom::fill(&mut nonce).ok()?;
        let mut body = json_record(value).ok()?.into_bytes();
        self.private_cursor
            .seal_in_place_append_tag(
                aead::Nonce::assume_unique_for_key(nonce),
                aead::Aad::from(purpose),
                &mut body,
            )
            .ok()?;
        let mut result = String::with_capacity(2 * (nonce.len() + body.len()));
        append_hex(&mut result, &nonce);
        append_hex(&mut result, &body);
        Some(result)
    }

    fn open_private<T: DeserializeOwned>(&self, purpose: &[u8], token: &str) -> Option<T> {
        if token.len() > 2048 || token.len() % 2 != 0 {
            return None;
        }
        let hex = |byte| char::from(byte).to_digit(16).map(|digit| digit as u8);
        let mut decoded = token
            .as_bytes()
            .chunks_exact(2)
            .map(|pair| Some((hex(pair[0])? << 4) | hex(pair[1])?))
            .collect::<Option<Vec<_>>>()?;
        let (prefix, body) = decoded.split_at_mut_checked(aead::NONCE_LEN)?;
        let nonce = aead::Nonce::try_assume_unique_for_key(prefix).ok()?;
        let clear = self
            .private_cursor
            .open_in_place(nonce, aead::Aad::from(purpose), body)
            .ok()?;
        serde_json::from_slice(clear).ok()
    }

    /// Bind all references in one permitted view to one session, controller
    /// and timeline. The caller retains its own admitted output fields.
    pub fn scoped<'a>(
        &'a self,
        scope: &'a RequestScope,
    ) -> Result<PlayerReferences<'a>, serde_json::Error> {
        let key = scope.key()?;
        let timeline_scope = format!("{}:{key}", scope.timeline_id);
        let history = json_record(&(&scope.world_id, timeline_scope))?;
        Ok(PlayerReferences {
            issuer: self,
            origin: scope,
            scope: key,
            history,
        })
    }

    /// Resolve only a current body reference issued for this view. The returned
    /// private source ID funds its own lifetime in the owning turn.
    pub(crate) fn resolve_contact(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        selected: &str,
        budget: &ByteBudget,
    ) -> Result<Option<ResolvedContact>, RuntimeError> {
        self.resolve_contact_body(session, scope, selected, None, budget)
    }

    /// The person overlay receives both the contact's current observation
    /// lease and the physical-life reference issued in that same view.
    pub(crate) fn resolve_contact_body(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        selected: &str,
        expected_body: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<Option<ResolvedContact>, RuntimeError> {
        self.resolve_contact_matching(session, scope, selected, expected_body, |_| true, budget)
    }

    /// A portable lot is a permitted item in this view only when the
    /// selected current contact's detailed pile observation shows it.
    pub(crate) fn resolve_ground_item(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        selected: &str,
        item: &str,
        budget: &ByteBudget,
    ) -> Result<Option<ResolvedContact>, RuntimeError> {
        self.resolve_contact_matching(session, scope, selected, None, |body| {
            body.facets().any(|facet| match &facet.value {
                openlegend_simulation::reception::SensoryFacet::PileContents { items } =>
                    items.iter().any(|witness| witness.id == item && witness.portable),
                _ => false,
            })
        }, budget)
    }

    fn resolve_contact_matching(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        selected: &str,
        expected_body: Option<&str>,
        matches: impl Fn(&openlegend_simulation::capture::PlayerObservedBody<'_>) -> bool,
        budget: &ByteBudget,
    ) -> Result<Option<ResolvedContact>, RuntimeError> {
        if !selected.starts_with("contact-") {
            return Ok(None);
        }
        let _workspace = budget.reserve(2048)?;
        let scoped = self
            .scoped(scope)
            .map_err(RuntimeError::application_refused)?;
        let mut selected_source = None;
        session.with_player_contacts(&scope.account_id, &scope.actor_id, |body| {
            match scoped.contact(
                body.source_id,
                body.physical_life.unwrap_or(0),
                body.lease_id,
            ) {
                Ok(current) if current == selected => {
                    if !matches(&body) {
                        return true;
                    }
                    if let Some(expected) = expected_body {
                        match scoped.body(body.source_id, body.physical_life.unwrap_or(0)) {
                            Ok(actual) if actual == expected => (),
                            Ok(_) => return true,
                            Err(error) => {
                                selected_source =
                                    Some(Err(RuntimeError::application_refused(error)));
                                return true;
                            }
                        }
                    }
                    selected_source = Some(
                        budget
                            .reserve(body.source_id.len())
                            .map(|custody| ResolvedContact {
                                id: body.source_id.to_owned(),
                                _custody: custody,
                            })
                            .map_err(RuntimeError::from),
                    );
                    true
                }
                Ok(_) => false,
                Err(error) => {
                    selected_source = Some(Err(RuntimeError::application_refused(error)));
                    true
                }
            }
        })?;
        selected_source.transpose()
    }

    /// Read only the current speech targets and return the selected public
    /// reference's independently funded body or remembered-person role.
    pub(crate) fn resolve_speech_target(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        selected: &str,
        budget: &ByteBudget,
    ) -> Result<Option<ResolvedSpeechTarget>, RuntimeError> {
        if !selected.starts_with("contact-") && !selected.starts_with("person-") {
            return Ok(None);
        }
        let _workspace = budget.reserve(2048)?;
        let scoped = self
            .scoped(scope)
            .map_err(RuntimeError::application_refused)?;
        let matched = RefCell::new(None);
        let resolve = |reference: Result<String, _>, actor: &str, role| match reference {
            Ok(value) if value == selected => {
                matched.replace(Some(
                    budget
                        .reserve(actor.len())
                        .map(|custody| ResolvedSpeechTarget {
                            id: actor.to_owned(),
                            role,
                            custody,
                        })
                        .map_err(RuntimeError::from),
                ));
                true
            }
            Ok(_) => false,
            Err(error) => {
                matched.replace(Some(Err(RuntimeError::application_refused(error))));
                true
            }
        };
        session.with_player_targets(
            &scope.account_id,
            &scope.actor_id,
            |body| {
                resolve(
                    scoped.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id),
                    body.source_id,
                    SpeechTargetRole::Body,
                )
            },
            |person| resolve(scoped.person(person), person, SpeechTargetRole::Remembered),
        )?;
        matched.into_inner().transpose()
    }
}

impl PlayerReferences<'_> {
    pub fn matches_reader(&self, world: &str, actor: &str) -> bool {
        self.origin.world_id == world && self.origin.actor_id == actor
    }

    pub fn context_action(
        &self,
        witness: &ContextActionWitness,
    ) -> Result<String, serde_json::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Encounter<'a> {
            actor_life: u64,
            episode: Option<&'a str>,
            hostile_revision: u64,
            revision: u64,
            target_id: &'a str,
            target_life: u64,
        }
        // The preview tuple hashes its nested fields in canonical Source
        // order. The native capture proves coaching and ranged absence.
        let encounter = witness.encounter.as_ref().map(|value| Encounter {
            actor_life: value.actor_life,
            episode: value.episode.as_deref(),
            hostile_revision: value.hostile_revision,
            revision: value.revision,
            target_id: &value.target_id,
            target_life: value.target_life,
        });
        sign(
            &self.issuer.body,
            "",
            &(
                "context-preview",
                &self.scope,
                witness.module_revision,
                witness.actor_life,
                witness.target_life,
                encounter,
                Option::<()>::None,
                witness.combat_ready,
                Option::<()>::None,
            ),
        )
    }

    /// These display handles carry the same 144 keyed bits as Source. They
    /// cannot turn acquired evidence into a fresh body lease or participant.
    pub fn personal_source(
        &self,
        identity: &(impl Serialize + ?Sized),
    ) -> Result<String, serde_json::Error> {
        let signed = signed(
            &self.issuer.body,
            &(
                "personal-source",
                &self.origin.world_id,
                &self.origin.actor_id,
                identity,
            ),
        )?;
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let mut reference = String::with_capacity(24);
        for bytes in signed.as_ref()[..18].chunks_exact(3) {
            for index in [
                bytes[0] >> 2,
                (bytes[0] & 3) << 4 | bytes[1] >> 4,
                (bytes[1] & 15) << 2 | bytes[2] >> 6,
                bytes[2] & 63,
            ] {
                reference.push(char::from(ALPHABET[index as usize]));
            }
        }
        Ok(reference)
    }

    pub fn evidence(&self, source: &EvidenceSource) -> Result<String, serde_json::Error> {
        self.personal_source(&(
            "evidence",
            source.family,
            &source.observer.actor_id,
            source.observer.physical_life,
            &source.id,
            &source.revision,
        ))
    }

    pub fn trade_draft(
        &self,
        subject: Option<&ObserverSubject>,
        contact: &str,
        life: u64,
    ) -> Result<String, serde_json::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct DraftScope<'a> {
            account_id: &'a str,
            session_id: &'a str,
            session_revision: u64,
            world_id: &'a str,
            timeline_id: &'a str,
            grant_revision: u64,
            actor_id: &'a str,
            audience: &'static str,
        }
        let scope = self.origin;
        let draft = sha256_hex(&serde_json::to_vec(&DraftScope {
            account_id: &scope.account_id,
            session_id: &scope.session_id,
            session_revision: scope.session_revision,
            world_id: &scope.world_id,
            timeline_id: &scope.timeline_id,
            grant_revision: scope.grant_revision,
            actor_id: &scope.actor_id,
            audience: if scope.embodied() {
                "embodied"
            } else {
                "authorized-inspection"
            },
        })?);
        #[derive(Serialize)]
        #[serde(untagged)]
        enum Subject<'a> {
            Known(&'a ObserverSubject),
            Observed(&'a str),
        }
        self.personal_source(&(
            "trade-draft",
            draft,
            &scope.timeline_id,
            subject.map_or(Subject::Observed(contact), Subject::Known),
            life,
        ))
    }

    pub fn contact(
        &self,
        id: &str,
        life: u64,
        lease_id: &str,
    ) -> Result<String, serde_json::Error> {
        let scope = format!("{}:{lease_id}", self.scope);
        sign(&self.issuer.body, "contact-", &(scope, id, life))
    }

    pub fn body(&self, id: &str, life: u64) -> Result<String, serde_json::Error> {
        sign(&self.issuer.body, "", &(&self.scope, id, life))
    }

    pub fn person(&self, id: &str) -> Result<String, serde_json::Error> {
        sign(&self.issuer.person, "person-", &(&self.scope, id))
    }

    pub fn historical(
        &self,
        event_id: &str,
        entity_id: &str,
        role: &str,
    ) -> Result<String, serde_json::Error> {
        sign(
            &self.issuer.historical,
            "",
            &(&self.history, event_id, entity_id, role),
        )
    }

    /// The selected input is the literal self role, a captured source subject
    /// or the event identity when no subject was learned.
    pub fn speech_participant(
        &self,
        label_route: &(impl Serialize + ?Sized),
    ) -> Result<String, serde_json::Error> {
        sign(
            &self.issuer.historical,
            "",
            &(&self.history, "speech-participant", label_route),
        )
    }
}

fn random_key() -> Result<hmac::Key, getrandom::Error> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes)?;
    Ok(hmac::Key::new(hmac::HMAC_SHA256, &bytes))
}

struct Signature(hmac::Context);
impl Write for Signature {
    fn write(&mut self, input: &[u8]) -> io::Result<usize> {
        self.0.update(input);
        Ok(input.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn sign(
    key: &hmac::Key,
    prefix: &str,
    body: &(impl Serialize + ?Sized),
) -> Result<String, serde_json::Error> {
    let signed = signed(key, body)?;
    let mut reference = String::with_capacity(prefix.len() + signed.as_ref().len() * 2);
    reference.push_str(prefix);
    append_hex(&mut reference, signed.as_ref());
    Ok(reference)
}

fn signed(
    key: &hmac::Key,
    body: &(impl Serialize + ?Sized),
) -> Result<hmac::Tag, serde_json::Error> {
    let mut signature = Signature(hmac::Context::with_key(key));
    // Hash the existing tuple directly. No intermediate JSON buffer is
    // needed just to issue one visible reference.
    write_json_record(body, &mut signature)?;
    Ok(signature.0.sign())
}
