//! One pure formatting batch over actual selected facts. Returned descriptions
//! remain text; the matching commands never leave their native offer owner.
use super::*;
use crate::reception::AttributeView;
use crate::state::Named;
use crate::text::JsText;

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
pub(crate) struct NpcDescriptionsRequest {
    pub binding: GeometryBinding,
    json: String,
    _storage: ByteReservation,
}
impl Serialize for NpcDescriptionsRequest {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(&self.json).map_err(serde::ser::Error::custom)?;
        raw.serialize(serializer)
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
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        mut context: DescriptionContext,
        targets: &[Target],
        offers: &[PreparedNpcOffer],
        activity: &NpcActivityRead,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        for body in &mut context.bodies {
            body.visible = targets
                .binary_search_by_key(&body.ordinal, |target| target.body)
                .ok()
                .is_some_and(|index| targets[index].visible);
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Offer<'a> {
            id: &'a str,
            meaning: &'a NpcOfferMeaning,
            transition: WorkTransitionMode,
            has_command: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            temporary: Option<&'a Outcome>,
            #[serde(skip_serializing_if = "Option::is_none")]
            next_at: Option<f64>,
        }
        struct Offers<'a>(&'a [PreparedNpcOffer]);
        impl Serialize for Offers<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeSeq;
                let mut out = serializer.serialize_seq(Some(self.0.len()))?;
                for offer in self.0 {
                    out.serialize_element(&Offer {
                        id: &offer.id,
                        meaning: &offer.meaning,
                        transition: offer.transition,
                        has_command: offer.command.is_some(),
                        temporary: offer.temporary.as_ref(),
                        next_at: offer.next_at,
                    })?;
                }
                out.end()
            }
        }
        #[derive(Serialize)]
        struct Input<'a, D: Serialize> {
            binding: GeometryBinding,
            #[serde(rename = "self")]
            myself: &'a Myself,
            bodies: &'a [Body],
            offers: Offers<'a>,
            #[serde(rename = "activityLabels")]
            activity_labels: &'a [activity::ActivityLabel],
            definitions: D,
        }
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let input = Input {
            binding,
            myself: &context.myself,
            bodies: &context.bodies,
            offers: Offers(offers),
            activity_labels: &activity.labels,
            definitions: super::super::definitions::choice_description_definitions(
                &core.state.installed,
            ),
        };
        let length =
            crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
        let mut storage = budget.reserve(
            length
                .checked_mul(2)
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let json = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
        storage.resize(json.capacity() + size_of::<Self>())?;
        Ok(Self {
            binding,
            json,
            _storage: storage,
        })
    }
}
