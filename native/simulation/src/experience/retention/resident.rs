//! A complete live installation already owns the eligible canonical bodies.
//! Prepare only the due actor under the ordinary accepted-world turn.

use super::*;
use crate::records::SqlCell;
use crate::text::{JsText, TextRef};

const KINDS: [PersonalSourceKind; 3] = [
    PersonalSourceKind::Awareness,
    PersonalSourceKind::Memory,
    PersonalSourceKind::Summary,
];

/// Select one due actor after the last attempted slot, with wraparound.
/// Headers contain only current scalar charges and deadlines. No account
/// bodies are visited until the chosen actor's bounded preparation begins.
pub(crate) fn next_due_actor(state: &SimulationState, after: usize) -> Option<(usize, &str)> {
    let now = state.physical.header.sim_time;
    let policy = &state.installed.attention.value().retention;
    let mut first = None;
    for (index, actor) in state.temporal.actor_ids().enumerate() {
        let Some(accounts) = state
            .temporal
            .actor(actor)
            .and_then(|history| history.header().accounts.as_ref())
        else {
            continue;
        };
        if accounts.next_due.is_some_and(|at| at <= now) || hard_pressure(accounts, policy) {
            if index >= after {
                return Some((index, actor));
            }
            first.get_or_insert((index, actor));
        }
    }
    first
}

/// Render a selected summary's retained short memory. The supplied prefix is
/// from the installed release, shared by the live and recovery consumers.
pub fn render_account_summary(
    payload: &str,
    prefix: &str,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), ExperienceError> {
    #[derive(Deserialize)]
    struct Text {
        text: JsText,
    }
    let decode = SqlCell::json_decode_bound(payload).ok_or(ExperienceError::Capacity)?;
    let _parser = budget
        .reserve(decode)
        .map_err(|_| ExperienceError::Capacity)?;
    let body: Text = serde_json::from_str(payload)
        .map_err(|_| ExperienceError::InvalidBody("retained summary text"))?;
    let factor = if body.text.as_unicode().is_some() {
        2
    } else {
        20
    };
    let rendered = prefix
        .len()
        .checked_add(body.text.storage_bytes())
        .and_then(|bytes| bytes.checked_mul(factor))
        .and_then(|bytes| bytes.checked_add(64))
        .ok_or(ExperienceError::Capacity)?;
    let mut storage = budget
        .reserve(rendered)
        .map_err(|_| ExperienceError::Capacity)?;
    let mut text = JsText::from(prefix);
    TextRef::from(&body.text).append_to(&mut text);
    storage
        .resize(text.storage_bytes())
        .map_err(|_| ExperienceError::Capacity)?;
    Ok((text, storage))
}

impl AccountRetentionRead {
    pub(crate) fn prepare_resident(
        state: &SimulationState,
        actor: &str,
        limits: RetentionPreparation,
        summary_prefix: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        // An incomplete import may omit eligible old accounts. It needs the
        // existing SQL metadata/body preparation before using this planner.
        for kind in KINDS {
            if state
                .experience
                .optional_collection(actor, kind)?
                .is_some_and(|records| !records.coverage().complete)
            {
                return Err(ExperienceError::Unavailable.into());
            }
        }
        let mut read = Self::capture(state, actor, limits, budget)?;
        let mut selected = read.prepare_selection(
            AccountMetadataReply {
                metadata: Vec::new(),
                next_due: None,
                more: false,
            },
            budget,
        )?;
        let count = selected.candidates.len();
        let bytes = count
            .checked_mul(
                size_of::<Arc<PersonalSourceRecord>>()
                    + size_of::<Arc<crate::host::SharedMemoryPin>>()
                    + size_of::<Option<JsText>>(),
            )
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut records = Vec::with_capacity(count);
        let mut pins = Vec::with_capacity(count);
        let mut summaries = Vec::with_capacity(count);
        for choice in &selected.candidates {
            let body = state
                .experience
                .optional_collection(actor, choice.kind)?
                .and_then(|collection| collection.resident_record(&choice.id))
                .ok_or(ExperienceError::StaleHydration)?;
            if body.header.reference.revision != choice.revision
                || body.row_id() != choice.record_id
            {
                return Err(ExperienceError::StaleHydration.into());
            }
            let summary = if choice.kind == PersonalSourceKind::Summary {
                let (text, owned) = render_account_summary(body.payload(), summary_prefix, budget)?;
                storage.merge(owned)?;
                Some(text)
            } else {
                None
            };
            records.push(Arc::clone(body));
            pins.push(body.capture_pin(budget)?);
            summaries.push(summary);
        }
        selected._storage.merge(storage)?;
        selected.records = Some(records);
        selected.pins = pins;
        selected.summaries = summaries;
        read.selection = Some(selected);
        read.live_complete = true;
        Ok(read)
    }
}
