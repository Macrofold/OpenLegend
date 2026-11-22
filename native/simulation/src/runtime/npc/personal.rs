//! Owned prompt facts from exact current or archived personal records.
use super::{ByteBudget, ByteReservation, RuntimeError, RuntimeNpcRead, failure};
use crate::{
    experience::{AwarenessSourceBody, PersonalSourceRef, encoded_body_bound},
    host::CapacityError,
    narration::NativeText,
    reception::{SpeechAddressing, SpeechParticipant},
    text::JsText,
};
use serde::Deserialize;
use std::mem::size_of;

pub struct RuntimeNpcPersonalSources {
    pub ordinal: usize,
    pub personal: Vec<RuntimeNpcPersonalSource>,
    pub unavailable_personal: Vec<usize>,
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
            custody,
        })
    }
}
