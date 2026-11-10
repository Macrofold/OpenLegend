//! One receiver's bounded current data and genuine native grant ordinals.
//! Formatting does not discover physical state or manufacture an evidence cut.
use super::*;
use crate::host::retained_size::heap_sum;
use crate::reception::{
    CurrentContact, CurrentNativeFacet, OwnedSceneBody, PerceptionEvidenceOwner, ReceivedSceneRead,
    current_group_native_facet, visit_current_value_references,
};
use serde::ser::{SerializeMap, SerializeSeq};

pub(crate) struct NpcCurrentCapture {
    json: String,
    pub(super) attention: crate::reception::CapturedAttentionPresentations,
    _storage: ByteReservation,
}
impl Serialize for NpcCurrentCapture {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(&self.json).map_err(serde::ser::Error::custom)?;
        raw.serialize(serializer)
    }
}
pub(crate) struct PreparedNpcCurrent {
    pub capture: NpcCurrentCapture,
    pub current: Vec<OwnedCurrentFacet>,
    pub backing: ByteReservation,
}
struct CurrentOwner<'a>(&'a PerceptionEvidenceOwner);
struct Contacts<'a>(&'a indexmap::IndexMap<String, CurrentContact>);
impl Serialize for Contacts<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(Some(self.0.len()))?;
        for (id, contact) in self.0 {
            out.serialize_element(&(id, contact))?;
        }
        out.end()
    }
}
impl Serialize for CurrentOwner<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let owner = self.0;
        let mut out = serializer.serialize_map(None)?;
        out.serialize_entry("life", &owner.life)?;
        if let Some(observer) = &owner.observer {
            out.serialize_entry("observer", observer)?;
        }
        if let Some(phase) = &owner.visual_confirmation {
            out.serialize_entry("visualConfirmation", phase)?;
        }
        if let Some(motions) = &owner.motion_samples {
            out.serialize_entry("motionSamples", motions)?;
        }
        out.serialize_entry("contacts", &Contacts(&owner.current))?;
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Observer<'a> {
    actor_id: &'a str,
    physical_life: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Grant<'a> {
    source_id: &'a str,
    original: &'a str,
    exposure: &'a str,
    channel: &'a crate::values::DefinitionPin,
    field_id: &'a str,
    ordinal: usize,
}
impl<'a> Grant<'a> {
    fn new(source_id: &'a str, field: CurrentNativeFacet<'a>, ordinal: usize) -> Self {
        Self {
            source_id,
            original: &field.grant.original,
            exposure: &field.grant.exposure,
            channel: &field.grant.channel,
            field_id: &field.field.id,
            ordinal,
        }
    }
}
struct Values<'a> {
    ids: &'a [&'a str],
    values: Option<&'a crate::received::ReceivedValues>,
}
struct SceneBodies<'a>(&'a [std::sync::Arc<OwnedSceneBody>]);
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SceneBinding<'a> {
    source_id: &'a str,
    lease_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    subject: Option<ObserverSubject>,
    #[serde(skip_serializing_if = "Option::is_none")]
    episode: Option<&'a str>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HistoryWindow<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    released_through: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recording_gap: Option<&'a crate::received::CoverageGap>,
}
impl Serialize for SceneBodies<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(Some(self.0.len()))?;
        for body in self.0 {
            out.serialize_element(&body.value)?;
        }
        out.end()
    }
}
impl Serialize for Values<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Value<'a> {
            value: &'a crate::received::ReceivedValueFragment,
        }
        let mut out = serializer.serialize_map(Some(self.ids.len()))?;
        for id in self.ids {
            let value = self
                .values
                .and_then(|values| values.shared_value(id))
                .ok_or_else(|| serde::ser::Error::custom("current value closure is unavailable"))?;
            out.serialize_entry(id, &Value { value })?;
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    observer: Observer<'a>,
    at: f64,
    privacy_revision: u64,
    last_included_order: u64,
    state: Option<CurrentOwner<'a>>,
    values: Values<'a>,
    grants: &'a [Grant<'a>],
    body_grants: &'a [&'a str],
    scene_bodies: SceneBodies<'a>,
    nonlocalized: usize,
    attention: &'a serde_json::value::RawValue,
    scene_bindings: &'a [SceneBinding<'a>],
    handle_attributions: &'a [(&'a str, OwnReferenceAttribution<'a>)],
    history: HistoryWindow<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    receipt_prefix: Option<&'a crate::received::TemporalReceiptPrefix<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    receipt_tail_request: Option<&'a crate::received::TemporalReceiptTailRequest<'a>>,
}

pub(crate) fn prepare(
    state: &SimulationState,
    actor_id: &str,
    scope: Option<&CurrentBodyReadScope<'_>>,
    names: &InstalledPersonalNameReader<'_>,
    first_ordinal: usize,
    budget: &ByteBudget,
) -> Result<PreparedNpcCurrent, ExecutionError> {
    let actor = state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?;
    let owner = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(actor_id));
    let mut references = 0usize;
    let mut overflow = false;
    if let Some(owner) = owner {
        visit_current_value_references(owner, &mut |_| {
            if let Some(next) = references.checked_add(1) {
                references = next;
            } else {
                overflow = true;
            }
        });
    }
    if overflow {
        return Err(ExecutionError::Capacity);
    }
    let fields = owner
        .map_or(Some(0), |owner| {
            owner.current.values().try_fold(0usize, |n, contact| {
                contact
                    .content
                    .groups
                    .iter()
                    .try_fold(n, |n, group| n.checked_add(group.received.fields.len()))
            })
        })
        .ok_or(ExecutionError::Capacity)?;
    let contacts = owner.map_or(0, |owner| owner.current.len());
    let handle_count = contacts
        .checked_add(
            owner
                .and_then(|owner| owner.attention.as_ref())
                .map_or(0, |attention| attention.annotations.len()),
        )
        .and_then(|n| n.checked_add(1))
        .ok_or(ExecutionError::Capacity)?;
    let mut backing = budget.reserve(
        heap_sum([
            references
                .checked_mul(size_of::<&str>())
                .ok_or(ExecutionError::Capacity)?,
            fields
                .checked_mul(size_of::<Grant<'_>>() + size_of::<OwnedCurrentFacet>())
                .ok_or(ExecutionError::Capacity)?,
            contacts
                .checked_mul(
                    2 * size_of::<&str>()
                        + size_of::<std::sync::Arc<OwnedSceneBody>>()
                        + size_of::<SceneBinding<'_>>(),
                )
                .ok_or(ExecutionError::Capacity)?,
            handle_count
                .checked_mul(size_of::<&str>() + size_of::<(&str, OwnReferenceAttribution<'_>)>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut ids = Vec::new();
    ids.try_reserve_exact(references)
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some(owner) = owner {
        visit_current_value_references(owner, &mut |id| ids.push(id));
    }
    ids.sort_unstable_by(|a, b| crate::encoding::js_string_cmp(a, b));
    ids.dedup();
    let mut grants = Vec::new();
    grants
        .try_reserve_exact(fields)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut current = Vec::new();
    current
        .try_reserve_exact(fields)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut bodies = Vec::new();
    bodies
        .try_reserve_exact(contacts)
        .map_err(|_| ExecutionError::Capacity)?;
    if let (Some(owner), Some(scope)) = (owner, scope) {
        for (id, contact) in &owner.current {
            if scope.native_body(id)?.is_some() {
                bodies.push(id.as_str());
            }
            for group in &contact.content.groups {
                let first = group
                    .received
                    .fields
                    .keys()
                    .find(|kind| kind.as_str() != "association")
                    .or_else(|| group.received.fields.keys().next());
                let Some(first) = first else {
                    continue;
                };
                let original = contact
                    .content
                    .originals
                    .get(&group.received.grant.original)
                    .ok_or(ExecutionError::Invariant)?;
                let first = current_group_native_facet(group, original, first, None)
                    .ok_or(ExecutionError::Invariant)?;
                if !scope.lease_eligible(first, true)? {
                    continue;
                }
                for kind in group.received.fields.keys() {
                    let input = current_group_native_facet(group, original, kind, None)
                        .ok_or(ExecutionError::Invariant)?;
                    if kind == "association" && !scope.lease_eligible(input, true)? {
                        continue;
                    }
                    let ordinal = first_ordinal
                        .checked_add(current.len())
                        .ok_or(ExecutionError::Capacity)?;
                    current.push(scope.capture_input(input, kind, budget)?);
                    grants.push(Grant::new(id, input, ordinal));
                }
            }
        }
    }
    let mut scene_ids = Vec::new();
    scene_ids
        .try_reserve_exact(contacts)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut scene_bodies = Vec::new();
    scene_bodies
        .try_reserve_exact(contacts)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut scene_bindings = Vec::new();
    scene_bindings
        .try_reserve_exact(contacts)
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some(mut scene) = ReceivedSceneRead::prepare(state, actor_id, budget)? {
        scene_ids.extend(scene.source_ids());
        for id in scene_ids {
            if let Some(body) = scene.body(id, budget)? {
                scene_bodies.push(body);
                if let Some(scope) = scope {
                    if let Some(grant) = scope.native_body(id)? {
                        let individual = names.current_body_identity(id)?;
                        let association = scope.association(id)?;
                        let copied = heap_sum([
                            id.len(),
                            grant.field.id.len(),
                            grant
                                .field
                                .local_subject
                                .heap_bytes()
                                .ok_or(ExecutionError::Capacity)?,
                            association
                                .map_or(Some(0), HeapBytes::heap_bytes)
                                .ok_or(ExecutionError::Capacity)?,
                            individual
                                .and_then(|value| value.individual_id.as_ref())
                                .map_or(0, String::len),
                            individual.map_or(0, |value| {
                                value.given_name.storage_bytes()
                                    + value
                                        .nickname
                                        .as_ref()
                                        .map_or(0, crate::text::JsText::storage_bytes)
                            }),
                        ])
                        .ok_or(ExecutionError::Capacity)?;
                        // Subject choice can quote both local and association
                        // note keys before cloning the selected subject.
                        backing.resize(
                            backing
                                .bytes()
                                .checked_add(
                                    copied
                                        .checked_mul(6)
                                        .and_then(|n| n.checked_add(128))
                                        .ok_or(ExecutionError::Capacity)?,
                                )
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let subject = names.current_body_subject(id)?.or_else(|| {
                            state
                                .physical
                                .entities
                                .get(id)
                                .filter(|entity| entity.actor.is_none())
                                .map(|_| ObserverSubject::Entity {
                                    entity_id: id.to_owned(),
                                })
                        });
                        scene_bindings.push(SceneBinding {
                            source_id: id,
                            lease_id: &grant.field.id,
                            subject,
                            episode: state
                                .reception
                                .perception_episodes
                                .as_ref()
                                .and_then(|owners| owners.get(actor_id))
                                .and_then(|episodes| episodes.get(id))
                                .map(String::as_str),
                        });
                    }
                }
            }
        }
    }
    let nonlocalized = owner
        .filter(|owner| owner.life == actor.physical_life.unwrap_or(0))
        .map_or(0, |owner| {
            owner
                .received
                .iter()
                .filter(|original| {
                    original
                        .facets
                        .iter()
                        .any(|facet| facet.value.kind == "sound")
                        && !original
                            .facets
                            .iter()
                            .any(|facet| facet.value.kind == "location")
                })
                .count()
        });
    let attention_read = crate::reception::capture_attention_read(state, actor_id, budget)?;
    let attention = serde_json::from_str::<&serde_json::value::RawValue>(&attention_read.json)
        .map_err(|_| ExecutionError::Invariant)?;
    let mut handle_ids = Vec::new();
    handle_ids
        .try_reserve_exact(handle_count)
        .map_err(|_| ExecutionError::Capacity)?;
    handle_ids.push(actor_id);
    if let Some(owner) = owner {
        handle_ids.extend(owner.current.keys().map(String::as_str));
        if let Some(attention) = &owner.attention {
            handle_ids.extend(
                attention
                    .annotations
                    .values()
                    .map(|annotation| annotation.source_id.as_str()),
            );
        }
    }
    handle_ids.sort_unstable_by(|a, b| crate::encoding::js_string_cmp(a, b));
    handle_ids.dedup();
    let mut handle_attributions = Vec::new();
    handle_attributions
        .try_reserve_exact(handle_count)
        .map_err(|_| ExecutionError::Capacity)?;
    for id in handle_ids {
        let grant = scope
            .map(|scope| scope.native_body(id))
            .transpose()?
            .flatten();
        let attribution = if let Some(body) = grant {
            OwnReferenceAttribution::Received(&body.field.id)
        } else if names.recognizes_subject(id)? {
            OwnReferenceAttribution::Received("known")
        } else {
            OwnReferenceAttribution::Sequence(state.physical.header.sequence)
        };
        handle_attributions.push((id, attribution));
    }
    let (receipt_prefix, receipt_tail_request) = match state
        .temporal
        .receipt_prefix(actor_id, state.physical.identity.next_id())
    {
        Ok(prefix) => (Some(prefix), None),
        Err(request) => (None, Some(request)),
    };
    let product = Product {
        observer: Observer {
            actor_id,
            physical_life: actor.physical_life.unwrap_or(0),
        },
        at: state.physical.header.sim_time,
        privacy_revision: state
            .experience
            .actor(actor_id)
            .map_or(0, |actor| actor.privacy.revision()),
        last_included_order: state.occurrences.last_hot_order(),
        state: owner.map(CurrentOwner),
        values: Values {
            ids: &ids,
            values: state.reception.received_values.as_ref(),
        },
        grants: &grants,
        body_grants: &bodies,
        scene_bodies: SceneBodies(&scene_bodies),
        nonlocalized,
        attention,
        scene_bindings: &scene_bindings,
        handle_attributions: &handle_attributions,
        history: HistoryWindow {
            released_through: state
                .temporal
                .actor(actor_id)
                .and_then(|actor| actor.header().released_through),
            recording_gap: state
                .temporal
                .actor(actor_id)
                .and_then(|actor| actor.header().recording_gap.as_ref()),
        },
        receipt_prefix: receipt_prefix.as_ref(),
        receipt_tail_request: receipt_tail_request.as_ref(),
    };
    let length =
        crate::encoding::json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let json = crate::encoding::json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(json.capacity())?;
    Ok(PreparedNpcCurrent {
        capture: NpcCurrentCapture {
            json,
            attention: attention_read.presentations,
            _storage: storage,
        },
        current,
        backing,
    })
}
