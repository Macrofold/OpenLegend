//! Keep the original actor and exact action page bound across both reads.
//! Recent result references are resolved through the ordinary receipt owner.

use super::*;
use crate::{
    activity::{
        ActivityInspection, INSPECTION_ROWS, LearningInspection, ResultEvidence,
        RuntimeActivityDecisionPage, RuntimeActivityPage, acquisition_count, activity_ordinal,
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
    decision: Option<DecisionInspection>,
    // Pending exact receipt addresses are kept through the independent store read.
    pending: Option<(Vec<NpcReceiptSelection>, ByteReservation)>,
}

struct DecisionInspection {
    selection: LearningInspection,
    recent_entries: u32,
    acquisitions: Option<usize>,
    _storage: ByteReservation,
}

impl RuntimeActivityInspection {
    pub(in crate::runtime) fn decision_current(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, RuntimeError> {
        let Some(decision) = &self.decision else {
            return Ok(false);
        };
        if self.origin.actor_id() != actor
            || !self.permitted(state)
            || decision.acquisitions.is_some_and(|count| count != acquisition_count(state, actor))
            || !state
                .activity
                .learning
                .get(actor)
                .is_some_and(|cursor| cursor.inspection.as_ref() == Some(&decision.selection))
        {
            return Ok(false);
        }
        self.records
            .as_ref()
            .map_or(Ok(false), |records| {
                records.recent_still_eligible(state, actor, decision.recent_entries, budget)
            })
            .map_err(failure)
    }

    fn permitted(&self, state: &crate::simulation::SimulationState) -> bool {
        self.origin.scope.still_permitted(state)
            && self.pending.is_none()
            && self
                .recent
                .as_ref()
                .is_none_or(|recent| recent.scope.still_permitted(state))
    }
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
        self.capture_activity_inspection_cut(actor, after, None, prepare)
            .map(Some)
    }

    /// This source is available only for the resident's exact chosen trigger,
    /// through an in-process decision caller. Other stimulus prepares no page.
    pub fn capture_decision_activity_inspection<T>(
        &mut self,
        actor: &str,
        trigger: &str,
        prepare: impl FnOnce(RuntimeActivityRowsRead<'_>) -> T,
    ) -> Result<Option<(RuntimeActivityInspection, T)>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let Some(selection) = state
            .activity
            .learning
            .get(actor)
            .and_then(|cursor| cursor.inspection.as_ref())
            .filter(|cursor| cursor.event_id == trigger)
        else {
            return Ok(None);
        };
        let after = selection.after;
        let decision = DecisionInspection {
            _storage: self.budget.reserve(
                selection.event_id.len() + std::mem::size_of::<RuntimeActivityInspection>(),
            )?,
            selection: selection.clone(),
            recent_entries: 0,
            acquisitions: None,
        };
        self.capture_activity_inspection_cut(actor, after, Some(decision), prepare)
            .map(Some)
    }

    fn capture_activity_inspection_cut<T>(
        &mut self,
        actor: &str,
        after: i64,
        decision: Option<DecisionInspection>,
        prepare: impl FnOnce(RuntimeActivityRowsRead<'_>) -> T,
    ) -> Result<(RuntimeActivityInspection, T), RuntimeError> {
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
        Ok((
            RuntimeActivityInspection {
                origin,
                next_ordinal,
                after,
                records: None,
                recent: None,
                decision,
                pending: None,
            },
            storage,
        ))
    }

    pub fn finish_decision_activity_inspection(
        &self,
        read: &mut RuntimeActivityInspection,
        historical_account: impl Fn(&JsText) -> JsText,
    ) -> Result<Option<RuntimeActivityDecisionPage>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        if !read.decision_current(state, read.origin.actor_id(), &self.budget)? {
            return Ok(None);
        }
        let method_after = read
            .decision
            .as_ref()
            .and_then(|decision| decision.selection.method_after)
            .unwrap_or_default() as usize;
        let page = self.publish_activity_inspection(
            read,
            method_after,
            historical_account,
            |page| page.into_decision(read.after, method_after as u64),
        )?;
        if let Some(page) = &page {
            let decision = read.decision.as_mut().expect("checked decision source");
            decision.recent_entries = page.recent_entries;
            decision.acquisitions = Some(acquisition_count(state, read.origin.actor_id()));
        }
        Ok(page)
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
        if !read.permitted(state) {
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
