//! Recent history uses the actor's existing eligible receipt directory to
//! select addresses. The ordinary source cursor owns bodies and proof.
use super::*;
use crate::capture::{NpcHistoryPrefix, NpcPersonalScope, NpcReceiptSelection, NpcSourceRows};
use crate::received::{MaterializedTemporalValue, TemporalReceipt, TemporalReceiptLocator};

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeRecentPosition {
    pub batch_order: u64,
    pub entry_index: u64,
    pub member_index: u64,
}

pub struct RuntimeRecentBrowse {
    pub world_id: String,
    pub generation: String,
    pub privacy: u64,
    pub life: u64,
    pub receipts: Vec<NpcReceiptSelection>,
    pub has_more: bool,
    pub incomplete: bool,
    pub maximum_operations: u64,
    _storage: ByteReservation,
}

pub struct RuntimeRecentReceipt<'a> {
    item: &'a crate::capture::CapturedNpcReceipt,
}

/// Borrow only this recent reader's accepted save owners. The store must
/// retain its selected overlay before the borrow ends and owns its release.
pub struct RuntimeRecentSourceRead<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor: &'a str,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    pub receipts: &'a [NpcReceiptSelection],
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
    pub temporal: Option<&'a crate::records::ChangedRows>,
}

impl<'a> RuntimeRecentReceipt<'a> {
    pub fn receipt(&self) -> &'a TemporalReceipt {
        self.item.capture.receipt()
    }

    pub fn values(&self) -> impl Iterator<Item = MaterializedTemporalValue<'a>> {
        let capture = &self.item.capture;
        (0..capture.fragments().len()).filter_map(move |index| capture.value(index))
    }

    pub fn bytes(&self) -> Result<usize, RuntimeError> {
        self.values().try_fold(
            json_record_len(&self.item.capture.read_view()).map_err(failure)?,
            |sum, value| {
                let bytes = json_record_len(&value).map_err(failure)?;
                sum.checked_add(bytes).ok_or_else(|| failure("capacity"))
            },
        )
    }
}

impl RuntimePrivateHistoryRead {
    /// Borrow prepared receipt bodies while the caller holds this read's
    /// current synchronous disclosure lease. No world rows escape.
    pub fn with_recent_receipts<'a, T>(
        &'a self,
        read: impl FnOnce(&mut dyn Iterator<Item = RuntimeRecentReceipt<'a>>, bool) -> T,
    ) -> Result<T, RuntimeError> {
        let prepared = self
            .sources
            .as_ref()
            .filter(|_| matches!(self.purpose, HistoryPurpose::Recent))
            .ok_or_else(|| failure("recent receipt bodies not prepared"))?;
        Ok(read(
            &mut prepared
                .receipts
                .iter()
                .map(|item| RuntimeRecentReceipt { item }),
            !prepared.unavailable_receipts.is_empty(),
        ))
    }
}

impl NativeWorldSession {
    /// Lend the original accepted cut and the same temporal save packing
    /// used by ordinary source requests. No I/O runs under this borrow.
    pub fn with_recent_source_read<T>(
        &self,
        read: &RuntimePrivateHistoryRead,
        browse: &RuntimeRecentBrowse,
        prepare: impl FnOnce(RuntimeRecentSourceRead<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        let (metadata, save) = self.session.accepted_save_read().map_err(failure)?;
        let scope = &read.scope;
        if !matches!(read.purpose, HistoryPurpose::Recent)
            || metadata.through_cut != scope.accepted_cut
        {
            return Err(failure("recent read lost its accepted cut"));
        }
        let (detached, suffix) = save.pending_read_rows();
        let temporal = (!browse.receipts.is_empty())
            .then(|| {
                self.session.npc_source_temporal(
                    &scope.actor_id,
                    metadata.represented_before,
                    self.temporal_save_limits,
                    &self.budget,
                )
            })
            .transpose()
            .map_err(failure)?;
        Ok(prepare(RuntimeRecentSourceRead {
            world_id: &scope.world_id,
            generation: &scope.generation,
            actor: &scope.actor_id,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            receipts: &browse.receipts,
            detached,
            suffix,
            temporal: temporal.as_ref().map(|rows| rows.changes()),
        }))
    }

    /// Admit the retained source rows after the SQL wait. This keeps the
    /// original temporal cutoff and checks current privacy before any body can
    /// enter the prepared read.
    pub fn admit_recent_source_rows(
        &self,
        read: &mut RuntimePrivateHistoryRead,
        browse: &mut RuntimeRecentBrowse,
        rows: NpcSourceRows,
    ) -> Result<bool, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if !matches!(read.purpose, HistoryPurpose::Recent)
            || read.sources.is_some()
            || !read.scope.still_permitted(state)
        {
            return Ok(false);
        }
        let current = NpcPersonalScope::capture(state, read.actor_id()).map_err(failure)?;
        let selection = crate::capture::NpcSourceSelection {
            receipts: std::mem::take(&mut browse.receipts),
            personal: Vec::new(),
            consolidation_job: None,
        };
        read.sources = Some(
            crate::capture::PreparedNpcSources::prepare(
                state,
                read.scope.clone(),
                current,
                &selection,
                rows,
                &self.budget,
            )
            .map_err(failure)?,
        );
        Ok(true)
    }

    /// Pin one exact actor and receipt cutoff before the reader's SQL wait.
    /// Only compact directory ranges are visited here. The returned addresses
    /// stay funded through the existing receipt loader and privacy recheck.
    pub fn read_recent_browse(
        &mut self,
        account: &str,
        owner: &str,
        actor: &str,
        before: Option<RuntimeRecentPosition>,
    ) -> Result<Option<(RuntimePrivateHistoryRead, RuntimeRecentBrowse)>, RuntimeError> {
        const RECEIPTS_PER_WINDOW: usize = 128;
        if !self.private_history_permitted(account, owner, actor)? {
            return Ok(None);
        }
        let read = self.read_history(actor, "recent")?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = &read.scope;
        let NpcHistoryPrefix::Known { prefix } = &scope.receipt_prefix else {
            return Err(RuntimeError::application_busy(
                "recent receipt tail unavailable",
            ));
        };
        let scene = &state.installed.attention.value().scene;
        let history = state.temporal.actor(actor);
        let maximum =
            RECEIPTS_PER_WINDOW.min(usize::try_from(scene.candidate_visits).map_err(failure)?);
        let storage = self.budget.reserve(
            4096 + scope.world_id.len()
                + scope.generation.len()
                + maximum * size_of::<NpcReceiptSelection>(),
        )?;
        let mut window = RuntimeRecentBrowse {
            world_id: scope.world_id.clone(),
            generation: scope.generation.clone(),
            privacy: scope.privacy_revision,
            life: scope.physical_life,
            receipts: Vec::with_capacity(maximum),
            has_more: false,
            incomplete: read.recording_gap.is_some()
                || scope.frontier.as_ref().is_some_and(|frontier| {
                    frontier.expired_through_time.is_some() || frontier.pressure_through.is_some()
                }),
            maximum_operations: scene.history_receipts,
            _storage: storage,
        };
        if prefix.epoch.is_none() {
            window.incomplete = true;
        } else if let Some(history) = history {
            'window: for block in history.recent().directories().rev() {
                let Some(header) = block.entries.first() else {
                    continue;
                };
                if header.through_at < (scope.at - scope.max_age_seconds).max(0.0)
                    || header.at > scope.at
                    || header.order > prefix.through_order
                {
                    continue;
                }
                let mut ceiling = header.entry_index;
                if Some(block.epoch.as_str()) == prefix.epoch.as_deref()
                    && block.physical_life == prefix.physical_life
                {
                    let batch = i128::from(header.batch_order);
                    if batch > i128::from(prefix.through_batch_order) {
                        continue;
                    }
                    if batch == i128::from(prefix.through_batch_order) {
                        let Ok(entry) = u64::try_from(prefix.through_entry_index) else {
                            continue;
                        };
                        ceiling = ceiling.min(entry);
                    }
                }
                if let Some(before) = before {
                    if header.batch_order > before.batch_order {
                        continue;
                    }
                    if header.batch_order == before.batch_order {
                        let entry = if before.member_index == 0 {
                            let Some(entry) = before.entry_index.checked_sub(1) else {
                                continue;
                            };
                            entry
                        } else {
                            before.entry_index
                        };
                        ceiling = ceiling.min(entry);
                    }
                }
                for entry_index in (header.first_entry..=ceiling).rev() {
                    if window.receipts.len() == maximum {
                        window.has_more = true;
                        window.incomplete = true;
                        break 'window;
                    }
                    window._storage.resize(
                        window
                            ._storage
                            .bytes()
                            .checked_add(actor.len() + block.epoch.len())
                            .ok_or_else(|| failure("capacity"))?,
                    )?;
                    window.receipts.push(NpcReceiptSelection {
                        locator: TemporalReceiptLocator {
                            actor_id: actor.to_owned(),
                            physical_life: block.physical_life,
                            epoch: block.epoch.clone(),
                            batch_order: header.batch_order,
                            entry_index,
                        },
                        member_indices: None,
                    });
                }
            }
        }
        Ok(Some((read, window)))
    }
}
