//! The owner's active promises and bounded recent overlays for the durable list.

use super::*;
use crate::experience::{
    ArchivedPersonalSourceRecord, PersonalSourceKind, PersonalSourceRecord, PersonalSourceRef,
};
use crate::host::{ByteReservation, SharedMemoryPin};
use std::cmp::Ordering;
use std::mem::size_of;

pub struct RuntimePromisePosition {
    pub at: f64,
    pub source: PersonalSourceRef,
}

impl RuntimePromisePosition {
    pub fn order(&self, other: &Self) -> Ordering {
        promise_order(self.at, &self.source.id, other.at, &other.source.id)
    }
}

fn promise_order(at: f64, id: &str, other_at: f64, other_id: &str) -> Ordering {
    at.partial_cmp(&other_at)
        .expect("promise chronology was validated")
        .then_with(|| id.cmp(other_id))
}

pub struct RuntimePromiseSelection {
    pub open: Vec<RuntimeResidentPromise>,
    pub recent_resolved: Vec<RuntimeResidentPromise>,
    pub limit: u64,
    pub unresolved: usize,
    _custody: ByteReservation,
}

pub struct RuntimeResidentPromise {
    pub position: RuntimePromisePosition,
    record: Arc<PersonalSourceRecord>,
    _pin: Arc<SharedMemoryPin>,
}

impl RuntimeResidentPromise {
    pub fn payload(&self) -> &str {
        self.record.payload()
    }
}

impl NativeWorldSession {
    /// The authenticated caller binds the owner and control to this candidate.
    /// The obligation writer checks the active source against its exact revision.
    pub fn begin_owner_promise_amendment(
        &mut self,
        account: &str,
        actor: &str,
        edit: crate::experience::PromiseAmendment,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(account, actor)
            .map_err(failure)?;
        let cursor =
            crate::knowledge::KnowledgeEditCursor::promise(actor.into(), edit, &self.budget)
                .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }

    /// A single pass over this actor's resident records counts every open
    /// obligation. The bounded resolved overlay includes recent completions
    /// waiting for the ordinary save. SQL supplies the older page separately.
    pub fn select_player_promises(
        &self,
        account: &str,
        actor: &str,
        before: Option<(f64, &str)>,
        lookahead: usize,
    ) -> Result<Option<RuntimePromiseSelection>, RuntimeError> {
        if !self.private_history_permitted(account, actor, actor)? {
            return Ok(None);
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let limit = state.installed.promises.value().limit;
        let open_slots = if before.is_none() {
            usize::try_from(limit).map_err(failure)?
        } else {
            0
        };
        let slots = open_slots.checked_add(lookahead).ok_or(CapacityError)?;
        let mut custody = self.budget.reserve(
            slots
                .checked_mul(
                    size_of::<&Arc<PersonalSourceRecord>>() + size_of::<RuntimeResidentPromise>(),
                )
                .and_then(|bytes| bytes.checked_add(size_of::<RuntimePromiseSelection>()))
                .ok_or(CapacityError)?,
        )?;
        let mut open = Vec::with_capacity(open_slots);
        let mut resolved: Vec<&Arc<PersonalSourceRecord>> = Vec::with_capacity(lookahead);
        let mut unresolved = 0;
        if let Some(owner) = state.experience.actor(actor) {
            let records = owner
                .collection(PersonalSourceKind::Memory)
                .map_err(failure)?;
            if !records.complete_current_obligations() {
                return Err(failure("open commitments are not resident"));
            }
            for record in records.records() {
                let header = record.header();
                if header.unresolved_commitment {
                    unresolved += 1;
                }
                if owner.privacy.revoked(&header.reference.id)
                    || header
                        .event_id
                        .as_ref()
                        .is_some_and(|id| owner.privacy.revoked(id))
                {
                    continue;
                }
                if header.unresolved_obligation || header.unresolved_commitment {
                    if before.is_none() && header.unresolved_obligation {
                        if open.len() == open_slots {
                            return Err(failure("open commitments exceed the installed limit"));
                        }
                        open.push(record);
                    }
                    continue;
                }
                if header.record_kind.as_deref() != Some("commitment")
                    || before.is_some_and(|(at, id)| {
                        !promise_order(header.at, &header.reference.id, at, id).is_lt()
                    })
                {
                    continue;
                }
                let position = resolved.partition_point(|other| {
                    let other = other.header();
                    promise_order(
                        other.at,
                        &other.reference.id,
                        header.at,
                        &header.reference.id,
                    )
                    .is_gt()
                });
                if position < lookahead {
                    if resolved.len() == lookahead {
                        resolved.pop();
                    }
                    resolved.insert(position, record);
                }
            }
        }
        // Retain original position on equal open times, as the browser's
        // authored promise list does. Past rows use the indexed id tie break.
        open.sort_by(|a, b| {
            b.header()
                .at
                .partial_cmp(&a.header().at)
                .expect("validated promise time")
        });
        for record in open.iter().chain(&resolved) {
            let header = record.header();
            custody.resize(
                custody
                    .bytes()
                    .checked_add(header.reference.id.len())
                    .and_then(|bytes| bytes.checked_add(header.reference.revision.len()))
                    .ok_or(CapacityError)?,
            )?;
        }
        let retain = |record: &Arc<PersonalSourceRecord>| {
            let header = record.header();
            Ok(RuntimeResidentPromise {
                position: RuntimePromisePosition {
                    at: header.at,
                    source: header.reference.clone(),
                },
                record: Arc::clone(record),
                _pin: record.capture_pin(&self.budget).map_err(failure)?,
            })
        };
        Ok(Some(RuntimePromiseSelection {
            open: open
                .into_iter()
                .map(retain)
                .collect::<Result<_, RuntimeError>>()?,
            recent_resolved: resolved
                .into_iter()
                .map(retain)
                .collect::<Result<_, RuntimeError>>()?,
            limit,
            unresolved,
            _custody: custody,
        }))
    }
}

pub struct RuntimePromiseView<'a> {
    pub id: &'a str,
    pub revision: u64,
    pub words: crate::text::JsText,
    pub recipient: Option<crate::text::JsText>,
    /// Internal recognized recipient. The application maps it to this tab's
    /// existing public person reference before encoding the browser result.
    pub recognized_recipient: Option<String>,
    pub at: f64,
    pub status: &'static str,
    pub terms: crate::text::JsText,
    pub due_at: Option<f64>,
    pub kept_at: Option<f64>,
    pub evidence: Option<crate::text::JsText>,
    _custody: ByteReservation,
}

pub struct RuntimePromisePresentation<'a> {
    state: &'a crate::simulation::SimulationState,
    names: crate::worlds::InstalledPersonalNameReader<'a>,
    actor: &'a str,
    budget: &'a ByteBudget,
}

impl NativeWorldSession {
    /// Read current names and installed delivery wording inside the exact
    /// personal-source publication. Callers may only pass already admitted
    /// promise bodies to the supplied formatter.
    pub fn with_player_promise_presentation<'a, T>(
        &self,
        read: &RuntimePrivateHistoryRead,
        references: impl IntoIterator<Item = &'a PersonalSourceRef>,
        consume: impl FnOnce(RuntimePromisePresentation<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let scope = &read.scope;
        let actor = &scope.actor_id;
        if !matches!(read.purpose, HistoryPurpose::Personal) || !scope.still_permitted(state) {
            return Ok(None);
        }
        let mut references = references.into_iter().peekable();
        if references.peek().is_some()
            && !state.experience.personal_references_current(
                &scope.generation,
                actor,
                scope.privacy_revision,
                references,
            )
        {
            return Ok(None);
        }
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )
        .map_err(failure)?;
        Ok(Some(consume(RuntimePromisePresentation {
            state,
            names,
            actor,
            budget: &self.budget,
        })))
    }
}

impl RuntimePromisePresentation<'_> {
    /// Verify the selected canonical body against its index and original
    /// owner before displaying a promise that is no longer resident.
    pub fn format_saved<'a>(
        &self,
        selected: &'a RuntimePromisePosition,
        payload: &str,
    ) -> Result<Option<RuntimePromiseView<'a>>, RuntimeError> {
        let _decode = self
            .budget
            .reserve(crate::experience::encoded_body_bound(&payload).map_err(failure)?)?;
        let record = ArchivedPersonalSourceRecord::install(
            PersonalSourceKind::Memory,
            self.actor,
            payload.to_owned(),
            &self.state.installed.account_law(),
            self.budget,
        )
        .map_err(failure)?;
        let header = record.header();
        if header.at != selected.at
            || header.reference != selected.source
            || header.record_kind.as_deref() != Some("commitment")
            || header.unresolved_commitment
        {
            return Err(failure(
                "selected promise body does not match the saved index",
            ));
        }
        if self
            .state
            .experience
            .actor(self.actor)
            .is_some_and(|history| {
                history.privacy.revoked(&header.reference.id)
                    || header
                        .event_id
                        .as_ref()
                        .is_some_and(|id| history.privacy.revoked(id))
            })
        {
            return Err(stale("private-promise-source"));
        }
        self.format(&selected.source, record.payload())
    }

    /// Decode one canonical, already scoped memory record. Unresolved
    /// commitments without a spoken obligation still count against admission.
    pub fn format<'a>(
        &self,
        source: &'a PersonalSourceRef,
        payload: &str,
    ) -> Result<Option<RuntimePromiseView<'a>>, RuntimeError> {
        use crate::narration::{NameArticle, name_phrase};
        use crate::text::JsText;
        use crate::worlds::base_promises::ObligationStatus;

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Body {
            summary: JsText,
            entity_ids: Vec<String>,
            at: f64,
            obligation: Option<Obligation>,
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Obligation {
            #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
            revision: u64,
            status: ObligationStatus,
            due_at: Option<f64>,
            fulfilled_at: Option<f64>,
            completion: Option<Completion>,
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Completion {
            event_type: String,
            definition_id: Option<String>,
        }

        let mut custody = self.budget.reserve(
            crate::encoding::json_tree_allocation_bound(payload)
                .and_then(|bytes| bytes.checked_add(1024))
                .ok_or(CapacityError)?,
        )?;
        let body: Body = serde_json::from_str(payload).map_err(failure)?;
        let Some(obligation) = body.obligation else {
            return Ok(None);
        };
        let recipient = body.entity_ids.into_iter().find(|id| id != self.actor);
        let (recognized_recipient, recipient) = if let Some(id) = recipient {
            let name = self
                .names
                .capture_observer_name(&id, self.budget)
                .map_err(failure)?;
            custody.resize(
                custody
                    .bytes()
                    .checked_add(
                        name.name()
                            .name
                            .storage_bytes()
                            .checked_mul(4)
                            .ok_or(CapacityError)?,
                    )
                    .ok_or(CapacityError)?,
            )?;
            (
                self.names
                    .recognizes_subject(&id)
                    .map_err(failure)?
                    .then_some(id),
                Some(name_phrase(name.name(), NameArticle::Definite, false)),
            )
        } else {
            (None, None)
        };
        let tracked = obligation.completion.as_ref();
        let item = tracked
            .and_then(|completion| completion.definition_id.as_ref())
            .map(|id| {
                self.state
                    .installed
                    .retained
                    .items
                    .get(id)
                    .map(|definition| &definition.named.name)
            });
        custody.resize(
            custody
                .bytes()
                .checked_add(
                    body.summary
                        .storage_bytes()
                        .checked_mul(2)
                        .ok_or(CapacityError)?,
                )
                .and_then(|bytes| {
                    bytes.checked_add(
                        item.flatten()
                            .map_or(0, JsText::storage_bytes)
                            .checked_mul(4)?,
                    )
                })
                .ok_or(CapacityError)?,
        )?;
        let rules = self.state.installed.promises.value();
        let (terms, evidence) = rules.describe(
            tracked.map(|completion| completion.event_type.as_str()),
            item,
            obligation.status,
        );
        Ok(Some(RuntimePromiseView {
            id: &source.id,
            revision: obligation.revision,
            words: rules.recorded_words(body.summary),
            recipient,
            recognized_recipient,
            at: body.at,
            status: obligation.status.label(),
            terms,
            due_at: obligation.due_at,
            kept_at: obligation.fulfilled_at,
            evidence,
            _custody: custody,
        }))
    }
}
