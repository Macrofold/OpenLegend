//! Deterministic native work envelopes and their single canonical invocation
//! owner. The operational limits are imported from the existing host policy;
//! omitted dimensions remain unconstrained, exactly as `requireWork` specifies.

use crate::encoding::sha256_hex;
use crate::identity::MAX_SAFE_INTEGER;
use crate::state::{EntityStore, WorkState};
use crate::values::{
    DefinitionPin, RecurringWork, WorkInvocation, WorkVector, deserialize_present_safe_integer,
    is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkUnit {
    Candidates,
    Tests,
    InputBytes,
    OutputBytes,
    Effects,
    Claims,
    Subscriptions,
    Live,
    Queued,
    RetainedBytes,
    Depth,
}

impl WorkUnit {
    pub const ALL: [Self; 11] = [
        Self::Candidates,
        Self::Tests,
        Self::InputBytes,
        Self::OutputBytes,
        Self::Effects,
        Self::Claims,
        Self::Subscriptions,
        Self::Live,
        Self::Queued,
        Self::RetainedBytes,
        Self::Depth,
    ];
    pub fn name(self) -> &'static str {
        match self {
            Self::Candidates => "candidates",
            Self::Tests => "tests",
            Self::InputBytes => "inputBytes",
            Self::OutputBytes => "outputBytes",
            Self::Effects => "effects",
            Self::Claims => "claims",
            Self::Subscriptions => "subscriptions",
            Self::Live => "live",
            Self::Queued => "queued",
            Self::RetainedBytes => "retainedBytes",
            Self::Depth => "depth",
        }
    }
    fn read(self, value: &WorkVector) -> u64 {
        match self {
            Self::Candidates => value.candidates,
            Self::Tests => value.tests,
            Self::InputBytes => value.input_bytes,
            Self::OutputBytes => value.output_bytes,
            Self::Effects => value.effects,
            Self::Claims => value.claims,
            Self::Subscriptions => value.subscriptions,
            Self::Live => value.live,
            Self::Queued => value.queued,
            Self::RetainedBytes => value.retained_bytes,
            Self::Depth => value.depth,
        }
    }
    fn write(self, value: &mut WorkVector, amount: u64) {
        match self {
            Self::Candidates => value.candidates = amount,
            Self::Tests => value.tests = amount,
            Self::InputBytes => value.input_bytes = amount,
            Self::OutputBytes => value.output_bytes = amount,
            Self::Effects => value.effects = amount,
            Self::Claims => value.claims = amount,
            Self::Subscriptions => value.subscriptions = amount,
            Self::Live => value.live = amount,
            Self::Queued => value.queued = amount,
            Self::RetainedBytes => value.retained_bytes = amount,
            Self::Depth => value.depth = amount,
        }
    }
}

macro_rules! demand {
    ($($field:ident),+ $(,)?) => {
        #[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        pub struct WorkDemand {
            $(#[serde(default, deserialize_with = "deserialize_present_safe_integer", skip_serializing_if = "Option::is_none")]
            pub $field: Option<u64>,)+
        }
    };
}
demand!(
    candidates,
    tests,
    input_bytes,
    output_bytes,
    effects,
    claims,
    subscriptions,
    live,
    queued,
    retained_bytes,
    depth
);

impl WorkDemand {
    pub fn vector(self) -> WorkVector {
        WorkVector {
            candidates: self.candidates.unwrap_or(0),
            tests: self.tests.unwrap_or(0),
            input_bytes: self.input_bytes.unwrap_or(0),
            output_bytes: self.output_bytes.unwrap_or(0),
            effects: self.effects.unwrap_or(0),
            claims: self.claims.unwrap_or(0),
            subscriptions: self.subscriptions.unwrap_or(0),
            live: self.live.unwrap_or(0),
            queued: self.queued.unwrap_or(0),
            retained_bytes: self.retained_bytes.unwrap_or(0),
            depth: self.depth.unwrap_or(0),
        }
    }
    fn read(self, unit: WorkUnit) -> Option<u64> {
        match unit {
            WorkUnit::Candidates => self.candidates,
            WorkUnit::Tests => self.tests,
            WorkUnit::InputBytes => self.input_bytes,
            WorkUnit::OutputBytes => self.output_bytes,
            WorkUnit::Effects => self.effects,
            WorkUnit::Claims => self.claims,
            WorkUnit::Subscriptions => self.subscriptions,
            WorkUnit::Live => self.live,
            WorkUnit::Queued => self.queued,
            WorkUnit::RetainedBytes => self.retained_bytes,
            WorkUnit::Depth => self.depth,
        }
    }
}
impl From<WorkVector> for WorkDemand {
    fn from(v: WorkVector) -> Self {
        Self {
            candidates: Some(v.candidates),
            tests: Some(v.tests),
            input_bytes: Some(v.input_bytes),
            output_bytes: Some(v.output_bytes),
            effects: Some(v.effects),
            claims: Some(v.claims),
            subscriptions: Some(v.subscriptions),
            live: Some(v.live),
            queued: Some(v.queued),
            retained_bytes: Some(v.retained_bytes),
            depth: Some(v.depth),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkError {
    InvalidBound,
    InvalidPolicy,
    InvalidIdentity,
    InvalidLineage,
    InvalidInvocation,
    IdentityConflict,
    UnsupportedResources,
    Capacity,
    Unavailable(WorkUnit),
    Contract(WorkUnit),
}

fn count(value: u64) -> Result<u64, WorkError> {
    (value <= MAX_SAFE_INTEGER)
        .then_some(value)
        .ok_or(WorkError::InvalidBound)
}
pub fn add_work(a: WorkVector, b: WorkVector) -> Result<WorkVector, WorkError> {
    let mut value = WorkVector::default();
    for unit in WorkUnit::ALL {
        let next = if unit == WorkUnit::Depth {
            unit.read(&a).max(unit.read(&b))
        } else {
            unit.read(&a)
                .checked_add(unit.read(&b))
                .ok_or(WorkError::InvalidBound)?
        };
        unit.write(&mut value, count(next)?);
    }
    Ok(value)
}
pub fn multiply_work(value: WorkVector, n: u64) -> Result<WorkVector, WorkError> {
    count(n)?;
    let mut result = WorkVector::default();
    for unit in WorkUnit::ALL {
        let next = if unit == WorkUnit::Depth {
            if n == 0 { 0 } else { value.depth }
        } else {
            unit.read(&value)
                .checked_mul(n)
                .ok_or(WorkError::InvalidBound)?
        };
        unit.write(&mut result, count(next)?);
    }
    Ok(result)
}
pub fn require_work(value: WorkVector, limit: WorkDemand, contract: bool) -> Result<(), WorkError> {
    for unit in WorkUnit::ALL {
        count(unit.read(&value))?;
        if let Some(bound) = limit.read(unit) {
            count(bound)?;
            if unit.read(&value) > bound {
                return Err(if contract {
                    WorkError::Contract(unit)
                } else {
                    WorkError::Unavailable(unit)
                });
            }
        }
    }
    Ok(())
}
fn retained(value: WorkVector) -> Result<(), WorkError> {
    for unit in WorkUnit::ALL {
        count(unit.read(&value))?;
        if !matches!(
            unit,
            WorkUnit::Live | WorkUnit::Queued | WorkUnit::RetainedBytes | WorkUnit::Subscriptions
        ) && unit.read(&value) != 0
        {
            return Err(WorkError::InvalidBound);
        }
    }
    Ok(())
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkPolicy {
    pub version: String,
    pub group: WorkDemand,
    pub actor: WorkDemand,
    pub module: WorkDemand,
    pub world: WorkDemand,
}

/// Supplied once from the trusted current WORK_LIMITS owner. Keeping the full
/// exact body beside its hash fences accidental policy mixing across arms.
pub struct InstalledWorkPolicy {
    canonical: Arc<str>,
    sha256: String,
    value: WorkPolicy,
}
impl InstalledWorkPolicy {
    pub fn verify(
        canonical: String,
        sha256: String,
        expected: WorkPolicy,
    ) -> Result<Self, WorkError> {
        let decoded: WorkPolicy =
            serde_json::from_str(&canonical).map_err(|_| WorkError::InvalidPolicy)?;
        if sha256_hex(canonical.as_bytes()) != sha256
            || decoded != expected
            || decoded.version.is_empty()
            || decoded.group.depth.is_none_or(|depth| depth == 0)
        {
            return Err(WorkError::InvalidPolicy);
        }
        for limit in [decoded.group, decoded.actor, decoded.module, decoded.world] {
            require_work(WorkVector::default(), limit, false)?;
        }
        Ok(Self {
            canonical: Arc::from(canonical),
            sha256,
            value: decoded,
        })
    }
    pub fn canonical(&self) -> &str {
        &self.canonical
    }
    pub fn sha256(&self) -> &str {
        &self.sha256
    }
    pub fn policy(&self) -> &WorkPolicy {
        &self.value
    }
}

#[derive(Clone, Debug)]
pub(crate) struct WorkRequest {
    pub id: String,
    pub parent_id: Option<String>,
    pub actor_id: String,
    pub module_id: String,
    pub definition_pin: DefinitionPin,
    pub limit: WorkVector,
    pub allocation: WorkVector,
    pub recurrence: Option<RecurringWork>,
}

pub(crate) enum InvocationEdit {
    Put(WorkInvocation),
    Remove(String),
}
pub(crate) struct WorkPlan {
    pub edits: Vec<InvocationEdit>,
}
pub(crate) struct WorkUndo {
    id: String,
    before: Option<(usize, WorkInvocation)>,
    owner_present: bool,
}

/// WorkState is owned here, once. All maps below it are disposable indexes of
/// that state, never a second independently writable invocation store.
pub struct WorkBook {
    state: Option<WorkState>,
    policy: Arc<InstalledWorkPolicy>,
    total: WorkVector,
    actors: BTreeMap<String, WorkVector>,
    modules: BTreeMap<String, WorkVector>,
    children: BTreeMap<String, Vec<String>>,
}
impl WorkBook {
    pub fn install(
        state: Option<WorkState>,
        policy: Arc<InstalledWorkPolicy>,
        entities: &EntityStore,
        at: f64,
    ) -> Result<Self, WorkError> {
        if !at.is_finite()
            || at < 0.0
            || state
                .as_ref()
                .is_some_and(|s| s.policy_version != policy.value.version)
        {
            return Err(WorkError::InvalidPolicy);
        }
        let mut value = Self {
            state,
            policy,
            total: WorkVector::default(),
            actors: BTreeMap::new(),
            modules: BTreeMap::new(),
            children: BTreeMap::new(),
        };
        if let Some(state) = &value.state {
            for invocation in state.invocations.values() {
                if let Some(parent) = &invocation.parent_id {
                    value
                        .children
                        .entry(parent.clone())
                        .or_default()
                        .push(invocation.id.clone());
                }
            }
            for (id, invocation) in &state.invocations {
                if id != &invocation.id
                    || ![
                        id.as_str(),
                        &invocation.root_id,
                        &invocation.actor_id,
                        &invocation.module_id,
                    ]
                    .into_iter()
                    .all(is_safe_record_id)
                    || entities.get(&invocation.actor_id).is_none()
                    || !invocation.definition_pin.is_valid()
                    || invocation.revision == 0
                    || invocation.revision > MAX_SAFE_INTEGER
                    || invocation.executions > MAX_SAFE_INTEGER
                    || invocation.children != value.children.get(id).map_or(0, |x| x.len() as u64)
                    || !invocation.started_at.is_finite()
                    || invocation.started_at < 0.0
                    || !invocation.interval_at.is_finite()
                    || invocation.interval_at < invocation.started_at
                    || invocation.interval_at > at
                {
                    return Err(WorkError::InvalidInvocation);
                }
                recurrence(invocation.recurrence)?;
                if invocation
                    .recurrence
                    .is_some_and(|r| invocation.executions > r.burst)
                {
                    return Err(WorkError::InvalidInvocation);
                }
                retained(invocation.allocation)?;
                require_work(invocation.used, invocation.limit.into(), false)?;
                require_work(invocation.limit, value.policy.value.group, false)?;
                let mut seen = BTreeSet::new();
                let mut cursor = invocation;
                while let Some(parent_id) = &cursor.parent_id {
                    if seen.contains(cursor.id.as_str())
                        || seen.len() as u64 >= value.policy.value.group.depth.unwrap()
                    {
                        return Err(WorkError::InvalidLineage);
                    }
                    seen.insert(cursor.id.as_str());
                    cursor = state
                        .invocations
                        .get(parent_id)
                        .ok_or(WorkError::InvalidLineage)?;
                    if cursor.root_id != invocation.root_id
                        || cursor.actor_id != invocation.actor_id
                        || cursor.module_id != invocation.module_id
                        || cursor.definition_pin != invocation.definition_pin
                    {
                        return Err(WorkError::InvalidLineage);
                    }
                }
                if cursor.id != invocation.root_id
                    || (invocation.parent_id.is_some() && invocation.recurrence.is_some())
                {
                    return Err(WorkError::InvalidLineage);
                }
                value.total = add_work(value.total, invocation.allocation)?;
                let actor = value.actors.entry(invocation.actor_id.clone()).or_default();
                *actor = add_work(*actor, invocation.allocation)?;
                let module = value
                    .modules
                    .entry(invocation.module_id.clone())
                    .or_default();
                *module = add_work(*module, invocation.allocation)?;
            }
        }
        require_work(value.total, value.policy.value.world, false)?;
        for allocation in value.actors.values() {
            require_work(*allocation, value.policy.value.actor, false)?;
        }
        for allocation in value.modules.values() {
            require_work(*allocation, value.policy.value.module, false)?;
        }
        Ok(value)
    }
    pub fn state(&self) -> Option<&WorkState> {
        self.state.as_ref()
    }
    pub fn invocation(&self, id: &str) -> Option<&WorkInvocation> {
        self.state.as_ref()?.invocations.get(id)
    }
    pub fn allocations(&self) -> WorkVector {
        self.total
    }
    pub fn require_allocation(
        &self,
        actor: &str,
        module: &str,
        demand: WorkVector,
    ) -> Result<(), WorkError> {
        require_work(
            add_work(self.actors.get(actor).copied().unwrap_or_default(), demand)?,
            self.policy.value.actor,
            false,
        )?;
        require_work(
            add_work(
                self.modules.get(module).copied().unwrap_or_default(),
                demand,
            )?,
            self.policy.value.module,
            false,
        )?;
        require_work(
            add_work(self.total, demand)?,
            self.policy.value.world,
            false,
        )
    }
    /// The execution owner settles only request/parent retained rate bindings
    /// before planning. Duplicate admission never replenishes any allowance.
    pub(crate) fn plan_admission(
        &self,
        request: WorkRequest,
        entities: &EntityStore,
        at: f64,
    ) -> Result<WorkPlan, WorkError> {
        if ![request.id.as_str(), &request.actor_id, &request.module_id]
            .into_iter()
            .all(is_safe_record_id)
            || request
                .parent_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
            || entities
                .get(&request.actor_id)
                .is_none_or(|e| e.retirement.is_some())
            || !request.definition_pin.is_valid()
        {
            return Err(WorkError::InvalidIdentity);
        }
        recurrence(request.recurrence)?;
        if let Some(existing) = self.invocation(&request.id) {
            if existing.actor_id != request.actor_id
                || existing.module_id != request.module_id
                || existing.parent_id != request.parent_id
                || existing.definition_pin != request.definition_pin
                || existing.limit != request.limit
                || existing.allocation != request.allocation
                || existing.recurrence != request.recurrence
            {
                return Err(WorkError::IdentityConflict);
            }
            return Ok(WorkPlan { edits: Vec::new() });
        }
        retained(request.allocation)?;
        require_work(request.limit, self.policy.value.group, false)?;
        require_work(request.allocation, self.policy.value.world, false)?;
        self.require_allocation(&request.actor_id, &request.module_id, request.allocation)?;
        let mut edits = Vec::new();
        let root_id = if let Some(parent_id) = &request.parent_id {
            let parent = self
                .invocation(parent_id)
                .ok_or(WorkError::InvalidLineage)?;
            if parent.actor_id != request.actor_id
                || parent.module_id != request.module_id
                || parent.definition_pin != request.definition_pin
                || request.recurrence.is_some()
            {
                return Err(WorkError::InvalidLineage);
            }
            let mut cursor = Some(parent);
            let mut depth = 1;
            while let Some(value) = cursor {
                depth += 1;
                if depth > self.policy.value.group.depth.unwrap() {
                    return Err(WorkError::Unavailable(WorkUnit::Depth));
                }
                cursor = value
                    .parent_id
                    .as_deref()
                    .map(|id| self.invocation(id).ok_or(WorkError::InvalidLineage))
                    .transpose()?;
            }
            let mut changed = parent.clone();
            changed.used = add_work(parent.used, add_work(request.limit, request.allocation)?)?;
            require_work(changed.used, parent.limit.into(), false)?;
            changed.children = count(
                parent
                    .children
                    .checked_add(1)
                    .ok_or(WorkError::InvalidBound)?,
            )?;
            changed.revision = count(
                parent
                    .revision
                    .checked_add(1)
                    .ok_or(WorkError::InvalidBound)?,
            )?;
            edits.push(InvocationEdit::Put(changed));
            parent.root_id.clone()
        } else {
            request.id.clone()
        };
        edits.push(InvocationEdit::Put(WorkInvocation {
            id: request.id,
            root_id,
            parent_id: request.parent_id,
            actor_id: request.actor_id,
            module_id: request.module_id,
            definition_pin: request.definition_pin,
            limit: request.limit,
            allocation: request.allocation,
            used: WorkVector::default(),
            started_at: at,
            interval_at: at,
            revision: 1,
            executions: 0,
            children: 0,
            recurrence: request.recurrence,
        }));
        Ok(WorkPlan { edits })
    }
    pub(crate) fn plan_release(&self, id: &str) -> Result<WorkPlan, WorkError> {
        let Some(source) = self.invocation(id) else {
            return Ok(WorkPlan { edits: Vec::new() });
        };
        let mut pending = vec![id.to_owned()];
        let mut cursor = 0;
        while cursor < pending.len() {
            if let Some(children) = self.children.get(&pending[cursor]) {
                pending.extend(children.iter().cloned());
            }
            cursor += 1;
        }
        let mut edits = Vec::with_capacity(pending.len() + usize::from(source.parent_id.is_some()));
        if let Some(parent_id) = &source.parent_id {
            let mut parent = self
                .invocation(parent_id)
                .ok_or(WorkError::InvalidLineage)?
                .clone();
            parent.children = parent
                .children
                .checked_sub(1)
                .ok_or(WorkError::InvalidLineage)?;
            parent.revision = count(
                parent
                    .revision
                    .checked_add(1)
                    .ok_or(WorkError::InvalidBound)?,
            )?;
            edits.push(InvocationEdit::Put(parent));
        }
        edits.extend(pending.into_iter().rev().map(InvocationEdit::Remove));
        Ok(WorkPlan { edits })
    }
    pub(crate) fn plan_charge(&self, id: &str, demand: WorkDemand) -> Result<WorkPlan, WorkError> {
        let invocation = self.invocation(id).ok_or(WorkError::InvalidInvocation)?;
        if invocation
            .recurrence
            .is_some_and(|r| invocation.executions >= r.burst)
        {
            return Err(WorkError::Contract(WorkUnit::Effects));
        }
        let mut changed = invocation.clone();
        for unit in WorkUnit::ALL {
            if let Some(amount) = demand.read(unit) {
                count(amount)?;
                let next = if unit == WorkUnit::Depth {
                    unit.read(&changed.used).max(amount)
                } else {
                    unit.read(&changed.used)
                        .checked_add(amount)
                        .ok_or(WorkError::InvalidBound)?
                };
                count(next)?;
                if next > unit.read(&changed.limit) {
                    return Err(WorkError::Contract(unit));
                }
                unit.write(&mut changed.used, next);
            }
        }
        changed.executions = count(
            changed
                .executions
                .checked_add(1)
                .ok_or(WorkError::InvalidBound)?,
        )?;
        changed.revision = count(
            changed
                .revision
                .checked_add(1)
                .ok_or(WorkError::InvalidBound)?,
        )?;
        Ok(WorkPlan {
            edits: vec![InvocationEdit::Put(changed)],
        })
    }
    pub(crate) fn plan_interval(&self, id: &str, at: f64) -> Result<WorkPlan, WorkError> {
        let mut changed = self
            .invocation(id)
            .ok_or(WorkError::InvalidInvocation)?
            .clone();
        crate::values::advance_invocation_interval(&mut changed, at)
            .map_err(|_| WorkError::InvalidInvocation)?;
        if Some(&changed) == self.invocation(id) {
            return Ok(WorkPlan { edits: Vec::new() });
        }
        Ok(WorkPlan {
            edits: vec![InvocationEdit::Put(changed)],
        })
    }
    /// Called only by the common typed journal after reserving its inverse.
    pub(crate) fn apply(&mut self, edit: InvocationEdit) -> Result<WorkUndo, WorkError> {
        let owner_present = self.state.is_some();
        let id = match &edit {
            InvocationEdit::Put(value) => value.id.clone(),
            InvocationEdit::Remove(id) => id.clone(),
        };
        let prior = self.state.as_ref().and_then(|s| s.invocations.get(&id));
        let next = match &edit {
            InvocationEdit::Put(value) => Some(value),
            InvocationEdit::Remove(_) => None,
        };
        self.adjust_indexes(prior.cloned().as_ref(), next)?;
        let state = self.state.get_or_insert_with(|| WorkState {
            policy_version: self.policy.value.version.clone(),
            invocations: IndexMap::new(),
        });
        let before = state
            .invocations
            .shift_remove_full(&id)
            .map(|(index, _, value)| (index, value));
        match edit {
            InvocationEdit::Put(value) => {
                let index = before
                    .as_ref()
                    .map_or(state.invocations.len(), |(index, _)| *index);
                state.invocations.shift_insert(index, id.clone(), value);
            }
            InvocationEdit::Remove(_) => {}
        }
        Ok(WorkUndo {
            id,
            before,
            owner_present,
        })
    }
    pub(crate) fn rollback(&mut self, undo: WorkUndo) -> Result<(), WorkError> {
        let current = self.invocation(&undo.id).cloned();
        self.adjust_indexes(
            current.as_ref(),
            undo.before.as_ref().map(|(_, value)| value),
        )?;
        let state = self.state.as_mut().ok_or(WorkError::InvalidInvocation)?;
        state.invocations.shift_remove(&undo.id);
        if let Some((index, value)) = undo.before {
            state.invocations.shift_insert(index, undo.id, value);
        }
        if !undo.owner_present {
            if !state.invocations.is_empty() {
                return Err(WorkError::InvalidInvocation);
            }
            self.state = None;
        }
        Ok(())
    }
    fn adjust_indexes(
        &mut self,
        before: Option<&WorkInvocation>,
        after: Option<&WorkInvocation>,
    ) -> Result<(), WorkError> {
        // All affected counters are preflighted before any index changes. A
        // changed interval's execution counters do not alter resident quotas.
        if before.zip(after).is_some_and(|(a, b)| {
            a.allocation == b.allocation
                && a.actor_id == b.actor_id
                && a.module_id == b.module_id
                && a.parent_id == b.parent_id
        }) {
            return Ok(());
        }
        let adjust = |value: WorkVector,
                      sub: WorkVector,
                      add: WorkVector|
         -> Result<WorkVector, WorkError> {
            let mut next = value;
            for unit in WorkUnit::ALL {
                unit.write(
                    &mut next,
                    count(
                        unit.read(&value)
                            .checked_sub(unit.read(&sub))
                            .and_then(|n| n.checked_add(unit.read(&add)))
                            .ok_or(WorkError::InvalidBound)?,
                    )?,
                );
            }
            Ok(next)
        };
        let zero = WorkVector::default();
        let total = adjust(
            self.total,
            before.map_or(zero, |x| x.allocation),
            after.map_or(zero, |x| x.allocation),
        )?;
        let mut actors = Vec::new();
        let mut modules = Vec::new();
        for key in before
            .map(|x| &x.actor_id)
            .into_iter()
            .chain(after.map(|x| &x.actor_id))
        {
            if actors.iter().any(|(k, _)| k == key) {
                continue;
            }
            actors.push((
                key.clone(),
                adjust(
                    self.actors.get(key).copied().unwrap_or_default(),
                    before
                        .filter(|x| &x.actor_id == key)
                        .map_or(zero, |x| x.allocation),
                    after
                        .filter(|x| &x.actor_id == key)
                        .map_or(zero, |x| x.allocation),
                )?,
            ));
        }
        for key in before
            .map(|x| &x.module_id)
            .into_iter()
            .chain(after.map(|x| &x.module_id))
        {
            if modules.iter().any(|(k, _)| k == key) {
                continue;
            }
            modules.push((
                key.clone(),
                adjust(
                    self.modules.get(key).copied().unwrap_or_default(),
                    before
                        .filter(|x| &x.module_id == key)
                        .map_or(zero, |x| x.allocation),
                    after
                        .filter(|x| &x.module_id == key)
                        .map_or(zero, |x| x.allocation),
                )?,
            ));
        }
        self.total = total;
        for (key, value) in actors {
            self.actors.insert(key, value);
        }
        for (key, value) in modules {
            self.modules.insert(key, value);
        }
        if let Some(old) = before {
            if let Some(parent) = &old.parent_id {
                if let Some(children) = self.children.get_mut(parent) {
                    children.retain(|id| id != &old.id);
                }
            }
        }
        if let Some(new) = after {
            if let Some(parent) = &new.parent_id {
                self.children
                    .entry(parent.clone())
                    .or_default()
                    .push(new.id.clone());
            }
        }
        Ok(())
    }
}
fn recurrence(value: Option<RecurringWork>) -> Result<(), WorkError> {
    if value.is_some_and(|r| {
        !r.interval_seconds.is_finite()
            || r.interval_seconds <= 0.0
            || r.burst == 0
            || r.burst > MAX_SAFE_INTEGER
    }) {
        Err(WorkError::InvalidInvocation)
    } else {
        Ok(())
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct MeterToken {
    index: usize,
    id: u64,
}
struct WorkMeter {
    id: u64,
    limit: WorkVector,
    used: WorkVector,
    depth: u64,
}

/// Candidate-owned operational metering, separate from saved invocations.
/// It follows a private continuation between workers/yields without TLS. A
/// refused child spends actual attempted work; checkpoint rollback never
/// subtracts that work or replenishes an enclosing allowance.
pub(crate) struct WorkMeters {
    group: WorkDemand,
    active: Vec<WorkMeter>,
    next_id: u64,
}
impl WorkMeters {
    pub(crate) fn heap_bound(group: WorkDemand) -> Result<usize, WorkError> {
        let depth = usize::try_from(group.depth.ok_or(WorkError::InvalidPolicy)?)
            .map_err(|_| WorkError::InvalidBound)?;
        depth
            .checked_mul(std::mem::size_of::<WorkMeter>())
            .ok_or(WorkError::InvalidBound)
    }
    pub(crate) fn new(group: WorkDemand) -> Result<Self, WorkError> {
        Self::heap_bound(group)?;
        let mut active = Vec::new();
        active
            .try_reserve_exact(group.depth.ok_or(WorkError::InvalidPolicy)? as usize)
            .map_err(|_| WorkError::Capacity)?;
        Ok(Self {
            group,
            active,
            next_id: 0,
        })
    }
    pub(crate) fn begin(&mut self, limit: WorkDemand) -> Result<MeterToken, WorkError> {
        let limit = limit.vector();
        let depth = self.active.last().map_or(1, |m| m.depth + 1);
        if self.group.depth.is_some_and(|maximum| depth > maximum) {
            return Err(WorkError::Contract(WorkUnit::Depth));
        }
        require_work(limit, self.group, false)?;
        let id = self.next_id;
        self.next_id = id.checked_add(1).ok_or(WorkError::InvalidBound)?;
        let token = MeterToken {
            index: self.active.len(),
            id,
        };
        self.active.push(WorkMeter {
            id,
            limit,
            used: WorkVector::default(),
            depth,
        });
        Ok(token)
    }
    pub(crate) fn resume(&self, token: MeterToken) -> Result<(), WorkError> {
        if self.active.len() != token.index + 1
            || self.active.last().is_none_or(|m| m.id != token.id)
        {
            return Err(WorkError::InvalidLineage);
        }
        Ok(())
    }
    pub(crate) fn finish(&mut self, token: MeterToken) -> Result<WorkVector, WorkError> {
        self.resume(token)?;
        Ok(self.active.pop().ok_or(WorkError::InvalidLineage)?.used)
    }
    pub(crate) fn charge(&mut self, demand: WorkDemand) -> Result<(), WorkError> {
        // Fresh seed installation has no meter, as in the existing source.
        if self.active.is_empty() {
            return Ok(());
        }
        for meter in self.active.iter().rev() {
            for unit in WorkUnit::ALL {
                if let Some(amount) = demand.read(unit) {
                    count(amount)?;
                    // The operational meter adds depth like every other unit;
                    // saved invocation addWork separately uses maximum depth.
                    let next = count(
                        unit.read(&meter.used)
                            .checked_add(amount)
                            .ok_or(WorkError::InvalidBound)?,
                    )?;
                    if next > unit.read(&meter.limit) {
                        return Err(WorkError::Contract(unit));
                    }
                }
            }
        }
        for meter in self.active.iter_mut().rev() {
            for unit in WorkUnit::ALL {
                if let Some(amount) = demand.read(unit) {
                    let next = unit.read(&meter.used) + amount;
                    unit.write(&mut meter.used, next);
                }
            }
        }
        Ok(())
    }
    pub(crate) fn used(&self, token: MeterToken) -> Result<WorkVector, WorkError> {
        let meter = self
            .active
            .get(token.index)
            .filter(|m| m.id == token.id)
            .ok_or(WorkError::InvalidLineage)?;
        Ok(meter.used)
    }
}
