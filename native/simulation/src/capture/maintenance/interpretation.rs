//! Private record subjects are selected from the actual mind at request time.
//! They are interpretation grants, never live body permissions.
use super::*;
use crate::host::retained_size::HeapBytes;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MaintenanceInterpretation {
    pub documents: Vec<MaintenanceDocument>,
    pub records: Vec<crate::cognition::InnerRecord>,
    pub subjects: Vec<Option<super::super::npc_subject::NpcSubjectFact>>,
    pub last_dream_episode: Option<String>,
    #[serde(skip)]
    _storage: ByteReservation,
}
#[derive(Serialize)]
pub(crate) struct MaintenanceDocument {
    id: String,
    revision: u64,
}
impl MaintenanceInterpretation {
    pub(crate) fn capture(
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mind = state
            .minds
            .minds
            .as_ref()
            .and_then(|m| m.get(actor))
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let bytes =
            mind.records
                .heap_bytes()
                .and_then(|n| {
                    n.checked_add(
                        mind.documents
                            .len()
                            .checked_mul(size_of::<MaintenanceDocument>())?,
                    )
                })
                .and_then(|n| {
                    n.checked_add(
                        mind.documents
                            .iter()
                            .try_fold(0usize, |n, d| n.checked_add(d.id.len()))?,
                    )
                })
                .and_then(|n| {
                    n.checked_add(mind.records.len().checked_mul(size_of::<
                        Option<super::super::npc_subject::NpcSubjectFact>,
                    >())?)
                })
                .and_then(|n| {
                    n.checked_add(mind.last_dream_episode.as_ref().map_or(0, String::capacity))
                })
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        let mut subjects = Vec::with_capacity(mind.records.len());
        for record in &mind.records {
            let _subject = budget.reserve(
                record
                    .subject_id
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            subjects.push(
                record
                    .subject_id
                    .as_ref()
                    .map(|subject| {
                        super::super::npc_subject::subject_fact(
                            state,
                            actor,
                            &names,
                            subject.clone(),
                            budget,
                        )
                    })
                    .transpose()?,
            );
        }
        Ok(Self {
            documents: mind
                .documents
                .iter()
                .map(|d| MaintenanceDocument {
                    id: d.id.clone(),
                    revision: d.revision,
                })
                .collect(),
            records: mind.records.clone(),
            subjects,
            last_dream_episode: mind.last_dream_episode.clone(),
            _storage: storage,
        })
    }
}
