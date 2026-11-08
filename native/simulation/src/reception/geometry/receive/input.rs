//! Actual receptor eligibility, Source signatures and received anchor selection.
use super::*;
impl Receptor {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        id: &str,
    ) -> Result<Option<Self>, ExecutionError> {
        Self::prepare_state(core.state, id)
    }
    pub(super) fn prepare_state(
        state: &crate::simulation::SimulationState,
        id: &str,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(entity) = state
            .physical
            .entities
            .get(id)
            .filter(|e| e.actively_participates() && e.actor.as_ref().is_some_and(|a| a.alive))
        else {
            return Ok(None);
        };
        let installed = &state.installed;
        if installed
            .capabilities
            .capability_blocked(Some(entity), "perception")
            .map_err(|_| invalid())?
        {
            return Ok(None);
        }
        let Some(detector) = sensors::selected_senses(installed, entity)
            .find(|v| matches!(v, SenseDefinition::VisionGeometry { .. }))
        else {
            return Ok(None);
        };
        let parameters = sensors::vision_parameters(installed, entity);
        if parameters.radius <= 0.0 {
            return Ok(None);
        }
        let detector = installed.senses.get(detector.id()).ok_or_else(invalid)?;
        let position = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let eye = Point {
            y: position.y + entity.body_profile().eye_height,
            ..position
        };
        let policy = installed.attention.value();
        // These exact source definition bytes preserve JSON.stringify's field
        // enumeration. The independently verified canonical body identifies it.
        let raw_detector: &RawValue =
            serde_json::from_str(detector.source()).map_err(|_| invalid())?;
        let mut fields = crate::encoding::RawFields::parse(installed.attention.source())
            .map_err(|_| invalid())?;
        let geometry: Box<RawValue> = fields.take("geometry").map_err(|_| invalid())?;
        let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
        let source_basis = encoded(&(
            life,
            installed.geometry.spatial.revision,
            raw_detector,
            &policy.id,
            policy.version,
            geometry,
        ))?;
        let basis = encoded(&(
            &source_basis,
            eye,
            parameters.radius,
            parameters.field_of_view,
            (parameters.field_of_view < 2.0 * std::f64::consts::PI)
                .then_some(entity.spatial.heading),
        ))?;
        Ok(Some(Self {
            observer: ObserverLife {
                actor_id: id.into(),
                physical_life: life,
            },
            detector: DetectorIdentity {
                id: detector.pin().id.clone(),
                version: detector.pin().version,
            },
            channel: detector.pin().clone(),
            radius: parameters.radius,
            angle: parameters.field_of_view,
            eye,
            frame: ObservationFrame {
                position_at_observation: position,
                forward_at_observation: Some(entity.spatial.heading),
            },
            source_basis,
            basis,
        }))
    }
    pub(super) fn contains(&self, p: Point) -> bool {
        distance(self.eye, p) <= self.radius
            && sensors::horizontal_cone(
                self.frame.position_at_observation,
                self.frame.forward_at_observation.unwrap_or(0.0),
                self.angle,
                p,
            )
    }
}
pub(super) fn certificate(
    core: &CoreMutation<'_>,
    id: &str,
    input: &Receptor,
    state: &ReceivedGeometryState,
) -> bool {
    let sensory = core.state.reception.sensory.as_ref();
    state.source_basis == input.source_basis
        && sensory.is_none_or(|s| {
            s.invalidated_revision
                .into_iter()
                .chain(s.scopes.get(id).and_then(|s| s.invalidated_revision))
                .all(|r| state.input_revision >= r)
        })
}
pub(super) fn anchor_bytes(core: &CoreMutation<'_>, id: &str) -> Result<usize, ExecutionError> {
    let mut count = 1usize;
    let mut bytes = 0usize;
    if let Some(attention) = owner(core, id).and_then(|o| o.attention.as_ref()) {
        for source in attention.entries.iter().map(|e| &e.source_id).chain(
            attention
                .annotations
                .values()
                .filter(|a| a.direct)
                .map(|a| &a.source_id),
        ) {
            count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
            bytes = bytes
                .checked_add(source.len())
                .ok_or(ExecutionError::Capacity)?;
        }
    }
    if let Some(target) = core
        .state
        .physical
        .entities
        .get(id)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .and_then(|a| a.target_id.as_ref())
    {
        bytes = bytes
            .checked_add(target.len())
            .ok_or(ExecutionError::Capacity)?;
    }
    heap_sum([
        bytes,
        crate::host::retained_size::map_storage::<String, ()>(
            count.checked_mul(2).ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?,
        count
            .checked_mul(4 * size_of::<usize>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)
}
pub(super) fn anchors(
    core: &CoreMutation<'_>,
    input: &Receptor,
    cursor: u64,
    policy: &GeometryAttentionPolicy,
) -> Result<(Vec<Point>, u64, bool, u64), ExecutionError> {
    let id = &input.observer.actor_id;
    let owner = owner(core, id).ok_or_else(invalid)?;
    let mut points = vec![input.frame.position_at_observation];
    let mut ids = IndexSet::new();
    if let Some(attention) = &owner.attention {
        ids.extend(attention.entries.iter().map(|e| e.source_id.clone()));
    }
    if let Some(target) = core
        .state
        .physical
        .entities
        .get(id)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .and_then(|a| a.target_id.as_ref())
    {
        ids.insert(target.clone());
    }
    if let Some(attention) = &owner.attention {
        let mut entries: Vec<_> = attention.annotations.iter().collect();
        entries.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
        ids.extend(
            entries
                .into_iter()
                .filter(|(_, e)| e.direct)
                .map(|(_, e)| e.source_id.clone()),
        );
    }
    let scope = CurrentBodyReadScope::prepare(
        &core.state.reception,
        &core.state.physical.entities,
        &core.state.installed,
        &core.state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        id,
    )?;
    let location = |id: &str| -> Result<Option<Point>, ExecutionError> {
        let Some(scope) = &scope else { return Ok(None) };
        let Some(field) = scope.observed(id, "location")? else {
            return Ok(None);
        };
        let Some(values) = scope.received_values() else {
            return Err(invalid());
        };
        Ok(match received_facet_value(values, &field.field.value)? {
            Some(SensoryFacet::Location {
                location: ObservedLocation::Point { point, .. },
                ..
            }) => Some(point.position()),
            _ => None,
        })
    };
    let mut visited = 0;
    let maximum = policy.visits / 3;
    for id in &ids {
        if visited >= maximum {
            break;
        }
        visited += 1;
        if let Some(point) = location(id)? {
            points.push(point)
        }
    }
    let people = core
        .state
        .reception
        .visible_people
        .as_ref()
        .and_then(|r| r.get(id))
        .map_or(&[][..], Vec::as_slice);
    let objects = core
        .state
        .reception
        .visible_objects
        .as_ref()
        .and_then(|r| r.get(id))
        .map_or(&[][..], Vec::as_slice);
    let count = people.len() + objects.len();
    let region = |p: Point| {
        encoded(&(
            (p.x / policy.extent_metres).floor(),
            (p.z / policy.extent_metres).floor(),
        ))
    };
    let mut regions = IndexSet::new();
    for point in &points {
        regions.insert(region(*point)?);
    }
    let mut scanned = 0usize;
    while scanned < count && visited < maximum {
        let at = (cursor as usize + scanned) % count;
        scanned += 1;
        let id = if at < people.len() {
            &people[at]
        } else {
            &objects[at - people.len()]
        };
        if ids.contains(id) {
            continue;
        }
        visited += 1;
        if let Some(point) = location(id)? {
            if regions.insert(region(point)?) {
                points.push(point)
            }
        }
    }
    Ok((
        points,
        visited,
        scanned < count,
        if count == 0 {
            0
        } else {
            (cursor + scanned as u64) % count as u64
        },
    ))
}

/// This view borrows actual personal observations only. The synchronous caller
/// retains its accepted-read gate; detached products copy and fund their own data.
pub(crate) struct CurrentReceivedGeometry<'a> {
    state: Option<&'a ReceivedGeometryState>,
}
impl<'a> CurrentReceivedGeometry<'a> {
    pub(crate) fn observations(
        &self,
    ) -> impl Iterator<Item = &'a ObservationContribution> + use<'a> {
        self.state.into_iter().flat_map(|s| {
            s.fragments
                .iter()
                .map(|f| &f.observation)
                .chain(s.boundaries.iter().map(|f| &f.observation))
        })
    }
    pub(crate) fn complete(&self) -> bool {
        self.state.is_some_and(|s| s.complete)
    }
    pub(crate) fn visited(&self) -> u64 {
        self.state.map_or(0, |s| s.visited)
    }
    pub(crate) fn supported_through(&self) -> f64 {
        self.state.map_or(0.0, |s| s.supported_through)
    }
}
pub(crate) fn current_received_geometry<'a>(
    state: &'a crate::simulation::SimulationState,
    observer: &str,
    budget: &ByteBudget,
) -> Result<CurrentReceivedGeometry<'a>, ExecutionError> {
    let definition_bytes = state
        .installed
        .attention
        .source()
        .len()
        .checked_add(
            state
                .installed
                .senses
                .values()
                .try_fold(0usize, |n, s| n.checked_add(s.source().len()))
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    let bound = definition_bytes
        .checked_mul(12)
        .and_then(|n| n.checked_add(observer.len().checked_mul(6)?))
        .and_then(|n| n.checked_add(2048))
        .ok_or(ExecutionError::Capacity)?;
    let _reservation = budget.reserve(bound)?;
    let input = Receptor::prepare_state(state, observer)?;
    let geometry = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|o| o.get(observer))
        .and_then(|o| o.geometry.as_ref());
    let geometry = geometry.filter(|g| {
        input.as_ref().is_some_and(|input| {
            g.source_basis == input.source_basis
                && state.reception.sensory.as_ref().is_none_or(|s| {
                    s.invalidated_revision
                        .into_iter()
                        .chain(s.scopes.get(observer).and_then(|s| s.invalidated_revision))
                        .all(|r| g.input_revision >= r)
                })
        })
    });
    Ok(CurrentReceivedGeometry { state: geometry })
}
