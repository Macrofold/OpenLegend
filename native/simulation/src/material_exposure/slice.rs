//! One weather input, with exposure captured before movement and settled at
//! the same elapsed boundary before endpoint work changes custody.
use super::{ExposedMaterial, ExposureRole};
use crate::{
    execution::{CoreMutation, ExecutionError},
    geometry::rain::{ExposureError, Rectangle, exposure_crossings, incident_exposure},
    host::{ByteBudget, ByteReservation, retained_size::map_storage},
    simulation::SimulationState,
    state::{Entity, EntityHandle, Placement},
    values::AttributeValue,
    weather::IncidentRain,
    work::{WorkMeters, WorkUnit},
};
use indexmap::IndexMap;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct Site {
    root: EntityHandle,
    half_size: [u64; 2],
}

#[derive(Clone, Copy)]
struct ItemSample {
    item: EntityHandle,
    area: usize,
}

struct Area {
    before: Option<Rectangle>,
    elapsed: Option<AreaChange>,
}

struct AreaChange {
    rates: RateSegments,
    process_changed: bool,
}

#[derive(Clone, Copy)]
struct RateSegment {
    seconds: f64,
    incident: f64,
}

enum RateSegments {
    Dry,
    Rain {
        segments: Vec<RateSegment>,
        _storage: ByteReservation,
    },
}

pub(crate) struct MaterialSlice {
    incident: [Option<IncidentRain>; 2],
    end_incident: [Option<IncidentRain>; 2],
    areas: IndexMap<Site, Area>,
    items: Vec<ItemSample>,
    _storage: ByteReservation,
}

impl MaterialSlice {
    /// Take at most one footprint per distinct physical site. Items sharing
    /// an open basket use the same rim regardless of their individual laws.
    pub(crate) fn capture(
        core: &mut CoreMutation<'_>,
        incident: [Option<IncidentRain>; 2],
        end_incident: [Option<IncidentRain>; 2],
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        // Dry stock has no elapsed drying work. Include it at the first rain
        // edge so a stationary open inventory also receives the new process.
        let wet_only = incident.iter().chain(&end_incident).all(Option::is_none);
        let state = &core.state;
        let items = state.inventory.exposure.handles(wet_only);
        if items.is_empty() {
            return Ok(None);
        }
        let count = items.len();
        let bytes = map_storage::<Site, Area>(count)
            .and_then(|bytes| bytes.checked_add(count.checked_mul(size_of::<ItemSample>())?))
            .ok_or(ExecutionError::Capacity)?;
        let _storage = budget.reserve(bytes)?;
        let mut areas = IndexMap::new();
        let mut samples = Vec::new();
        areas
            .try_reserve(count)
            .map_err(|_| ExecutionError::Capacity)?;
        samples
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for handle in items.iter().copied() {
            core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
            let (entity, material) = material_item(state, handle)?;
            let Some(site) = material_site(state, entity, material) else {
                continue;
            };
            let area = match areas.get_index_of(&site) {
                Some(area) => area,
                None => {
                    let before = if wet_only {
                        None
                    } else {
                        let Some(footprint) = site.footprint(state) else {
                            continue;
                        };
                        Some(footprint)
                    };
                    let area = areas.len();
                    areas.insert(
                        site,
                        Area {
                            before,
                            elapsed: None,
                        },
                    );
                    area
                }
            };
            samples.push(ItemSample { item: handle, area });
        }
        // The indexes describe membership. They may have a different dense
        // order after a removal, save/reopen or rejected candidate. Settlement
        // follows Source's root order and then the item's UTF-16 key order.
        let entities = &state.physical.entities;
        let ordering = |sample: &ItemSample| {
            let root = areas
                .get_index(sample.area)
                .and_then(|(site, _)| entities.resolve(site.root));
            let order = root.and_then(|root| entities.ordering(&root.id));
            (
                order,
                entities.resolve(sample.item).map(|item| item.id.as_str()),
            )
        };
        samples.sort_unstable_by(|a, b| {
            let (a_root, a_id) = ordering(a);
            let (b_root, b_id) = ordering(b);
            a_root.cmp(&b_root).then_with(|| {
                a_id.unwrap_or_default()
                    .encode_utf16()
                    .cmp(b_id.unwrap_or_default().encode_utf16())
            })
        });
        Ok((!samples.is_empty()).then_some(Self {
            incident,
            end_incident,
            areas,
            items: samples,
            _storage,
        }))
    }

    /// Integrate each unchanged site's elapsed field once. Every item keeps
    /// its independent condition, law, revision and ordinary save row.
    pub(crate) fn settle(
        mut self,
        core: &mut CoreMutation<'_>,
        seconds: f64,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        for sample in self.items {
            let (site, area) = self
                .areas
                .get_index_mut(sample.area)
                .ok_or(ExecutionError::Invariant)?;
            let Some(entity) = core
                .state
                .physical
                .entities
                .resolve(sample.item)
                .filter(|entity| entity.item.is_some())
            else {
                continue;
            };
            let (_, material) = material_item(core.state, sample.item)?;
            let Some(current_site) = material_site(core.state, entity, material) else {
                continue;
            };
            let law = &material.law;
            let attribute = entity
                .stored_attributes()
                .and_then(|attrs| attrs.get(&law.moisture_attribute));
            let Some(AttributeValue::Number(before)) = attribute.map(|attr| &attr.value) else {
                return Err(ExecutionError::Invariant);
            };
            let alternate;
            let change = if area.before.is_none() {
                alternate = AreaChange {
                    rates: RateSegments::Dry,
                    process_changed: false,
                };
                &alternate
            } else if *site == current_site {
                if area.elapsed.is_none() {
                    let before = area.before.ok_or(ExecutionError::Invariant)?;
                    let Some(after) = current_site.footprint(core.state) else {
                        continue;
                    };
                    area.elapsed = Some(area_change(
                        before,
                        after,
                        seconds,
                        &self.incident,
                        &self.end_incident,
                        &mut core.journal.meters,
                        budget,
                    )?);
                }
                area.elapsed.as_ref().ok_or(ExecutionError::Invariant)?
            } else {
                // The real endpoint determines the new footprint if motion
                // changed the root. Reuse is restricted to the exact site.
                let before = area.before.ok_or(ExecutionError::Invariant)?;
                let Some(after) = current_site.footprint(core.state) else {
                    continue;
                };
                alternate = area_change(
                    before,
                    after,
                    seconds,
                    &self.incident,
                    &self.end_incident,
                    &mut core.journal.meters,
                    budget,
                )?;
                &alternate
            };
            let next = match &change.rates {
                RateSegments::Dry => (*before - seconds / law.drying_seconds).max(0.0),
                RateSegments::Rain { segments, .. } => {
                    segments.iter().fold(*before, |value, segment| {
                        if segment.incident > 0.0 {
                            (value
                                + (segment.seconds * segment.incident) / 6.0 / law.wetting_seconds)
                                .min(1.0)
                        } else {
                            (value - segment.seconds / law.drying_seconds).max(0.0)
                        }
                    })
                }
            };
            let details_changed = change.process_changed || law.label(next) != law.label(*before);
            if next != *before {
                let law = law.clone();
                core.write_material_moisture(sample.item, &law, next)?;
            }
            if details_changed {
                core.change_material_details(current_site.root)?;
            }
        }
        Ok(())
    }
}

/// Read current condition only after the inventory caller has admitted the
/// item. The world uses the same footprint and active sources as the writer.
pub(crate) fn material_condition<'a>(
    state: &SimulationState,
    item: &Entity,
    material: Option<&'a ExposedMaterial>,
) -> Result<Option<crate::install::MaterialCondition<'a>>, ExecutionError> {
    let Some(material) = material else {
        return Ok(None);
    };
    let Some(site) = material_site(state, item, material) else {
        return Ok(None);
    };
    let Some(footprint) = site.footprint(state) else {
        return Ok(None);
    };
    let value = item
        .stored_attributes()
        .and_then(|attrs| attrs.get(&material.law.moisture_attribute));
    let Some(AttributeValue::Number(value)) = value.map(|state| &state.value) else {
        return Err(ExecutionError::Invariant);
    };
    // Persisted assembly attachments require their own supported installation
    // family. The admitted stock roots currently have no assembly cover.
    let weather = state.weather_at(state.physical.header.sim_time);
    let wetting =
        incident_exposure(footprint, &weather.incident, None).map_err(exposure_error)? > 0.0;
    Ok(Some(crate::install::MaterialCondition {
        label: material.law.label(*value),
        process: if wetting { "wetting" } else { "drying" },
        covered_fraction: 0.0,
    }))
}

fn material_item(
    state: &SimulationState,
    item: EntityHandle,
) -> Result<(&Entity, &ExposedMaterial), ExecutionError> {
    let entity = state
        .physical
        .entities
        .resolve(item)
        .ok_or(ExecutionError::Invariant)?;
    let role = entity
        .item
        .as_ref()
        .and_then(|lot| state.installed.retained.items.get(&lot.definition_pin.id))
        .and_then(|definition| definition.exposure.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    Ok((entity, role))
}

fn material_site(
    state: &SimulationState,
    item: &Entity,
    material: &ExposedMaterial,
) -> Option<Site> {
    if item.retirement.is_some() {
        return None;
    }
    let entities = &state.physical.entities;
    let parent = entities.get(crate::install::inventory_parent(item)?)?;
    let pile = &state.installed.observation_rules.value().pile_kind;
    let root = |entity: &Entity| {
        entity.physical_root() && (entity.actor.is_some() || &entity.kind == pile)
    };
    if parent.container.is_some() {
        let definition = state
            .installed
            .retained
            .items
            .get(&parent.item.as_ref()?.definition_pin.id)?;
        let Placement::Contained {
            parent_entity_id, ..
        } = parent.placement.as_ref()?
        else {
            return None;
        };
        let carrier = entities.get(parent_entity_id)?;
        if !definition.has_open_contents()
            || !root(carrier)
            || carrier.world_support().is_none()
            || parent.spatial.body.radius <= 0.0
            || parent.spatial.body.height <= 0.0
        {
            return None;
        }
        let radius = parent.ordinary_body_profile().radius.to_bits();
        return Some(Site {
            root: entities.handle(&carrier.id)?,
            half_size: [radius; 2],
        });
    }
    if !root(parent) {
        return None;
    }
    let worn = matches!(material.role, ExposureRole::Cover)
        && matches!(item.placement, Some(Placement::Attached { .. }));
    let form = material.law.form(material.role, worn);
    Some(Site {
        root: entities.handle(&parent.id)?,
        half_size: [(form.width / 2.0).to_bits(), (form.length / 2.0).to_bits()],
    })
}

impl Site {
    fn footprint(self, state: &SimulationState) -> Option<Rectangle> {
        let point = state
            .physical
            .entities
            .resolve(self.root)?
            .world_position()?;
        let [x, z] = self.half_size.map(f64::from_bits);
        Some(Rectangle {
            min_x: point.x - x,
            max_x: point.x + x,
            min_z: point.z - z,
            max_z: point.z + z,
        })
    }
}

fn area_change(
    before: Rectangle,
    after: Rectangle,
    seconds: f64,
    incident: &[Option<IncidentRain>; 2],
    end_incident: &[Option<IncidentRain>; 2],
    work: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<AreaChange, ExecutionError> {
    let process_changed = if before == after && incident == end_incident {
        false
    } else {
        let started = incident_exposure(before, incident, Some(work)).map_err(exposure_error)?;
        let ended = incident_exposure(after, end_incident, Some(work)).map_err(exposure_error)?;
        (started > 0.0) != (ended > 0.0)
    };
    let rates = integrate(before, after, seconds, incident, work, budget)?;
    Ok(AreaChange {
        rates,
        process_changed,
    })
}

fn integrate(
    before: Rectangle,
    after: Rectangle,
    seconds: f64,
    incident: &[Option<IncidentRain>; 2],
    work: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<RateSegments, ExecutionError> {
    if incident.iter().all(Option::is_none) {
        return Ok(RateSegments::Dry);
    }
    let cuts = exposure_crossings(before, after, incident, work).map_err(exposure_error)?;
    let count = cuts.as_ref().len().saturating_sub(1);
    let storage = budget.reserve(
        count
            .checked_mul(size_of::<RateSegment>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut segments = Vec::new();
    segments
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for times in cuts.as_ref().windows(2) {
        let (from, to) = (times[0], times[1]);
        let mut exposure = |t| {
            incident_exposure(before.between(after, t), incident, Some(work))
                .map_err(exposure_error)
        };
        let middle = exposure((from + to) / 2.0)?;
        let received = if middle > 0.0 {
            exposure(from)? + 4.0 * middle + exposure(to)?
        } else {
            0.0
        };
        segments.push(RateSegment {
            seconds: seconds * (to - from),
            incident: received,
        });
    }
    Ok(RateSegments::Rain {
        segments,
        _storage: storage,
    })
}

fn exposure_error(error: ExposureError) -> ExecutionError {
    match error {
        ExposureError::Work(error) => ExecutionError::Work(error),
        ExposureError::Invalid => ExecutionError::Invariant,
    }
}
