//! Native-origin semantic dependencies, distinct from receipt, source and body
//! leases. Rechecking one actor never compares the global accepted cut.
use super::*;
use crate::appraisals::AppraisalScope;
use crate::host::retained_size::heap_sum;
use crate::simulation::InstalledWorld;
use crate::state::{ActorAgency, ActorState, Entity};
use crate::status::{AttributeAudience, EntityReference, StatusOperation, project_attributes};
use serde::ser::{SerializeMap, SerializeSeq};
use std::sync::Arc;

pub(crate) struct DecisionValidityWitness {
    actor: String,
    world: String,
    generation: String,
    required: Vec<AppraisalScope>,
    installed: Arc<InstalledWorld>,
    decision: String,
    prepared: String,
    outcomes: String,
    _storage: ByteReservation,
}
#[derive(Serialize)]
struct Installed {
    modules: u64,
    cognition: u64,
    status: u64,
}
#[derive(Serialize)]
struct Identity<'a> {
    name: &'a crate::text::JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    species: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    traits: Option<&'a Vec<crate::state::CharacterTrait>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Action<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    stage: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
}
struct Agency<'a>(&'a ActorAgency);
impl Serialize for Agency<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        self.0.serialize_without_semantic(s)
    }
}
struct Attribute<'a> {
    value: &'a crate::reception::AttributeView,
    stable: bool,
}
impl Serialize for Attribute<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let crate::reception::AttributeView {
            id,
            version,
            name,
            display,
            presentation,
            change_feedback,
            body_health,
            value,
            status,
            critical,
            editor_critical,
            revision,
            min,
            max,
            unit,
            editor_critical_comparison,
            meaning,
            condition,
            concern,
        } = self.value;
        let mut out = s.serialize_map(None)?;
        out.serialize_entry("id", id)?;
        out.serialize_entry("version", version)?;
        out.serialize_entry("name", name)?;
        out.serialize_entry("display", display)?;
        out.serialize_entry("presentation", presentation)?;
        if let Some(v) = change_feedback {
            out.serialize_entry("changeFeedback", v)?;
        }
        if let Some(v) = body_health {
            out.serialize_entry("bodyHealth", v)?;
        }
        if !self.stable {
            out.serialize_entry("value", value)?;
        }
        out.serialize_entry("status", status)?;
        if let Some(v) = critical {
            out.serialize_entry("critical", v)?;
        }
        if let Some(v) = editor_critical {
            out.serialize_entry("editorCritical", v)?;
        }
        if !self.stable {
            out.serialize_entry("revision", revision)?;
        }
        if let Some(v) = min {
            out.serialize_entry("min", v)?;
        }
        if let Some(v) = max {
            out.serialize_entry("max", v)?;
        }
        if let Some(v) = unit {
            out.serialize_entry("unit", v)?;
        }
        if let Some(v) = editor_critical_comparison {
            out.serialize_entry("editorCriticalComparison", v)?;
        }
        if let Some(v) = meaning {
            out.serialize_entry("meaning", v)?;
        }
        if let Some(v) = condition {
            out.serialize_entry("condition", v)?;
        }
        if let Some(v) = concern {
            out.serialize_entry("concern", v)?;
        }
        out.end()
    }
}
struct Outcomes<'a>(&'a outcomes::RequiredResults<'a>);
impl Serialize for Outcomes<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut out = s.serialize_seq(Some(self.0.values().len()))?;
        for value in self.0.values() {
            out.serialize_element(value.evidence())?;
        }
        out.end()
    }
}
struct Facts<'a, H: Serialize, P: Serialize> {
    state: &'a SimulationState,
    entity: &'a Entity,
    actor: &'a ActorState,
    attributes: Vec<Attribute<'a>>,
    hot: H,
    subscribed: P,
    outcomes: Option<&'a outcomes::RequiredResults<'a>>,
    forgotten: bool,
    corrections: bool,
}
struct Decision<'a, 'b, H: Serialize, P: Serialize>(&'a Facts<'b, H, P>);
struct Prepared<'a, 'b, H: Serialize, P: Serialize>(&'a Facts<'b, H, P>);
fn own_fields<M: SerializeMap>(
    out: &mut M,
    state: &SimulationState,
    actor: &ActorState,
    entity: &Entity,
    forgotten: bool,
    corrections: bool,
) -> Result<(), M::Error> {
    if let Some(v) = actor.physical_life {
        out.serialize_entry("life", &v)?;
    }
    out.serialize_entry("controller", &actor.controller)?;
    out.serialize_entry("alive", &actor.alive)?;
    out.serialize_entry("incapacitated", &actor.incapacitated)?;
    if let Some(v) = &actor.capabilities {
        out.serialize_entry("capabilities", v)?;
    }
    let mind = state
        .minds
        .inner_worlds
        .as_ref()
        .and_then(|owners| owners.get(&entity.id))
        .map(|v| v.revision)
        .or_else(|| {
            state
                .minds
                .minds
                .as_ref()
                .and_then(|owners| owners.get(&entity.id))
                .map(|v| v.revision)
        });
    if let Some(v) = mind {
        out.serialize_entry("mind", &v)?;
    }
    if let Some(history) = state.experience.actor(&entity.id) {
        if forgotten {
            out.serialize_entry("forgotten", history.privacy.forgotten_ids())?;
        }
        if corrections {
            out.serialize_entry("corrections", history.privacy.corrections())?;
        }
    }
    Ok(())
}
impl<H: Serialize, P: Serialize> Serialize for Decision<'_, '_, H, P> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let f = self.0;
        let mut out = s.serialize_map(None)?;
        out.serialize_entry(
            "installed",
            &Installed {
                modules: f.state.installed.manifest.revision,
                cognition: f.state.installed.cognition.revision,
                status: f.state.installed.status_policy.revision,
            },
        )?;
        out.serialize_entry(
            "identity",
            &Identity {
                name: &f.entity.name,
                species: f.actor.species.as_deref(),
                traits: f.actor.traits.as_ref(),
            },
        )?;
        out.serialize_entry("actorId", &f.entity.id)?;
        own_fields(
            &mut out,
            f.state,
            f.actor,
            f.entity,
            f.forgotten,
            f.corrections,
        )?;
        // Native comparison keeps the actual typed body. Node's finite formatter
        // applies the existing canonical body-revision reader for Source bytes.
        if let Some(body) = &f.actor.body {
            out.serialize_entry("body", body)?;
        }
        out.serialize_entry("attributes", &f.attributes)?;
        out.serialize_entry("feelings", &f.hot)?;
        out.serialize_entry("planGeneration", &f.actor.plan_generation)?;
        out.serialize_entry("agency", &Agency(&f.actor.agency))?;
        let action = f.actor.action.as_ref().map(|v| Action {
            id: &v.id,
            kind: &v.kind,
            stage: &v.stage,
            target_id: v.target_id.as_deref(),
        });
        out.serialize_entry("action", &action)?;
        out.serialize_entry(
            "outcomes",
            &Outcomes(
                f.outcomes
                    .ok_or_else(|| serde::ser::Error::custom("decision outcomes unavailable"))?,
            ),
        )?;
        out.end()
    }
}
impl<H: Serialize, P: Serialize> Serialize for Prepared<'_, '_, H, P> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let f = self.0;
        let mut out = s.serialize_map(None)?;
        out.serialize_entry("world", &f.state.physical.header.id)?;
        out.serialize_entry("policy", &f.state.installed.cognition)?;
        out.serialize_entry("modules", &f.state.installed.manifest.revision)?;
        out.serialize_entry("status", &f.state.installed.status_policy.revision)?;
        out.serialize_entry(
            "identity",
            &(
                &f.entity.name,
                &f.entity.description,
                &f.actor.species,
                &f.actor.traits,
                &f.actor.personality,
                &f.actor.backstory,
            ),
        )?;
        own_fields(
            &mut out,
            f.state,
            f.actor,
            f.entity,
            f.forgotten,
            f.corrections,
        )?;
        out.serialize_entry("goals", &f.actor.agency.goals)?;
        out.serialize_entry("feelings", &f.subscribed)?;
        out.end()
    }
}
#[derive(Clone, Copy)]
enum SignatureRoute {
    Both,
    Decision,
    Prepared,
}
impl SignatureRoute {
    fn decision(self) -> bool {
        matches!(self, Self::Both | Self::Decision)
    }
    fn prepared(self) -> bool {
        matches!(self, Self::Both | Self::Prepared)
    }
}
struct CapturedSignatures {
    decision: Option<String>,
    prepared: Option<String>,
    outcomes: Option<String>,
    storage: ByteReservation,
}
/// The initial read needs both signatures. A later validity query reads only
/// the Source helper's dependencies; unrelated scopes cannot spend its quota.
fn capture_signatures(
    state: &SimulationState,
    actor_id: &str,
    required: &[AppraisalScope],
    route: SignatureRoute,
    budget: &ByteBudget,
) -> Result<CapturedSignatures, ExecutionError> {
    let entity = state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let projected = if route.decision() {
        Some(project_attributes(
            entity,
            &state.installed.attributes,
            state.physical.pending_values.as_ref(),
            AttributeAudience::Owner,
            budget,
        )?)
    } else {
        None
    };
    let rows = projected.as_ref().map_or(&[][..], |views| views.rows());
    let owner_keys = actor_id
        .len()
        .checked_mul(12)
        .and_then(|n| n.checked_add(256))
        .ok_or(ExecutionError::Capacity)?;
    let _views = budget.reserve(
        rows.len()
            .checked_mul(size_of::<Attribute<'_>>())
            .and_then(|n| n.checked_add(owner_keys))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let attributes=rows.iter().map(|value| {
        let definition=state.installed.attributes.get(&value.id).map(|v|v.value());
        let flowing=state.installed.status_policy.definitions.iter().any(|definition|definition.while_active.iter().any(|operation|
            matches!(operation,StatusOperation::Rate{change_rate,..} if change_rate.target==EntityReference::Subject && change_rate.attribute==value.id)));
        Attribute {value,stable:definition.is_some_and(|d|(d.reservoir.is_some()||flowing)&&(d.concern.is_some()||d.condition.is_some()))}
    }).collect::<Vec<_>>();
    let appraisal = crate::appraisals::capture_validity_views(
        state,
        actor_id,
        if route.prepared() { required } else { &[] },
        route.decision(),
        budget,
    )?;
    let outcomes = if route.decision() {
        Some(outcomes::capture(state, actor_id, &actor.agency, budget)?)
    } else {
        None
    };
    let owner = |table, path: &[&str]| -> Result<bool, ExecutionError> {
        let id = crate::encoding::json_record(path).map_err(|_| ExecutionError::Invariant)?;
        Ok(state.records.placement(table, &id).is_some())
    };
    let facts = Facts {
        state,
        entity,
        actor,
        attributes,
        hot: appraisal.hot(),
        subscribed: appraisal.subscribed(),
        outcomes: outcomes.as_ref(),
        forgotten: owner(
            "mind_forgotten_owners",
            &["world", "experience", "forgotten", actor_id],
        )?,
        corrections: owner(
            "mind_corrections_owners",
            &["world", "experience", "corrections", actor_id],
        )?,
    };
    let decision = route.decision().then_some(Decision(&facts));
    let prepared = route.prepared().then_some(Prepared(&facts));
    // Only the original witness retains a separate required-outcome signature.
    let outcome_view = if matches!(route, SignatureRoute::Both) {
        outcomes.as_ref().map(Outcomes)
    } else {
        None
    };
    let decision_bytes = decision
        .as_ref()
        .map(crate::encoding::json_record_len)
        .transpose()
        .map_err(|_| ExecutionError::Invariant)?
        .unwrap_or(0);
    let prepared_bytes = prepared
        .as_ref()
        .map(crate::encoding::json_record_len)
        .transpose()
        .map_err(|_| ExecutionError::Invariant)?
        .unwrap_or(0);
    let outcome_bytes = outcome_view
        .as_ref()
        .map(crate::encoding::json_record_len)
        .transpose()
        .map_err(|_| ExecutionError::Invariant)?
        .unwrap_or(0);
    let bytes = decision_bytes
        .checked_add(prepared_bytes)
        .and_then(|n| n.checked_add(outcome_bytes))
        .and_then(|n| n.checked_mul(4))
        .and_then(|n| n.checked_add(size_of::<CapturedSignatures>()))
        .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    Ok(CapturedSignatures {
        decision: decision
            .as_ref()
            .map(crate::encoding::json_record)
            .transpose()
            .map_err(|_| ExecutionError::Invariant)?,
        prepared: prepared
            .as_ref()
            .map(crate::encoding::json_record)
            .transpose()
            .map_err(|_| ExecutionError::Invariant)?,
        outcomes: outcome_view
            .as_ref()
            .map(crate::encoding::json_record)
            .transpose()
            .map_err(|_| ExecutionError::Invariant)?,
        storage,
    })
}
impl DecisionValidityWitness {
    pub(crate) fn capture(
        state: &SimulationState,
        actor_id: &str,
        required: &[AppraisalScope],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut values =
            capture_signatures(state, actor_id, required, SignatureRoute::Both, budget)?;
        let names = heap_sum([
            actor_id.len(),
            state.physical.header.id.len(),
            state.generation.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let scopes = required
            .iter()
            .try_fold(
                required
                    .len()
                    .checked_mul(size_of::<AppraisalScope>())
                    .ok_or(ExecutionError::Capacity)?,
                |n, v| {
                    n.checked_add(v.definition_pin.heap_bytes()?)
                        .and_then(|n| n.checked_add(v.target_id.heap_bytes()?))
                },
            )
            .ok_or(ExecutionError::Capacity)?;
        values.storage.resize(
            values
                .storage
                .bytes()
                .checked_add(names)
                .and_then(|n| n.checked_add(scopes))
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor: actor_id.to_owned(),
            world: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            required: required.to_vec(),
            installed: Arc::clone(&state.installed),
            decision: values.decision.take().ok_or(ExecutionError::Invariant)?,
            prepared: values.prepared.take().ok_or(ExecutionError::Invariant)?,
            outcomes: values.outcomes.take().ok_or(ExecutionError::Invariant)?,
            _storage: values.storage,
        })
    }
    pub(crate) fn decision_json(&self) -> &str {
        &self.decision
    }
    /// Reflection source validation observes the existing result addresses;
    /// unrelated self meter/goal/agency changes belong to other consumers.
    pub(crate) fn required_outcomes_current(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if self.actor != actor
            || self.world != state.physical.header.id
            || self.generation != state.generation
        {
            return Ok(false);
        }
        let Some(agency) = state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .map(|a| &a.agency)
        else {
            return Ok(false);
        };
        let values = outcomes::capture(state, actor, agency, budget)?;
        crate::encoding::json_record_eq(&Outcomes(&values), &self.outcomes)
            .map_err(|_| ExecutionError::Invariant)
    }
    pub(crate) fn prepared_json(&self) -> &str {
        &self.prepared
    }
    fn permitted(&self, state: &SimulationState, actor: &str) -> bool {
        actor == self.actor
            && state.physical.header.id == self.world
            && state.generation == self.generation
            && Arc::ptr_eq(&state.installed, &self.installed)
            && state.physical.entities.get(actor).is_some_and(|e| {
                e.actor.as_ref().is_some_and(|a| a.controller == "npc") && e.has_memory()
            })
    }
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if !self.permitted(state, actor) {
            return Ok(false);
        }
        Ok(
            capture_signatures(state, actor, &[], SignatureRoute::Decision, budget)?
                .decision
                .as_deref()
                == Some(self.decision.as_str()),
        )
    }
    pub(crate) fn prepared_current(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if !self.permitted(state, actor) {
            return Ok(false);
        }
        Ok(capture_signatures(
            state,
            actor,
            &self.required,
            SignatureRoute::Prepared,
            budget,
        )?
        .prepared
        .as_deref()
            == Some(self.prepared.as_str()))
    }
}
