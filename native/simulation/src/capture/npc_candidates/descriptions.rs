//! One pure formatting batch over actual selected facts. Returned descriptions
//! remain text; the matching commands never leave their native offer owner.
use super::*;
use crate::reception::AttributeView;
use crate::state::Named;
use crate::text::JsText;
use std::sync::Arc;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Myself {
    name: crate::worlds::OwnedPersonalName,
    position: Point,
    has_action: bool,
    health: Option<AttributeView>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Body {
    ordinal: usize,
    source_id: String,
    name: Named,
    position: Point,
    visible: bool,
    health: Option<AttributeView>,
}
pub(super) struct DescriptionContext {
    myself: Myself,
    bodies: Vec<Body>,
    _storage: ByteReservation,
}
impl DescriptionContext {
    pub(super) fn observed_name(&self, ordinal: usize) -> Option<&JsText> {
        let index = self
            .bodies
            .binary_search_by_key(&ordinal, |body| body.ordinal)
            .ok()?;
        Some(&self.bodies[index].name.name)
    }

    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        read: &AcceptedActorRead,
        selected: &[usize],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&read.perception.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let attributes = crate::status::project_attributes(
            entity,
            &core.state.installed.attributes,
            core.state.physical.pending_values.as_ref(),
            crate::status::AttributeAudience::Owner,
            budget,
        )?;
        let health = attributes
            .rows()
            .iter()
            .find(|attribute| attribute.body_health.is_some());
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            &read.perception.actor_id,
        )?;
        let name = names.capture_observer_name(&read.perception.actor_id, budget)?;
        let mut storage = budget.reserve(
            selected
                .len()
                .checked_mul(size_of::<Body>())
                .and_then(|n| n.checked_add(health.map_or(Some(0), HeapBytes::heap_bytes)?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut bodies = Vec::with_capacity(selected.len());
        for &ordinal in selected {
            let binding = read
                .perception
                .bodies
                .get(ordinal)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            let values = &read.perception.evidence.cut().current
                [binding.first..binding.first + binding.count];
            let observed = values
                .iter()
                .find_map(|value| match &value.value {
                    SensoryFacet::Body { body } => Some(body),
                    _ => None,
                })
                .ok_or(ExecutionError::Invariant)?;
            let health = values.iter().find_map(|value| match &value.value {
                SensoryFacet::PublicAttributes { attributes } => attributes
                    .iter()
                    .find(|attribute| attribute.body_health.is_some()),
                _ => None,
            });
            storage.resize(
                storage
                    .bytes()
                    .checked_add(binding.source_id.len())
                    .and_then(|n| n.checked_add(binding.name.name().heap_bytes()?))
                    .and_then(|n| n.checked_add(health.map_or(Some(0), HeapBytes::heap_bytes)?))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            bodies.push(Body {
                ordinal,
                source_id: binding.source_id.clone(),
                name: binding.name.name().clone(),
                position: observed.position,
                visible: false,
                health: health.cloned(),
            });
        }
        Ok(Self {
            myself: Myself {
                name,
                position: entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                has_action: actor.action.is_some(),
                health: health.cloned(),
            },
            bodies,
            _storage: storage,
        })
    }
}
/// Formatting gets one authorized, immutable capture. The command bodies
/// stay in their original catalogue. Only the Node consumer asks for JSON.
pub struct NpcDescriptionsRequest {
    pub(crate) binding: GeometryBinding,
    context: DescriptionContext,
    offers: Vec<NpcDescriptionOffer>,
    activity_labels: Vec<crate::capture::NpcActivityLabel>,
    installed: Arc<crate::simulation::InstalledWorld>,
    storage: ByteReservation,
}

pub struct NpcDescriptionSubject<'a> {
    pub name: &'a Named,
    pub position: Point,
    pub visible: bool,
    pub health: Option<&'a AttributeView>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcDescriptionOffer {
    id: String,
    pub meaning: NpcOfferMeaning,
    pub transition: WorkTransitionMode,
    pub has_command: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporary: Option<Outcome>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_at: Option<f64>,
}

impl Serialize for NpcDescriptionsRequest {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut output = serializer.serialize_struct("NpcDescriptions", 6)?;
        output.serialize_field("binding", &self.binding)?;
        output.serialize_field("self", &self.context.myself)?;
        output.serialize_field("bodies", &self.context.bodies)?;
        output.serialize_field("offers", &self.offers)?;
        output.serialize_field("activityLabels", &self.activity_labels)?;
        output.serialize_field(
            "definitions",
            &super::super::definitions::choice_description_definitions(&self.installed),
        )?;
        output.end()
    }
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct NpcDescriptionsAnswer {
    pub binding: GeometryBinding,
    pub descriptions: Vec<JsText>,
    #[serde(rename = "activityLabels")]
    pub activity_labels: Vec<JsText>,
}

impl NpcDescriptionsRequest {
    pub fn offers(&self) -> &[NpcDescriptionOffer] {
        &self.offers
    }

    pub fn activity_labels(&self) -> &[crate::capture::NpcActivityLabel] {
        &self.activity_labels
    }

    pub fn has_action(&self) -> bool {
        self.context.myself.has_action
    }

    pub fn myself(&self) -> NpcDescriptionSubject<'_> {
        let myself = &self.context.myself;
        NpcDescriptionSubject {
            name: myself.name.name(),
            position: myself.position,
            visible: true,
            health: myself.health.as_ref(),
        }
    }

    pub fn subject(&self, ordinal: usize) -> Option<NpcDescriptionSubject<'_>> {
        let index = self
            .context
            .bodies
            .binary_search_by_key(&ordinal, |body| body.ordinal)
            .ok()?;
        let body = &self.context.bodies[index];
        Some(NpcDescriptionSubject {
            name: &body.name,
            position: body.position,
            visible: body.visible,
            health: body.health.as_ref(),
        })
    }

    /// Upper bound on owned working inputs for the formatter. A separate
    /// allowance covers authored output, which can outlive this question.
    pub fn admitted_bytes(&self) -> usize {
        self.storage
            .bytes()
            .saturating_add(self.context._storage.bytes())
            .saturating_add(
                self.context
                    .myself
                    .name
                    .name()
                    .heap_bytes()
                    .unwrap_or(usize::MAX),
            )
    }

    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        mut context: DescriptionContext,
        targets: &[Target],
        offers: &[PreparedNpcOffer],
        activity: &NpcActivityRead,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        use crate::capture::NpcActivityLabel;
        for body in &mut context.bodies {
            body.visible = targets
                .binary_search_by_key(&body.ordinal, |target| target.body)
                .ok()
                .is_some_and(|index| targets[index].visible);
        }
        let bytes = offers.iter().try_fold(
            size_of::<Self>() + 2 * size_of::<usize>(),
            |bytes, offer| {
                let meaning = match &offer.meaning {
                    NpcOfferMeaning::Continuation { action_type, .. } => {
                        action_type.heap_bytes()?
                    }
                    _ => 0,
                };
                bytes
                    .checked_add(size_of::<NpcDescriptionOffer>())?
                    .checked_add(offer.id.len())?
                    .checked_add(meaning)?
                    .checked_add(offer.temporary.heap_bytes()?)
            },
        );
        let bytes = activity.labels.iter().try_fold(
            bytes.ok_or(ExecutionError::Capacity)?,
            |bytes, label| {
                let heap = match label {
                    NpcActivityLabel::CampOwn => Some(0),
                    NpcActivityLabel::Hands { label } => label.heap_bytes(),
                    NpcActivityLabel::Person { name } => name.heap_bytes(),
                };
                bytes
                    .checked_add(size_of::<NpcActivityLabel>())
                    .and_then(|n| n.checked_add(heap?))
                    .ok_or(ExecutionError::Capacity)
            },
        )?;
        let storage = budget.reserve(bytes)?;
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        Ok(Arc::new(Self {
            binding,
            context,
            offers: offers
                .iter()
                .map(|offer| NpcDescriptionOffer {
                    id: offer.id.clone(),
                    meaning: offer.meaning.clone(),
                    transition: offer.transition,
                    has_command: offer.command.is_some(),
                    temporary: offer.temporary.clone(),
                    next_at: offer.next_at,
                })
                .collect(),
            activity_labels: activity.labels.clone(),
            installed: Arc::clone(&core.state.installed),
            storage,
        }))
    }
}
