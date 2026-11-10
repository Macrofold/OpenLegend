//! Alias spellings select only actual first-request personal sources and the
//! current private record subjects retained by this batch's interpretation read.
use super::*;
use crate::reception::ObserverSubject;
use crate::records::SqlCell;
use indexmap::{IndexMap, IndexSet};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
    evidence_aliases: Vec<Evidence>,
    identities: Vec<Identity>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Evidence {
    alias: String,
    ordinal: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Identity {
    alias: String,
    source: Subject,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum Subject {
    MindRecord { ordinal: usize },
    Personal { ordinal: usize, subject: usize },
}
pub struct RuntimeConsolidationDream {
    scope: Arc<NpcHistoricalScope>,
    identities: IndexMap<String, ObserverSubject>,
    evidence: IndexMap<String, String>,
    _storage: ByteReservation,
}
impl NativeWorldSession {
    pub fn bind_consolidation_dream(
        &self,
        ticket: &RuntimeConsolidationTicket,
        input: &[u8],
    ) -> Result<RuntimeConsolidationDream, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: Binding = serde_json::from_slice(input).map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let view = ticket
            .interpretation
            .as_ref()
            .ok_or_else(|| failure("dream interpretation was not offered"))?;
        let sources = ticket
            .sources
            .as_ref()
            .filter(|_| ticket.sources_ready())
            .ok_or_else(|| failure("dream sources are not available"))?;
        if !ticket.scope.still_permitted(state)
            || ticket.inner_revision.is_none()
            || ticket.admission.dream_episode.is_none()
            || ticket.admission.dream_episode == view.last_dream_episode
            || !ticket.admission.requires_body
        {
            return Err(failure("dream has no admitted current episode"));
        }
        let mut bytes = size_of::<RuntimeConsolidationDream>()
            + crate::host::retained_size::map_storage::<String, String>(
                input.evidence_aliases.len(),
            )
            .ok_or_else(|| failure("capacity"))?
            + crate::host::retained_size::map_storage::<String, ObserverSubject>(
                input.identities.len(),
            )
            .ok_or_else(|| failure("capacity"))?;
        for alias in &input.evidence_aliases {
            let source = sources
                .personal
                .get(alias.ordinal)
                .ok_or_else(|| failure("dream evidence selection is unavailable"))?;
            bytes = bytes
                .checked_add(alias.alias.capacity())
                .and_then(|n| n.checked_add(source.record.header().reference.id.len()))
                .ok_or_else(|| failure("capacity"))?;
        }
        for alias in &input.identities {
            let subject = match alias.source {
                Subject::MindRecord { ordinal } => view
                    .subjects
                    .get(ordinal)
                    .and_then(Option::as_ref)
                    .map(|fact| &fact.subject),
                Subject::Personal { ordinal, subject } => sources
                    .personal
                    .get(ordinal)
                    .and_then(|s| s.attribution.subject(subject))
                    .map(|fact| &fact.subject),
            }
            .ok_or_else(|| failure("dream subject selection is unavailable"))?;
            bytes = bytes
                .checked_add(alias.alias.capacity())
                .and_then(|n| n.checked_add(subject.heap_bytes()?))
                .ok_or_else(|| failure("capacity"))?;
        }
        let storage = self.budget.reserve(bytes).map_err(failure)?;
        let _selected = self
            .budget
            .reserve(
                crate::host::retained_size::map_storage::<usize, ()>(input.evidence_aliases.len())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut selected = IndexSet::with_capacity(input.evidence_aliases.len());
        let mut evidence = IndexMap::with_capacity(input.evidence_aliases.len());
        for alias in input.evidence_aliases {
            if alias.alias.is_empty() {
                return Err(failure("empty dream evidence alias"));
            }
            let source = sources
                .personal
                .get(alias.ordinal)
                .ok_or_else(|| failure("dream evidence selection is unavailable"))?;
            let id = &source.record.header().reference.id;
            if evidence.get(&alias.alias).is_some_and(|prior| prior != id) {
                return Err(failure("conflicting dream evidence alias"));
            }
            selected.insert(alias.ordinal);
            evidence.insert(alias.alias, id.clone());
        }
        let mut identities = IndexMap::with_capacity(input.identities.len());
        for alias in input.identities {
            if alias.alias.is_empty() {
                return Err(failure("empty dream identity alias"));
            }
            let subject = match alias.source {
                Subject::MindRecord { ordinal } => view
                    .subjects
                    .get(ordinal)
                    .and_then(Option::as_ref)
                    .map(|fact| &fact.subject),
                Subject::Personal { ordinal, subject } if selected.contains(&ordinal) => sources
                    .personal
                    .get(ordinal)
                    .and_then(|s| s.attribution.subject(subject))
                    .map(|fact| &fact.subject),
                _ => None,
            }
            .ok_or_else(|| failure("dream subject was not included in its request"))?;
            if identities
                .get(&alias.alias)
                .is_some_and(|prior| prior != subject)
            {
                return Err(failure("conflicting dream identity alias"));
            }
            identities.insert(alias.alias, subject.clone());
        }
        Ok(RuntimeConsolidationDream {
            scope: Arc::clone(&ticket.scope),
            identities,
            evidence,
            _storage: storage,
        })
    }
}
impl RuntimeConsolidationDream {
    pub(super) fn prepare(
        &self,
        ticket: &RuntimeConsolidationTicket,
        input: &[u8],
        budget: &ByteBudget,
    ) -> Result<crate::cognition::dream::DreamInput, RuntimeError> {
        if !Arc::ptr_eq(&self.scope, &ticket.scope)
            || ticket.admission.dream_episode.is_none()
            || !ticket.admission.requires_body
        {
            return Err(failure("dream belongs to another maintenance batch"));
        }
        let text = std::str::from_utf8(input).map_err(failure)?;
        let bytes = crate::experience::encoded_body_bound(text)
            .map_err(failure)?
            .checked_add(crate::experience::encoded_body_bound(&ticket.files).map_err(failure)?)
            .ok_or_else(|| failure("capacity"))?;
        let mut storage = budget
            .reserve(
                bytes
                    .checked_add(
                        self.identities
                            .heap_bytes()
                            .ok_or_else(|| failure("capacity"))?,
                    )
                    .and_then(|n| {
                        n.checked_add(self.evidence.values().try_fold(0usize, |n, id| {
                            n.checked_add(id.len() * 2 + size_of::<SqlCell>())
                        })?)
                    })
                    .and_then(|n| {
                        n.checked_add(
                            ticket.job.len() * 3
                                + ticket.scope.actor_id.len()
                                + ticket
                                    .admission
                                    .dream_episode
                                    .as_ref()
                                    .map_or(0, String::len)
                                + 256
                                + crate::host::retained_size::map_storage::<String, SqlCell>(13)?,
                        )
                    })
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let raw: SqlCell = serde_json::from_slice(input).map_err(failure)?;
        let SqlCell::Object(mut raw) = raw else {
            return Err(failure("dream interpretation must be an object"));
        };
        if raw
            .keys()
            .any(|key| !matches!(key.as_str(), "files" | "thoughts" | "recordChanges"))
        {
            return Err(failure("dream interpretation has unknown fields"));
        }
        let files = match raw.shift_remove("files") {
            Some(value) => value,
            None => serde_json::from_str(&ticket.files).map_err(failure)?,
        };
        let thoughts = raw
            .shift_remove("thoughts")
            .ok_or_else(|| failure("dream interpretation has no thoughts"))?;
        let mut records = raw
            .shift_remove("recordChanges")
            .unwrap_or_else(|| SqlCell::Array(Vec::new()));
        let empty = IndexMap::new();
        let aliases = crate::response::ResponseAliases {
            entities: &empty,
            physical: &empty,
            intentions: &empty,
            knowledge: &self.identities,
            identities: &self.identities,
        };
        aliases
            .resolve_interpretation_records(&mut records, &self.evidence, &mut storage)
            .map_err(failure)?;
        let mut fields = IndexMap::with_capacity(13);
        fields.insert("actorId".into(), ticket.scope.actor_id.as_str().into());
        fields.insert(
            "expectedRevision".into(),
            ticket
                .inner_revision
                .ok_or_else(|| failure("dream workspace is unavailable"))?
                .into(),
        );
        fields.insert("snapshot".into(), ticket.job.as_str().into());
        fields.insert("files".into(), files);
        fields.insert("thoughts".into(), thoughts);
        for key in [
            "goalChanges",
            "knowledgeChanges",
            "nameChanges",
            "appraisalChanges",
        ] {
            fields.insert(key.into(), SqlCell::Array(Vec::new()));
        }
        fields.insert("recordChanges".into(), records);
        fields.insert(
            "evidenceIds".into(),
            SqlCell::Array(
                self.evidence
                    .values()
                    .map(|id| SqlCell::from(id.as_str()))
                    .collect(),
            ),
        );
        fields.insert(
            "dreamEpisode".into(),
            ticket
                .admission
                .dream_episode
                .as_deref()
                .ok_or_else(|| failure("dream episode unavailable"))?
                .into(),
        );
        Ok(crate::cognition::dream::DreamInput {
            job: format!("{}:dream", ticket.job),
            publication: SqlCell::Object(fields),
            subjects: self.identities.values().cloned().collect(),
            storage,
        })
    }
}
