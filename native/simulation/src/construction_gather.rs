//! Operational material authority is read only for a tracked gather. The
//! saved action keeps its exact original fences, never grant contents.
//! See docs/projects/editable-shelters-tech-design.md#116-complete-authority-contribution-and-exposed-property.

use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::mem::size_of;
use std::sync::Arc;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MaterialPermissionPolicy {
    material_origins: usize,
    changed: String,
    full: String,
}

fn policy() -> &'static MaterialPermissionPolicy {
    static POLICY: std::sync::LazyLock<MaterialPermissionPolicy> = std::sync::LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/construction-permission-policy.json"
        ))
        .expect("construction permission policy")
    });
    &POLICY
}

pub fn material_origin_limit() -> usize {
    policy().material_origins
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct MaterialGrantFence {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct MaterialPermissionBinding {
    pub(crate) definition: DefinitionPin,
    grants: Vec<MaterialGrantFence>,
}

heap_record!(MaterialGrantFence { id });
heap_record!(MaterialPermissionBinding { definition, grants });

impl MaterialPermissionBinding {
    pub(crate) fn valid_for(&self, definition: &DefinitionPin) -> bool {
        &self.definition == definition
            && !self.grants.is_empty()
            && self
                .grants
                .iter()
                .all(|fence| fence.revision > 0 && is_safe_record_id(&fence.id))
            && self
                .grants
                .iter()
                .enumerate()
                .all(|(at, fence)| self.grants[..at].iter().all(|prior| prior.id != fence.id))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialGrant {
    pub id: String,
    world_id: String,
    actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    revoked: bool,
    pub material_ids: Vec<String>,
    site: ConstructionSite,
    operations: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    contribution: Option<ContributionScope>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    acquisition: Option<MaterialAcquisitionRules>,
}

/// Bounds on the grant's exact named support. Receipt bounds use this same
/// record shape. A site and its material must be covered by one grant.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConstructionSite {
    pub surface_id: String,
    pub min_x: f64,
    pub max_x: f64,
    pub min_z: f64,
    pub max_z: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContributionScope {
    expires_at: f64,
    foreign_origin_ids: Vec<String>,
    prior_contribution_ids: Vec<String>,
}

impl ConstructionSite {
    pub(crate) fn valid(&self) -> bool {
        is_safe_record_id(&self.surface_id)
            && [self.min_x, self.max_x, self.min_z, self.max_z].into_iter().all(f64::is_finite)
            && self.min_x <= self.max_x
            && self.min_z <= self.max_z
    }

    fn covers(&self, site: &Self) -> bool {
        self.surface_id == site.surface_id
            && self.min_x <= site.min_x
            && self.max_x >= site.max_x
            && self.min_z <= site.min_z
            && self.max_z >= site.max_z
    }
}

#[derive(Debug, Deserialize)]
struct MaterialAcquisitionRules {
    sources: Vec<MaterialSource>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MaterialSource {
    entity_id: String,
    definition: DefinitionPin,
}

heap_record!(MaterialGrant {
    id,
    world_id,
    actor_id,
    material_ids,
    site,
    operations,
    contribution,
    acquisition
});
heap_record!(ConstructionSite { surface_id });
heap_record!(ContributionScope { foreign_origin_ids, prior_contribution_ids });
heap_record!(MaterialAcquisitionRules { sources });
heap_record!(MaterialSource {
    entity_id,
    definition
});

impl MaterialGrant {
    pub fn is_valid(&self, world: &str, id: &str, revision: u64) -> bool {
        self.world_id == world
            && self.id == id
            && self.revision == revision
            && self.revision > 0
            && is_safe_record_id(&self.id)
            && is_safe_record_id(&self.actor_id)
            && self.site.valid()
            && self.operations.iter().all(|operation| is_safe_record_id(operation))
            && self.contribution.as_ref().is_none_or(|scope| {
                scope.expires_at.is_finite()
                    && scope.foreign_origin_ids.iter().all(|id| is_safe_record_id(id))
                    && scope.prior_contribution_ids.iter().all(|id| is_safe_record_id(id))
            })
            && self.material_ids.len() <= material_origin_limit()
            && self.material_ids.iter().all(|id| is_safe_record_id(id))
            && self.acquisition.as_ref().is_none_or(|acquisition| {
                acquisition.sources.iter().enumerate().all(|(at, source)| {
                    is_safe_record_id(&source.entity_id)
                        && source.definition.is_valid()
                        && acquisition.sources[..at]
                            .iter()
                            .all(|prior| prior.entity_id != source.entity_id)
                })
            })
    }

    pub(crate) fn permits_hearth(&self, actor: &str, at: f64, site: &ConstructionSite) -> bool {
        !self.revoked
            && self.actor_id == actor
            && self.operations.iter().any(|operation| operation == "place-hearth")
            && self.site.covers(site)
            && self.contribution.as_ref().is_none_or(|scope| at < scope.expires_at)
    }

    pub(crate) fn permits_origins(&self, origins: &[String], contribution_ids: &[String]) -> bool {
        !origins.is_empty()
            && origins.iter().all(|origin| self.material_ids.contains(origin))
            && self.contribution.as_ref().is_none_or(|scope| {
                !origins.iter().any(|origin| scope.foreign_origin_ids.contains(origin))
                    || contribution_ids.iter().any(|id| {
                        id == &self.id || scope.prior_contribution_ids.contains(id)
                    })
            })
    }

    pub fn matches(&self, actor: &str, source: &str, definition: &DefinitionPin) -> bool {
        !self.revoked
            && self.actor_id == actor
            && self.acquisition.as_ref().is_some_and(|acquisition| {
                acquisition.sources.iter().any(|candidate| {
                    candidate.entity_id == source && &candidate.definition == definition
                })
            })
    }
}

/// Independently funded read from operational authority, scoped to one writer
/// and either one authenticated actor or one protected time offer.
pub struct MaterialGrants {
    grants: Vec<MaterialGrant>,
    camp_assets: Vec<crate::assembly::gate::AssetGrant>,
    _custody: ByteReservation,
}

impl MaterialGrants {
    pub(crate) fn hearth_available(&self, actor: &str, at: f64) -> bool {
        self.grants.iter().any(|grant| grant.actor_id == actor
            && grant.permits_hearth(actor, at, &grant.site))
    }

    pub(crate) fn hearth_revision<'a>(&'a self, actor: &'a str) -> impl Iterator<Item = (&'a str, u64, bool)> + 'a {
        self.grants.iter().filter_map(move |grant| (grant.actor_id == actor
            && grant.operations.iter().any(|op| op == "place-hearth"))
            .then_some((grant.id.as_str(), grant.revision, grant.revoked)))
    }

    pub fn from_funded(
        grants: Vec<MaterialGrant>,
        camp_assets: Vec<crate::assembly::gate::AssetGrant>,
        mut custody: ByteReservation,
    ) -> Result<Self, crate::host::CapacityError> {
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            grants.heap_bytes().ok_or(crate::host::CapacityError)?,
            camp_assets.heap_bytes().ok_or(crate::host::CapacityError)?,
        ])
        .ok_or(crate::host::CapacityError)?;
        if bytes > custody.bytes() {
            return Err(crate::host::CapacityError);
        }
        custody.resize(bytes)?;
        Ok(Self {
            grants,
            camp_assets,
            _custody: custody,
        })
    }
}

/// One actual gathered lot and the ordered current grants to which it belongs.
/// The store rechecks those matches before it publishes the original prefix.
pub struct GatheredMaterial {
    pub action_id: String,
    pub actor_id: String,
    pub physical_life: u64,
    pub at: f64,
    pub source_id: String,
    pub definition: DefinitionPin,
    pub item_id: String,
    pub quantity: u64,
    pub grants: Vec<MaterialGrantFence>,
    _custody: ByteReservation,
}

/// Ordered protected effects for one candidate. Publication uses the same
/// grant locks and timeline receipt transaction for both physical families.
pub enum ConstructionEffect {
    Gather(GatheredMaterial),
    Hearth(CompletedHearth),
    Gate(CompletedGate),
}

impl ConstructionEffect {
    pub fn actor_id(&self) -> &str {
        match self {
            Self::Gather(fact) => &fact.actor_id,
            Self::Hearth(fact) => &fact.actor_id,
            Self::Gate(fact) => &fact.actor_id,
        }
    }
}

pub struct CompletedGate {
    pub actor_id: String,
    pub grant: MaterialGrantFence,
    _custody: ByteReservation,
}

pub struct CompletedHearth {
    pub action_id: String,
    pub actor_id: String,
    pub physical_life: u64,
    pub at: f64,
    pub hearth_id: String,
    pub definition: DefinitionPin,
    pub grant: MaterialGrantFence,
    pub site: ConstructionSite,
    pub origin_ids: Vec<String>,
    _custody: ByteReservation,
}

impl CompletedHearth {
    /// The exact contribution checks already belonged to each lot while it
    /// was live. Here we verify the same guarded grant and origin membership.
    pub fn permitted(&self, grant: &MaterialGrant) -> bool {
        grant.id == self.grant.id && grant.revision == self.grant.revision
            && grant.permits_hearth(&self.actor_id, self.at, &self.site)
            && self.origin_ids.iter().all(|origin| grant.material_ids.contains(origin))
    }
}

#[derive(Default)]
pub(crate) struct ConstructionGather {
    pub(crate) checked: bool,
    pub(crate) protected: bool,
    pub(crate) input: Option<Arc<MaterialGrants>>,
    effects: Vec<Arc<ConstructionEffect>>,
    slots: Option<ByteReservation>,
}

#[derive(Clone, Copy)]
pub(crate) enum Refusal {
    Changed,
    Full,
    Hearth(&'static crate::worlds::InstalledActionMessage),
    Gate,
}

impl Refusal {
    pub(crate) fn code(self) -> &'static str {
        match self {
            Self::Changed => "construction-permission",
            Self::Full => "construction-material-limit",
            Self::Hearth(copy) => &copy.code,
            Self::Gate => &crate::worlds::base_gate_use::copy().changed.code,
        }
    }

    pub(crate) fn message(self) -> &'static str {
        let copy = policy();
        match self {
            Self::Changed => &copy.changed,
            Self::Full => &copy.full,
            Self::Hearth(copy) => &copy.message,
            Self::Gate => &crate::worlds::base_gate_use::copy().changed.message,
        }
    }
}

pub(crate) struct PreparedGrantFences {
    pub(crate) grants: Vec<MaterialGrantFence>,
    pub(crate) custody: ByteReservation,
}

impl ConstructionGather {
    pub(crate) fn for_advance(input: Option<Arc<MaterialGrants>>) -> Self {
        Self {
            checked: true,
            protected: input.is_some(),
            input,
            ..Self::default()
        }
    }

    pub(crate) fn for_command(input: Option<Arc<MaterialGrants>>) -> Self {
        Self {
            checked: input.is_some(),
            input,
            ..Self::default()
        }
    }

    pub(crate) fn checkpoint(&self) -> usize {
        self.effects.len()
    }

    pub(crate) fn rollback(&mut self, before: usize) {
        self.effects.truncate(before);
    }

    pub(crate) fn effects(&self) -> &[Arc<ConstructionEffect>] {
        &self.effects
    }

    pub(crate) fn gate_grant<'a>(
        &'a self,
        state: &crate::simulation::SimulationState,
        gate: &crate::assembly::gate::GateRead<'_>,
        intent: &crate::assembly::gate::GateIntent,
        prior: Option<&MaterialGrantFence>,
    ) -> Result<Option<&'a crate::assembly::gate::AssetGrant>, ExecutionError> {
        let contracts = self.input.as_deref().ok_or(ExecutionError::ConstructionGatherNeedsAuthority)?;
        Ok(gate.permitted(&state.physical.header.id, &state.physical.entities,
            intent, &contracts.camp_assets, prior))
    }

    pub(crate) fn record_gate(
        &mut self, actor: &str, grant: &MaterialGrantFence, budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if !self.protected {
            return Err(ExecutionError::ConstructionGatherNeedsAuthority);
        }
        let custody = budget.reserve(size_of::<ConstructionEffect>() + 2 * size_of::<usize>()
            + actor.len() + grant.id.len())?;
        self.reserve_effect_slot(budget)?;
        self.effects.push(Arc::new(ConstructionEffect::Gate(CompletedGate {
            actor_id: actor.to_owned(), grant: grant.clone(), _custody: custody,
        })));
        Ok(())
    }

    pub(crate) fn hearth_grants(&self) -> impl Iterator<Item = &MaterialGrant> {
        self.input.iter().flat_map(|input| input.grants.iter())
    }

    pub(crate) fn hearth_fence(&self, grant: &MaterialGrant) -> Result<MaterialGrantFence, ExecutionError> {
        let revision = grant.revision.checked_add(self.used(grant) as u64)
            .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        Ok(MaterialGrantFence { id: grant.id.clone(), revision })
    }

    pub(crate) fn current_hearth_grant(
        &self, fence: &MaterialGrantFence, actor: &str, at: f64, site: &ConstructionSite,
    ) -> Result<Option<&MaterialGrant>, ExecutionError> {
        if self.input.is_none() { return Err(ExecutionError::ConstructionGatherNeedsAuthority); }
        Ok(self.hearth_grants().find(|grant| {
            grant.id == fence.id && grant.permits_hearth(actor, at, site)
                && grant.revision.checked_add(self.used(grant) as u64) == Some(fence.revision)
        }))
    }

    fn used(&self, grant: &MaterialGrant) -> usize {
        self.effects
            .iter()
            .filter_map(|effect| match effect.as_ref() {
                ConstructionEffect::Gather(fact) => Some(fact),
                ConstructionEffect::Hearth(_) | ConstructionEffect::Gate(_) => None,
            })
            .filter(|effect| {
                effect.grants.iter().any(|fence| fence.id == grant.id)
                    && !grant.material_ids.contains(&effect.item_id)
            })
            .count()
    }

    /// Resolve each fence against the input and earlier accepted-order facts
    /// in this same candidate. A new matching grant may receive an origin,
    /// but an exact grant on the action cannot be replaced mid-work.
    pub(crate) fn prepare(
        &self,
        actor: &str,
        source: &str,
        definition: &DefinitionPin,
        prior: Option<&MaterialPermissionBinding>,
        budget: &ByteBudget,
    ) -> Result<Result<Option<PreparedGrantFences>, Refusal>, ExecutionError> {
        let Some(input) = &self.input else {
            return if self.checked || prior.is_some() {
                Err(ExecutionError::ConstructionGatherNeedsAuthority)
            } else {
                Ok(Ok(None))
            };
        };
        let matches = || {
            input
                .grants
                .iter()
                .filter(|grant| grant.matches(actor, source, definition))
        };
        let revision = |grant: &MaterialGrant| grant.revision.checked_add(self.used(grant) as u64);
        if let Some(prior) = prior
            && (&prior.definition != definition
                || prior.grants.iter().any(|fence| {
                    !matches().any(|grant| {
                        grant.id == fence.id && revision(grant) == Some(fence.revision)
                    })
                }))
        {
            return Ok(Err(Refusal::Changed));
        }
        let mut count = 0;
        let mut bytes = 0;
        for grant in matches() {
            if grant.material_ids.len() + self.used(grant) >= material_origin_limit() {
                return Ok(Err(Refusal::Full));
            }
            bytes = heap_sum([bytes, size_of::<MaterialGrantFence>(), grant.id.len()])
                .ok_or(ExecutionError::Capacity)?;
            count += 1;
        }
        if count == 0 {
            return Ok(Ok(None));
        }
        let custody = budget.reserve(bytes)?;
        let mut grants = Vec::new();
        grants
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for grant in matches() {
            grants.push(MaterialGrantFence {
                id: grant.id.clone(),
                revision: revision(grant).ok_or(ExecutionError::Identity)?,
            });
        }
        Ok(Ok(Some(PreparedGrantFences { grants, custody })))
    }

    pub(crate) fn record(
        &mut self,
        prepared: PreparedGrantFences,
        action: &str,
        actor: &str,
        physical_life: u64,
        at: f64,
        source: &str,
        definition: &DefinitionPin,
        item: &str,
        quantity: u64,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let PreparedGrantFences {
            grants,
            mut custody,
        } = prepared;
        custody.resize(
            heap_sum([
                custody.bytes(),
                size_of::<ConstructionEffect>() + 2 * size_of::<usize>(),
                action.len(),
                actor.len(),
                source.len(),
                item.len(),
                definition.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self.reserve_effect_slot(budget)?;
        self.effects.push(Arc::new(ConstructionEffect::Gather(GatheredMaterial {
            action_id: action.to_owned(),
            actor_id: actor.to_owned(),
            physical_life,
            at,
            source_id: source.to_owned(),
            definition: definition.clone(),
            item_id: item.to_owned(),
            quantity,
            grants,
            _custody: custody,
        })));
        Ok(())
    }
    fn reserve_effect_slot(&mut self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        if self.slots.is_none() {
            self.slots = Some(budget.reserve(0)?);
        }
        let slots = self
            .slots
            .as_mut()
            .expect("admitted construction effect slots");
        if self.effects.len() == self.effects.capacity() {
            let capacity = self
                .effects
                .capacity()
                .max(2)
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?;
            slots.resize(
                capacity
                    .checked_mul(size_of::<Arc<ConstructionEffect>>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.effects
                .try_reserve_exact(capacity - self.effects.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        Ok(())
    }

    pub(crate) fn record_hearth(
        &mut self, actor: &str, at: f64, action: &crate::state::Action,
        hearth_id: &str, definition: &crate::hearth::Definition, budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if !self.protected { return Err(ExecutionError::ConstructionGatherNeedsAuthority); }
        let work = action.hearth_work.as_ref().ok_or(ExecutionError::Invariant)?;
        let grant = action.construction_grant.as_ref().ok_or(ExecutionError::Invariant)?;
        let mut bytes = heap_sum([
            size_of::<ConstructionEffect>() + 2 * size_of::<usize>(),
            actor.len(), action.id.len(), hearth_id.len(), work.site.surface_id.len(),
            work.definition.heap_bytes().ok_or(ExecutionError::Capacity)?, grant.id.len(),
        ]).ok_or(ExecutionError::Capacity)?;
        let count = work.stones.iter().try_fold(0_usize, |count, stone| {
            for id in &stone.origin_ids {
                bytes = bytes.checked_add(id.len() + size_of::<String>())?;
            }
            count.checked_add(stone.origin_ids.len())
        }).ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(bytes)?;
        let mut origin_ids = Vec::new();
        origin_ids.try_reserve_exact(count).map_err(|_| ExecutionError::Capacity)?;
        for id in work.stones.iter().flat_map(|stone| &stone.origin_ids) {
            if !origin_ids.contains(id) { origin_ids.push(id.clone()); }
        }
        self.reserve_effect_slot(budget)?;
        self.effects.push(Arc::new(ConstructionEffect::Hearth(CompletedHearth {
            action_id: action.id.clone(), actor_id: actor.to_owned(), physical_life: work.physical_life, at,
            hearth_id: hearth_id.to_owned(), definition: work.definition.clone(), grant: (**grant).clone(),
            site: crate::hearth::site::grant_bounds(&work.site, definition), origin_ids, _custody: custody,
        })));
        Ok(())
    }
}

impl PreparedGrantFences {
    pub(crate) fn into_binding(self, definition: &DefinitionPin) -> MaterialPermissionBinding {
        MaterialPermissionBinding {
            definition: definition.clone(),
            grants: self.grants,
        }
    }
}

pub(crate) fn has_bound_work(state: &crate::simulation::SimulationState) -> bool {
    let entities = &state.physical.entities;
    entities
        .ordered_ids()
        .filter_map(|id| entities.get(id))
        .any(|body| {
            body.actor
                .as_ref()
                .and_then(|actor| actor.action.as_ref())
                .is_some_and(|action| action.material_permission.is_some() || action.is_placing_hearth() || action.is_operating_gate())
        })
}

/// Reconcile saved unfinished work before publishing a reopened installation.
/// No world time or finished stock changes. Use the same personal result and
/// activity closure as due completion, before taking the action out of service.
pub(crate) fn reconcile(
    core: &mut crate::execution::CoreMutation<'_>,
    budget: &ByteBudget,
) -> Result<(), crate::time::AdvanceError> {
    use crate::execution::{ActionFinish, ActionWrite, PlanGenerationWrite};
    use crate::experience::{acquire_activity_result, prepare_activity_result};
    let mut invalid = Vec::new();
    let mut workspace = budget.reserve(0)?;
    let entities = &core.state.physical.entities;
    for owner in entities.ordered_ids().filter_map(|id| entities.get(id)) {
        let Some(action) = owner.actor.as_ref().and_then(|actor| actor.action.as_ref()) else { continue; };
        let problem = if let Some(prior) = action.material_permission.as_deref() {
            match action.target_id.as_deref().and_then(|id| crate::gathering::source(core.state, id)) {
                Some(source) => core.journal.material_gather.prepare(
                    &owner.id, &source.entity.id, &source.definition.pin, Some(prior), budget,
                )?.err(),
                None => Some(Refusal::Changed),
            }
        } else if let Some(work) = &action.hearth_work {
            let Some(meaning) = core.state.installed.retained.hearths.get(&work.definition.id) else {
                return Err(ExecutionError::Invariant.into());
            };
            crate::hearth::current_problem(core.state, &core.journal.material_gather, owner, action,
                &meaning.definition, core.state.physical.header.sim_time, budget)?.map(Refusal::Hearth)
        } else if let Some(work) = action.gate_work.as_deref() {
            let Some(gate) = work.intent.read(core.state) else {
                return Err(ExecutionError::Invariant.into());
            };
            core.journal.material_gather.gate_grant(core.state, &gate, &work.intent, Some(&work.grant))?
                .is_none().then_some(Refusal::Gate)
        } else {
            None
        };
        if let Some(reason) = problem {
            workspace.resize(
                heap_sum([
                    workspace.bytes(),
                    size_of::<(String, String, Refusal)>(),
                    owner.id.len(),
                    action.id.len(),
                    reason.message().len(),
                    Refusal::Changed.code().len(),
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            invalid
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
            invalid.push((owner.id.clone(), action.id.clone(), reason));
        }
    }
    if invalid.is_empty() {
        return Ok(());
    }
    core.settle_numeric_prediction()?;
    let installed = Arc::clone(&core.state.installed);
    for (owner, action, reason) in invalid {
        let result = crate::commands::Outcome {
            ok: false,
            code: reason.code().into(),
            message: reason.message().into(),
            spent: None,
            outputs: None,
            item_id: None,
            recipe_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        };
        if let ActionFinish::Personal(pending) =
            core.begin_finish_action(&owner, &action, result)?
        {
            let prepared = prepare_activity_result(core, pending.personal(), budget)?;
            let acquired = acquire_activity_result(core, prepared, &installed.schema)?;
            core.complete_finish_action(pending, &acquired)?;
        }
        core.physical().replace_action(
            &owner,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )?;
    }
    Ok(())
}
