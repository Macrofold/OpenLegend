//! Private authored recognition and its exact onset. An unchanged or
//! temporarily unseen cue is not a fresh cause.
use super::*;
use crate::host::retained_size::{heap_record, tree_node_bound};
use crate::reception::{
    CurrentBodyReadScope, EvidenceFamily, EvidenceSource, ObservationFactKey, ObserverLife,
    SourceRevision,
};
use crate::state::Entity;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexSet;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AppearanceSensitivities {
    pub rule: DefinitionPin,
    pub cues: IndexSet<String>,
    pub onsets: BTreeMap<String, SensitivityOnset>,
    #[serde(skip)]
    profile_storage: Option<crate::host::ResidentReservation>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SensitivityOnset {
    pub appearance: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub subject_life: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub observer_life: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub proof: Option<ObservationFactKey>,
    pub operation_id: String,
    pub at: f64,
    #[serde(skip)]
    pub storage: Option<crate::host::ResidentReservation>,
}
heap_record!(SensitivityOnset {
    appearance,
    proof,
    operation_id
});

impl SensitivityOnset {
    pub(crate) fn fund(
        &mut self,
        subject: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let bytes = heap_sum([
            tree_node_bound::<String, Self>().ok_or(ExecutionError::Capacity)?,
            self.heap_bytes().ok_or(ExecutionError::Capacity)?,
            subject.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.storage = Some(budget.reserve_record(bytes)?);
        Ok(())
    }
}

impl AppearanceSensitivities {
    pub(crate) fn restore(
        &mut self,
        entity: &Entity,
        now: f64,
        policy: &crate::install::VerifiedDefinition<crate::worlds::InstalledEventAppraisalRules>,
        budget: &ByteBudget,
    ) -> Result<(), InstallError> {
        if !entity.has_memory()
            || policy.value().appearance.is_none()
            || &self.rule != policy.pin()
            || self.cues.is_empty()
            || self.cues.iter().any(|cue| !is_safe_record_id(cue))
        {
            return Err(InstallError::CurrentFormat);
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            self.rule.heap_bytes().ok_or(InstallError::Capacity)?,
            self.cues.heap_bytes().ok_or(InstallError::Capacity)?,
        ])
        .ok_or(InstallError::Capacity)?;
        self.profile_storage = Some(
            budget
                .reserve_record(bytes)
                .map_err(|_| InstallError::Capacity)?,
        );
        for (subject, onset) in &mut self.onsets {
            if !is_safe_record_id(subject)
                || subject == &entity.id
                || !self.cues.contains(&onset.appearance)
                || !is_safe_record_id(&onset.operation_id)
                || !onset.at.is_finite()
                || onset.at < 0.0
                || onset.at > now
                || onset.proof.as_ref().is_some_and(|proof| {
                    proof.source.family != EvidenceFamily::NativeExposure
                        || proof.source.observer.actor_id != entity.id
                        || proof.source.observer.physical_life != onset.observer_life
                        || proof.source.validate().is_err()
                })
            {
                return Err(InstallError::CurrentFormat);
            }
            onset
                .fund(subject, budget)
                .map_err(|_| InstallError::Capacity)?;
        }
        Ok(())
    }
}

fn sight<'a>(
    state: &'a crate::simulation::SimulationState,
    actor: &str,
    subject: &str,
) -> Result<Option<(crate::reception::CurrentNativeFacet<'a>, &'a str, u64)>, ExecutionError> {
    let Some(scope) = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        actor,
    )?
    else {
        return Ok(None);
    };
    Ok(scope.recognized_appearance(subject)?)
}

/// Consume an actual changed appearance received by an enrolled witness.
/// The actor's exact cue/subject maps avoid any history, biography or rule scan.
pub(crate) fn receive_appearance_sensitivity(
    core: &mut CoreMutation<'_>,
    actor: &str,
    subject: &str,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let installed = Arc::clone(&core.state.installed);
    let policy = &installed.event_appraisal_rules;
    let Some(rule) = policy.value().appearance.as_ref() else {
        return Ok(false);
    };
    let Some(profile) = core
        .state
        .minds
        .appearance_sensitivities(actor)
        .filter(|p| &p.rule == policy.pin())
    else {
        return Ok(false);
    };
    let Some((body, appearance, actor_life)) = sight(core.state, actor, subject)? else {
        return Ok(false);
    };
    let Some(subject_life) = body.grant.subject_physical_life else {
        return Ok(false);
    };
    let prior = profile.onsets.get(subject);
    if prior.is_some_and(|onset| {
        onset.appearance == appearance
            && onset.subject_life == subject_life
            && onset.observer_life == actor_life
    }) {
        return Ok(false);
    }
    if !profile.cues.contains(appearance) {
        if prior.is_some() {
            core.journal.cognition.set_sensitivity_onset(
                &mut core.state.minds,
                actor,
                subject,
                None,
                budget,
            )?;
        }
        return Ok(false);
    }
    if core
        .state
        .experience
        .actor(actor)
        .is_some_and(|history| history.privacy.revoked(&body.original_source.id))
    {
        return Ok(false);
    }
    let _storage = budget.reserve(
        heap_sum([
            appearance.len(),
            actor.len() * 4,
            body.original_source.id.len() * 3,
            "sensitivity-onset".len() + 16,
            rule.coverage.len(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let proof = ObservationFactKey {
        source: EvidenceSource {
            family: EvidenceFamily::NativeExposure,
            id: body.original_source.id.clone(),
            revision: SourceRevision::Number(body.original_source.revision),
            observer: ObserverLife {
                actor_id: actor.to_owned(),
                physical_life: actor_life,
            },
        },
        ordinal: body.field.original_ordinal,
    };
    let appearance = appearance.to_owned();
    let operation_id = core
        .state
        .physical
        .identity
        .allocate("sensitivity-onset")?
        .id;
    let SourceRevision::Number(revision) = &proof.source.revision else {
        return Err(ExecutionError::Invariant);
    };
    let cause = PerceivedCause {
        kind: "perceived-event".into(),
        actor_id: actor.to_owned(),
        source_id: proof.source.id.clone(),
        source_kind: "native-exposure".into(),
        occurrence_id: operation_id.clone(),
        source_version: format!("{revision}:{}", proof.ordinal),
        coverage: rule.coverage.clone(),
        subject_ids: Vec::new(),
        recall_episode_id: None,
    };
    let mut onset = SensitivityOnset {
        appearance,
        subject_life,
        observer_life: actor_life,
        proof: Some(proof),
        operation_id,
        at: core.state.physical.header.sim_time,
        storage: None,
    };
    onset.fund(subject, budget)?;
    crate::appraisals::appraise_recognized_appearance(core, cause, rule, budget)?;
    core.journal.cognition.set_sensitivity_onset(
        &mut core.state.minds,
        actor,
        subject,
        Some(onset),
        budget,
    )?;
    Ok(true)
}

/// Invalidation keeps only the condition latch needed to prevent replaying
/// a continuous cue. Its old source attribution is withdrawn with the feeling.
pub(super) fn redact_onsets(
    core: &mut CoreMutation<'_>,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(profile) = core.state.minds.appearance_sensitivities(actor) else {
        return Ok(());
    };
    let live = || {
        profile
            .onsets
            .iter()
            .filter(|(_, onset)| onset.proof.is_some())
    };
    let bytes = live()
        .try_fold(0usize, |n, (subject, onset)| {
            heap_sum([
                n,
                size_of::<(String, SensitivityOnset)>(),
                subject.len(),
                onset.appearance.len(),
                onset.operation_id.len(),
            ])
        })
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let mut replacement = Vec::new();
    replacement
        .try_reserve_exact(live().count())
        .map_err(|_| ExecutionError::Capacity)?;
    for (subject, onset) in live() {
        let mut value = SensitivityOnset {
            appearance: onset.appearance.clone(),
            subject_life: onset.subject_life,
            observer_life: onset.observer_life,
            proof: None,
            operation_id: onset.operation_id.clone(),
            at: onset.at,
            storage: None,
        };
        value.fund(subject, budget)?;
        replacement.push((subject.clone(), value));
    }
    for (subject, onset) in replacement {
        core.journal.cognition.set_sensitivity_onset(
            &mut core.state.minds,
            actor,
            &subject,
            Some(onset),
            budget,
        )?;
    }
    Ok(())
}
