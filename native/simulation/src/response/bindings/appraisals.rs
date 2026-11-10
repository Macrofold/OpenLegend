//! Appraisal handles select installed policies, captured own records and actual
//! admitted personal sources. Generated JSON cannot invent their native cause.
use super::*;
use crate::appraisals::{AppraisalContentWitness, AppraisalValue, PerceivedCause, ValueLaw};
use crate::capture::{NpcAliasOrdinal, PreparedNpcSources};
use crate::records::SqlCell;

#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PersonalOrdinal {
    pub inventory: usize,
    pub ordinal: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AppraisalSourceAlias {
    pub alias: String,
    pub inventory: usize,
    pub ordinal: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AppraisalSelection {
    purpose: AppraisalPurpose,
    guard: AppraisalGuard,
    pub policies: Vec<NpcAliasOrdinal>,
    pub records: Vec<NpcAliasOrdinal>,
    pub sources: Vec<AppraisalSourceAlias>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub trigger: Option<PersonalOrdinal>,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum AppraisalPurpose {
    Decision,
    Reflection,
}
impl AppraisalSelection {
    pub(crate) fn reflection(&self) -> bool {
        matches!(self.purpose, AppraisalPurpose::Reflection)
    }
}
impl AppraisalPurpose {
    fn permits(self, definition: &crate::appraisals::Definition) -> bool {
        match self {
            Self::Decision => definition.decision,
            Self::Reflection => definition.reflection,
        }
    }
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum AppraisalGuard {
    All,
    Required,
}
struct Record {
    id: String,
    revision: u64,
    pin: crate::values::DefinitionPin,
}
pub(crate) struct PreparedResponseAppraisals {
    actor: String,
    purpose: AppraisalPurpose,
    guard: AppraisalGuard,
    policies: IndexMap<String, crate::values::DefinitionPin>,
    records: IndexMap<String, Record>,
    sources: IndexMap<String, PerceivedCause>,
    pub(super) content: AppraisalContentWitness,
    knowledge_revision: Option<u64>,
    owner_account: Option<String>,
    _storage: ByteReservation,
}
impl PreparedResponseAppraisals {
    pub(crate) fn into_shared(mut self) -> Result<std::sync::Arc<Self>, ExecutionError> {
        self._storage.resize(
            self._storage
                .bytes()
                .checked_add(2 * size_of::<usize>() + std::mem::align_of::<Self>() - 1)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(std::sync::Arc::new(self))
    }
    /// A funded higher execution reuses the same admitted facts. Only the
    /// transient recall episode belongs to the newly issued decision identity.
    pub(crate) fn rebind_decision(&mut self, decision: &str) -> Result<(), ExecutionError> {
        let count = self
            .sources
            .values()
            .filter(|source| source.recall_episode_id.is_some())
            .count();
        let old_bytes = self
            .sources
            .values()
            .filter_map(|source| source.recall_episode_id.as_ref())
            .try_fold(0usize, |bytes, id| bytes.checked_add(id.capacity()))
            .ok_or(ExecutionError::Capacity)?;
        let before = self._storage.bytes();
        let new_bytes = decision
            .len()
            .checked_mul(count)
            .ok_or(ExecutionError::Capacity)?;
        self._storage.resize(
            before
                .checked_add(new_bytes)
                .and_then(|bytes| bytes.checked_add(count.checked_mul(size_of::<String>())?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut replacements = Vec::with_capacity(count);
        for _ in 0..count {
            replacements.push(decision.to_owned());
        }
        let mut replacements = replacements.into_iter();
        for source in self
            .sources
            .values_mut()
            .filter(|source| source.recall_episode_id.is_some())
        {
            source.recall_episode_id = replacements.next();
        }
        drop(replacements);
        self._storage.resize(
            before
                .checked_sub(old_bytes)
                .and_then(|bytes| bytes.checked_add(new_bytes))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    pub(crate) fn prepare(
        state: &SimulationState,
        read: &AcceptedActorRead,
        sources: &[PreparedNpcSources],
        selected: &AppraisalSelection,
        decision: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if matches!(selected.purpose, AppraisalPurpose::Reflection) && selected.trigger.is_some() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let purpose = selected.purpose;
        let captured = read
            .appraisal_read()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let bytes = heap_sum([
            size_of::<Self>(),
            map_storage::<String, crate::values::DefinitionPin>(selected.policies.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, Record>(selected.records.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, PerceivedCause>(selected.sources.len())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(read.perception.actor_id.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        storage.resize(
            storage
                .bytes()
                .checked_add(captured.owner_account.as_ref().map_or(0, String::len))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut policies = IndexMap::with_capacity(selected.policies.len());
        for selected in &selected.policies {
            let definition = state
                .appraisals
                .definitions
                .get_index(selected.ordinal)
                .map(|(_, definition)| definition)
                .filter(|definition| purpose.permits(&definition.value))
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(selected.alias.len())
                    .and_then(|n| n.checked_add(definition.pin.heap_bytes()?))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            if policies
                .insert(selected.alias.clone(), definition.pin.clone())
                .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let mut records = IndexMap::with_capacity(selected.records.len());
        for selected in &selected.records {
            let record = captured
                .record(selected.ordinal)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            let definition = state
                .appraisals
                .definitions
                .get(&record.definition_pin.id)
                .filter(|definition| {
                    definition.pin == record.definition_pin && purpose.permits(&definition.value)
                })
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(selected.alias.len() + record.id.len())
                    .and_then(|n| n.checked_add(definition.pin.heap_bytes()?))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            if records
                .insert(
                    selected.alias.clone(),
                    Record {
                        id: record.id.clone(),
                        revision: record.revision,
                        pin: record.definition_pin.clone(),
                    },
                )
                .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let mut causes = IndexMap::with_capacity(selected.sources.len());
        for selected_source in &selected.sources {
            let source = sources
                .get(selected_source.inventory)
                .and_then(|source| source.personal.get(selected_source.ordinal))
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            let trigger = selected.trigger
                == Some(PersonalOrdinal {
                    inventory: selected_source.inventory,
                    ordinal: selected_source.ordinal,
                });
            let (cause, custody) =
                source
                    .attribution
                    .appraisal_source(&source.record, decision, trigger, budget)?;
            storage.merge(custody)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(selected_source.alias.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            if causes
                .insert(selected_source.alias.clone(), cause)
                .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        Ok(Self {
            actor: read.perception.actor_id.clone(),
            purpose: selected.purpose,
            guard: selected.guard,
            policies,
            records,
            sources: causes,
            content: captured.content,
            knowledge_revision: captured.knowledge_revision,
            owner_account: captured.owner_account.clone(),
            _storage: storage,
        })
    }
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        read: &AcceptedActorRead,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let feelings_current = match self.guard {
            AppraisalGuard::All => self.content.current(&state.appraisals, actor),
            AppraisalGuard::Required => read
                .appraisal_read()
                .ok_or(ExecutionError::InvalidCheckpoint)?
                .scoped_current(state, actor, budget)?,
        };
        Ok(feelings_current
            && self.knowledge_revision
                == state
                    .reception
                    .knowledge_revisions
                    .as_ref()
                    .and_then(|revisions| revisions.get(actor))
                    .copied()
            && self.owner_account.as_deref()
                == state
                    .administration
                    .authorship
                    .player_account_ids
                    .get(actor)
                    .map(String::as_str)
            && self.policies.values().all(|pin| {
                state
                    .appraisals
                    .definitions
                    .get(&pin.id)
                    .is_some_and(|definition| {
                        definition.pin == *pin && self.purpose.permits(&definition.value)
                    })
            }))
    }
    pub(crate) fn bindings<'a>(
        &self,
        subjects: impl Iterator<Item = &'a str> + Clone,
        budget: &ByteBudget,
    ) -> Result<(AppraisalBindings, ByteReservation), ExecutionError> {
        let bytes = self
            .sources
            .values()
            .try_fold(0usize, |n, source| n.checked_add(source.heap_bytes()?))
            .and_then(|n| {
                n.checked_add(
                    self.sources
                        .len()
                        .checked_mul(size_of::<PerceivedCause>())?,
                )
            })
            .and_then(|n| {
                subjects.clone().try_fold(n, |n, subject| {
                    n.checked_add(subject.len() + size_of::<String>())
                })
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok((
            AppraisalBindings {
                sources: self.sources.values().cloned().collect(),
                subjects: subjects.map(str::to_owned).collect(),
                reflection: matches!(self.purpose, AppraisalPurpose::Reflection).then_some(true),
                decision: matches!(self.purpose, AppraisalPurpose::Decision).then_some(true),
                complete_creates: None,
                prior_outcomes: None,
                publication: None,
            },
            storage,
        ))
    }
    pub(crate) fn resolve(
        &self,
        state: &SimulationState,
        input: &SqlCell,
        subjects: &IndexMap<String, String>,
        budget: &ByteBudget,
    ) -> Result<(SqlCell, ByteReservation), ExecutionError> {
        let invalid = || ExecutionError::InvalidCheckpoint;
        let kind = input
            .get("kind")
            .and_then(SqlCell::as_str)
            .ok_or_else(invalid)?;
        let fields: &[&str] = match kind {
            "create" => &["kind", "definition", "source", "target", "value"],
            "reframe" => &["kind", "appraisal", "source", "value"],
            "resolve" => &["kind", "appraisal"],
            _ => return Err(invalid()),
        };
        if !input.as_object().is_some_and(|object| {
            object.len() == fields.len() && fields.iter().all(|key| object.contains_key(*key))
        }) {
            return Err(invalid());
        }
        let record = input
            .get("appraisal")
            .and_then(SqlCell::as_str)
            .and_then(|alias| self.records.get(alias))
            .filter(|record| {
                state
                    .appraisals
                    .owners
                    .get(&self.actor)
                    .and_then(|owner| owner.records.get(&record.id))
                    .is_some_and(|current| {
                        current.value.revision == record.revision
                            && current.value.definition_pin == record.pin
                    })
            });
        if kind == "resolve" {
            let record = record.ok_or_else(invalid)?;
            #[derive(Serialize)]
            #[serde(rename_all = "camelCase")]
            struct Resolution<'a> {
                kind: &'static str,
                id: &'a str,
                expected_revision: u64,
            }
            return cell(
                &Resolution {
                    kind: "resolve",
                    id: &record.id,
                    expected_revision: record.revision,
                },
                budget,
            );
        }
        let source = input
            .get("source")
            .and_then(SqlCell::as_str)
            .and_then(|alias| self.sources.get(alias))
            .ok_or_else(invalid)?;
        let pin = if kind == "create" {
            input
                .get("definition")
                .and_then(SqlCell::as_str)
                .and_then(|alias| self.policies.get(alias))
                .ok_or_else(invalid)?
        } else if kind == "reframe" {
            &record.ok_or_else(invalid)?.pin
        } else {
            return Err(invalid());
        };
        let definition = state
            .appraisals
            .definitions
            .get(&pin.id)
            .filter(|definition| definition.pin == *pin && self.purpose.permits(&definition.value))
            .ok_or_else(invalid)?;
        let supplied_value = input.get("value").ok_or_else(invalid)?;
        let value = match (
            &definition.value.value,
            supplied_value.get("kind").and_then(SqlCell::as_str),
        ) {
            (ValueLaw::Qualitative, Some("qualitative"))
                if supplied_value
                    .as_object()
                    .is_some_and(|object| object.len() == 1) =>
            {
                AppraisalValue::Qualitative
            }
            (ValueLaw::Scaled { min, max }, Some("scaled"))
                if supplied_value
                    .as_object()
                    .is_some_and(|object| object.len() == 2) =>
            {
                AppraisalValue::Scaled {
                    value: supplied_value
                        .get("value")
                        .and_then(SqlCell::as_f64)
                        .filter(|value| value.is_finite() && value >= min && value <= max)
                        .ok_or_else(invalid)?,
                }
            }
            _ => return Err(invalid()),
        };
        if kind == "create" {
            let target = if input.get("target").is_some_and(SqlCell::is_null) {
                None
            } else {
                Some(
                    input
                        .get("target")
                        .and_then(SqlCell::as_str)
                        .and_then(|alias| subjects.get(alias))
                        .ok_or_else(invalid)?
                        .as_str(),
                )
            };
            #[derive(Serialize)]
            #[serde(rename_all = "camelCase")]
            struct Creation<'a> {
                kind: &'static str,
                definition_pin: &'a crate::values::DefinitionPin,
                source: &'a PerceivedCause,
                target_id: Option<&'a str>,
                value: AppraisalValue,
            }
            cell(
                &Creation {
                    kind: "create",
                    definition_pin: pin,
                    source,
                    target_id: target,
                    value,
                },
                budget,
            )
        } else {
            let record = record.ok_or_else(invalid)?;
            #[derive(Serialize)]
            #[serde(rename_all = "camelCase")]
            struct Reframe<'a> {
                kind: &'static str,
                id: &'a str,
                expected_revision: u64,
                source: &'a PerceivedCause,
                value: AppraisalValue,
            }
            cell(
                &Reframe {
                    kind: "reframe",
                    id: &record.id,
                    expected_revision: record.revision,
                    source,
                    value,
                },
                budget,
            )
        }
    }
}
fn cell(
    value: &impl Serialize,
    budget: &ByteBudget,
) -> Result<(SqlCell, ByteReservation), ExecutionError> {
    let length = crate::encoding::json_record_len(value).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        length
            .checked_mul(32)
            .and_then(|n| n.checked_add(1024))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let json = crate::encoding::json_record(value).map_err(|_| ExecutionError::Invariant)?;
    let value: SqlCell = serde_json::from_str(&json).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok((value, storage))
}
