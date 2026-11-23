//! Scoped unsaved temporal rows share the actual save packer and accepted cut.
//! This is an internal indexed-read product, not a model/HTTP disclosure grant.
use super::*;
use std::borrow::Cow;

/// The accepted predecessor of the actual source-version question. Borrowing
/// this inside the native turn leaves no temporary world or save copy.
pub struct RuntimeSourceVersionRead<'a> {
    pub request: &'a str,
    pub binding: crate::geometry::GeometryBinding,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    save: &'a crate::records::save::SaveJournal,
}

impl RuntimeSourceVersionRead<'_> {
    pub fn pending_rows(
        &self,
    ) -> (
        Option<&crate::records::ChangedRows>,
        &crate::records::ChangedRows,
    ) {
        self.save.pending_read_rows()
    }

    pub fn pending_versions(
        &self,
        detached: bool,
    ) -> impl Iterator<Item = crate::received::SourceVersionArchiveChange<'_>> {
        self.save.pending_source_versions(detached)
    }
}

impl RuntimeProvider {
    pub fn asks_source_versions(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.kind() == crate::simulation::ProviderKind::SourceVersions)
    }

    pub fn asks_npc_sources(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.npc_sources().is_some())
    }

    pub fn asks_appraisal_outcomes(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.appraisal_outcomes().is_some())
    }

    pub fn asks_activity_history(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.learning_history().is_some())
    }
}

/// Exact prior create identities and pending save rows for one appraisal
/// operation. The SQL reader retains only the selected rows across its await.
pub struct RuntimeAppraisalOutcomesRead<'a> {
    pub binding: crate::geometry::GeometryBinding,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor_id: &'a str,
    pub ids: &'a [String],
    pub maximum_transfer_bytes: usize,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
}

impl NativeWorldSession {
    pub fn with_appraisal_outcomes_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeAppraisalOutcomesRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        let Some(request) = question.appraisal_outcomes() else {
            return Ok(None);
        };
        let (metadata, save) = self
            .session
            .source_versions_read(request.binding, &request.world_id, &request.generation)
            .map_err(failure)?;
        let (detached, suffix) = save.pending_read_rows();
        Ok(Some(prepare(RuntimeAppraisalOutcomesRead {
            binding: request.binding,
            world_id: &request.world_id,
            generation: &request.generation,
            actor_id: &request.actor_id,
            ids: &request.ids,
            maximum_transfer_bytes: request.maximum_transfer_bytes,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            detached,
            suffix,
        })))
    }
}

/// Borrowed operation scope for acquiring exact activity rows. Only the
/// matching candidate may consume the answer; this read grants no disclosure.
pub struct RuntimeActivityHistoryRead<'a> {
    pub request: &'a crate::activity::LearningHistoryRequest,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    save: &'a crate::records::save::SaveJournal,
}

/// Bounded actor-specific read of canonical occurrence rows. Both the
/// learner and explicit inspection use the same pending/durable selection.
pub struct RuntimeActivityRowsRead<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor_id: &'a str,
    pub after: i64,
    pub ids: Option<&'a [String]>,
    pub maximum_rows: usize,
    pub maximum_bytes: usize,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
}

impl RuntimeActivityHistoryRead<'_> {
    pub fn pending_rows(
        &self,
    ) -> (
        Option<&crate::records::ChangedRows>,
        &crate::records::ChangedRows,
    ) {
        self.save.pending_read_rows()
    }

    pub fn rows(&self) -> RuntimeActivityRowsRead<'_> {
        let (detached, suffix) = self.pending_rows();
        RuntimeActivityRowsRead {
            world_id: &self.request.world_id,
            generation: &self.request.generation,
            actor_id: &self.request.actor_id,
            after: self.request.after,
            ids: self.request.ids.as_deref(),
            maximum_rows: self.request.maximum_rows,
            maximum_bytes: self.request.maximum_bytes,
            durable_revision: self.durable_revision,
            in_flight_through: self.in_flight_through,
            detached,
            suffix,
        }
    }
}

impl NativeWorldSession {
    /// Attach the active learning question to the same pending save prefix as
    /// its accepted world cut. The caller copies only matching activity rows.
    pub fn with_activity_history_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeActivityHistoryRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        let Some(request) = question.learning_history() else {
            return Ok(None);
        };
        if request.accepted_cut != request.binding.base_cut {
            return Err(failure("activity history lost its accepted cut"));
        }
        let (metadata, save) = self
            .session
            .source_versions_read(request.binding, &request.world_id, &request.generation)
            .map_err(failure)?;
        Ok(Some(prepare(RuntimeActivityHistoryRead {
            request,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            save,
        })))
    }
}

/// Accepted evidence rows for one genuine read origin. The privacy and
/// chronology checks still live in the NPC source cursor on completion.
pub struct RuntimeNpcSourceRead<'a> {
    pub binding: crate::geometry::GeometryBinding,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor_id: &'a str,
    pub read_serial: u64,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    pub maximum_transfer_bytes: usize,
    pub selection: &'a NpcSourceSelection,
    pub temporal: Option<&'a crate::records::ChangedRows>,
    save: &'a crate::records::save::SaveJournal,
}

impl RuntimeNpcSourceRead<'_> {
    pub fn pending_rows(
        &self,
    ) -> (
        Option<&crate::records::ChangedRows>,
        &crate::records::ChangedRows,
    ) {
        self.save.pending_read_rows()
    }

    pub fn pending_versions(
        &self,
        detached: bool,
    ) -> impl Iterator<Item = crate::received::SourceVersionArchiveChange<'_>> {
        self.save.pending_source_versions(detached)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceHeader<'a> {
    binding: crate::geometry::GeometryBinding,
    #[serde(borrow)]
    world_id: Cow<'a, str>,
    #[serde(borrow)]
    generation: Cow<'a, str>,
    base_cut: u64,
    #[serde(default)]
    restore_projection: Option<&'a serde_json::value::RawValue>,
}

impl NativeWorldSession {
    /// Lend the exact pending predecessor of an ordinary finalizer to the
    /// storage owner. Restore has its own checkpoint predecessor.
    pub fn with_source_version_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeSourceVersionRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        if question.kind() != crate::simulation::ProviderKind::SourceVersions {
            return Ok(None);
        }
        #[derive(Deserialize)]
        struct Envelope<'a> {
            #[serde(borrow)]
            value: SourceHeader<'a>,
        }
        let text = question
            .json()
            .ok_or_else(|| failure("missing source request"))?;
        let _storage = self.budget.reserve(text.len()).map_err(failure)?;
        let Envelope { value: header } = serde_json::from_str(text).map_err(failure)?;
        if question.binding() != header.binding
            || header.base_cut != header.binding.base_cut
            || header.restore_projection.is_some()
        {
            return Err(failure(
                "source request is not an ordinary accepted predecessor",
            ));
        }
        let (metadata, save) = self
            .session
            .source_versions_read(header.binding, &header.world_id, &header.generation)
            .map_err(failure)?;
        Ok(Some(prepare(RuntimeSourceVersionRead {
            request: text,
            binding: header.binding,
            world_id: &header.world_id,
            generation: &header.generation,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            save,
        })))
    }

    /// The actual source ticket selects the actor and scopes every retained
    /// record. Account-only readers do not prepare pending temporal pages.
    pub fn with_npc_sources_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeNpcSourceRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        let Some(request) = question.npc_sources() else {
            return Ok(None);
        };
        if question.binding() != request.binding {
            return Err(failure("NPC source request binding changed"));
        }
        let (metadata, save) = self
            .session
            .source_versions_read(
                request.binding,
                &request.origin.world_id,
                &request.origin.generation,
            )
            .map_err(failure)?;
        let temporal = (!request.selection.receipts.is_empty())
            .then(|| {
                self.session.npc_source_temporal(
                    &request.origin.actor_id,
                    metadata.represented_before,
                    self.temporal_save_limits,
                    &self.budget,
                )
            })
            .transpose()
            .map_err(failure)?;
        Ok(Some(prepare(RuntimeNpcSourceRead {
            binding: request.binding,
            world_id: &request.origin.world_id,
            generation: &request.origin.generation,
            actor_id: &request.origin.actor_id,
            read_serial: request.origin.read_serial,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            maximum_transfer_bytes: request.maximum_transfer_bytes,
            selection: &request.selection,
            temporal: temporal.as_ref().map(|product| product.changes()),
            save,
        })))
    }
}

/// Original accepted SQL-cut facts for the active remembered-place request.
/// The I/O owner takes independently funded copies only of relevant data.
pub struct RuntimeKnownPlaceRead<'a> {
    pub binding: crate::geometry::GeometryBinding,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor_id: &'a str,
    pub maximum_rows: u64,
    pub maximum_bytes: u64,
    pub durable_revision: u64,
    pub durable_cut: u64,
    pub in_flight_through: Option<u64>,
    pub privacy: &'a crate::experience::ActorPrivacy,
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReadCutInput {
    actor_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TailOwner {
    actor_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    physical_life: u64,
    epoch: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    tail_revision: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TailReply {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    accepted_cut: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    identity_through: u64,
    request: TailOwner,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    tail: Option<crate::received::TemporalReceiptTail>,
}
impl NativeWorldSession {
    /// Lend the needed save owners to the active provider without capturing
    /// temporal pages or going back through the application mutation lane.
    pub fn with_known_place_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeKnownPlaceRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        let Some(request) = question.known_places() else {
            return Ok(None);
        };
        let (save, privacy, (detached, suffix)) = self
            .session
            .known_place_read(
                request.binding,
                &request.world_id,
                &request.generation,
                &request.actor_id,
                request.physical_life,
                request.privacy_revision,
                request.expected_revision,
            )
            .map_err(failure)?;
        Ok(Some(prepare(RuntimeKnownPlaceRead {
            binding: request.binding,
            world_id: &request.world_id,
            generation: &request.generation,
            actor_id: &request.actor_id,
            maximum_rows: request.maximum_rows,
            maximum_bytes: request.maximum_bytes,
            durable_revision: save.durable_revision,
            durable_cut: save.durable_cut,
            in_flight_through: save.in_flight_through,
            privacy,
            detached,
            suffix,
        })))
    }
    pub fn resolve_receipt_tail(&mut self, input: &[u8]) -> Result<(), RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: TailReply = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .resolve_receipt_tail(
                &input.world_id,
                &input.generation,
                input.accepted_cut,
                input.identity_through,
                &crate::received::TemporalReceiptTailRequest {
                    actor_id: &input.request.actor_id,
                    physical_life: input.request.physical_life,
                    epoch: &input.request.epoch,
                    tail_revision: input.request.tail_revision,
                },
                input.tail,
            )
            .map_err(failure)
    }
    pub fn read_cut(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ReadCutInput = serde_json::from_slice(input).map_err(failure)?;
        let captured = self
            .session
            .read_cut(&input.actor_id, self.temporal_save_limits, &self.budget)
            .map_err(failure)?;
        RuntimeJson::encode(&captured, &self.budget)
    }
}
