//! Complete checkpoint cleanup uses the ordinary semantic writers one actor at
//! a time. SQL supplies only exact cold membership and selected account rows.
use super::*;
use crate::experience::HistoryPreparationError;
use crate::experience::retention::{
    RestoreAccountCursor, RestoreAccountStep, RestoreRetentionAnswer, RestoreRetentionQuestion,
};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::{
    RecentRetentionCursor, SupportMembershipAnswer, SupportMembershipRequest, SupportPreparation,
    SupportRetentionCursor, SupportRetentionStep,
};
use indexmap::{IndexMap, IndexSet};
use serde::Serialize;
use std::{mem::size_of, sync::Arc};

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RestoreRetentionPreparation {
    pub accounts: crate::experience::RetentionPreparation,
    pub support: SupportPreparation,
    pub rounds: usize,
}
enum Phase {
    Knowledge,
    Accounts,
    Supports,
    Recent,
    Individuals,
    Done,
}
pub(super) struct RestoreRetentionCursor {
    actors: Vec<String>,
    phase: Phase,
    next: usize,
    account: Option<RestoreAccountCursor>,
    support: Option<SupportRetentionCursor>,
    recent: Option<RecentRetentionCursor>,
    individuals: Option<RetiredIndividualsCursor>,
    preparation: RestoreRetentionPreparation,
    key: CandidateKey,
    experience_before: crate::experience::ExperienceCheckpoint,
    temporal_before: crate::received::TemporalCheckpoint,
    _storage: ByteReservation,
}
pub(super) enum RetentionAnswer {
    Account(RestoreRetentionAnswer),
    Support(SupportMembershipAnswer),
    Collation(crate::language::CollationAnswer),
}
pub(super) enum RetentionStep<'a> {
    Continue,
    Accounts(Arc<RestoreRetentionQuestion>),
    Support(&'a SupportMembershipRequest),
    Collation(&'a crate::language::CollationRequest),
    Complete { source_changed: bool },
}
impl RestoreRetentionCursor {
    pub(super) fn new(
        core: &CoreMutation<'_>,
        key: CandidateKey,
        preparation: RestoreRetentionPreparation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if preparation.rounds == 0 {
            return Err(ExecutionError::Invariant);
        }
        let names = core
            .state
            .temporal
            .actor_ids()
            .try_fold(0usize, |n, id| {
                n.checked_add(size_of::<String>())?.checked_add(id.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(
            size_of::<Self>()
                .checked_add(names)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut actors = Vec::with_capacity(core.state.temporal.actor_ids().count());
        actors.extend(core.state.temporal.actor_ids().map(str::to_owned));
        Ok(Self {
            actors,
            phase: Phase::Knowledge,
            next: 0,
            account: None,
            support: None,
            recent: None,
            individuals: None,
            preparation,
            key,
            experience_before: core.journal.experience.checkpoint(),
            temporal_before: core.state.temporal.checkpoint(),
            _storage: storage,
        })
    }
    pub(super) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RetentionAnswer>,
        budget: &ByteBudget,
    ) -> Result<RetentionStep<'a>, HistoryPreparationError> {
        match self.phase {
            Phase::Knowledge => {
                if answer.is_some() {
                    return Err(HistoryPreparationError::StaleResponse);
                }
                if let Some(actor) = self.actors.get(self.next) {
                    crate::worlds::base_recognition::maintain_restore_recognition(
                        core, actor, budget,
                    )?;
                    self.next += 1;
                } else {
                    self.next = 0;
                    self.phase = Phase::Accounts;
                }
            }
            Phase::Accounts => {
                if self.next == self.actors.len() {
                    if answer.is_some() {
                        return Err(HistoryPreparationError::StaleResponse);
                    }
                    let _copy = budget
                        .reserve(self.actors.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    self.support = Some(SupportRetentionCursor::new_restore(
                        self.key,
                        self.actors.clone(),
                        self.preparation.support,
                        budget,
                    )?);
                    self.phase = Phase::Supports;
                    return Ok(RetentionStep::Continue);
                }
                let actor = &self.actors[self.next];
                if self.account.is_none() {
                    if answer.is_some() {
                        return Err(HistoryPreparationError::StaleResponse);
                    }
                    let missing = core
                        .state
                        .temporal
                        .actor(actor)
                        .is_some_and(|actor| actor.header().accounts.is_none());
                    if missing {
                        crate::received::ensure_experience_accounting(core, actor, budget)?;
                        let installed = core.state.installed.clone();
                        core.state
                            .temporal
                            .set_account_due(
                                actor,
                                Some(0.0),
                                false,
                                core.state.physical.header.sim_time,
                                &installed.attention.value().retention,
                            )
                            .map_err(ExecutionError::from)?;
                    }
                    self.account = Some(RestoreAccountCursor::new(
                        core,
                        actor,
                        self.preparation.accounts,
                        self.key,
                        budget,
                    )?);
                }
                let supplied = match answer {
                    Some(RetentionAnswer::Account(answer)) => Some(answer),
                    None => None,
                    _ => return Err(HistoryPreparationError::StaleResponse),
                };
                match self
                    .account
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, supplied, budget)?
                {
                    RestoreAccountStep::Question(question) => {
                        return Ok(RetentionStep::Accounts(question));
                    }
                    RestoreAccountStep::Complete => {
                        self.account = None;
                        self.next += 1;
                    }
                }
            }
            Phase::Supports => {
                let supplied = match answer {
                    Some(RetentionAnswer::Support(answer)) => Some(answer),
                    None => None,
                    _ => return Err(HistoryPreparationError::StaleResponse),
                };
                match self
                    .support
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, supplied, budget)?
                {
                    SupportRetentionStep::Membership(question) => {
                        return Ok(RetentionStep::Support(question));
                    }
                    SupportRetentionStep::Continue => {}
                    SupportRetentionStep::Complete(_) => {
                        let _copy = budget
                            .reserve(self.actors.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                        self.recent =
                            Some(RecentRetentionCursor::new(self.actors.clone(), budget)?);
                        self.phase = Phase::Recent;
                    }
                }
            }
            Phase::Recent => {
                self.support = None;
                if answer.is_some() {
                    return Err(HistoryPreparationError::StaleResponse);
                }
                if self
                    .recent
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, budget)?
                    .is_some()
                {
                    self.recent = None;
                    self.individuals = Some(RetiredIndividualsCursor::new(
                        core,
                        self.key,
                        self.experience_before,
                        self.temporal_before,
                        self.preparation.support,
                        budget,
                    )?);
                    self.phase = Phase::Individuals;
                }
            }
            Phase::Individuals => {
                return self
                    .individuals
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, answer, budget)
                    .map(|step| match step {
                        IndividualStep::Continue => RetentionStep::Continue,
                        IndividualStep::Question(question) => RetentionStep::Accounts(question),
                        IndividualStep::Collation(question) => RetentionStep::Collation(question),
                        IndividualStep::Complete => {
                            self.phase = Phase::Done;
                            RetentionStep::Continue
                        }
                    });
            }
            Phase::Done => {
                if answer.is_some() {
                    return Err(HistoryPreparationError::StaleResponse);
                }
                return Ok(RetentionStep::Complete {
                    source_changed: core
                        .journal
                        .experience
                        .retention_sources_changed_since(self.experience_before)
                        .map_err(ExecutionError::from)?,
                });
            }
        }
        Ok(RetentionStep::Continue)
    }
}

struct Affected {
    actor: String,
    aliases: IndexSet<String>,
}
struct RetiredIndividualsCursor {
    affected: Vec<Affected>,
    next: usize,
    aliases_from: usize,
    individuals_from: usize,
    individuals: Vec<String>,
    retained_aliases: Vec<bool>,
    retained_individuals: Vec<bool>,
    requested: Option<(Arc<RestoreRetentionQuestion>, usize, usize)>,
    pruning: Option<crate::worlds::base_recognition::PreparedIndividualRetirement>,
    actor_storage: Option<ByteReservation>,
    key: CandidateKey,
    preparation: SupportPreparation,
    _storage: ByteReservation,
}
enum IndividualStep<'a> {
    Continue,
    Question(Arc<RestoreRetentionQuestion>),
    Collation(&'a crate::language::CollationRequest),
    Complete,
}
fn add_alias(
    groups: &mut IndexMap<String, IndexSet<String>>,
    actor: &str,
    alias: &str,
    storage: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if groups
        .get(actor)
        .is_some_and(|aliases| aliases.contains(alias))
    {
        return Ok(());
    }
    let bytes = heap_sum([
        actor.len(),
        alias.len(),
        map_storage::<String, IndexSet<String>>(2).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, ()>(2).ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    storage.merge(budget.reserve(bytes)?)?;
    groups
        .entry(actor.to_owned())
        .or_default()
        .insert(alias.to_owned());
    Ok(())
}
impl RetiredIndividualsCursor {
    fn new(
        core: &CoreMutation<'_>,
        key: CandidateKey,
        experience: crate::experience::ExperienceCheckpoint,
        temporal: crate::received::TemporalCheckpoint,
        preparation: SupportPreparation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut storage = budget.reserve(size_of::<Self>())?;
        let mut groups = IndexMap::<String, IndexSet<String>>::new();
        // Source groups retired rows by table before sparse support removals.
        for kind in [
            crate::experience::PersonalSourceKind::Awareness,
            crate::experience::PersonalSourceKind::Memory,
            crate::experience::PersonalSourceKind::Summary,
        ] {
            for record in core.journal.experience.retired_records_since(experience)? {
                if record.header().reference.kind == kind {
                    add_alias(
                        &mut groups,
                        &record.header().actor_id,
                        &record.header().reference.id,
                        &mut storage,
                        budget,
                    )?;
                }
            }
        }
        let meaning = core.state.installed.account_law();
        for (actor, record) in core.state.temporal.retired_supports_since(temporal)? {
            let capsule = record.capsule();
            let _aliases = budget.reserve(
                crate::received::temporal_receipt_aliases_bound(
                    &capsule.receipt,
                    &capsule.values,
                    &meaning,
                )
                .ok_or(ExecutionError::Capacity)?,
            )?;
            for alias in crate::received::temporal_receipt_aliases(
                &capsule.receipt,
                &core.state.reception.received_values.as_ref(),
                &meaning,
                Some(&capsule.values),
            )? {
                add_alias(&mut groups, actor, &alias, &mut storage, budget)?;
            }
        }
        storage.merge(
            budget.reserve(
                groups
                    .len()
                    .checked_mul(size_of::<Affected>())
                    .ok_or(ExecutionError::Capacity)?,
            )?,
        )?;
        let mut affected = Vec::with_capacity(groups.len());
        for (actor, aliases) in groups {
            affected.push(Affected { actor, aliases });
        }
        Ok(Self {
            affected,
            next: 0,
            aliases_from: 0,
            individuals_from: 0,
            individuals: Vec::new(),
            retained_aliases: Vec::new(),
            retained_individuals: Vec::new(),
            requested: None,
            pruning: None,
            actor_storage: None,
            key,
            preparation,
            _storage: storage,
        })
    }
    fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RetentionAnswer>,
        budget: &ByteBudget,
    ) -> Result<IndividualStep<'a>, HistoryPreparationError> {
        if self.next == self.affected.len() {
            if answer.is_some() {
                return Err(HistoryPreparationError::StaleResponse);
            }
            return Ok(IndividualStep::Complete);
        }
        if self.pruning.is_some() {
            let supplied = match answer {
                Some(RetentionAnswer::Collation(answer)) => Some(answer),
                None => None,
                _ => return Err(HistoryPreparationError::StaleResponse),
            };
            if supplied.is_none()
                && self
                    .pruning
                    .as_ref()
                    .is_some_and(|pruning| pruning.comparisons().is_some())
            {
                return Ok(IndividualStep::Collation(
                    self.pruning
                        .as_ref()
                        .and_then(|pruning| pruning.comparisons())
                        .ok_or(ExecutionError::Invariant)?,
                ));
            }
            self.pruning
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .validate_answer(supplied.as_ref())
                .map_err(|_| HistoryPreparationError::MalformedResponse)?;
            self.pruning
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish(core, supplied.as_ref(), budget)?;
            self.individuals = Vec::new();
            self.retained_aliases = Vec::new();
            self.retained_individuals = Vec::new();
            self.actor_storage = None;
            self.aliases_from = 0;
            self.individuals_from = 0;
            self.next += 1;
            return Ok(IndividualStep::Continue);
        }
        let group = &self.affected[self.next];
        if let Some((question, aliases_end, individuals_end)) = &self.requested {
            let Some(RetentionAnswer::Account(answer)) = answer else {
                return if answer.is_none() {
                    Ok(IndividualStep::Question(Arc::clone(question)))
                } else {
                    Err(HistoryPreparationError::StaleResponse)
                };
            };
            let answer = answer.into_membership(question)?;
            if answer
                .aliases
                .iter()
                .any(|index| *index >= *aliases_end - self.aliases_from)
                || answer
                    .individuals
                    .iter()
                    .any(|index| *index >= *individuals_end - self.individuals_from)
            {
                return Err(HistoryPreparationError::MalformedResponse);
            }
            for index in answer.aliases {
                self.retained_aliases[self.aliases_from + index] = true;
            }
            for index in answer.individuals {
                self.retained_individuals[self.individuals_from + index] = true;
            }
            self.aliases_from = *aliases_end;
            self.individuals_from = *individuals_end;
            self.requested = None;
            return Ok(IndividualStep::Continue);
        }
        if answer.is_some() {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if self.retained_aliases.is_empty() && self.aliases_from == 0 {
            let identities = core
                .state
                .reception
                .observer_identities
                .as_ref()
                .and_then(|owners| owners.get(&group.actor));
            let count = identities.map_or(0, |records| records.len());
            let names = identities
                .into_iter()
                .flat_map(|records| records.keys())
                .try_fold(0usize, |n, id| n.checked_add(id.len()))
                .ok_or(ExecutionError::Capacity)?;
            self.actor_storage = Some(
                budget.reserve(
                    heap_sum([
                        names,
                        count
                            .checked_mul(size_of::<String>() + 1)
                            .ok_or(ExecutionError::Capacity)?,
                        group.aliases.len(),
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                )?,
            );
            self.individuals = Vec::with_capacity(count);
            self.individuals.extend(
                identities
                    .into_iter()
                    .flat_map(|records| records.keys())
                    .cloned(),
            );
            self.retained_aliases = vec![false; group.aliases.len()];
            self.retained_individuals = vec![false; count];
        }
        if self.aliases_from == group.aliases.len()
            && self.individuals_from == self.individuals.len()
        {
            let _copies = budget.reserve(
                heap_sum([
                    group.aliases.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    self.individuals
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                    map_storage::<String, ()>(
                        self.individuals
                            .len()
                            .checked_mul(2)
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let released = group
                .aliases
                .iter()
                .zip(&self.retained_aliases)
                .filter(|(_, kept)| !**kept)
                .map(|(id, _)| id.clone())
                .collect();
            let retained = self
                .individuals
                .iter()
                .zip(&self.retained_individuals)
                .filter(|(_, kept)| **kept)
                .map(|(id, _)| id.clone())
                .collect();
            let binding = crate::geometry::GeometryBinding::new(
                self.key,
                core.state.installed.geometry.spatial.revision,
                core.journal.next_provider_serial()?,
            );
            self.pruning = Some(
                crate::worlds::base_recognition::PreparedIndividualRetirement::prepare(
                    core,
                    &group.actor,
                    &released,
                    &retained,
                    binding,
                    budget,
                )?,
            );
            return Ok(IndividualStep::Continue);
        }
        let mut aliases_end = self.aliases_from;
        let mut individuals_end = self.individuals_from;
        let mut bytes = group
            .actor
            .len()
            .checked_mul(6)
            .and_then(|n| n.checked_add(256))
            .ok_or(ExecutionError::Capacity)?;
        let mut count = 0;
        while count < self.preparation.rows {
            let next = if let Some(alias) = group.aliases.get_index(aliases_end) {
                Some((true, alias))
            } else {
                self.individuals.get(individuals_end).map(|id| (false, id))
            };
            let Some((alias, id)) = next else {
                break;
            };
            let size =
                crate::encoding::json_record_len(id).map_err(|_| ExecutionError::Invariant)? + 1;
            if bytes.checked_add(size).ok_or(ExecutionError::Capacity)? > self.preparation.bytes {
                break;
            }
            bytes += size;
            count += 1;
            if alias {
                aliases_end += 1;
            } else {
                individuals_end += 1;
            }
        }
        if count == 0 {
            return Err(HistoryPreparationError::Capacity);
        }
        let _lists = budget.reserve(
            count
                .checked_mul(size_of::<&str>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut aliases = Vec::with_capacity(aliases_end - self.aliases_from);
        aliases.extend(
            group
                .aliases
                .iter()
                .skip(self.aliases_from)
                .take(aliases_end - self.aliases_from)
                .map(String::as_str),
        );
        let mut individual_ids = Vec::with_capacity(individuals_end - self.individuals_from);
        individual_ids.extend(
            self.individuals[self.individuals_from..individuals_end]
                .iter()
                .map(String::as_str),
        );
        let history = core
            .state
            .temporal
            .actor(&group.actor)
            .ok_or(ExecutionError::Invariant)?;
        let privacy = &core
            .state
            .experience
            .actor(&group.actor)
            .ok_or(ExecutionError::Invariant)?
            .privacy;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Membership<'a> {
            actor_id: &'a str,
            at: f64,
            max_age_seconds: f64,
            frontier: Option<&'a crate::received::ReceivedFrontier>,
            recent_directories: Directories<'a>,
            recent_bytes: u64,
            recent_count: u64,
            forgotten: &'a [String],
            corrections: &'a IndexMap<String, String>,
            aliases: Vec<&'a str>,
            individual_ids: Vec<&'a str>,
        }
        struct Directories<'a>(&'a crate::received::ReceivedRecentDirectory);
        impl Serialize for Directories<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeSeq;
                let mut output = serializer.serialize_seq(None)?;
                for directory in self.0.directories() {
                    output.serialize_element(directory)?;
                }
                output.end()
            }
        }
        let data = Membership {
            actor_id: &group.actor,
            at: core.state.physical.header.sim_time,
            max_age_seconds: core
                .state
                .installed
                .attention
                .value()
                .retention
                .recent
                .max_age_seconds,
            frontier: history.header().frontier.as_ref(),
            recent_directories: Directories(history.recent()),
            recent_bytes: history.recent().bytes(),
            recent_count: history.recent().count(),
            forgotten: privacy.forgotten_ids(),
            corrections: privacy.corrections(),
            aliases,
            individual_ids,
        };
        let serial = core.journal.next_provider_serial()?;
        let question = RestoreRetentionQuestion::membership(
            core,
            &group.actor,
            self.key,
            serial,
            &data,
            budget,
        )?;
        self.requested = Some((Arc::clone(&question), aliases_end, individuals_end));
        Ok(IndividualStep::Question(question))
    }
}
