//! Issue opaque references only for facts the existing observer read grants.
//! Body, person and historical handles serve different lifetimes and roles.

use crate::authority::RequestScope;
use openlegend_simulation::{
    capture::ContextActionWitness,
    encoding::{append_hex, json_record, sha256_hex, write_json_record},
    reception::{EvidenceSource, ObserverSubject},
};
use ring::hmac;
use serde::Serialize;
use std::io::{self, Write};

pub struct ReferenceIssuer {
    body: hmac::Key,
    person: hmac::Key,
    historical: hmac::Key,
}

pub struct PlayerReferences<'a> {
    issuer: &'a ReferenceIssuer,
    origin: &'a RequestScope,
    scope: String,
    history: String,
}

impl ReferenceIssuer {
    pub fn new() -> Result<Self, getrandom::Error> {
        Ok(Self {
            body: random_key()?,
            person: random_key()?,
            historical: random_key()?,
        })
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
