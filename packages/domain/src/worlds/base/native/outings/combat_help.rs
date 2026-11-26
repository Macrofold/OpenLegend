//! Voluntary combat help selects an opponent and an independently chosen goal.
//! The recipient keeps authority over individual moves and attacks.
use crate::{
    execution::{CoreMutation, ExecutionError},
    host::ByteBudget,
    plans::{GoalChange, GoalOperation, change_goal},
    records::SqlCell,
    simulation::SimulationState,
    text::JsText,
    worlds::{InstalledPersonalNameReader, base_decision_offers::activity_opponent_permitted},
};
use serde_json::{Value, json};

pub(crate) const HELP_PURPOSE: &str = "Help me in this fight";
pub(crate) const HELP_RISK: &str =
    "You may be injured or killed. You choose how to help and can stop.";

pub(crate) fn combat_current(
    state: &SimulationState,
    participants: [&str; 2],
    id: &str,
    life: u64,
    human: bool,
    see: bool,
) -> Result<bool, ExecutionError> {
    let Some(opponent) = state
        .physical
        .entities
        .get(id)
        .filter(|e| e.physical_life() == Some(life))
    else {
        return Ok(false);
    };
    let Some(target) = opponent.actor.as_ref() else {
        return Ok(false);
    };
    if human
        && !state
            .installed
            .body_policy
            .as_ref()
            .and_then(|p| p.value().combat.as_ref())
            .is_some_and(|policy| policy.human_issued_targets.contains(&target.controller))
    {
        return Ok(false);
    }
    for person in participants {
        let Some(body) = state.physical.entities.get(person) else {
            return Ok(false);
        };
        if !activity_opponent_permitted(&state.installed, body, opponent) {
            return Ok(false);
        }
        if see {
            let names = InstalledPersonalNameReader::prepare(
                &state.physical,
                &state.reception,
                &state.installed,
                &state.experience,
                person,
            )?;
            if names.current_body_grant(id)?.is_none() {
                return Ok(false);
            }
        }
    }
    Ok(true)
}

pub(crate) fn combat_proposal(
    state: &SimulationState,
    a: &str,
    b: &str,
    id: &str,
    opponent: &str,
    human: bool,
) -> Result<Option<Value>, ExecutionError> {
    let Some(target) = state.physical.entities.get(opponent) else {
        return Ok(None);
    };
    let Some(life) = target.physical_life() else {
        return Ok(None);
    };
    let Some(point) = target.world_position() else {
        return Ok(None);
    };
    if !combat_current(state, [a, b], opponent, life, human, true)? {
        return Ok(None);
    }
    let mut lives = serde_json::Map::new();
    let mut labels = serde_json::Map::new();
    let mut work = serde_json::Map::new();
    for actor in [a, b] {
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let who = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        labels.insert(
            actor.into(),
            json!(who.observer_name(opponent)?.name.to_owned()),
        );
        lives.insert(actor.into(), json!(entity.physical_life()));
        work.insert(
            actor.into(),
            json!(
                entity
                    .actor
                    .as_ref()
                    .ok_or(ExecutionError::MissingActor)?
                    .plan_generation
            ),
        );
    }
    let now = state.physical.header.sim_time;
    let social = state
        .installed
        .retained
        .social_offer_read
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    Ok(Some(
        json!({"id":id,"kind":"combat-help","revision":1,"proposerId":a,"recipientId":b,"destination":{"point":point,"label":HELP_PURPOSE},"purpose":HELP_PURPOSE,"createdAt":now,"expiresAt":now+social.pending_seconds,"status":"pending","proposerMode":"enqueue","work":work,"arrived":[],"company":{},"combat":{"opponentId":opponent,"opponentLife":life,"lives":lives,"labels":labels,"humanProposed":human}}),
    ))
}

pub(crate) fn help_goal(
    core: &mut CoreMutation<'_>,
    trip: &mut SqlCell,
    accept: bool,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let helper = super::text(trip, "recipientId")
        .map_err(|_| ExecutionError::Invariant)?
        .to_owned();
    let proposer = super::text(trip, "proposerId").map_err(|_| ExecutionError::Invariant)?;
    let combat = trip.get("combat").ok_or(ExecutionError::Invariant)?;
    let source = core
        .state
        .physical
        .entities
        .get(&helper)
        .and_then(|v| v.actor.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let mut next_identity = core.state.physical.identity;
    let (change, id) = if accept {
        let names = InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            &helper,
        )?;
        let mut objective = JsText::from("Help ");
        objective.push_text(&names.observer_name(proposer)?.name.to_owned());
        objective.push_str(" against ");
        objective.push_text(
            combat
                .get("labels")
                .and_then(|m| m.get(&helper))
                .and_then(SqlCell::as_text)
                .ok_or(ExecutionError::Invariant)?,
        );
        objective.push_str(". Choose how to help and stop when needed.");
        let id = next_identity.allocate("help-goal")?.id;
        (
            GoalChange {
                operation: GoalOperation::Create,
                goal_id: None,
                expected_revision: None,
                parent_id: None,
                objective: Some(objective),
            },
            id,
        )
    } else {
        let Some(id) = combat.get("goalId").and_then(SqlCell::as_str) else {
            return Ok(true);
        };
        let Some(goal) = source
            .agency
            .goals
            .iter()
            .find(|g| g.id == id && matches!(g.status.as_str(), "active" | "paused"))
        else {
            return Ok(true);
        };
        (
            GoalChange {
                operation: GoalOperation::Abandon,
                goal_id: Some(id.into()),
                expected_revision: Some(goal.revision),
                parent_id: None,
                objective: None,
            },
            id.into(),
        )
    };
    let result = change_goal(core, &helper, &change, &id, "actor", budget)?;
    if result.outcome.ok && accept {
        core.state.physical.identity = next_identity;
        let SqlCell::Object(row) = trip else {
            return Err(ExecutionError::Invariant);
        };
        let Some(SqlCell::Object(combat)) = row.get_mut("combat") else {
            return Err(ExecutionError::Invariant);
        };
        combat.insert("goalId".into(), SqlCell::Text(id.into()));
    }
    Ok(result.outcome.ok)
}
