//! A selected personal-account request retains its actual preparation frame.
//! Later body loss does not rewrite that frame into a different observation.
use super::*;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MaintenancePresentation {
    world_id: String,
    generation: String,
    actor_id: String,
    accepted_cut: u64,
    position: crate::state::Point,
    heading: f64,
    support_surface_id: Option<String>,
    reference_attribution: crate::records::SqlCell,
    forgotten: Vec<String>,
    corrected: Vec<String>,
    #[serde(skip)]
    _storage: ByteReservation,
}
impl MaintenancePresentation {
    pub(crate) fn capture(
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let history = state
            .experience
            .actor(actor)
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        let reference = if let Some((lease, _)) = names.current_body_grant(actor)? {
            Some(lease)
        } else if names.recognizes_subject(actor)? {
            Some("known")
        } else {
            None
        };
        let support = match entity.placement.as_ref() {
            Some(crate::state::Placement::World {
                support_surface_id, ..
            }) => support_surface_id.as_deref(),
            _ => None,
        };
        let bytes = size_of::<Self>()
            .checked_add(state.physical.header.id.len())
            .and_then(|n| n.checked_add(state.generation.len()))
            .and_then(|n| n.checked_add(actor.len()))
            .and_then(|n| n.checked_add(support.map_or(0, str::len)))
            .and_then(|n| n.checked_add(reference.map_or(0, |text| text.len() * 2)))
            .and_then(|n| {
                n.checked_add(
                    history
                        .privacy
                        .forgotten()
                        .chain(history.privacy.corrections().keys())
                        .try_fold(0usize, |n, s| n.checked_add(s.len() + size_of::<String>()))?,
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok(Self {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            actor_id: actor.into(),
            accepted_cut: state.accepted_cut,
            position: entity
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            heading: entity.spatial.heading,
            support_surface_id: support.map(str::to_owned),
            reference_attribution: reference.map_or_else(
                || state.physical.header.sequence.into(),
                crate::records::SqlCell::from,
            ),
            forgotten: history.privacy.forgotten().cloned().collect(),
            corrected: history.privacy.corrections().keys().cloned().collect(),
            _storage: storage,
        })
    }
}
