//! Prepare the same finite placement for preview and execution. Geometry and
//! grant evidence lead to one exact action; a preview publishes no hold.
use super::*;
use crate::activity::{ActivityDetail, ActivityFact, ActivityScalar};
use crate::geometry::{NavigationResult, PlacementClearance, PlacementStance};
use crate::hearth::{self as placement, MaterialSelection};
use crate::text::JsText;

#[derive(Default)]
pub(super) struct PreparedHearth {
    geometry: Option<ByteReservation>,
    selection: Option<MaterialSelection>,
    stances: Vec<PlacementStance>,
    stance_storage: Option<ByteReservation>,
    pending: Option<PlacementStance>,
}

impl CommandCursor {
    pub(super) fn prepare_hearth(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::PlaceHearth {
            envelope,
            definition,
            site,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(definition) = installed
            .retained
            .hearths
            .get(&definition.id)
            .filter(|d| &d.pin == definition)
        else {
            self.refuse(&placement::messages().unavailable_definition);
            return Ok(false);
        };
        if installed.hearth_placement.is_none()
            || !installed
                .retained
                .item_handling_read
                .can_handle(&actor.ordinary_body_profile().id)
            || actor.supported_position().is_none()
        {
            self.refuse(&placement::messages().unavailable);
            return Ok(false);
        }
        let Some(sight) = placement::site::sight_to_site(&installed, actor, site, &self.budget)?
        else {
            self.refuse(&placement::messages().not_visible);
            return Ok(false);
        };
        let (volume, stances, custody) = placement::site::placement_geometry(
            core,
            &envelope.actor_id,
            &definition.definition,
            site,
            None,
            &self.budget,
        )?;
        let question = self.question(core, Phase::HearthGeometry)?;
        question.sight.push(sight);
        question.placement_volumes.push(volume);
        question.placement_stances.push(stances);
        self.hearth = Some(PreparedHearth {
            geometry: Some(custody),
            ..Default::default()
        });
        Ok(true)
    }

    pub(super) fn hearth_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let mut prepared = self.hearth.take().ok_or(ExecutionError::Invariant)?;
        prepared.geometry = None;
        let messages = placement::messages();
        let visible = answer.sight.pop().ok_or(ExecutionError::Invariant)?;
        let clearance = answer
            .placement_volumes
            .pop()
            .ok_or(ExecutionError::Invariant)?;
        let problem = if !visible {
            Some(&messages.not_visible)
        } else {
            match clearance {
                PlacementClearance::Clear => None,
                PlacementClearance::Unsupported => Some(&messages.support),
                PlacementClearance::Blocked => Some(&messages.blocked),
                PlacementClearance::Occupied => Some(&messages.occupied),
            }
        };
        if let Some(problem) = problem {
            self.refuse(problem);
            return self.drive(core, None);
        }
        let NativeCommand::PlaceHearth {
            envelope,
            definition,
            site,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let meaning = installed
            .retained
            .hearths
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let selection = placement::select_materials(
            core,
            &envelope.actor_id,
            &meaning.definition,
            site,
            &self.budget,
        )?;
        match selection {
            MaterialSelection::Incomplete => self.refuse(&messages.scan_incomplete),
            MaterialSelection::Insufficient => self.refuse(&messages.permission),
            selection => {
                let stances = answer
                    .placement_stances
                    .pop()
                    .ok_or(ExecutionError::Invariant)?;
                if stances.is_empty() {
                    self.refuse(&messages.stance);
                } else {
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(&envelope.actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let from = actor
                        .supported_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let profile = actor.body_profile().into_owned();
                    let extra = stances.heap_bytes().ok_or(ExecutionError::Capacity)?
                        + stances.len()
                            * (size_of::<RouteQuery>() + from.surface_id.len() + profile.id.len())
                        + stances
                            .iter()
                            .map(|s| s.stance.surface_id.len())
                            .sum::<usize>();
                    let storage = self.budget.reserve(extra)?;
                    let query = self.question(core, Phase::HearthRoutes)?;
                    query
                        .routes
                        .try_reserve_exact(stances.len())
                        .map_err(|_| ExecutionError::Capacity)?;
                    query
                        .routes
                        .extend(stances.iter().map(|stance| RouteQuery::Surface {
                            from: from.clone(),
                            to: stance.stance.clone(),
                            body: profile.clone(),
                        }));
                    prepared.selection = Some(selection);
                    prepared.stances = stances;
                    prepared.stance_storage = Some(storage);
                    self.hearth = Some(prepared);
                    return Ok(Progress::Geometry);
                }
            }
        }
        self.drive(core, None)
    }

    pub(super) fn hearth_routes(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let mut prepared = self.hearth.take().ok_or(ExecutionError::Invariant)?;
        let mut best_pending = None;
        for (stance, route) in std::mem::take(&mut prepared.stances)
            .into_iter()
            .zip(answer.routes)
        {
            match route {
                RoutePlan::Reached { path, .. } => {
                    return self.accept_hearth(core, prepared, stance, path);
                }
                RoutePlan::Pending { request, .. } if best_pending.is_none() => {
                    best_pending = Some((stance, request))
                }
                _ => {}
            }
        }
        if let Some((stance, request)) = best_pending {
            let storage = self.budget.reserve(
                size_of::<crate::state::NavigationRequest>()
                    + request.heap_bytes().ok_or(ExecutionError::Capacity)?,
            )?;
            self.question(core, Phase::HearthNavigation)?
                .navigation
                .push(request);
            prepared.geometry = Some(storage);
            prepared.pending = Some(stance);
            self.hearth = Some(prepared);
            return Ok(Progress::Geometry);
        }
        self.refuse(&placement::messages().stance);
        self.drive(core, None)
    }

    pub(super) fn hearth_navigation(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let mut prepared = self.hearth.take().ok_or(ExecutionError::Invariant)?;
        prepared.geometry = None;
        match answer
            .navigation
            .pop()
            .ok_or(ExecutionError::Invariant)?
            .result
        {
            NavigationResult::Reached { path, .. } => {
                let stance = prepared.pending.take().ok_or(ExecutionError::Invariant)?;
                if path.last() != Some(&stance.stance) {
                    return Err(ExecutionError::Invariant);
                }
                self.accept_hearth(core, prepared, stance, path)
            }
            NavigationResult::NoRoute { .. } | NavigationResult::InvalidEndpoint { .. } => {
                self.refuse(&placement::messages().stance);
                self.drive(core, None)
            }
            _ => {
                self.refuse(
                    &core
                        .state
                        .installed
                        .ordinary_actions
                        .value()
                        .budget_exceeded,
                );
                self.drive(core, None)
            }
        }
    }

    fn accept_hearth(
        &mut self,
        core: &mut CoreMutation<'_>,
        prepared: PreparedHearth,
        stance: PlacementStance,
        path: Vec<SurfacePoint>,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::PlaceHearth {
            envelope,
            definition,
            site,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let Some(MaterialSelection::Ready {
            grant,
            stones,
            mut custody,
        }) = prepared.selection
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let from = actor
            .supported_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let installed = &core.state.installed;
        let meaning = installed
            .retained
            .hearths
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let working = from.surface_id == stance.stance.surface_id
            && crate::spatial::distance(from.point(), stance.stance.point())
                <= installed.movement_settings.arrival_tolerance;
        custody.resize(
            custody.bytes()
                + definition.heap_bytes().ok_or(ExecutionError::Capacity)?
                + path.heap_bytes().ok_or(ExecutionError::Capacity)?
                + site.surface_id.len()
                + stance.stance.surface_id.len()
                + envelope.id.len()
                + 256,
        )?;
        let mut action = Action::place_hearth(
            envelope.id.clone(),
            stance.stance,
            placement::Binding {
                definition: definition.clone(),
                site: site.clone(),
                point: stance.point,
                physical_life: actor.physical_life().unwrap_or_default(),
                stones,
            },
            grant,
            meaning.definition.work_seconds,
        );
        if !working {
            action.stage = "approaching".into();
            action.path = path;
        }
        self.action = Some(action);
        self.action_storage = Some(custody);
        self.phase = Phase::Prepared;
        self.drive(core, None)
    }

    pub(super) fn prepare_hearth_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::PlaceHearth { definition, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let definition = &core
            .state
            .installed
            .retained
            .hearths
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?
            .definition;
        let material = &core
            .state
            .installed
            .retained
            .items
            .get(&definition.input.definition.id)
            .ok_or(ExecutionError::Invariant)?
            .named
            .name;
        let copy = &placement::messages().activity;
        let mut custody = self.budget.reserve(
            1024 + definition.action_label.storage_bytes()
                + definition.help.storage_bytes()
                + 3 * material.storage_bytes(),
        )?;
        let fact = |name: &JsText, text| ActivityFact {
            name: name.clone(),
            value: ActivityDetail::Scalar(ActivityScalar::String(text)),
            critical: true,
            sentence: None,
        };
        let work_time = JsText::from(ryu_js::Buffer::new().format_finite(definition.work_seconds));
        let amount = JsText::from(definition.input.quantity.to_string());
        let view = ActivityView {
            name: definition.action_label.clone(),
            actor: None,
            tool: None,
            target: None,
            facts: vec![
                fact(
                    &copy.material_name,
                    JsText::concat(&[&amount, &" ".into(), material, &copy.material_suffix]),
                ),
                fact(
                    &copy.work_name,
                    JsText::concat(&[&work_time, &copy.work_suffix]),
                ),
                fact(&copy.placement_name, definition.help.clone()),
            ],
            children: None,
            result: None,
        };
        custody.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(custody);
        Ok(())
    }

    pub(super) fn hearth_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::PlaceHearth { definition, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let definition = &installed
            .retained
            .hearths
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?
            .definition;
        let kind = &installed.ordinary_actions.value().action_started_event;
        let _temporary = self.budget.reserve(
            512 + 3 * actor.len() + kind.len() + 2 * definition.activity_text.storage_bytes(),
        )?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: kind.clone(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor.to_owned(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(" ".into()),
                    NarrationPart::Literal(definition.activity_text.clone()),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(actor.to_owned()),
            target_id: None,
            data: Some(IndexMap::from([(
                "actionType".into(),
                crate::reception::EventScalar::Text("place-hearth".into()),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
