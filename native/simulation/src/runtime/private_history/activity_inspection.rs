//! Keep the original actor and exact action page bound across both reads.
//! Recent result references are resolved through the ordinary receipt owner.

use super::*;
use crate::{
    activity::{
        ActivityInspection, INSPECTION_ROWS, ResultEvidence, RuntimeActivityPage, activity_ordinal,
    },
    capture::{NpcReceiptSelection, NpcSourceRows},
    execution::ExecutionError,
    received::{MaterializedTemporalValue, ReceivedValueFragment},
    records::InstalledRow,
    runtime::RuntimeActivityRowsRead,
    text::JsText,
};

pub struct RuntimeActivityInspection {
    origin: RuntimePrivateHistoryRead,
    next_ordinal: u64,
    after: i64,
    records: Option<ActivityInspection>,
    recent: Option<RuntimePrivateHistoryRead>,
    // Pending exact receipt addresses are kept through the independent store read.
    pending: Option<(Vec<NpcReceiptSelection>, ByteReservation)>,
}

impl NativeWorldSession {
    /// Borrow the original accepted save prefix. The application independently
    /// retains selected pending writes before releasing this world turn.
    pub fn capture_activity_inspection<T>(
        &mut self,
        account: &str,
        owner: &str,
        actor: &str,
        after: i64,
        prepare: impl FnOnce(RuntimeActivityRowsRead<'_>) -> T,
    ) -> Result<Option<(RuntimeActivityInspection, T)>, RuntimeError> {
        if !self.private_history_permitted(account, owner, actor)? {
            return Ok(None);
        }
        let origin = self.read_history(actor, "personal")?;
        let (metadata, save) = self.session.accepted_save_read().map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let next_ordinal = activity_ordinal(state, actor);
        let (detached, suffix) = save.pending_read_rows();
        let maximum_bytes = usize::try_from(state.activity.limits.record_bytes)
            .map_err(failure)?
            .checked_mul(INSPECTION_ROWS)
            .ok_or_else(|| failure("capacity"))?;
        let storage = prepare(RuntimeActivityRowsRead {
            world_id: &origin.scope.world_id,
            generation: &origin.scope.generation,
            actor_id: &origin.scope.actor_id,
            after,
            ids: None,
            maximum_rows: INSPECTION_ROWS,
            maximum_bytes,
            durable_revision: metadata.durable_revision,
            in_flight_through: metadata.in_flight_through,
            detached,
            suffix,
        });
        Ok(Some((
            RuntimeActivityInspection {
                origin,
                next_ordinal,
                after,
                records: None,
                recent: None,
                pending: None,
            },
            storage,
        )))
    }

    /// Accept validated canonical activity rows from the original cut and
    /// resolve only their exact still-eligible recent result addresses. As
    /// in Source, this later read can discover expiry but cannot substitute
    /// a current observation for the stored locator.
    pub fn prepare_activity_inspection_results<T>(
        &mut self,
        read: &mut RuntimeActivityInspection,
        rows: Vec<InstalledRow>,
        custody: ByteReservation,
        prepare: impl FnOnce(RuntimeRecentSourceRead<'_>) -> T,
    ) -> Result<Option<Option<T>>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if !read.origin.scope.still_permitted(state) || read.records.is_some() {
            return Ok(None);
        }
        let actor = read.origin.actor_id();
        let records = ActivityInspection::prepare(
            state,
            actor,
            read.after,
            read.next_ordinal,
            rows,
            custody,
            &self.budget,
        )
        .map_err(failure)?;
        let (receipts, custody) = records
            .recent_receipts(state, actor, &self.budget)
            .map_err(failure)?;
        read.records = Some(records);
        if receipts.is_empty() {
            return Ok(Some(None));
        }
        let recent = self.read_history(actor, "recent")?;
        let prepared = self.with_selected_recent_read(&recent, &receipts, prepare)?;
        read.recent = Some(recent);
        read.pending = Some((receipts, custody));
        Ok(Some(Some(prepared)))
    }

    pub fn admit_activity_inspection_results(
        &self,
        read: &mut RuntimeActivityInspection,
        rows: NpcSourceRows,
    ) -> Result<bool, RuntimeError> {
        let (Some(recent), Some((receipts, _storage))) = (&mut read.recent, read.pending.take())
        else {
            return Ok(false);
        };
        self.admit_selected_recent_rows(recent, receipts, rows)
    }

    /// The application already holds the same grant and pending-edit owner.
    /// Validate and encode while the native disclosure lease is still held.
    pub fn publish_activity_inspection<T>(
        &self,
        read: &RuntimeActivityInspection,
        method_after: usize,
        historical_account: impl Fn(&JsText) -> JsText,
        publish: impl FnOnce(RuntimeActivityPage<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        if !read.origin.scope.still_permitted(state)
            || read.pending.is_some()
            || read
                .recent
                .as_ref()
                .is_some_and(|recent| !recent.scope.still_permitted(state))
        {
            return Ok(None);
        }
        let Some(records) = &read.records else {
            return Ok(None);
        };
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let page = records
            .page(
                state,
                read.origin.actor_id(),
                method_after,
                |source| {
                    let Some(recent) = &read.recent else {
                        return Ok(None);
                    };
                    let ResultEvidence::Recent { subject, .. } = source else {
                        return Ok(None);
                    };
                    recent
                        .with_recent_receipts(|mut receipts, _| {
                            (&mut receipts).find_map(|receipt| {
                                source
                                    .matches_receipt(subject, &receipt.receipt().locator)
                                    .then(|| {
                                        receipt.values().find_map(|value| match value {
                                            MaterializedTemporalValue::Other(
                                                ReceivedValueFragment::ActionResult(result),
                                            ) if result.id == *subject => {
                                                Some(historical_account(&result.text))
                                            }
                                            _ => None,
                                        })
                                    })
                                    .flatten()
                            })
                        })
                        .map_err(|_| ExecutionError::InvalidCheckpoint)
                },
                &self.budget,
            )
            .map_err(failure)?;
        Ok(Some(publish(page)))
    }
}
