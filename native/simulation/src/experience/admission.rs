//! Automatic personal acquisition over actual received awareness. Account
//! selection and recent evidence are separate: optional prose may be omitted
//! while an attended original remains received and needed support survives.

use super::*;
use crate::attention::{
    AccountRecordingInput, AccountRecordingLaw, ActivityRecordingContext, RecordingInput,
    RecordingReason, RecordingSource,
};
use crate::execution::CoreMutation;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{NativeText, native_text, native_text_bound};
use crate::received::values::{
    PersonalAccountFragment, PersonalAccountKind, PersonalAccountSource,
};
use crate::received::{
    ReceivedError, ReceivedFieldClock, ReceivedRole, ReceivedValueFragment,
    SupportRetentionContext, TemporalAppendError, TemporalCaptureFacet, TemporalCaptureInput,
    TemporalChange,
};
use crate::reception::{EncounterExposure, TriggerKind};
use crate::records::RecordSchema;
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum AwarenessAcquisitionError {
    Experience(ExperienceError),
    Received(ReceivedError),
    Append(TemporalAppendError),
    Encoding,
    Execution(crate::execution::ExecutionError),
}
impl From<crate::execution::ExecutionError> for AwarenessAcquisitionError {
    fn from(error: crate::execution::ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<ExperienceError> for AwarenessAcquisitionError {
    fn from(error: ExperienceError) -> Self {
        Self::Experience(error)
    }
}
impl From<ReceivedError> for AwarenessAcquisitionError {
    fn from(error: ReceivedError) -> Self {
        Self::Received(error)
    }
}
impl From<TemporalAppendError> for AwarenessAcquisitionError {
    fn from(error: TemporalAppendError) -> Self {
        Self::Append(error)
    }
}
struct Decision {
    body: Awareness,
    encoding: AwarenessEncoding,
    reason: RecordingReason,
    selected: bool,
    sensory: bool,
}
pub(crate) struct AwarenessAdmission {
    actor_id: String,
    has_memory: bool,
    decisions: Vec<Decision>,
    _reservation: ByteReservation,
}
/// The actual source has been placed; speech recognition retention is a later
/// Source duty. Holding this product grants no occurrence completion token.
pub(crate) struct PlacedAwarenessAccounts {
    entries: Vec<Awareness>,
    _reservation: ByteReservation,
}
impl PlacedAwarenessAccounts {
    pub(crate) fn entries(&self) -> &[Awareness] {
        &self.entries
    }
}
fn original_contexts(
    body: &Awareness,
) -> impl Iterator<Item = &crate::reception::ObservationContext> {
    body.observation
        .iter()
        .chain(body.observations.iter().flatten())
        .filter_map(|observation| observation.context.as_ref())
}
fn selected_reason(body: &Awareness, law: &impl AccountRecordingLaw) -> RecordingReason {
    if body.retention_class == AwarenessRetentionClass::Sensory {
        return RecordingReason::None;
    }
    law.recording_reason(RecordingInput {
        source: RecordingSource::Awareness,
        event_type: body.event_type.as_deref(),
        modality: Some(body.modality.as_str()),
        trigger_kind: body.trigger_kind.map(TriggerKind::as_str),
        own: body.source_id.as_deref() == Some(body.actor_id.as_str())
            || body.trigger_kind == Some(TriggerKind::SelfEvent),
        has_exposure: body.exposure.is_some(),
        exposure_kind: body.exposure.as_ref().map(|exposure| match exposure {
            EncounterExposure::Place { .. } => "place",
            EncounterExposure::InventoryItem { .. } => "inventory-item",
        }),
        consequence: matches!(
            body.trigger_kind,
            Some(TriggerKind::SelfEvent | TriggerKind::DirectedAction)
        ),
    })
}
fn source_header(
    payload: &str,
    law: &impl AccountRecordingLaw,
) -> Result<PersonalSourceHeader, ExperienceError> {
    let body = super::header_input::header_input(payload)?;
    let object = object(&body)?;
    header(
        object,
        PersonalSourceKind::Awareness,
        text(object, "actorId")?,
        payload,
        law,
    )
}
fn available_new_source(
    state: &ExperienceState,
    actor_id: &str,
    id: &str,
) -> Result<(), ExperienceError> {
    if let Some(actor) = state.actor(actor_id) {
        if actor.privacy.forgotten_index.contains(id) {
            return Err(ExperienceError::Revoked);
        }
        if let Some(source) = actor.sources.get(&PersonalSourceKind::Awareness) {
            if source.get(id)?.is_some() {
                return Err(ExperienceError::DuplicateIdentity);
            }
        }
    }
    let owners = state
        .owner_maps
        .get(&PersonalSourceKind::Awareness)
        .ok_or(ExperienceError::UnknownCoverage)?;
    if !owners.coverage.complete || !owners.coverage.parent_present {
        return Err(ExperienceError::UnknownCoverage);
    }
    Ok(())
}
pub(crate) fn prepare_awareness_admission(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    input: &[AwarenessInput<'_>],
    activity: Option<ActivityRecordingContext<'_>>,
    budget: &ByteBudget,
) -> Result<AwarenessAdmission, AwarenessAcquisitionError> {
    let actor = core
        .state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    let has_memory = actor.has_memory();
    // Source sensory placement still calls canAddExperience, whose actual
    // accounting owner is required even though sensory charges are zero.
    let has_accounts = core
        .state
        .temporal
        .actor(actor_id)
        .is_some_and(|actor| actor.header().accounts.is_some());
    let mut bytes = heap_sum([
        size_of::<AwarenessAdmission>(),
        actor_id.len(),
        input
            .len()
            .checked_mul(size_of::<Decision>())
            .ok_or(ExperienceError::Capacity)?,
    ])
    .ok_or(ExperienceError::Capacity)?;
    for input in input {
        let body = input.awareness;
        if body.actor_id != actor_id {
            return Err(ExperienceError::ForeignOwner.into());
        }
        // Before cloning/rendering, fund actual strings, selected immutable
        // original retention, rendered wording and escaped encoding/parse scratch.
        bytes = heap_sum([
            bytes,
            body.heap_bytes()
                .ok_or(ExperienceError::Capacity)?
                .checked_mul(2)
                .ok_or(ExperienceError::Capacity)?,
            native_text_bound(&body.text).ok_or(ExperienceError::Capacity)?,
            body.content
                .as_ref()
                .map_or(Some(0), native_text_bound)
                .ok_or(ExperienceError::Capacity)?,
        ])
        .ok_or(ExperienceError::Capacity)?;
    }
    let reservation = budget
        .reserve(bytes.checked_mul(6).ok_or(ExperienceError::Capacity)?)
        .map_err(|_| ExperienceError::Capacity)?;
    let law = core.state.installed.account_law();
    let policy = &core.state.installed.attention.value().retention;
    let mut quota = if has_memory {
        Some(core.state.temporal.account_addition_budget(actor_id)?)
    } else {
        None
    };
    let mut decisions = Vec::new();
    decisions
        .try_reserve_exact(input.len())
        .map_err(|_| ExperienceError::Capacity)?;
    let mut ids = BTreeSet::new();
    for input in input {
        let awareness = input.awareness;
        let mut reason = if has_memory {
            selected_reason(awareness, &law)
        } else {
            RecordingReason::None
        };
        let mut body = awareness.clone();
        if reason != RecordingReason::None {
            body.text = NativeText::Literal(native_text(&awareness.text));
            body.content = awareness
                .content
                .as_ref()
                .map(|content| NativeText::Literal(native_text(content)));
            if awareness.speech.is_none() && awareness.sound.is_none() {
                body.retention = Some(ExperienceRetention {
                    reason: if awareness.exposure.is_some() {
                        RetentionReason::Deliberate
                    } else {
                        RetentionReason::Consequence
                    },
                    after_release: awareness
                        .retention
                        .as_ref()
                        .map(|retention| retention.after_release)
                        .unwrap_or_else(|| {
                            law.account_after_release(AccountRecordingInput {
                                source: RecordingSource::Awareness,
                                own: awareness.source_id.as_deref() == Some(actor_id)
                                    || awareness.trigger_kind == Some(TriggerKind::SelfEvent),
                                event_type: awareness.event_type.as_deref(),
                                activity,
                            })
                        }),
                    required: (reason == RecordingReason::Required).then_some(true),
                    receipt: None,
                });
            }
        }
        let mut selected = reason != RecordingReason::None;
        if selected {
            let payload = super::awareness_encoding::encode(&body, input.encoding)
                .map_err(|_| AwarenessAcquisitionError::Encoding)?;
            let header = source_header(&payload, &law)?;
            if !quota
                .as_mut()
                .ok_or(ReceivedError("Personal account quota is absent."))?
                .reserve(header.class, payload.len() as u64, policy)?
            {
                if header.class != AccountClass::Optional {
                    return Err(ReceivedError(
                        "Required personal experience could not be recorded.",
                    )
                    .into());
                }
                core.state
                    .temporal
                    .account_recording_gap(actor_id, core.state.physical.header.sim_time)?;
                selected = false;
                reason = RecordingReason::None;
            }
        }
        let mut sensory = body.retention_class == AwarenessRetentionClass::Sensory && has_accounts;
        if selected {
            available_new_source(&core.state.experience, actor_id, &body.event_id)?;
            if !ids.insert(body.event_id.clone()) {
                return Err(ExperienceError::DuplicateIdentity.into());
            }
        } else if sensory {
            match available_new_source(&core.state.experience, actor_id, &body.event_id) {
                Ok(()) => {
                    sensory = ids.insert(body.event_id.clone());
                }
                Err(ExperienceError::DuplicateIdentity | ExperienceError::Revoked) => {
                    sensory = false;
                }
                Err(error) => return Err(error.into()),
            }
        }
        decisions.push(Decision {
            body,
            encoding: input.encoding,
            reason,
            selected,
            sensory,
        });
    }
    Ok(AwarenessAdmission {
        actor_id: actor_id.to_owned(),
        has_memory,
        decisions,
        _reservation: reservation,
    })
}

pub(crate) fn acquire_awareness_accounts(
    core: &mut CoreMutation<'_>,
    mut admission: AwarenessAdmission,
    schema: &RecordSchema,
    budget: &ByteBudget,
) -> Result<PlacedAwarenessAccounts, AwarenessAcquisitionError> {
    let now = core.state.physical.header.sim_time;
    let installed = Arc::clone(&core.state.installed);
    let law = installed.account_law();
    let policy = &installed.attention.value().retention;
    for decision in &mut admission.decisions {
        let body = &mut decision.body;
        let attended = original_contexts(body).any(|context| context.attended);
        if !decision.selected && !attended {
            continue;
        }
        let mut locator = body.source_receipt.clone();
        if locator.is_none() && decision.selected {
            let context_subjects = original_contexts(body)
                .flat_map(|context| context.subjects.iter().map(|subject| subject.track.clone()))
                .collect::<IndexSet<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            let content = body
                .content
                .as_ref()
                .map(native_text)
                .filter(|content| !content.is_empty());
            let data = body
                .event_data
                .as_ref()
                .map(|data| {
                    #[derive(Serialize)]
                    struct Data<'a>(
                        #[serde(serialize_with = "crate::encoding::serialize_js_map")]
                        &'a IndexMap<String, crate::reception::EventScalar>,
                    );
                    json_record(&Data(data))
                })
                .transpose()
                .map_err(|_| AwarenessAcquisitionError::Encoding)?
                .map(crate::received::values::PersonalAccountData::from_encoded)
                .transpose()?;
            let physical_life = core
                .state
                .physical
                .entities
                .get(&admission.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .ok_or(ExperienceError::ForeignOwner)?
                .physical_life
                .unwrap_or(0);
            locator = super::receipt::append_personal_receipt(
                core,
                &admission.actor_id,
                physical_life,
                TemporalCaptureInput {
                    spatial_context: false,
                    availability_at: None,
                    coverage_gap: None,
                    ended_fields: None,
                    terminal_reservation_bytes: None,
                    terminal_reservation_delta: None,
                    received_at: None,
                    received_order: None,
                    availability: None,
                    receiver_frame: None,
                    subject: body.event_id.clone(),
                    context_subjects: (!context_subjects.is_empty()).then_some(context_subjects),
                    subject_identity: None,
                    change: TemporalChange::Occurrence,
                    required: decision.reason == RecordingReason::Required,
                    source_ids: vec![body.event_id.clone()],
                    origin: None,
                    facets: vec![TemporalCaptureFacet {
                        value: ReceivedValueFragment::PersonalAccount(PersonalAccountFragment {
                            kind: PersonalAccountKind::PersonalAccount,
                            source: PersonalAccountSource::Awareness,
                            id: body.event_id.clone(),
                            text: native_text(&body.text),
                            event_type: body.event_type.clone(),
                            content,
                            data,
                        }),
                        preferred: None,
                        reception: None,
                        clock: ReceivedFieldClock {
                            role: ReceivedRole::Direct,
                            as_of: body.at,
                            measured_from: body.at,
                            measured_through: body.at,
                            acquired_at: now,
                            confirmed_through: None,
                        },
                        member_index: None,
                        track: None,
                        support: None,
                        detail_support: None,
                        pose_frame: None,
                        original: None,
                        received_from: None,
                    }],
                },
            )?;
        }
        if let Some(locator) = &locator {
            if let Some(retention) = body.retention.as_mut() {
                retention.receipt = Some(locator.clone());
            }
            body.source_receipt = Some(locator.clone());
            if matches!(body.exposure, Some(EncounterExposure::Place { .. })) {
                let values = core
                    .state
                    .reception
                    .received_values
                    .as_ref()
                    .ok_or(ReceivedError(
                        "Actual received value ownership is unavailable.",
                    ))?;
                if let Some(receipt) = core
                    .state
                    .temporal
                    .native_receipt(locator, values, &law, budget)?
                {
                    let ordinals = receipt
                        .fragments()
                        .iter()
                        .zip(&receipt.receipt().facets)
                        .filter_map(|(value, field)| {
                            matches!(
                                value,
                                ReceivedValueFragment::Location(_)
                                    | ReceivedValueFragment::Sensory(
                                        crate::reception::SensoryFacet::EncounterExposure {
                                            exposure: EncounterExposure::Place { .. }
                                        }
                                    )
                            )
                            .then_some(field.member_index)
                        })
                        .collect::<BTreeSet<_>>();
                    core.state.temporal.retain_receipt_support(
                        locator,
                        Some(&ordinals),
                        false,
                        &policy.optional,
                        SupportRetentionContext {
                            values,
                            meaning: &law,
                            now,
                            policy,
                            meters: &mut core.journal.meters,
                            budget,
                            places: Some(KnownPlaceMutation {
                                state: &mut core.state.experience,
                                journal: &mut core.journal.experience,
                                limits: &core.state.installed.personal_evidence_preparation,
                                budget,
                            }),
                        },
                    )?;
                }
            }
        }
    }
    let mut quota = if admission.has_memory {
        Some(
            core.state
                .temporal
                .account_addition_budget(&admission.actor_id)?,
        )
    } else {
        None
    };
    let mut placed = Vec::new();
    placed
        .try_reserve_exact(admission.decisions.len())
        .map_err(|_| ExperienceError::Capacity)?;
    for decision in admission.decisions {
        let body = decision.body;
        if !decision.selected && !decision.sensory {
            continue;
        }
        let payload = super::awareness_encoding::encode(&body, decision.encoding)
            .map_err(|_| AwarenessAcquisitionError::Encoding)?;
        let header = source_header(&payload, &law)?;
        if decision.selected
            && !quota
                .as_mut()
                .ok_or(ReceivedError("Personal account quota is absent."))?
                .reserve(header.class, payload.len() as u64, policy)?
        {
            if header.class != AccountClass::Optional {
                return Err(
                    ReceivedError("Required personal experience could not be recorded.").into(),
                );
            }
            core.state
                .temporal
                .account_recording_gap(&admission.actor_id, now)?;
            continue;
        }
        core.journal.experience.ensure_collection(
            &mut core.state.experience,
            PersonalSourceKind::Awareness,
            &admission.actor_id,
        )?;
        available_new_source(&core.state.experience, &admission.actor_id, &body.event_id)?;
        let collection = core
            .state
            .experience
            .actor(&admission.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?
            .collection(PersonalSourceKind::Awareness)?;
        let position = collection.coverage.next_ordinal;
        let parent = collection_owner(PersonalSourceKind::Awareness, &admission.actor_id)?;
        let row_id = json_record(&[
            "world",
            "experience",
            "awareness",
            &admission.actor_id,
            &body.event_id,
        ])
        .map_err(|_| AwarenessAcquisitionError::Encoding)?;
        let mut extra: Vec<crate::records::SqlCell> = super::columns::awareness_columns(
            &body, &header, &payload, &law, policy, schema, budget,
        )
        .map_err(|_| AwarenessAcquisitionError::Encoding)?
        .into_iter()
        .map(Into::into)
        .collect();
        for cell in &mut extra {
            crate::records::save::normalize_cell(cell);
        }
        let record = PersonalSourceRecord::install(
            PersonalSourceKind::Awareness,
            &admission.actor_id,
            InstalledRow {
                id: row_id,
                parent,
                slot: position.to_string(),
                position,
                payload,
                extra,
            },
            &law,
        )?;
        core.state.temporal.adjust_account(
            &admission.actor_id,
            header.class,
            record.payload.len() as i128,
            1,
            experience_retention_due(&header, policy),
            now,
            policy,
        )?;
        core.journal
            .experience
            .append(&mut core.state.experience, record)?;
        placed.push((body, decision.selected));
    }
    for (body, _) in &placed {
        core.journal.experience.acquire_known_place_awareness(
            &mut core.state.experience,
            body,
            &core.state.installed.personal_evidence_preparation,
            budget,
        )?;
    }
    // Only genuinely admitted automatic speech enters the later recognition
    // retention duty; an ephemeral sensory account never becomes lasting speech.
    let entries = placed
        .into_iter()
        .filter_map(|(body, automatic)| automatic.then_some(body))
        .collect();
    Ok(PlacedAwarenessAccounts {
        entries,
        _reservation: admission._reservation,
    })
}
