//! One complete purpose-bound repository selection over actual current personal
//! rows, including cold/ended heads. No live outing reconstructs these terms.
use super::*;
use crate::host::retained_size::tree_node_bound;
use crate::records::SqlCell;
use crate::text::JsText;
use crate::worlds::InstalledMovementTerms as MovementTerms;
use serde::ser::SerializeSeq;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SelectedRow {
    row: InstalledRow,
    reference: PersonalSourceRef,
    agreement_key: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    first_position: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Selection {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    read_serial: u64,
    rows: Vec<SelectedRow>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Agreement {
    event_data: AgreementData,
}
#[derive(Deserialize)]
struct AgreementData {
    agreement: JsText,
}

struct HeldTerms {
    record: Arc<PersonalSourceRecord>,
    _pin: Arc<SharedMemoryPin>,
    terms: MovementTerms,
    first_position: u64,
}
pub(crate) struct PreparedMovementTerms {
    scope: Arc<NpcHistoricalScope>,
    personal_cut: cursor::NpcPersonalScope,
    terms: Vec<HeldTerms>,
    _storage: ByteReservation,
}
impl PreparedMovementTerms {
    pub(crate) fn prepare(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        personal_cut: &cursor::NpcPersonalScope,
        input: &[u8],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !scope.still_permitted(state)
            || !scope.allows_selection(true)
            || personal_cut.at < scope.at
            || personal_cut.at > state.physical.header.sim_time
            || personal_cut.accepted_cut > state.accepted_cut
            || personal_cut.identity_through > state.physical.identity.next_id()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let text = std::str::from_utf8(input).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let _decode = crate::install::reserve_typed_parse::<Selection>(
            text,
            size_of::<SelectedRow>().max(size_of::<SqlCell>()),
            Some(size_of::<(usize, JsText, SqlCell)>()),
            budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => ExecutionError::Capacity,
            _ => ExecutionError::InvalidCheckpoint,
        })?;
        let selected: Selection =
            serde_json::from_str(text).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        if selected.world_id != scope.world_id
            || selected.generation != scope.generation
            || selected.read_serial != scope.read_serial
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let count = selected.rows.len();
        let storage = budget.reserve(
            size_of::<Self>()
                .checked_add(
                    count
                        .checked_mul(size_of::<HeldTerms>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut scratch = budget.reserve(
            count
                .checked_mul(
                    tree_node_bound::<JsText, ()>()
                        .ok_or(ExecutionError::Capacity)?
                        .checked_add(tree_node_bound::<u64, ()>().ok_or(ExecutionError::Capacity)?)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut seen_ids = BTreeSet::new();
        let mut seen_positions = BTreeSet::new();
        let mut terms = Vec::new();
        terms
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut previous = None;
        let actor = scope.actor_id.as_str();
        for selected in selected.rows {
            if selected.reference.kind != PersonalSourceKind::Awareness
                || !selected.reference.validate()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let record = personal::current_record(
                state,
                personal_cut,
                actor,
                PersonalSourceKind::Awareness,
                selected.row,
                budget,
            )?;
            let header = record.header();
            let coverage = personal_cut
                .coverage(PersonalSourceKind::Awareness)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            let revoked = state.experience.actor(actor).is_some_and(|history| {
                history.privacy.revoked(&header.reference.id)
                    || header
                        .event_id
                        .as_deref()
                        .is_some_and(|id| history.privacy.revoked(id))
            });
            // This derived canonical flag includes awareness kind, exact
            // memory retention, string agreement and personalAgreement=true.
            if header.reference != selected.reference
                || record.slot() != header.reference.id
                || !header.personal_agreement
                || selected.first_position > record.position()
                || selected.first_position >= coverage.next_ordinal
                || previous.is_some_and(|position| selected.first_position <= position)
                || revoked
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let _agreement_decode = crate::install::reserve_typed_parse::<Agreement>(
                record.payload(),
                size_of::<usize>(),
                None,
                budget,
            )
            .map_err(|error| match error {
                crate::install::InstallError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::InvalidCheckpoint,
            })?;
            let agreement: Agreement = serde_json::from_str(record.payload())
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
            // JSON.parse accepts literal isolated units within a document's
            // quoted strings. Reuse the existing exact document codec instead
            // of narrowing an acquired JS string to Unicode or replacing units.
            let _document = budget.reserve(
                agreement
                    .event_data
                    .agreement
                    .json_document_bound()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let document = agreement
                .event_data
                .agreement
                .json_document()
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
            let value = MovementTerms::decode(actor, &document, budget)?;
            let key_bytes = crate::encoding::json_record_len(&(value.family(), value.id()))
                .map_err(|_| ExecutionError::Invariant)?;
            let _key = budget.reserve(key_bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
            let key = crate::encoding::json_record(&(value.family(), value.id()))
                .map_err(|_| ExecutionError::Invariant)?;
            if key != selected.agreement_key
                || seen_ids.contains(value.id())
                || !seen_positions.insert(record.position())
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            scratch.resize(
                scratch
                    .bytes()
                    .checked_add(value.id().heap_bytes().ok_or(ExecutionError::Capacity)?)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            seen_ids.insert(value.id().clone());
            previous = Some(selected.first_position);
            let pin = record.capture_pin(budget)?;
            terms.push(HeldTerms {
                record,
                _pin: pin,
                terms: value,
                first_position: selected.first_position,
            });
        }
        Ok(Self {
            scope,
            personal_cut: personal_cut.clone(),
            terms,
            _storage: storage,
        })
    }
    pub(crate) fn still_permitted(&self, state: &SimulationState) -> bool {
        self.scope.still_permitted(state)
    }
    pub(crate) fn values(&self) -> impl ExactSizeIterator<Item = &MovementTerms> {
        self.terms.iter().map(|entry| &entry.terms)
    }
    pub(crate) fn sources(&self) -> impl ExactSizeIterator<Item = &PersonalSourceRef> {
        self.terms
            .iter()
            .map(|entry| &entry.record.header().reference)
    }
}
impl Serialize for PreparedMovementTerms {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut values = serializer.serialize_seq(Some(self.terms.len()))?;
        for entry in &self.terms {
            values.serialize_element(&entry.terms)?;
        }
        values.end()
    }
}
