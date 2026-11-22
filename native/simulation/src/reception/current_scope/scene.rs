//! A compatible received-body catalogue, with scalar geometry materialized only
//! for selected relation/context inputs. Target coordinates always come from
//! held received values; physical state supplies only the Source revision fence.
use super::*;
use crate::simulation::SimulationState;
use indexmap::IndexMap;
use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BodyGeometry {
    pub position: Point,
    pub radius: f64,
    pub height: f64,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GeometrySample {
    pub value_measured_from: f64,
    pub value_measured_through: f64,
    pub value_supported_from: f64,
    pub value_supported_through: f64,
    #[serde(serialize_with = "fact")]
    pub fact: ObservationFactKey,
}
fn fact<S: serde::Serializer>(value: &ObservationFactKey, s: S) -> Result<S::Ok, S::Error> {
    original_fact_view(value).serialize(s)
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocationGeometrySample {
    #[serde(flatten)]
    pub sample: GeometrySample,
    pub location: ObservedLocation,
}
pub(crate) struct SceneQueryBody<'a> {
    pub geometry: crate::reception::received_separation::Body,
    pub location_id: &'a str,
}
#[derive(Clone, Serialize)]
pub(crate) struct BodyMotion {
    pub earlier: LocationGeometrySample,
    pub later: LocationGeometrySample,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReceivedSceneBody {
    pub source_id: String,
    pub track: String,
    pub body: BodyGeometry,
    pub sample: GeometrySample,
    pub location: LocationGeometrySample,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion: Option<BodyMotion>,
}
impl HeapBytes for GeometrySample {
    fn heap_bytes(&self) -> Option<usize> {
        self.fact.heap_bytes()
    }
}
impl HeapBytes for LocationGeometrySample {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.sample.heap_bytes()?, self.location.heap_bytes()?])
    }
}
impl HeapBytes for BodyMotion {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.earlier.heap_bytes()?, self.later.heap_bytes()?])
    }
}
impl HeapBytes for ReceivedSceneBody {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.source_id.capacity(),
            self.track.capacity(),
            self.sample.heap_bytes()?,
            self.location.heap_bytes()?,
            self.motion.heap_bytes()?,
        ])
    }
}
pub(crate) struct OwnedSceneBody {
    pub value: ReceivedSceneBody,
    _reservation: ByteReservation,
}
struct SceneSlot {
    track: String,
    body: Option<Arc<OwnedSceneBody>>,
}
pub(crate) struct ReceivedSceneRead<'a> {
    scope: CurrentBodyReadScope<'a>,
    slots: IndexMap<&'a str, SceneSlot>,
    now: f64,
    _reservation: ByteReservation,
}
impl<'a> ReceivedSceneRead<'a> {
    pub(crate) fn prepare(
        state: &'a SimulationState,
        observer: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ReceivedError> {
        let Some(scope) = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            observer,
        )?
        else {
            return Ok(None);
        };
        let count = scope.owner.current.len();
        let mut bytes = heap_sum([
            size_of::<Self>(),
            crate::host::retained_size::map_storage::<&str, SceneSlot>(count)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        for contact in scope.owner.current.values() {
            for group in &contact.content.groups {
                bytes = bytes
                    .checked_add(
                        crate::encoding::json_record_len(&(
                            &group.received.grant.exposure,
                            &group.received.grant.channel.id,
                            group.received.grant.channel.version,
                            &group.received.grant.channel.digest,
                        ))
                        .map_err(|_| unavailable())?,
                    )
                    .ok_or_else(capacity)?;
            }
        }
        let reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let ordered = scope.ordered_subjects(budget)?;
        let mut slots = IndexMap::with_capacity(count);
        for id in ordered.ids() {
            let Some(body) = scope.native_body(id)? else {
                continue;
            };
            if received_body_parts(scope.lookup(), &body.field.value).is_none() {
                continue;
            }
            let Some(location) = scope.native_location(id)? else {
                continue;
            };
            if location_value(&scope, location).is_none() {
                continue;
            }
            let track = received_track_key(&body.grant.exposure, &body.grant.channel)?;
            slots.insert(
                body.grant.subject_id.as_str(),
                SceneSlot { track, body: None },
            );
        }
        Ok(Some(Self {
            scope,
            slots,
            now: state.physical.header.sim_time,
            _reservation: reservation,
        }))
    }
    pub(crate) fn catalogue(&self) -> impl Iterator<Item = (&str, &str)> {
        self.slots.iter().map(|(id, v)| (*id, v.track.as_str()))
    }
    pub(crate) fn source_ids(&self) -> impl Iterator<Item = &'a str> + Clone + '_ {
        self.slots.keys().copied()
    }
    pub(crate) fn body_by_track(
        &mut self,
        track: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<OwnedSceneBody>>, ReceivedError> {
        let id = self
            .slots
            .iter()
            .find(|(_, v)| v.track == track)
            .map(|(id, _)| *id);
        match id {
            Some(id) => self.body(id, budget),
            None => Ok(None),
        }
    }
    pub(crate) fn body(
        &mut self,
        id: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<OwnedSceneBody>>, ReceivedError> {
        let Some(slot) = self.slots.get(id) else {
            return Ok(None);
        };
        if let Some(body) = &slot.body {
            return Ok(Some(Arc::clone(body)));
        }
        let body = self.scope.native_body(id)?.ok_or_else(unavailable)?;
        let location = self.scope.native_location(id)?.ok_or_else(unavailable)?;
        let (details, pose) =
            received_body_parts(self.scope.lookup(), &body.field.value).ok_or_else(unavailable)?;
        let location_value = location_value(&self.scope, location).ok_or_else(unavailable)?;
        let observer = self.scope.owner.observer.as_ref().ok_or_else(unavailable)?;
        let bound = heap_sum([
            size_of::<OwnedSceneBody>() + 2 * size_of::<usize>(),
            id.len(),
            slot.track.len(),
            observer
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(6)
                .ok_or_else(capacity)?,
            descriptor_heap(self.scope.lookup(), &location.field.value)?,
            (body.original_source.id.len() + location.original_source.id.len())
                .checked_mul(6)
                .ok_or_else(capacity)?,
            self.scope
                .owner
                .motion_samples
                .as_ref()
                .and_then(|m| m.get(id))
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or_else(capacity)?
                .checked_mul(4)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bound).map_err(|_| capacity())?;
        let position = match self.scope.value(&location.field.value.reference) {
            Some(ReceivedValueFragment::BodyPose(v)) => v.pose.position,
            _ => pose.position,
        };
        let sample = geometry_sample(&self.scope, body, location, self.now)?;
        let point_sample = geometry_sample(&self.scope, location, location, self.now)?;
        let captured = self.scope.capture_motion(id, self.now, budget)?;
        let motion = match captured.as_ref().map(|v| &v.facet().value) {
            Some(SensoryFacet::ObservedMotion { earlier, later, .. }) => Some(BodyMotion {
                earlier: motion_sample(earlier),
                later: motion_sample(later),
            }),
            _ => None,
        };
        let value = ReceivedSceneBody {
            source_id: id.into(),
            track: slot.track.clone(),
            body: BodyGeometry {
                position,
                radius: details.radius,
                height: details.height,
            },
            sample,
            location: LocationGeometrySample {
                sample: point_sample,
                location: location_value.into_owned(),
            },
            motion,
        };
        drop(captured);
        reservation
            .resize(
                size_of::<OwnedSceneBody>()
                    + 2 * size_of::<usize>()
                    + value.heap_bytes().ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let body = Arc::new(OwnedSceneBody {
            value,
            _reservation: reservation,
        });
        self.slots.get_mut(id).ok_or_else(unavailable)?.body = Some(Arc::clone(&body));
        Ok(Some(body))
    }
}
fn location_value<'a>(
    scope: &'a CurrentBodyReadScope<'_>,
    input: CurrentNativeFacet<'a>,
) -> Option<std::borrow::Cow<'a, ObservedLocation>> {
    match scope.value(&input.field.value.reference)? {
        ReceivedValueFragment::BodyPose(v) => {
            Some(std::borrow::Cow::Owned(ObservedLocation::Point {
                point: ObservedPoint::from(v.pose.position),
                error_radius: 0.0,
            }))
        }
        ReceivedValueFragment::Location(v) => Some(std::borrow::Cow::Borrowed(&v.location)),
        _ => None,
    }
}
fn geometry_sample(
    scope: &CurrentBodyReadScope<'_>,
    input: CurrentNativeFacet<'_>,
    location: CurrentNativeFacet<'_>,
    now: f64,
) -> Result<GeometrySample, ReceivedError> {
    let clocks = scene_clocks(scope, input, location, now)?;
    let observer = received_observation_header(scope.lookup(), input.original_source)?
        .observer
        .clone();
    Ok(GeometrySample {
        value_measured_from: clocks.value_measured_from,
        value_measured_through: clocks.value_measured_through,
        value_supported_from: clocks.value_supported_from,
        value_supported_through: clocks.value_supported_through,
        fact: ObservationFactKey {
            source: EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                id: input.original_source.id.clone(),
                revision: SourceRevision::Number(input.original_source.revision),
                observer,
            },
            ordinal: input.field.original_ordinal,
        },
    })
}

struct SceneClocks {
    value_measured_from: f64,
    value_measured_through: f64,
    value_supported_from: f64,
    value_supported_through: f64,
}

fn scene_clocks(
    scope: &CurrentBodyReadScope<'_>,
    input: CurrentNativeFacet<'_>,
    location: CurrentNativeFacet<'_>,
    now: f64,
) -> Result<SceneClocks, ReceivedError> {
    let times = match effective_current_check(scope.owner, input.grant, input.metadata, false)? {
        Some(check) => current_partition_with_check(input.metadata, check, false)?
            .times
            .expanded(),
        None => input.metadata.times.expanded(),
    };
    let point_times =
        match effective_current_check(scope.owner, location.grant, location.metadata, false)? {
            Some(check) => current_partition_with_check(location.metadata, check, false)?
                .times
                .expanded(),
            None => location.metadata.times.expanded(),
        };
    let unchanged = scope
        .entities
        .get(&input.grant.subject_id)
        .and_then(|e| e.placement.as_ref())
        .is_some_and(|p| match p {
            crate::state::Placement::World { revision, .. } => {
                location.field.source_placement_revision == Some(*revision)
            }
            _ => false,
        });
    Ok(SceneClocks {
        value_measured_from: times.value_measured_from,
        value_measured_through: times.value_measured_through,
        value_supported_from: times
            .value_measured_from
            .max(point_times.value_measured_from),
        value_supported_through: if unchanged {
            now
        } else {
            times
                .value_measured_through
                .max(point_times.confirmed_through)
        },
    })
}

impl<'a> CurrentBodyReadScope<'a> {
    /// Retain only the measured coordinates and time ranges needed to answer
    /// a later query against this exact accepted read. No private transform or
    /// cloned proof enters this scalar summary.
    pub(crate) fn scene_query_body(
        &self,
        body: CurrentNativeFacet<'a>,
        now: f64,
        motion: Option<&CapturedCurrentFacet>,
    ) -> Result<Option<SceneQueryBody<'a>>, ReceivedError> {
        use crate::reception::received_separation::{Body, PointSample, Span};
        let Some(location) = self.location_for_body(&body.grant.subject_id, body)? else {
            return Ok(None);
        };
        let Some((details, pose)) = received_body_parts(self.lookup(), &body.field.value) else {
            return Ok(None);
        };
        let Some(value) = location_value(self, location) else {
            return Ok(None);
        };
        let position = match self.value(&location.field.value.reference) {
            Some(ReceivedValueFragment::BodyPose(value)) => value.pose.position,
            _ => pose.position,
        };
        let span = |clock: SceneClocks| Span {
            from: clock.value_supported_from,
            through: clock.value_supported_through,
        };
        let point = |location: &ObservedLocation| match location {
            ObservedLocation::Point {
                point,
                error_radius,
            } => Some((point.position(), *error_radius)),
            _ => None,
        };
        let measured = |sample: &ReceivedLocationSample| PointSample {
            span: Span {
                from: sample.measured_from,
                through: sample.confirmed_through,
            },
            point: point(&sample.location),
        };
        Ok(Some(SceneQueryBody {
            geometry: Body {
                position,
                extent: crate::spatial::Extent {
                    radius: details.radius,
                    height: details.height,
                },
                span: span(scene_clocks(self, body, location, now)?),
                location: Some(PointSample {
                    span: span(scene_clocks(self, location, location, now)?),
                    point: point(value.as_ref()),
                }),
                motion: motion.and_then(|facet| match &facet.value {
                    SensoryFacet::ObservedMotion { earlier, later, .. } => {
                        Some((measured(earlier), measured(later)))
                    }
                    _ => None,
                }),
            },
            location_id: &location.field.id,
        }))
    }
}
fn motion_sample(input: &ReceivedLocationSample) -> LocationGeometrySample {
    LocationGeometrySample {
        sample: GeometrySample {
            value_measured_from: input.measured_from,
            value_measured_through: input.measured_through,
            value_supported_from: input.measured_from,
            value_supported_through: input.confirmed_through,
            fact: input.original.clone(),
        },
        location: input.location.clone(),
    }
}
