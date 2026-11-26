//! Offer only already acquired identity subjects. The JSON shown to the
//! model carries opaque names and revisions rather than new action grants.
use super::{CallFailure, capacity, packet_failure, prompt_text};
use openlegend_simulation::{
    capture::NpcSubjectAlias,
    host::{ByteReservation, CapacityError},
    runtime::{RuntimeNpcIdentity, RuntimeNpcRead},
};
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};

#[derive(Default)]
pub(super) struct Naming {
    pub(super) bindings: Vec<NpcSubjectAlias>,
    pub(super) aliases: Vec<String>,
    pub(super) description: Vec<Value>,
}

/// The earlier view and personal-source read already selected every eligible
/// row. Fund only the new aliases and the small prompt fields for those rows.
pub(super) fn prepare<'a>(
    current: &'a RuntimeNpcRead,
    original: &'a RuntimeNpcRead,
    canonical: &HashMap<&str, String>,
    personal: Option<(usize, &[(usize, &super::PersonalSource)])>,
    key: &str,
    custody: &mut ByteReservation,
) -> Result<Naming, CallFailure> {
    let mut seen = HashSet::new();
    let mut offers = Naming::default();
    let mut retain = |fact: RuntimeNpcIdentity<'a>, alias: Option<&str>| {
        let current = alias.is_some();
        let unique = (current, fact.subject);
        if seen.contains(&unique) {
            return Ok(());
        }
        let length = fact
            .label
            .storage_bytes()
            .checked_mul(8)
            .and_then(|bytes| bytes.checked_add(custody.bytes()))
            .and_then(|bytes| bytes.checked_add(2048))
            .ok_or_else(|| capacity(CapacityError))?;
        custody.resize(length).map_err(capacity)?;
        seen.insert(unique);
        let (alias, body) = if let Some(alias) = alias {
            (alias.to_owned(), true)
        } else {
            (
                super::alias(key, "remembered-name", offers.aliases.len()),
                false,
            )
        };
        offers.description.push(json!({
            "subjectId": alias,
            "label": prompt_text(fact.label),
            "nameRevision": fact.revision,
            "currentBody": body,
        }));
        offers.aliases.push(alias.clone());
        offers.bindings.push(NpcSubjectAlias {
            alias,
            source: fact.source,
        });
        Ok::<_, CallFailure>(())
    };
    for &ordinal in current.selected_body_ordinals().map_err(packet_failure)? {
        let body = current
            .presented_body(ordinal)
            .ok_or(CallFailure::Invalid)?;
        if let Some(fact) = current.visible_identity(ordinal) {
            let alias = canonical.get(body.source_id).ok_or(CallFailure::Invalid)?;
            retain(fact, Some(alias))?;
        }
    }
    if let Some((inventory, sources)) = personal {
        for (ordinal, _) in sources {
            let facts = original
                .remembered_identities(inventory, *ordinal)
                .ok_or(CallFailure::Stale("decision-name-source"))?;
            for fact in facts {
                retain(fact, None)?;
            }
        }
    }
    Ok(offers)
}
