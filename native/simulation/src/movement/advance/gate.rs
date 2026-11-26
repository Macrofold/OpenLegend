use super::*;
use crate::{
    assembly::gate::GateOperation, geometry::StandingQuery, host::retained_size::HeapBytes,
    worlds::base_gate_use::copy,
};

impl MoveAdvanceCursor {
    pub(super) fn check_gate(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let work = action
            .gate_work
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let Some(gate) = work.intent.read(core.state) else {
            self.fail(&copy().changed.message)?;
            return self.drive(core, None);
        };
        if gate.gate.position != work.position
            || gate.gate.barred != work.barred
            || gate
                .edit
                .is_none_or(|edit| edit.actor_id != self.actor_id || edit.invocation_id != id)
            || core
                .journal
                .material_gather
                .gate_grant(core.state, &gate, &work.intent, Some(&work.grant))?
                .is_none()
        {
            self.fail(&copy().changed.message)?;
            return self.drive(core, None);
        }
        let Some(from) = actor.supported_position() else {
            self.fail(&copy().access.message)?;
            return self.drive(core, None);
        };
        let body = actor.body_profile();
        let (handle, stance) = gate.stance(work.side, body.radius);
        let Some(ray) = crate::commands::gate_handle_ray(
            actor,
            from.point(),
            handle,
            core.state.installed.movement.interaction_radius(),
        )
        .filter(|_| {
            from.surface_id == gate.support
                && crate::spatial::distance(from.point(), stance.point())
                    <= core.state.installed.movement_settings.arrival_tolerance
        }) else {
            self.fail(&copy().access.message)?;
            return self.drive(core, None);
        };
        let mut storage = self.budget.reserve(
            size_of::<GeometryQueries>()
                + size_of::<StandingQuery>()
                + size_of::<crate::geometry::SightRay>()
                + size_of::<crate::geometry::SolidSpace>()
                + from.surface_id.len()
                + gate.support.len()
                + body.id.len()
                + work.intent.item_id.len()
                + gate.gate.binding_ids[4..]
                    .iter()
                    .map(String::len)
                    .sum::<usize>(),
        )?;
        let mut query = GeometryQueries::new(self.binding);
        query.movement_rays.push(ray);
        query.standing.push(StandingQuery {
            point: from,
            body: body.as_ref().clone(),
        });
        if work.intent.operation.moves_leaf() && !gate.already(work.intent.operation) {
            let origin = gate.frame.origin;
            let pieces = gate.sweep();
            query.solid_spaces.push(gate.swept_space(&work.intent));
            if !clear_people(core, origin, pieces, &self.budget)? {
                self.fail(&copy().blocked.message)?;
                return self.drive(core, None);
            }
        }
        storage.resize(query.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.binding.serial = core.journal.next_provider_serial()?;
        self.binding.geometry_revision = core.state.geometry_revision();
        query.binding = self.binding;
        self.queries = Some((query, storage));
        self.phase = Phase::GateWork;
        Ok(Progress::Geometry)
    }

    pub(super) fn finish_gate_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let work = action
            .gate_work
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let reason = if answer.movement_rays.len() != 1
            || answer.movement_rays[0].is_some()
            || answer.standing != [true]
        {
            Some(&copy().access)
        } else if work.intent.operation == GateOperation::Open && work.barred {
            Some(&copy().barred)
        } else if answer.solid_spaces.contains(&false) {
            Some(&copy().blocked)
        } else {
            None
        };
        if let Some(reason) = reason {
            self.fail(&reason.message)?;
            return self.drive(core, None);
        }
        if action.stage == "approaching" {
            return self.start_contact_work(core);
        }
        let gate = work
            .intent
            .read(core.state)
            .ok_or(ExecutionError::Invariant)?;
        let changed = !gate.already(work.intent.operation);
        let label = gate
            .family
            .labels
            .get(work.intent.operation.key())
            .ok_or(ExecutionError::Invariant)?;
        let operation = work.intent.operation;
        let _workspace = self.budget.reserve(
            512 + 2 * id.len()
                + 3 * self.actor_id.len()
                + 3 * work.heap_bytes().ok_or(ExecutionError::Capacity)?
                + 5 * label.len(),
        )?;
        let intent = work.intent.clone();
        let grant = work.grant.clone();
        let at = gate.family.geometry.handle(
            gate.frame,
            match operation {
                GateOperation::Open => crate::assembly::GatePosition::Open,
                GateOperation::Close => crate::assembly::GatePosition::Closed,
                _ => work.position,
            },
            work.side == crate::assembly::gate::Side::Inside,
        );
        let mut result = copy().unchanged.outcome(true);
        if changed {
            result.code = copy().operated_event.clone();
            result.message = label.clone().into();
        }
        let text = if changed {
            format!("{}{}.", copy().completed_prefix, label.to_lowercase())
        } else {
            copy().checked_clause.clone()
        };
        let budget = &self.budget;
        core.journal
            .material_gather
            .record_gate(&self.actor_id, &grant, budget)?;
        let epsilon = core.state.installed.time_epsilon;
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        if core.operate_bound_gate(&intent)? != changed {
            return Err(ExecutionError::Invariant);
        }
        // Handle state can be private. Until the selected operation is seen
        // from the actual approach side, only its actor gets the result.
        let external = changed && operation.moves_leaf();
        let event = core.stage_event(EventEmissionIntent {
            event_type: if changed { copy().operated_event.clone() } else { copy().checked_event.clone() },
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.actor_id.clone(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(format!(" {text}").into()),
                ],
            }),
            audience: if external {
                AudienceSelection::Physical
            } else {
                AudienceSelection::Explicit(vec![self.actor_id.clone()])
            },
            source_id: Some(self.actor_id.clone()),
            target_id: Some(intent.assembly_id.clone()),
            data: Some(indexmap::IndexMap::from([(
                "actionId".into(),
                crate::reception::EventScalar::Text(id.into()),
            )])),
            scope: if external {
                EventScope::External
            } else {
                EventScope::Private
            },
            origin: Some(at),
            exposure: None,
        })?;
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}

fn clear_people(
    core: &mut CoreMutation<'_>,
    origin: Point,
    pieces: [crate::state::Bounds; 3],
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let points = pieces.iter().flat_map(|piece| [piece.min, piece.max]);
    let radius = points
        .map(|point| crate::spatial::distance(point, origin))
        .fold(0.0_f64, f64::max);
    let body_index = &core.state.physical.bodies;
    let envelope = radius + body_index.maximum_extent();
    let (count, _) = body_index.candidate_capacity(origin, envelope);
    let _workspace = budget.reserve(
        count
            .checked_mul(6 * size_of::<(&str, crate::state::EntityHandle)>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    for (_, handle) in body_index.candidates_metered(origin, envelope, &mut core.journal.meters)? {
        let entity = core
            .state
            .physical
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        if entity.assembly.is_some() {
            continue;
        }
        let space = crate::movement::body_space(entity, &core.state.installed.status_policy)
            .map_err(|_| ExecutionError::UnsupportedFamily)?;
        if pieces.iter().any(|piece| {
            piece.min.x < space.max.x
                && piece.max.x > space.min.x
                && piece.min.y < space.max.y
                && piece.max.y > space.min.y
                && piece.min.z < space.max.z
                && piece.max.z > space.min.z
        }) {
            return Ok(false);
        }
    }
    Ok(true)
}
