//! One weather input, with exposure captured before movement and settled at
//! the same elapsed boundary before endpoint work changes custody.
use super::{ExposedMaterial, ExposureRole};
use crate::{
    assembly::scene::StructureScene,
    execution::{CoreMutation, ExecutionError},
    geometry::rain::{ExposureError, Footprint, LocalCovers, Rectangle, exposure_crossings},
    host::{ByteBudget, ByteReservation, retained_size::map_storage},
    simulation::SimulationState,
    state::{Entity, EntityHandle, Placement},
    values::AttributeValue,
    weather::IncidentRain,
    work::{WorkMeters, WorkUnit},
};
use indexmap::IndexMap;
use std::sync::Arc;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct Site {
    root: EntityHandle,
    area: SiteArea,
}
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
enum SiteArea {
    Stock { half_size: [u64; 2], layer: Layer },
    Cover(EntityHandle),
}
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
enum Layer {
    Offset(u64),
    Hand,
    Worn,
}

#[derive(Clone, Copy)]
struct ItemSample {
    item: EntityHandle,
    area: usize,
}

struct Area {
    before: Option<Footprint>,
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
    structures: Option<Arc<StructureScene>>,
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
        let structures = (!wet_only)
            .then(|| state.physical.structures.clone())
            .flatten();
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
                        let Some(footprint) = site.footprint(state, structures.as_deref()) else {
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
            structures,
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
                    let Some(after) =
                        current_site.footprint(core.state, self.structures.as_deref())
                    else {
                        continue;
                    };
                    area.elapsed = Some(area_change(
                        before,
                        after,
                        seconds,
                        &self.incident,
                        &self.end_incident,
                        self.structures.as_deref(),
                        current_site.cover_id(core.state),
                        &mut core.journal.meters,
                        budget,
                    )?);
                }
                area.elapsed.as_ref().ok_or(ExecutionError::Invariant)?
            } else {
                // The real endpoint determines the new footprint if motion
                // changed the root. Reuse is restricted to the exact site.
                let before = area.before.ok_or(ExecutionError::Invariant)?;
                let Some(after) = current_site.footprint(core.state, self.structures.as_deref())
                else {
                    continue;
                };
                alternate = area_change(
                    before,
                    after,
                    seconds,
                    &self.incident,
                    &self.end_incident,
                    self.structures.as_deref(),
                    current_site.cover_id(core.state),
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
            if details_changed && matches!(current_site.area, SiteArea::Stock { .. }) {
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
    budget: &ByteBudget,
) -> Result<Option<crate::install::MaterialCondition<'a>>, ExecutionError> {
    let Some(material) = material else {
        return Ok(None);
    };
    let Some(site) = material_site(state, item, material) else {
        return Ok(None);
    };
    let structures = state.physical.structures.as_deref();
    let Some(footprint) = site.footprint(state, structures) else {
        return Ok(None);
    };
    let value = item
        .stored_attributes()
        .and_then(|attrs| attrs.get(&material.law.moisture_attribute));
    let Some(AttributeValue::Number(value)) = value.map(|state| &state.value) else {
        return Err(ExecutionError::Invariant);
    };
    let weather = state.weather_at(state.physical.header.sim_time);
    let own = site.cover_id(state);
    let covers = LocalCovers::prepare(
        structures.into_iter().flat_map(StructureScene::covers),
        footprint,
        footprint,
        own,
        budget,
        None,
    )
    .map_err(exposure_error)?;
    let (incident, covered_fraction) = covers
        .measure(
            footprint,
            own,
            footprint.height,
            &weather.incident,
            budget,
            None,
        )
        .map_err(exposure_error)?;
    Ok(Some(crate::install::MaterialCondition {
        label: material.law.label(*value),
        process: if incident > 0.0 { "wetting" } else { "drying" },
        covered_fraction,
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
    if parent.assembly.is_some() {
        state
            .physical
            .structures
            .as_deref()?
            .cover(&parent.id, &item.id)?;
        return Some(Site {
            root: entities.handle(&parent.id)?,
            area: SiteArea::Cover(entities.handle(&item.id)?),
        });
    }
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
        let body = parent.ordinary_body_profile();
        let layer = if carrier.actor.as_ref().is_some_and(|actor| actor.alive) {
            Layer::Hand
        } else {
            Layer::Offset(body.height.to_bits())
        };
        return Some(Site {
            root: entities.handle(&carrier.id)?,
            area: SiteArea::Stock {
                half_size: [body.radius.to_bits(); 2],
                layer,
            },
        });
    }
    if !root(parent) {
        return None;
    }
    let worn = matches!(material.role, ExposureRole::Cover)
        && matches!(item.placement, Some(Placement::Attached { .. }));
    let form = material.law.form(material.role, worn);
    let layer = if parent.actor.is_none() {
        Layer::Offset(form.height.unwrap_or(0.).to_bits())
    } else if worn {
        Layer::Worn
    } else {
        Layer::Hand
    };
    Some(Site {
        root: entities.handle(&parent.id)?,
        area: SiteArea::Stock {
            half_size: [(form.width / 2.0).to_bits(), (form.length / 2.0).to_bits()],
            layer,
        },
    })
}

impl Site {
    fn cover_id(self, state: &SimulationState) -> Option<&str> {
        let SiteArea::Cover(item) = self.area else {
            return None;
        };
        Some(&state.physical.entities.resolve(item)?.id)
    }

    fn footprint(
        self,
        state: &SimulationState,
        scene: Option<&StructureScene>,
    ) -> Option<Footprint> {
        let root = state.physical.entities.resolve(self.root)?;
        let SiteArea::Stock { half_size, layer } = self.area else {
            return Some(scene?.cover(&root.id, self.cover_id(state)?)?.footprint());
        };
        let point = root.world_position()?;
        let [x, z] = half_size.map(f64::from_bits);
        let offset = match layer {
            Layer::Offset(offset) => f64::from_bits(offset),
            Layer::Hand => root.body_profile().interaction_height,
            Layer::Worn => root.body_profile().height,
        };
        Some(Footprint::level(
            Rectangle {
                min_x: point.x - x,
                max_x: point.x + x,
                min_z: point.z - z,
                max_z: point.z + z,
            },
            point.y + offset,
        ))
    }
}

fn area_change(
    before: Footprint,
    after: Footprint,
    seconds: f64,
    incident: &[Option<IncidentRain>; 2],
    end_incident: &[Option<IncidentRain>; 2],
    structures: Option<&StructureScene>,
    own: Option<&str>,
    work: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<AreaChange, ExecutionError> {
    let covers = LocalCovers::prepare(
        structures.into_iter().flat_map(StructureScene::covers),
        before,
        after,
        own,
        budget,
        Some(work),
    )
    .map_err(exposure_error)?;
    let process_changed = if before == after && incident == end_incident {
        false
    } else {
        let (started, from_cover) = covers
            .measure(before, own, before.height, incident, budget, Some(work))
            .map_err(exposure_error)?;
        let (ended, to_cover) = covers
            .measure(after, own, after.height, end_incident, budget, Some(work))
            .map_err(exposure_error)?;
        (started > 0.0) != (ended > 0.0) || from_cover != to_cover
    };
    let rates = integrate(before, after, seconds, incident, &covers, own, work, budget)?;
    Ok(AreaChange {
        rates,
        process_changed,
    })
}

fn integrate(
    before: Footprint,
    after: Footprint,
    seconds: f64,
    incident: &[Option<IncidentRain>; 2],
    covers: &LocalCovers<'_>,
    own: Option<&str>,
    work: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<RateSegments, ExecutionError> {
    if incident.iter().all(Option::is_none) {
        return Ok(RateSegments::Dry);
    }
    let bare_cuts;
    let cover_cuts;
    let cuts: &[f64] = if covers.is_empty() {
        bare_cuts = exposure_crossings(before.rectangle, after.rectangle, incident, work)
            .map_err(exposure_error)?;
        bare_cuts.as_ref()
    } else {
        cover_cuts = covers
            .crossings(before, after, incident, budget, work)
            .map_err(exposure_error)?;
        &cover_cuts.0
    };
    let count = cuts.len().saturating_sub(1);
    let storage = budget.reserve(
        count
            .checked_mul(size_of::<RateSegment>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut segments = Vec::new();
    segments
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for times in cuts.windows(2) {
        let (from, to) = (times[0], times[1]);
        let ordering_height = before.height + (after.height - before.height) * (from + to) / 2.;
        let mut exposure = |t| {
            covers
                .measure(
                    before.between(after, t),
                    own,
                    ordering_height,
                    incident,
                    budget,
                    Some(work),
                )
                .map(|(incident, _)| incident)
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
        ExposureError::Capacity => ExecutionError::Capacity,
    }
}
