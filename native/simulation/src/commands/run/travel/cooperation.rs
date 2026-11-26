//! Cooperating characters explicitly accept exact terms. Accepted work and stock
//! remain with their ordinary owners. The same candidate handles save, undo and notices.
use super::*;
use serde_json::json;

pub(super) fn selected(state: &crate::simulation::SimulationState, args: &SqlCell) -> bool {
    matches!(
        args.get("operation").and_then(SqlCell::as_str),
        Some("propose" | "revise")
    ) || args
        .get("outingId")
        .and_then(SqlCell::as_str)
        .and_then(|id| state.outings.get(id))
        .is_some_and(|row| row.kind() == OutingKind::Cooperate)
}

fn owns_received_terms(
    state: &crate::simulation::SimulationState,
    actor: &str,
    id: &str,
    revision: u64,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let mut received = false;
    crate::worlds::base_outings::visit_agreements(state, actor, budget, |key, r, _| {
        received |= key == id && r == revision;
        Ok(())
    })?;
    Ok(received)
}

pub(super) struct Change {
    pub operation: String,
    pub cause: Option<&'static str>,
}
impl CommandCursor {
    pub(super) fn begin_joint(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        let installed = core.state.installed.clone();
        let ordinary = &installed.ordinary_actions.value().travel;
        let refusal = |this: &mut Self| {
            this.travel_result(
                false,
                "cooperation-unavailable",
                ordinary.messages.unavailable.as_str(),
            )
        };
        let Some(social) = installed.retained.social_offer_read.as_ref() else {
            refusal(self)?;
            return Ok(None);
        };
        let Some(law) = social.cooperation.as_ref() else {
            refusal(self)?;
            return Ok(None);
        };
        let NativeCommand::Outing {
            parameters,
            envelope,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = envelope.actor_id.as_str();
        let args = parameters.value();
        let operation = args
            .get("operation")
            .and_then(SqlCell::as_str)
            .unwrap_or_default();
        let prior = args
            .get("outingId")
            .and_then(SqlCell::as_str)
            .and_then(|id| core.state.outings.get(id));
        let other = match prior {
            None if operation == "propose" => args.get("recipientId").and_then(SqlCell::as_str),
            Some(row)
                if operation != "propose"
                    && row.kind() == OutingKind::Cooperate
                    && row.participants().contains(&actor) =>
            {
                row.participants().into_iter().find(|id| *id != actor)
            }
            _ => None,
        };
        let Some(other) = other.filter(|id| *id != actor) else {
            refusal(self)?;
            return Ok(None);
        };
        let ending = matches!(operation, "leave" | "decline" | "withdraw" | "conclude");
        let now = core.state.physical.header.sim_time;
        if !ending
            && (!travel_able(core, actor)?
                || !travel_able(core, other)?
                || ![actor, other].iter().all(|id| {
                    core.state.physical.entities.get(id).is_some_and(|ent| {
                        ent.actor.as_ref().is_some_and(|body| {
                            body.capabilities
                                .as_ref()
                                .map_or(body.controller != "native", |caps| {
                                    caps.speech && caps.language
                                })
                        })
                    })
                }))
        {
            refusal(self)?;
            return Ok(None);
        }
        if operation == "propose" {
            if core
                .state
                .outings
                .pair_ids(actor, other, &self.budget)?
                .any(|id| {
                    core.state.outings.get(id).is_some_and(|r| {
                        r.kind() == OutingKind::Cooperate
                            || social.one_pending_per_pair && r.status() == OutingStatus::Pending
                    })
                })
            {
                self.travel_result(false, "cooperation-pending", social.messages.pair.clone())?;
                return Ok(None);
            }
            if let Some(problem) = offers::pending_slots(core, actor, other, &self.budget)? {
                self.travel_result(false, problem.code, problem.message.clone())?;
                return Ok(None);
            }
        } else if prior.is_none_or(|r| {
            Some(r.revision()) != args.get("expectedRevision").and_then(SqlCell::as_u64)
        }) {
            refusal(self)?;
            return Ok(None);
        }
        let row_bytes = prior.and_then(|r| r.body().heap_bytes()).unwrap_or(0);
        let workspace = self.budget.reserve(
            (row_bytes + args.heap_bytes().ok_or(ExecutionError::Capacity)? + 4096)
                .checked_mul(12)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if let Some(row) = prior {
            if !owns_received_terms(core.state, actor, row.id(), row.revision(), &self.budget)? {
                refusal(self)?;
                return Ok(None);
            }
            let end = row
                .body()
                .get(if row.status() == OutingStatus::Pending {
                    "expiresAt"
                } else {
                    "endAt"
                })
                .and_then(SqlCell::as_f64);
            if !ending
                && (end.is_none_or(|at| at <= now)
                    || !crate::worlds::base_outings::terms_current(
                        core.state,
                        row.body(),
                        &self.budget,
                    )?)
            {
                refusal(self)?;
                return Ok(None);
            }
            if !ending
                && !row.participants().into_iter().all(|id| {
                    row.body()
                        .get("lives")
                        .and_then(|l| l.get(id))
                        .and_then(SqlCell::as_u64)
                        == core
                            .state
                            .physical
                            .entities
                            .get(id)
                            .and_then(|e| e.physical_life())
                })
            {
                refusal(self)?;
                return Ok(None);
            }
        }
        let mut body = match prior {
            Some(row) => serde_json::to_value(row.body()).map_err(|_| ExecutionError::Invariant)?,
            None => {
                json!({"id":envelope.id,"revision":1,"kind":"cooperate","proposerId":actor,"recipientId":other,
                "definition":{"id":social.id,"version":social.version},"lives":{(actor):core.state.physical.entities.get(actor).and_then(|e|e.physical_life()),(other):core.state.physical.entities.get(other).and_then(|e|e.physical_life())},
                "status":"pending","createdAt":now,"expiresAt":now+social.pending_seconds,"ownedWork":{},"arrived":[]})
            }
        };
        let revision = body["revision"].as_u64().ok_or(ExecutionError::Invariant)?;
        let next = revision
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let pending = body["status"] == "pending";
        let amendment = body.get("pendingAmendment");
        let amendment_author = amendment.and_then(|a| a["proposedBy"].as_str());
        let amendment_selected = amendment.is_some_and(|a| {
            a["expiresAt"].as_f64().is_some_and(|at| at > now) && {
                a["revision"].as_u64() == args.get("amendmentRevision").and_then(SqlCell::as_u64)
            }
        });
        let mut cause = None;
        match operation {
            "propose" | "revise" => {
                if amendment.is_some() {
                    refusal(self)?;
                    return Ok(None);
                }
                let Some(terms) = crate::worlds::base_outings::cooperation_terms(
                    core.state,
                    actor,
                    other,
                    args,
                    &self.budget,
                )?
                else {
                    refusal(self)?;
                    return Ok(None);
                };
                if pending {
                    body["proposerId"] = actor.into();
                    body["recipientId"] = other.into();
                    body["terms"] = terms;
                    body["createdAt"] = now.into();
                    body["expiresAt"] = (now + social.pending_seconds).into();
                } else {
                    body["pendingAmendment"] = json!({"revision":next,"proposedBy":actor,"terms":terms,"createdAt":now,"expiresAt":now+social.pending_seconds});
                }
                if operation == "revise" {
                    body["revision"] = next.into();
                }
            }
            "accept"
                if pending && body["recipientId"] == actor
                    || amendment_selected && amendment_author != Some(actor) =>
            {
                let mut occupied = false;
                for person in [actor, other] {
                    occupied |= core
                        .state
                        .outings
                        .actor_ids(person, &self.budget)?
                        .any(|key| {
                            Some(key) != body["id"].as_str()
                                && core
                                    .state
                                    .outings
                                    .get(key)
                                    .is_some_and(|r| r.status() != OutingStatus::Pending)
                        });
                }
                if occupied {
                    refusal(self)?;
                    return Ok(None);
                }
                if let Some(amendment) = body
                    .as_object_mut()
                    .and_then(|r| r.remove("pendingAmendment"))
                {
                    body["terms"] = amendment["terms"].clone();
                    body["arrived"] = json!([]);
                    body["ownedWork"] = json!({});
                }
                body["status"] = "accepted".into();
                body["acceptedAt"] = now.into();
                body["acceptedRevision"] = next.into();
                body["revision"] = next.into();
                body["endAt"] = (now + law.episode_seconds).into();
                let prepare = body["terms"]["task"]["kind"] == "prepare";
                if let Some(files) = body.as_object_mut() {
                    for key in [
                        "prepared",
                        "reportedPrepared",
                        "carried",
                        "constructionResult",
                    ] {
                        files.remove(key);
                    }
                }
                if prepare {
                    body["prepared"] = 0.into();
                    body["reportedPrepared"] = 0.into();
                }
            }
            "withdraw" | "decline"
                if amendment_selected
                    && (operation == "withdraw") == (amendment_author == Some(actor)) =>
            {
                body.as_object_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .remove("pendingAmendment");
                body["revision"] = next.into();
            }
            "withdraw" if pending && body["proposerId"] == actor => cause = Some("withdrawn"),
            "decline" if pending && body["recipientId"] == actor => cause = Some("declined"),
            "leave" if !pending => cause = Some("withdrawn"),
            "conclude" if !pending => cause = Some("concluded"),
            _ => {
                refusal(self)?;
                return Ok(None);
            }
        }
        let value: SqlCell = serde_json::from_value(body).map_err(|_| ExecutionError::Invariant)?;
        let mut prepared = Consent::new(&self.budget)?;
        prepared.joint = Some(Change {
            operation: operation.into(),
            cause,
        });
        prepared.trip = Some((value, workspace));
        self.binding.serial = core.journal.next_provider_serial()?;
        let pair = [actor, other];
        prepared.ending_reception = MutualHearing::prepare(core, pair, self.binding, &self.budget)?;
        let needs_geometry = prepared.ending_reception.is_some();
        self.travel = Some(prepared);
        if needs_geometry {
            self.phase = Phase::TravelEndReception;
            Ok(Some(Progress::Geometry))
        } else {
            self.finish_joint(core, None).map(Some)
        }
    }

    pub(super) fn finish_joint(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<Progress, ExecutionError> {
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let change = travel.joint.as_ref().ok_or(ExecutionError::Invariant)?;
        let trip = &mut travel.trip.as_mut().ok_or(ExecutionError::Invariant)?.0;
        let pair = [
            offers::text(trip, "proposerId")?,
            offers::text(trip, "recipientId")?,
        ];
        let heard = match (travel.ending_reception.take(), answer) {
            (Some(check), Some(answer)) => check.finish(core, pair, answer)?,
            (None, None) => false,
            _ => return Err(ExecutionError::InvalidCheckpoint),
        };
        if !heard && change.cause.is_none() {
            self.travel_result(
                false,
                "cooperation-reception",
                "Both people must perceive and hear one another to review these terms.",
            )?;
            return self.drive(core, None);
        }
        travel.other_received_ending = heard;
        if self.options.preview {
            self.travel_result(true, "available", "These terms are available.")?;
            return self.drive(core, None);
        }
        let combat = trip.get("kind").and_then(SqlCell::as_str) == Some("combat-help");
        if combat
            && (change.operation == "accept" || change.cause.is_some())
            && !crate::worlds::base_outings::help_goal(
                core,
                trip,
                change.operation == "accept",
                &self.budget,
            )?
        {
            self.travel_result(false, "help-goal", crate::worlds::base_outings::HELP_RISK)?;
            return self.drive(core, None);
        }
        if matches!(change.operation.as_str(), "propose" | "help") {
            let id = core
                .state
                .physical
                .identity
                .allocate(if combat { "outing" } else { "cooperation" })?
                .id;
            let SqlCell::Object(fields) = trip else {
                return Err(ExecutionError::Invariant);
            };
            fields.insert("id".into(), SqlCell::Text(id.into()));
        }
        if change.cause.is_some() {
            core.remove_outing(offers::text(trip, "id")?)?;
        } else {
            let custody = self
                .budget
                .reserve(trip.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            core.replace_outing(trip.clone_within_heap_bound(), custody, &self.budget)?;
        }
        self.phase = Phase::TravelNotices;
        self.drive(core, None)
    }

    pub(super) fn next_joint_notice(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let trip = &travel.trip.as_ref().ok_or(ExecutionError::Invariant)?.0;
        let change = travel.joint.as_ref().ok_or(ExecutionError::Invariant)?;
        let pair = [
            offers::text(trip, "proposerId")?,
            offers::text(trip, "recipientId")?,
        ];
        let installed = core.state.installed.clone();
        let dynamic_words;
        let words = if trip.get("kind").and_then(SqlCell::as_str) == Some("combat-help") {
            dynamic_words = JsText::from(crate::worlds::base_outings::HELP_RISK);
            &dynamic_words
        } else {
            let policy = installed
                .retained
                .social_offer_read
                .as_ref()
                .and_then(|p| p.cooperation.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            policy
                .labels
                .get(match change.operation.as_str() {
                    "revise" => "propose",
                    other => other,
                })
                .unwrap_or(&policy.description)
        };
        while let Some(actor) = pair.get(travel.announce).copied() {
            travel.announce += 1;
            if change.cause.is_some()
                && actor != self.command.envelope().actor_id
                && !travel.other_received_ending
            {
                continue;
            }
            self.binding.serial = core.journal.next_provider_serial()?;
            travel.notice = TravelNoticePreparation::joint(
                core,
                trip,
                actor,
                words,
                change.cause,
                self.binding,
                &self.budget,
            )?;
            if travel.notice.is_some() {
                self.phase = Phase::TravelTerms;
                return Ok(Some(Progress::TravelTerms));
            }
        }
        self.travel_result(true, "cooperation", words.clone())?;
        Ok(None)
    }
}
