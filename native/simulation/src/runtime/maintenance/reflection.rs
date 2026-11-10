//! Reflection aliases are selected from a genuine NPC ticket. Node supplies
//! displayed spellings and ordinals, never canonical subjects or evidence IDs.
use super::*;
use crate::capture::{
    NpcBindingPurpose,
    maintenance::{MaintenanceAdmission, MaintenancePurpose},
};
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::records::SqlCell;
use crate::response::{ResponseAliases, ResponseBindings};
use indexmap::IndexMap;
use std::mem::size_of;
use std::sync::atomic::AtomicBool;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    expected_revision: u64,
    evidence_aliases: Vec<EvidenceAlias>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    dream_episode: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EvidenceAlias {
    alias: String,
    inventory: usize,
    ordinal: usize,
}
pub struct RuntimeReflectionTicket {
    npc: RuntimeNpcResponseTicket,
    body: Arc<crate::capture::maintenance::MaintenanceCapture>,
    workspace: Arc<crate::capture::maintenance::MaintenanceCapture>,
    bindings: Arc<ResponseBindings>,
    evidence_aliases: IndexMap<String, String>,
    admission: MaintenanceAdmission,
    _storage: ByteReservation,
}
impl RuntimeReflectionTicket {
    pub fn receipt_liveness(&self) -> [Weak<AtomicBool>; 2] {
        self.npc.receipt_liveness()
    }
}
impl NativeWorldSession {
    pub fn reflection_sources_current(
        &self,
        ticket: &RuntimeReflectionTicket,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.publication_read().map_err(failure)?.state;
        if !ticket.workspace.scope_current(state) {
            return Ok(false);
        }
        ticket
            .bindings
            .reflection_sources_current(state, &self.budget)
            .map_err(failure)
    }
    pub fn reflection_publication(
        &self,
        ticket: &RuntimeReflectionTicket,
    ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        // Paid disclosure rechecks the original body admission and selected
        // sources. Workspace revision/obligations are publication-effect guards,
        // so context preparation cannot turn them into permission withdrawal.
        if !ticket
            .body
            .current(state, &ticket.admission)
            .map_err(failure)?
            || !self.reflection_sources_current(ticket)?
        {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(size_of::<RuntimeMaintenancePublication>())
            .map_err(failure)?;
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeMaintenancePublication {
            _lease: lease,
            fence,
            _storage: storage,
        }))
    }
    pub fn begin_reflection(
        &mut self,
        owner: &mut Option<RuntimeReflectionTicket>,
        proposal: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let ticket = owner
            .as_ref()
            .ok_or_else(|| failure("reflection ticket was released"))?;
        let input = ticket.prepare(
            &self.session.accepted().map_err(failure)?.state,
            proposal,
            &self.budget,
        )?;
        let key = self.session.begin_reflection(input).map_err(failure)?;
        *owner = None;
        Ok(key)
    }
    pub fn bind_reflection(
        &self,
        body: &RuntimeMaintenanceRead,
        workspace: &RuntimeMaintenanceRead,
        owner: &mut Option<RuntimeNpcResponseTicket>,
        input: &[u8],
    ) -> Result<RuntimeReflectionTicket, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: Binding = serde_json::from_slice(input).map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let npc = owner
            .as_ref()
            .ok_or_else(|| failure("NPC reflection ticket was released"))?;
        if npc.bindings.purpose != NpcBindingPurpose::Reflection
            || !body.read.scope_current(state)
            || !workspace.read.scope_current(state)
            || workspace.read.inner_revision != Some(input.expected_revision)
            || body.read.request.actor_id != npc.current.read.perception.actor_id
            || workspace.read.request.actor_id != npc.current.read.perception.actor_id
            || npc.original.read.perception.evidence.generation() != state.generation
        {
            return Err(failure(
                "reflection origin or accepted workspace revision differs",
            ));
        }
        let bindings = self.npc_response_bindings(npc)?;
        let sources = &bindings
            .native_guard()
            .ok_or_else(|| failure("reflection source scope unavailable"))?
            .sources;
        let initial = size_of::<RuntimeReflectionTicket>()
            .checked_add(
                map_storage::<String, String>(input.evidence_aliases.len())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .ok_or_else(|| failure("capacity"))?;
        let bytes = input
            .evidence_aliases
            .iter()
            .try_fold(initial, |n, alias| {
                let id = &sources
                    .get(alias.inventory)?
                    .personal
                    .get(alias.ordinal)?
                    .record
                    .header()
                    .reference
                    .id;
                n.checked_add(alias.alias.capacity())?.checked_add(id.len())
            })
            .and_then(|n| n.checked_add(input.dream_episode.as_ref().map_or(0, String::capacity)))
            .ok_or_else(|| failure("reflection evidence selection unavailable"))?;
        let storage = self.budget.reserve(bytes).map_err(failure)?;
        let mut aliases = IndexMap::with_capacity(input.evidence_aliases.len());
        for alias in input.evidence_aliases {
            let selected = sources
                .get(alias.inventory)
                .and_then(|s| s.personal.get(alias.ordinal))
                .ok_or_else(|| failure("reflection evidence selection unavailable"))?;
            let id = &selected.record.header().reference.id;
            if alias.alias.is_empty()
                || !npc
                    .bindings
                    .selected_personal
                    .contains(&(alias.inventory, alias.ordinal))
                || !npc.bindings.evidence_ids.contains(id)
            {
                return Err(failure(
                    "reflection evidence was not included in the issued request",
                ));
            }
            if aliases.get(&alias.alias).is_some_and(|prior| prior != id) {
                return Err(failure("reflection evidence alias collision"));
            }
            aliases.insert(alias.alias, id.clone());
        }
        let admission = MaintenanceAdmission {
            purpose: if input.dream_episode.is_some() {
                MaintenancePurpose::Maintenance
            } else {
                MaintenancePurpose::Reflection
            },
            requires_body: true,
            dream_episode: input.dream_episode,
        };
        Ok(RuntimeReflectionTicket {
            npc: owner
                .take()
                .ok_or_else(|| failure("NPC reflection ticket was released"))?,
            body: Arc::clone(&body.read),
            workspace: Arc::clone(&workspace.read),
            bindings,
            evidence_aliases: aliases,
            admission,
            _storage: storage,
        })
    }
}
impl RuntimeReflectionTicket {
    pub(super) fn prepare(
        &self,
        state: &crate::simulation::SimulationState,
        proposal: &[u8],
        budget: &ByteBudget,
    ) -> Result<crate::cognition::publication::ReflectionInput, RuntimeError> {
        let source = std::str::from_utf8(proposal).map_err(failure)?;
        let mut storage = budget
            .reserve(crate::experience::encoded_body_bound(source).map_err(failure)?)
            .map_err(failure)?;
        let raw: SqlCell = serde_json::from_slice(proposal).map_err(failure)?;
        let SqlCell::Object(mut raw) = raw else {
            return Err(failure("reflection proposal must be an object"));
        };
        let fields = [
            "files",
            "thoughts",
            "goalChanges",
            "knowledgeChanges",
            "nameChanges",
            "appraisalChanges",
            "recordChanges",
        ];
        let body_size = map_storage::<String, SqlCell>(13)
            .and_then(|n| n.checked_add(fields.iter().map(|key| key.len()).sum::<usize>() + 128))
            .and_then(|n| n.checked_add(self.bindings.actor_id().len()))
            .and_then(|n| n.checked_add(self.npc.decision_id.len()))
            .and_then(|n| {
                n.checked_add(
                    self.admission
                        .dream_episode
                        .as_ref()
                        .map_or(0, |e| e.len() * 2),
                )
            })
            .and_then(|n| {
                n.checked_add(
                    self.bindings
                        .evidence_ids()
                        .len()
                        .checked_mul(size_of::<SqlCell>())?,
                )
            })
            .and_then(|n| {
                self.bindings
                    .evidence_ids()
                    .iter()
                    .try_fold(n, |n, id| n.checked_add(id.len()))
            })
            .ok_or_else(|| failure("capacity"))?;
        storage
            .resize(
                storage
                    .bytes()
                    .checked_add(body_size)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut publication = IndexMap::with_capacity(13);
        publication.insert("actorId".into(), self.bindings.actor_id().into());
        publication.insert(
            "expectedRevision".into(),
            self.workspace
                .inner_revision
                .ok_or_else(|| failure("reflection workspace unavailable"))?
                .into(),
        );
        publication.insert(
            "snapshot".into(),
            raw.shift_remove("revision")
                .ok_or_else(|| failure("reflection revision unavailable"))?,
        );
        for field in fields {
            let value = raw
                .shift_remove(field)
                .unwrap_or_else(|| SqlCell::Array(Vec::new()));
            if value.as_array().is_none() {
                return Err(failure("reflection proposal collection is malformed"));
            }
            publication.insert(field.into(), value);
        }
        publication.insert(
            "evidenceIds".into(),
            SqlCell::Array(
                self.bindings
                    .evidence_ids()
                    .iter()
                    .map(|id| id.as_str().into())
                    .collect(),
            ),
        );
        publication.insert(
            "dreamEpisode".into(),
            self.admission
                .dream_episode
                .as_deref()
                .map_or(SqlCell::Null, SqlCell::from),
        );
        let mut publication = SqlCell::Object(publication);
        let aliases = ResponseAliases {
            entities: &self.npc.bindings.entity_references,
            physical: &self.npc.bindings.physical_references,
            intentions: &self.npc.bindings.intention_references,
            knowledge: &self.npc.bindings.knowledge_references,
            identities: &self.npc.bindings.identity_references,
        };
        aliases
            .resolve_reflection_proposal(
                &mut publication,
                &self.evidence_aliases,
                self.npc.bindings.appraisals.as_deref(),
                state,
                budget,
                &mut storage,
            )
            .map_err(failure)?;
        let count =
            self.npc.bindings.entity_ids.len() + self.npc.bindings.identity_references.len();
        let subject_bytes = count
            .checked_mul(size_of::<crate::reception::ObserverSubject>())
            .and_then(|n| {
                self.npc
                    .bindings
                    .entity_ids
                    .iter()
                    .try_fold(n, |n, id| n.checked_add(id.len()))
            })
            .and_then(|n| {
                self.npc
                    .bindings
                    .identity_references
                    .values()
                    .try_fold(n, |n, s| n.checked_add(s.heap_bytes()?))
            })
            .ok_or_else(|| failure("capacity"))?;
        storage
            .resize(
                storage
                    .bytes()
                    .checked_add(subject_bytes)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut subjects = Vec::with_capacity(count);
        subjects.extend(self.npc.bindings.entity_ids.iter().map(|id| {
            crate::reception::ObserverSubject::Entity {
                entity_id: id.clone(),
            }
        }));
        subjects.extend(self.npc.bindings.identity_references.values().cloned());
        Ok(crate::cognition::publication::ReflectionInput {
            job_id: self.npc.decision_id.clone(),
            body: Arc::clone(&self.body),
            workspace: Arc::clone(&self.workspace),
            admission: MaintenanceAdmission {
                purpose: self.admission.purpose,
                requires_body: true,
                dream_episode: self.admission.dream_episode.clone(),
            },
            bindings: Arc::clone(&self.bindings),
            permitted_subjects: subjects,
            publication,
            storage,
        })
    }
}
