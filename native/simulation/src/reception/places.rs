//! Static authored places are indexed by their real landmark, not scanned for
//! every observer. Learning keeps an immutable private exposure; current place
//! presence and headings independently require the current physical marker.
use crate::geometry::GeometryMap;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::{InstallError, RetainedMap, SpatialSettings, reserve_typed_parse};
use crate::simulation::PhysicalState;
use crate::state::{Entity, Placement, SurfacePoint};
use crate::text::JsText;
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::Deserialize;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InstalledPlace {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub label: JsText,
    pub description: JsText,
    pub point: SurfacePoint,
    pub landmark_id: String,
    pub exposure: PlaceExposure,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
}
#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum PlaceExposureKind {
    ArriveAndSee,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PlaceExposure {
    kind: PlaceExposureKind,
    pub radius: f64,
    pub importance: f64,
}
impl HeapBytes for InstalledPlace {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.heap_bytes()?,
            self.label.heap_bytes()?,
            self.description.heap_bytes()?,
            self.point.heap_bytes()?,
            self.landmark_id.heap_bytes()?,
            self.mechanism_fields.heap_bytes()?,
        ])
    }
}
pub(crate) struct InstalledPlaces {
    definitions: IndexMap<String, InstalledPlace>,
    landmarks: IndexMap<String, Vec<usize>>,
    // Installation transfers these bodies to RetainedDefinitions' one resident
    // owner before releasing the temporary admission, including on refusal.
    preparation: Option<ByteReservation>,
}
impl HeapBytes for InstalledPlaces {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.definitions.heap_bytes()?, self.landmarks.heap_bytes()?])
    }
}
fn valid_text(text: &JsText, maximum: usize) -> bool {
    text.units_len() <= maximum && !text.trim_is_empty()
}
impl InstalledPlaces {
    pub(crate) fn install(places: &RetainedMap, budget: &ByteBudget) -> Result<Self, InstallError> {
        let count = places.len();
        let mut preparation = budget
            .reserve(
                heap_sum([
                    map_storage::<String, InstalledPlace>(
                        count.checked_mul(2).ok_or(InstallError::Capacity)?,
                    )
                    .ok_or(InstallError::Capacity)?,
                    map_storage::<String, Vec<usize>>(
                        count.checked_mul(2).ok_or(InstallError::Capacity)?,
                    )
                    .ok_or(InstallError::Capacity)?,
                    count
                        .checked_mul(size_of::<usize>() * 4)
                        .ok_or(InstallError::Capacity)?,
                    places
                        .entries()
                        .try_fold(0usize, |sum, (id, _)| {
                            sum.checked_add(id.len().checked_mul(3)?)
                        })
                        .ok_or(InstallError::Capacity)?,
                ])
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut definitions = IndexMap::new();
        definitions
            .try_reserve(count)
            .map_err(|_| InstallError::Capacity)?;
        for (id, payload) in places.entries() {
            let parsing = reserve_typed_parse::<InstalledPlace>(
                payload,
                size_of::<usize>(),
                Some(size_of::<(String, IndexMap<String, f64>)>()),
                budget,
            )?;
            let place: InstalledPlace =
                serde_json::from_str(payload).map_err(|_| InstallError::CurrentFormat)?;
            if id != place.id
                || !is_safe_record_id(id)
                || place.revision == 0
                || !valid_text(&place.label, 160)
                || !valid_text(&place.description, 2000)
                || !is_safe_record_id(&place.landmark_id)
                || ![
                    place.point.x,
                    place.point.y,
                    place.point.z,
                    place.exposure.radius,
                    place.exposure.importance,
                ]
                .into_iter()
                .all(f64::is_finite)
                || place.exposure.radius <= 0.0
                || !(0.0..=10.0).contains(&place.exposure.importance)
                || place.mechanism_fields.as_ref().is_some_and(|owners| {
                    owners.iter().any(|(owner, fields)| {
                        !is_safe_record_id(owner)
                            || fields
                                .iter()
                                .any(|(key, value)| !is_safe_record_id(key) || !value.is_finite())
                    })
                })
            {
                return Err(InstallError::CurrentFormat);
            }
            preparation
                .merge(parsing)
                .map_err(|_| InstallError::Capacity)?;
            definitions.insert(id.to_owned(), place);
        }
        // Object.values puts numeric IDs first while preserving insertion order
        // for the remaining authored definitions.
        definitions.sort_by(|a, _, b, _| crate::encoding::js_property_cmp(a, b));
        let mut landmarks: IndexMap<String, Vec<usize>> = IndexMap::new();
        landmarks
            .try_reserve(count)
            .map_err(|_| InstallError::Capacity)?;
        for (ordinal, place) in definitions.values().enumerate() {
            let ordinals = landmarks.entry(place.landmark_id.clone()).or_default();
            ordinals
                .try_reserve(1)
                .map_err(|_| InstallError::Capacity)?;
            ordinals.push(ordinal);
        }
        let mut result = Self {
            definitions,
            landmarks,
            preparation: None,
        };
        preparation
            .resize(result.heap_bytes().ok_or(InstallError::Capacity)?)
            .map_err(|_| InstallError::Capacity)?;
        result.preparation = Some(preparation);
        Ok(result)
    }
    pub(crate) fn finish_install(&mut self) {
        self.preparation = None;
    }
    pub(crate) fn get(&self, id: &str) -> Option<&InstalledPlace> {
        self.definitions.get(id)
    }
    pub(crate) fn validate_physical(
        &self,
        physical: &PhysicalState,
        geometry: &GeometryMap,
        settings: &SpatialSettings,
    ) -> Result<(), InstallError> {
        for place in self.definitions.values() {
            let point = &place.point;
            let surface = geometry
                .spatial
                .surfaces
                .iter()
                .find(|surface| surface.id == point.surface_id)
                .ok_or(InstallError::CurrentFormat)?;
            let height = surface.y
                + (point.x - surface.min_x) * surface.slope_x
                + (point.z - surface.min_z) * surface.slope_z;
            let tile = (point.z.round() >= 0.0 && point.x.round() >= 0.0)
                .then(|| {
                    geometry
                        .tiles
                        .get(point.z.round() as usize)
                        .and_then(|row| row.get(point.x.round() as usize))
                })
                .flatten();
            if [point.x, point.y, point.z]
                .into_iter()
                .any(|coordinate| coordinate.abs() > settings.max_extent)
                || point.x < surface.min_x - settings.epsilon
                || point.x > surface.max_x + settings.epsilon
                || point.z < surface.min_z - settings.epsilon
                || point.z > surface.max_z + settings.epsilon
                || (height - point.y).abs() > settings.support_tolerance
                || (surface.terrain == Some(true)
                    && (point.x < 0.0
                        || point.z < 0.0
                        || point.x > geometry.width.saturating_sub(1) as f64
                        || point.z > geometry.height.saturating_sub(1) as f64
                        || tile
                            .and_then(|tile| geometry.terrain.get(tile))
                            .is_none_or(|terrain| !terrain.walkable)))
                || physical
                    .entities
                    .get(&place.landmark_id)
                    .is_some_and(|landmark| landmark.actor.is_some())
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(())
    }
    pub(crate) fn eligible<'a, I>(
        &'a self,
        physical: &'a PhysicalState,
        observer: &'a Entity,
        visible: I,
    ) -> impl Iterator<Item = &'a InstalledPlace> + 'a
    where
        I: IntoIterator<Item = &'a str>,
        I::IntoIter: 'a,
    {
        visible
            .into_iter()
            .flat_map(move |id| {
                self.landmarks
                    .get(id)
                    .into_iter()
                    .flatten()
                    .filter_map(|ordinal| {
                        self.definitions.get_index(*ordinal).map(|(_, place)| place)
                    })
            })
            .filter(move |place| place.exposed_to(physical, observer))
    }
    pub(crate) fn current_observation(
        &self,
        exposure: &super::EncounterExposure,
        physical: &PhysicalState,
    ) -> bool {
        let super::EncounterExposure::Place {
            id,
            revision,
            label,
            description,
            point,
            landmark_id,
            reported_by,
            ..
        } = exposure
        else {
            return false;
        };
        self.get(id).is_some_and(|place| {
            place.revision == *revision
                && place.label == *label
                && place.description == *description
                && place.point == *point
                && place.landmark_id == *landmark_id
                && (reported_by.is_some() || place.landmark_at_place(physical))
        })
    }
}
fn world_support(entity: &Entity) -> Option<&str> {
    match &entity.placement {
        Some(Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_deref(),
        _ => None,
    }
}
impl InstalledPlace {
    fn landmark_at_place(&self, physical: &PhysicalState) -> bool {
        physical
            .entities
            .get(&self.landmark_id)
            .filter(|landmark| landmark.actor.is_none())
            .is_some_and(|landmark| {
                world_support(landmark) == Some(self.point.surface_id.as_str())
                    && landmark.world_position().is_some_and(|point| {
                        crate::spatial::distance(point, self.point.point()) <= self.exposure.radius
                    })
            })
    }
    fn exposed_to(&self, physical: &PhysicalState, observer: &Entity) -> bool {
        world_support(observer) == Some(self.point.surface_id.as_str())
            && observer.world_position().is_some_and(|point| {
                crate::spatial::distance(point, self.point.point()) <= self.exposure.radius
            })
            && self.landmark_at_place(physical)
    }
}
