//! Exact status-family work admission, compiled from the already verified
//! canonical policy. Raw slices preserve the source digest without replacing
//! JavaScript locale collation with a different generic sorter.

use super::{StatusEffectPolicy, status_work};
use crate::encoding::content_label;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ResidentReservation};
use crate::install::InstallError;
use crate::values::{DefinitionPin, RecurringWork, WorkVector};
use crate::work::{WorkRequest, multiply_work};
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::value::RawValue;
use std::mem::size_of;

pub(crate) struct CompiledStatusWork {
    pub pin: DefinitionPin,
    pub tests: u64,
    pub effects: u64,
    pub retained_bytes: u64,
}
impl CompiledStatusWork {
    pub(crate) fn request(
        &self,
        actor_id: &str,
        episode: &str,
    ) -> Result<WorkRequest, crate::work::WorkError> {
        // The existing native-work owner permits 1024 public subsecond samples
        // per game second. This operational lineage is independent of world
        // status rates, publication slices and the ephemeral active work meter.
        let limit = multiply_work(
            WorkVector {
                tests: self.tests,
                effects: self.effects,
                depth: 1,
                ..WorkVector::default()
            },
            1024,
        )?;
        Ok(WorkRequest {
            id: episode.to_owned(),
            parent_id: None,
            actor_id: actor_id.to_owned(),
            module_id: self.pin.id.clone(),
            definition_pin: self.pin.clone(),
            limit,
            allocation: WorkVector {
                live: 1,
                retained_bytes: self.retained_bytes,
                subscriptions: 1,
                ..WorkVector::default()
            },
            recurrence: Some(RecurringWork {
                interval_seconds: 1.0,
                burst: 1024,
            }),
        })
    }
}
pub(crate) struct CompiledStatusWorkMap {
    values: IndexMap<String, CompiledStatusWork>,
    _storage: ResidentReservation,
}
impl std::ops::Deref for CompiledStatusWorkMap {
    type Target = IndexMap<String, CompiledStatusWork>;
    fn deref(&self) -> &Self::Target {
        &self.values
    }
}
pub(crate) fn compile_status_work(
    policy: &StatusEffectPolicy,
    canonical: &str,
    budget: &ByteBudget,
) -> Result<CompiledStatusWorkMap, InstallError> {
    #[derive(Deserialize)]
    struct Policy<'a> {
        #[serde(borrow)]
        definitions: Vec<&'a RawValue>,
    }
    let _parse = crate::install::reserve_typed_parse::<Policy<'_>>(
        canonical,
        size_of::<&RawValue>(),
        None,
        budget,
    )?;
    let raw: Policy<'_> =
        serde_json::from_str(canonical).map_err(|_| InstallError::DefinitionBody)?;
    if raw.definitions.len() != policy.definitions.len() {
        return Err(InstallError::DefinitionBody);
    }
    let names = policy
        .definitions
        .iter()
        .try_fold(0usize, |n, value| {
            n.checked_add(value.id.len().checked_mul(2)?)
        })
        .ok_or(InstallError::Capacity)?;
    let bound = heap_sum([
        map_storage::<String, CompiledStatusWork>(if raw.definitions.is_empty() {
            0
        } else {
            raw.definitions
                .len()
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .ok_or(InstallError::Capacity)?
        })
        .ok_or(InstallError::Capacity)?,
        names,
        raw.definitions
            .len()
            .checked_mul(7)
            .ok_or(InstallError::Capacity)?,
    ])
    .ok_or(InstallError::Capacity)?;
    let mut storage = budget.reserve(bound).map_err(|_| InstallError::Capacity)?;
    let mut result = IndexMap::with_capacity(raw.definitions.len());
    for (definition, raw) in policy.definitions.iter().zip(raw.definitions) {
        // The consuming policy constructor already compared the complete
        // canonical typed value. Raw slices remain only for the actual Source
        // content-label spelling; parsing every definition again adds no fact.
        let cost = status_work(definition);
        // JSON.stringify length is UTF-16 units in the current native-work.ts
        // quota. UTF-8 resident allocation is accounted separately by the host.
        let retained_bytes = u64::try_from(raw.get().encode_utf16().count())
            .ok()
            .and_then(|n| n.checked_mul(3))
            .and_then(|n| n.checked_add(1024))
            .ok_or(InstallError::DefinitionBody)?;
        let compiled = CompiledStatusWork {
            pin: DefinitionPin {
                id: definition.id.clone(),
                version: 1,
                digest: content_label(raw.get()),
            },
            tests: cost.tests,
            effects: cost.effects,
            retained_bytes,
        };
        if result.insert(definition.id.clone(), compiled).is_some() {
            return Err(InstallError::DefinitionCollision);
        }
    }
    storage
        .resize(result.heap_bytes().ok_or(InstallError::Capacity)?)
        .map_err(|_| InstallError::Capacity)?;
    Ok(CompiledStatusWorkMap {
        values: result,
        _storage: budget
            .adopt_record(storage)
            .map_err(|_| InstallError::Capacity)?,
    })
}

pub(crate) struct StatusInstallationWork {
    combined: WorkVector,
}
impl StatusInstallationWork {
    /// Source installedWorkAllocation retains interface bytes once and one
    /// subscription per physical root, including an inactive rooted person.
    pub(crate) fn live_allocation(&self, roots: u64) -> Result<WorkVector, crate::work::WorkError> {
        let subscriptions = multiply_work(
            WorkVector {
                subscriptions: self.combined.subscriptions,
                ..WorkVector::default()
            },
            roots,
        )?
        .subscriptions;
        Ok(WorkVector {
            retained_bytes: self.combined.retained_bytes,
            subscriptions,
            ..WorkVector::default()
        })
    }
    pub(crate) fn require_population(
        &self,
        entities: &crate::state::EntityStore,
        policy: &crate::work::InstalledWorkPolicy,
    ) -> Result<(), crate::work::WorkError> {
        crate::work::require_work(self.combined, policy.policy().module, false)?;
        // Source worldRootCount includes inactive participants still physically
        // rooted; activelyParticipates is a separate detector/action predicate.
        let roots = entities
            .ordered_ids()
            .filter(|id| entities.get(id).is_some_and(|e| e.physical_root()))
            .count() as u64;
        let demand = WorkVector {
            tests: self.combined.tests,
            effects: self.combined.effects,
            subscriptions: self.combined.subscriptions,
            ..WorkVector::default()
        };
        crate::work::require_work(multiply_work(demand, roots)?, policy.policy().group, false)
    }
}
pub(crate) fn compile_status_installation(
    manifest_payload: &str,
    policy: &StatusEffectPolicy,
    costs: &IndexMap<String, CompiledStatusWork>,
    body: Option<&crate::body::BodyPolicy>,
    budget: &ByteBudget,
) -> Result<StatusInstallationWork, InstallError> {
    #[derive(Deserialize)]
    struct Appraisals<'a> {
        #[serde(borrow)]
        definitions: Vec<&'a RawValue>,
    }
    #[derive(Deserialize)]
    struct Manifest<'a> {
        #[serde(borrow)]
        definitions: Vec<&'a RawValue>,
        #[serde(borrow)]
        senses: Vec<&'a RawValue>,
        #[serde(borrow)]
        appraisals: Option<Appraisals<'a>>,
    }
    let _parse = crate::install::reserve_typed_parse::<Manifest<'_>>(
        manifest_payload,
        size_of::<&RawValue>(),
        None,
        budget,
    )?;
    let manifest: Manifest<'_> =
        serde_json::from_str(manifest_payload).map_err(|_| InstallError::DefinitionBody)?;
    let interfaces = manifest
        .definitions
        .len()
        .checked_add(manifest.senses.len())
        .and_then(|n| {
            n.checked_add(
                manifest
                    .appraisals
                    .as_ref()
                    .map_or(0, |a| a.definitions.len()),
            )
        })
        .and_then(|n| u64::try_from(n).ok())
        .ok_or(InstallError::DefinitionBody)?;
    let retained_bytes = u64::try_from(manifest_payload.encode_utf16().count())
        .ok()
        .and_then(|n| n.checked_mul(3))
        .ok_or(InstallError::DefinitionBody)?;
    let mut combined = WorkVector {
        tests: interfaces,
        subscriptions: interfaces,
        retained_bytes,
        ..WorkVector::default()
    };
    if let Some(body) = body {
        let thinking = &body.background_thinking;
        let optional =
            |c: Option<&super::StatusCondition>| c.map_or(0, super::StatusCondition::node_count);
        let tests = body
            .recovery
            .as_ref()
            .map_or(0, |r| r.when.node_count() + r.controllers.len() as u64)
            + body
                .consumption
                .as_ref()
                .map_or(0, |c| c.suggest_when.node_count() + c.refusals.len() as u64)
            + optional(thinking.maintenance_blocked_when.as_ref())
            + optional(thinking.commit_blocked_when.as_ref())
            + optional(thinking.reflection_blocked_when.as_ref())
            + thinking
                .reconsideration_inputs
                .iter()
                .map(|input| input.when.node_count())
                .sum::<u64>()
            + u64::from(body.carrying_concern.is_some());
        let effects = body.recovery.as_ref().map_or(0, |r| r.floors.len() as u64)
            + body.revival.fill_to_maximum.len() as u64
            + u64::from(body.consumption.is_some());
        combined = crate::work::add_work(
            combined,
            WorkVector {
                tests: tests + effects,
                subscriptions: 1,
                ..WorkVector::default()
            },
        )
        .map_err(|_| InstallError::DefinitionBody)?;
    }
    for definition in &policy.definitions {
        if definition.enabled {
            let cost = costs
                .get(&definition.id)
                .ok_or(InstallError::DefinitionBody)?;
            combined = crate::work::add_work(
                combined,
                WorkVector {
                    tests: cost.tests,
                    effects: cost.effects,
                    subscriptions: 1,
                    retained_bytes: cost.retained_bytes,
                    depth: 1,
                    ..WorkVector::default()
                },
            )
            .map_err(|_| InstallError::DefinitionBody)?;
        }
    }
    Ok(StatusInstallationWork { combined })
}
