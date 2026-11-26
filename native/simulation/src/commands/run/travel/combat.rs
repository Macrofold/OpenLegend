//! Both people must currently recognize an eligible opponent before consent.
//! Acceptance installs the recipient's own goal and starts no attack.
use super::*;
use crate::worlds::base_outings::{HELP_RISK, combat_current, combat_proposal};

impl CommandCursor {
    pub(super) fn begin_combat_help(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        let NativeCommand::Outing {
            parameters,
            envelope,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let args = parameters.value();
        let actor = &envelope.actor_id;
        let operation = args
            .get("operation")
            .and_then(SqlCell::as_str)
            .unwrap_or_default();
        let deny = |this: &mut Self| this.travel_result(false, "help-unavailable", HELP_RISK);
        let budget = &self.budget;
        let Some(social) = core.state.installed.retained.social_offer_read.as_ref() else {
            deny(self)?;
            return Ok(None);
        };
        let mut cause = None;
        let scratch =
            budget.reserve(8192 + args.heap_bytes().ok_or(ExecutionError::Capacity)? * 8)?;
        let mut body = if operation == "help" {
            let Some(other) = args.get("recipientId").and_then(SqlCell::as_str) else {
                deny(self)?;
                return Ok(None);
            };
            let Some(opponent) = args.get("opponentId").and_then(SqlCell::as_str) else {
                deny(self)?;
                return Ok(None);
            };
            if actor == other
                || !travel_able(core, actor)?
                || !travel_able(core, other)?
                || core
                    .state
                    .outings
                    .pair_ids(actor, other, budget)?
                    .any(|id| {
                        core.state.outings.get(id).is_some_and(|v| {
                            v.kind() == OutingKind::CombatHelp
                                || social.one_pending_per_pair
                                    && v.status() == OutingStatus::Pending
                        })
                    })
            {
                deny(self)?;
                return Ok(None);
            }
            if let Some(problem) = offers::pending_slots(core, actor, other, budget)? {
                self.travel_result(false, problem.code, problem.message.clone())?;
                return Ok(None);
            }
            let accepted = core
                .state
                .outings
                .accepted_id(actor, OutingKind::CombatHelp, budget)?
                .is_some()
                || core
                    .state
                    .outings
                    .accepted_id(other, OutingKind::CombatHelp, budget)?
                    .is_some();
            if accepted {
                deny(self)?;
                return Ok(None);
            }
            let human = envelope.human_initiated == Some(true)
                || core
                    .state
                    .physical
                    .entities
                    .get(actor)
                    .and_then(|e| e.actor.as_ref())
                    .is_some_and(|s| s.controller == "player");
            let Some(value) =
                combat_proposal(core.state, actor, other, &envelope.id, opponent, human)?
            else {
                deny(self)?;
                return Ok(None);
            };
            serde_json::from_value(value).map_err(|_| ExecutionError::Invariant)?
        } else {
            let Some(row) = args
                .get("outingId")
                .and_then(SqlCell::as_str)
                .and_then(|id| core.state.outings.get(id))
                .filter(|row| {
                    row.kind() == OutingKind::CombatHelp
                        && row.participants().contains(&actor.as_str())
                        && Some(row.revision())
                            == args.get("expectedRevision").and_then(SqlCell::as_u64)
                })
            else {
                deny(self)?;
                return Ok(None);
            };
            if !crate::outings::view::knows_current(core.state, actor, row.id(), budget)? {
                deny(self)?;
                return Ok(None);
            }
            let pair = row.participants();
            let pending = row.status() == OutingStatus::Pending;
            let mut trip = row.body().clone_within_heap_bound();
            match operation {
                "decline" if pending && pair[1] == actor => cause = Some("declined"),
                "leave" => cause = Some("left"),
                "accept" if pending && pair[1] == actor => {
                    let combat = row.body().get("combat").ok_or(ExecutionError::Invariant)?;
                    let target = offers::text(combat, "opponentId")?;
                    let life = combat
                        .get("opponentLife")
                        .and_then(SqlCell::as_u64)
                        .ok_or(ExecutionError::Invariant)?;
                    if row
                        .deadline()
                        .is_none_or(|v| v <= core.state.physical.header.sim_time)
                        || !combat_current(
                            core.state,
                            pair,
                            target,
                            life,
                            combat.get("humanProposed").and_then(SqlCell::as_bool) == Some(true),
                            true,
                        )?
                    {
                        deny(self)?;
                        return Ok(None);
                    }
                    for person in pair {
                        let own = core
                            .state
                            .physical
                            .entities
                            .get(person)
                            .and_then(|entity| entity.actor.as_ref())
                            .ok_or(ExecutionError::MissingActor)?;
                        if Some(own.plan_generation)
                            != row
                                .body()
                                .get("work")
                                .and_then(|w| w.get(person))
                                .and_then(SqlCell::as_u64)
                            || core
                                .state
                                .outings
                                .accepted_id(person, OutingKind::CombatHelp, budget)?
                                .is_some()
                        {
                            deny(self)?;
                            return Ok(None);
                        }
                    }
                    let SqlCell::Object(ref mut fields) = trip else {
                        return Err(ExecutionError::Invariant);
                    };
                    fields.insert("status".into(), SqlCell::Text("helping".into()));
                    fields.insert("revision".into(), SqlCell::Number(2.into()));
                }
                _ => {
                    deny(self)?;
                    return Ok(None);
                }
            }
            trip
        };
        let pair = [
            offers::text(&body, "proposerId")?,
            offers::text(&body, "recipientId")?,
        ];
        self.binding.serial = core.journal.next_provider_serial()?;
        let reception = MutualHearing::prepare(core, pair, self.binding, budget)?;
        let mut consent = Consent::new(budget)?;
        consent.joint = Some(cooperation::Change {
            operation: operation.into(),
            cause,
        });
        consent.ending_reception = reception;
        let query = consent.ending_reception.is_some();
        let mut hold = scratch;
        hold.resize(body.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        consent.trip = Some((body, hold));
        self.travel = Some(consent);
        if query {
            self.phase = Phase::TravelEndReception;
            Ok(Some(Progress::Geometry))
        } else {
            self.finish_joint(core, None).map(Some)
        }
    }
}
