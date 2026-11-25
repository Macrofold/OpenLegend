//! Owned prompt facts from exact current or archived personal records.
use super::{ByteBudget, ByteReservation, RuntimeError, RuntimeNpcRead, failure};
use crate::{
    capture::NpcHistoricalScope,
    commands::guard_input::{GuardFacing, RecentGuard},
    experience::{AwarenessSourceBody, PersonalSourceRef, encoded_body_bound},
    host::CapacityError,
    narration::NativeText,
    reception::{
        EventScalar, ExperienceModality, SpeechAddressing, SpeechParticipant, TriggerKind,
        combat_observation::ATTACK_CUE_EVENT,
    },
    simulation::SimulationState,
    text::JsText,
};
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

pub struct RuntimeNpcPersonalSources {
    pub ordinal: usize,
    pub personal: Vec<RuntimeNpcPersonalSource>,
    pub unavailable_personal: Vec<usize>,
    scope: Arc<NpcHistoricalScope>,
    custody: ByteReservation,
}

pub struct RuntimeNpcPersonalSource {
    pub selection: usize,
    pub reference: PersonalSourceRef,
    pub value: RuntimeNpcPersonalFacts,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNpcPersonalFacts {
    pub event_id: Option<String>,
    pub event_type: Option<String>,
    pub modality: Option<String>,
    pub trigger_kind: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer"
    )]
    pub sequence: Option<u64>,
    pub at: Option<f64>,
    pub to: Option<f64>,
    pub source_body: Option<AwarenessSourceBody>,
    pub speech: Option<RuntimeNpcPersonalSpeech>,
    pub text: Option<NativeText>,
    pub content: Option<NativeText>,
    pub summary: Option<JsText>,
    pub literal_references: Option<crate::experience::LiteralReferences>,
    event_data: Option<GuardCueFacts>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GuardCueFacts {
    target_life: Option<EventScalar>,
}

/// A recently observed preparation directed at this NPC in their current
/// life. Only the original permitted personal rows can create this fact.
pub struct RuntimeNpcGuardThreat {
    scope: Arc<NpcHistoricalScope>,
    threat: RecentGuard,
    _custody: ByteReservation,
}

impl RuntimeNpcGuardThreat {
    pub(crate) fn for_receiver(
        &self,
        state: &SimulationState,
        actor: &str,
        life: Option<u64>,
    ) -> bool {
        self.scope.actor_id == actor
            && self.scope.still_permitted(state)
            && self.threat.current(state, actor, life)
    }

    pub(crate) fn facing(&self) -> GuardFacing<&str> {
        GuardFacing::Recent(RecentGuard {
            life: self.threat.life,
            observed_at: self.threat.observed_at,
            source: &self.threat.source,
        })
    }
}

#[derive(Deserialize)]
pub struct RuntimeNpcPersonalSpeech {
    pub speaker: Option<SpeechParticipant>,
    pub addressee: Option<SpeechParticipant>,
    pub addressing: Option<SpeechAddressing>,
}

impl RuntimeNpcPersonalSources {
    pub fn admitted_bytes(&self) -> usize {
        self.custody.bytes()
    }

    /// Use only selected evidence already admitted for this request. Missing,
    /// overheard or third-person preparation has no defensive authority.
    pub fn guard_threat(
        &self,
        required: &[usize],
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeNpcGuardThreat>, CapacityError> {
        let life = self.scope.physical_life;
        let Some((observed_at, source)) = required
            .iter()
            .filter_map(|&row| self.personal.get(row))
            .filter(|row| row.reference.kind == crate::experience::PersonalSourceKind::Awareness)
            .filter(|row| {
                let value = &row.value;
                value.event_type.as_deref() == Some(ATTACK_CUE_EVENT)
                    && value.modality.as_deref() == Some(ExperienceModality::Observed.as_str())
                    && value.trigger_kind.as_deref() == Some(TriggerKind::DirectedAction.as_str())
                    && matches!(
                        value.event_data.as_ref().and_then(|data| data.target_life.as_ref()),
                        Some(EventScalar::Number(target_life)) if *target_life == life as f64
                    )
            })
            .filter_map(|row| Some((row.value.at?, row.reference.id.as_str())))
            .filter(|(at, _)| *at <= self.scope.at)
            .max_by(|(a, _), (b, _)| a.total_cmp(b))
        else {
            return Ok(None);
        };
        let custody = budget.reserve(source.len())?;
        Ok(Some(RuntimeNpcGuardThreat {
            scope: Arc::clone(&self.scope),
            threat: RecentGuard {
                life,
                observed_at,
                source: source.to_owned(),
            },
            _custody: custody,
        }))
    }
}

impl RuntimeNpcRead {
    /// Decode only the selected personal bodies at their stored JSON boundary.
    /// The result independently owns its prompt text while a binding consumes
    /// the read. Source validity, selected ordinals and leases stay with that read.
    pub fn personal_sources(
        &self,
        budget: &ByteBudget,
    ) -> Result<RuntimeNpcPersonalSources, RuntimeError> {
        let ordinal = self
            .sources
            .len()
            .checked_sub(1)
            .ok_or_else(|| failure("NPC sources are unavailable"))?;
        let sources = &self.sources[ordinal];
        let bytes = sources
            .personal
            .len()
            .checked_mul(size_of::<RuntimeNpcPersonalSource>())
            .and_then(|rows| {
                rows.checked_add(
                    sources
                        .unavailable_personal
                        .len()
                        .checked_mul(size_of::<usize>())?,
                )
            })
            .ok_or(CapacityError)?;
        let bytes = sources.personal.iter().try_fold(bytes, |bytes, source| {
            let reference = &source.record.header().reference;
            let decoded = encoded_body_bound(source.record.payload()).map_err(|_| CapacityError)?;
            bytes
                .checked_add(decoded)
                .and_then(|bytes| bytes.checked_add(reference.id.len()))
                .and_then(|bytes| bytes.checked_add(reference.revision.len()))
                .ok_or(CapacityError)
        })?;
        let custody = budget.reserve(bytes)?;
        let mut personal = Vec::new();
        personal
            .try_reserve_exact(sources.personal.len())
            .map_err(|_| CapacityError)?;
        for source in &sources.personal {
            personal.push(RuntimeNpcPersonalSource {
                selection: source.selection,
                reference: source.record.header().reference.clone(),
                value: serde_json::from_str(source.record.payload()).map_err(failure)?,
            });
        }
        Ok(RuntimeNpcPersonalSources {
            ordinal,
            personal,
            unavailable_personal: sources.unavailable_personal.clone(),
            scope: Arc::clone(&sources.scope),
            custody,
        })
    }
}
