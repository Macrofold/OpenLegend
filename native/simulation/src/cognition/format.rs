//! Source ICU canonical property ordering and NFKC word/filename predicates are
//! finite pure preparation. The native owner still owns every semantic check.
use crate::execution::ExecutionError;
use crate::experience::HistoryPreparationError;
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CanonicalJsonAnswer, CanonicalJsonRequest};
use crate::records::SqlCell;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

pub(crate) struct MaintenanceFormatRequest {
    canonical: CanonicalJsonRequest,
}
impl Serialize for MaintenanceFormatRequest {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = serializer.serialize_struct("MaintenanceFormat", 2)?;
        out.serialize_field("binding", &self.canonical.binding)?;
        out.serialize_field("publication", &self.canonical.value)?;
        out.end()
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MaintenanceFormatAnswer {
    pub binding: GeometryBinding,
    canonical_publication: String,
    valid_paths: Vec<bool>,
    file_words: Vec<u64>,
    thought_words: Vec<u64>,
    #[serde(skip)]
    storage: Option<ByteReservation>,
}
pub(crate) struct VerifiedMaintenanceFormat {
    pub canonical: String,
    pub valid_paths: Vec<bool>,
    pub file_words: Vec<u64>,
    pub thought_words: Vec<u64>,
    _storage: ByteReservation,
}
impl MaintenanceFormatAnswer {
    pub(crate) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, HistoryPreparationError> {
        let storage =
            crate::install::reserve_typed_parse::<Self>(text, size_of::<u64>(), None, budget)
                .map_err(|e| match e {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
        let mut value: Self =
            serde_json::from_str(text).map_err(|_| HistoryPreparationError::MalformedResponse)?;
        value.storage = Some(storage);
        Ok(value)
    }
}
impl MaintenanceFormatRequest {
    pub(crate) fn prepare(
        binding: GeometryBinding,
        publication: &impl Serialize,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Ok(Self {
            canonical: CanonicalJsonRequest::prepare(binding, publication, budget)?,
        })
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.canonical.binding
    }
    pub(crate) fn finish(
        &mut self,
        mut answer: MaintenanceFormatAnswer,
        _budget: &ByteBudget,
    ) -> Result<VerifiedMaintenanceFormat, HistoryPreparationError> {
        let canonical = CanonicalJsonAnswer {
            binding: answer.binding,
            canonical: answer.canonical_publication,
        };
        self.canonical
            .validate(&canonical)
            .map_err(|error| match error {
                ExecutionError::Capacity => HistoryPreparationError::Capacity,
                ExecutionError::InvalidCheckpoint => HistoryPreparationError::StaleResponse,
                _ => HistoryPreparationError::MalformedResponse,
            })?;
        let value = &self.canonical.value;
        let files = value
            .get("files")
            .and_then(SqlCell::as_array)
            .ok_or(HistoryPreparationError::MalformedResponse)?
            .len();
        let thoughts = value
            .get("thoughts")
            .and_then(SqlCell::as_array)
            .ok_or(HistoryPreparationError::MalformedResponse)?
            .len();
        if answer.valid_paths.len() != files
            || answer.file_words.len() != files
            || answer.thought_words.len() != thoughts
        {
            return Err(HistoryPreparationError::MalformedResponse);
        }
        let mut storage = answer
            .storage
            .take()
            .ok_or(HistoryPreparationError::MalformedResponse)?;
        storage
            .resize(
                canonical
                    .canonical
                    .capacity()
                    .checked_add(answer.valid_paths.capacity() * size_of::<bool>())
                    .and_then(|n| {
                        n.checked_add(answer.file_words.capacity().checked_mul(size_of::<u64>())?)
                    })
                    .and_then(|n| {
                        n.checked_add(
                            answer
                                .thought_words
                                .capacity()
                                .checked_mul(size_of::<u64>())?,
                        )
                    })
                    .and_then(|n| n.checked_add(size_of::<VerifiedMaintenanceFormat>()))
                    .ok_or(HistoryPreparationError::Capacity)?,
            )
            .map_err(|_| HistoryPreparationError::Capacity)?;
        Ok(VerifiedMaintenanceFormat {
            canonical: canonical.canonical,
            valid_paths: answer.valid_paths,
            file_words: answer.file_words,
            thought_words: answer.thought_words,
            _storage: storage,
        })
    }
}
