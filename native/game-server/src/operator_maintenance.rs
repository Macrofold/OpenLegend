//! One operational window, independent of gameplay save/rewind. The clock
//! publishes this prepared state only after the atomic protected save.
use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, now_ms},
    game_clock::GameClock,
    store::StoreError,
    world::WorldError,
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Duration};
use tokio::sync::{Mutex, watch};
use uuid::Uuid;

const MINUTE: i64 = 60_000;
const DAY: i64 = 1_440 * MINUTE;
const LEAD: i64 = 366 * DAY;
const MAX: i64 = 7 * DAY;
const MIN: i64 = 5 * MINUTE;
pub(crate) const HISTORY: usize = 20;
const MESSAGE: usize = 280;

pub(super) const HOLD_MESSAGE: &str =
    "The world is paused for maintenance until a creator marks it ready.";
pub(super) const ACTION_MESSAGE: &str =
    "The world is paused for maintenance. Ordinary actions resume when it is ready.";

#[derive(Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Status {
    Scheduled,
    Active,
    Completed,
    Cancelled,
}
#[derive(Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum Change {
    Scheduled,
    Rescheduled,
    Extended,
    Started,
    Cancelled,
    Completed,
}
#[derive(Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Notice {
    pub(crate) id: Uuid,
    pub(crate) revision: u64,
    pub(crate) status: Status,
    pub(crate) starts_at: i64,
    pub(crate) ends_at: i64,
    pub(crate) time_zone: String,
    message: String,
    last_change: Change,
    pub(crate) updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    started_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    completed_at: Option<i64>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Audit {
    at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    by: Option<String>,
    change: Change,
    starts_at: i64,
    ends_at: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Window {
    #[serde(flatten)]
    pub(crate) notice: Notice,
    pub(crate) world_id: String,
    created_by: String,
    changes: Vec<Audit>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
}

impl Window {
    pub(crate) fn validated(
        mut self,
        budget: &ByteBudget,
        row_world: &str,
        row_id: &str,
        updated: i64,
    ) -> Result<Arc<Self>, StoreError> {
        let notice = &self.notice;
        let valid_time = |time: i64| {
            (0..=openlegend_simulation::identity::MAX_SAFE_INTEGER as i64).contains(&time)
        };
        if self.world_id != row_world
            || Uuid::parse_str(row_id).ok() != Some(notice.id)
            || notice.id.is_nil()
            || notice.updated_at != updated
            || notice.revision == 0
            || notice.revision > openlegend_simulation::identity::MAX_SAFE_INTEGER
            || notice.time_zone.is_empty()
            || notice.time_zone.len() > 64
            || notice.message.encode_utf16().count() > MESSAGE
            || !valid_time(notice.starts_at)
            || !valid_time(notice.ends_at)
            || !valid_time(updated)
            || notice.starts_at >= notice.ends_at
            || notice.started_at.is_some_and(|time| !valid_time(time))
            || notice.completed_at.is_some_and(|time| !valid_time(time))
            || self.created_by.is_empty()
            || self.changes.is_empty()
            || self.changes.len() > HISTORY
            || self.changes.last().is_none_or(|last| {
                last.change != notice.last_change
                    || last.at != notice.updated_at
                    || last.starts_at != notice.starts_at
                    || last.ends_at != notice.ends_at
            })
            || self.changes.iter().any(|entry| {
                !valid_time(entry.at)
                    || !valid_time(entry.starts_at)
                    || !valid_time(entry.ends_at)
                    || entry.starts_at >= entry.ends_at
                    || entry.by.as_deref() == Some("")
            })
        {
            return Err(StoreError::InvalidRecord);
        }
        let phase = match notice.status {
            Status::Scheduled => {
                matches!(notice.last_change, Change::Scheduled | Change::Rescheduled)
                    && notice.started_at.is_none()
                    && notice.completed_at.is_none()
            }
            Status::Active => {
                matches!(notice.last_change, Change::Started | Change::Extended)
                    && notice.started_at.is_some()
                    && notice.completed_at.is_none()
            }
            Status::Completed => {
                notice.last_change == Change::Completed
                    && notice.started_at.is_some()
                    && notice.completed_at >= notice.started_at
            }
            Status::Cancelled => {
                notice.last_change == Change::Cancelled
                    && notice.started_at.is_none()
                    && notice.completed_at.is_none()
            }
        };
        if !phase {
            return Err(StoreError::InvalidRecord);
        }
        let bytes = size_of::<Self>()
            + 2 * size_of::<usize>()
            + self.world_id.capacity()
            + self.created_by.capacity()
            + notice.message.capacity()
            + notice.time_zone.capacity()
            + self.changes.capacity() * size_of::<Audit>()
            + self
                .changes
                .iter()
                .filter_map(|change| change.by.as_ref())
                .map(String::capacity)
                .sum::<usize>();
        self._storage = Some(budget.reserve(bytes).map_err(|_| StoreError::Capacity)?);
        Ok(Arc::new(self))
    }
}

#[derive(Default)]
pub(crate) struct Snapshot {
    windows: Vec<Arc<Window>>,
    pub(crate) revision: u64,
    pub(crate) active: bool,
    pub(crate) generation: Option<String>,
    _storage: Option<ByteReservation>,
}
impl Snapshot {
    fn live(&self) -> Option<&Arc<Window>> {
        self.windows
            .iter()
            .find(|window| matches!(window.notice.status, Status::Scheduled | Status::Active))
    }
    pub(crate) fn notice(&self) -> Option<&Notice> {
        self.live()
            .or_else(|| self.windows.first())
            .map(|window| &window.notice)
    }
    /// A view retains the same small funded window independently of later changes.
    pub(crate) fn retained_notice(&self) -> Option<Arc<Window>> {
        self.live().or_else(|| self.windows.first()).map(Arc::clone)
    }
    pub(crate) fn history(&self) -> impl Iterator<Item = &Notice> {
        self.windows.iter().map(|window| &window.notice)
    }
    fn new(
        windows: Vec<Arc<Window>>,
        revision: u64,
        generation: Option<String>,
        budget: &ByteBudget,
    ) -> Result<Self, StoreError> {
        if windows
            .iter()
            .filter(|w| matches!(w.notice.status, Status::Active | Status::Scheduled))
            .count()
            > 1
            || windows.len() > HISTORY + 1
        {
            return Err(StoreError::InvalidRecord);
        }
        let allocated = budget
            .reserve(
                size_of::<Self>()
                    + 2 * size_of::<usize>()
                    + windows.capacity() * size_of::<Arc<Window>>()
                    + generation.as_ref().map_or(0, String::capacity),
            )
            .map_err(|_| StoreError::Capacity)?;
        let active = windows.iter().any(|w| w.notice.status == Status::Active);
        Ok(Self {
            windows,
            revision,
            active,
            generation,
            _storage: Some(allocated),
        })
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct LocalTime {
    pub(crate) date: String,
    pub(crate) time: String,
    pub(crate) occurrence: Option<Occurrence>,
}
#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Occurrence {
    Earlier,
    Later,
}
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Field {
    Start,
    End,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Planned {
    pub(crate) id: Uuid,
    pub(crate) expected_revision: Option<u64>,
    pub(crate) time_zone: String,
    pub(crate) start: Option<LocalTime>,
    pub(crate) end: LocalTime,
    pub(crate) message: Option<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Transition {
    pub(crate) id: Uuid,
    pub(crate) expected_revision: u64,
}
pub(crate) enum Request {
    Schedule(Planned),
    Update(Planned),
    Start(Transition),
    Cancel(Transition),
    Ready(Transition),
}
pub(crate) enum Error {
    Refused {
        message: String,
        code: &'static str,
        field: Option<Field>,
    },
    World(WorldError),
}
impl Error {
    pub(crate) fn invalid(message: impl Into<String>, field: Option<Field>) -> Self {
        Self::Refused {
            message: message.into(),
            code: "maintenance",
            field,
        }
    }
    pub(crate) fn ambiguous(message: String, field: Field) -> Self {
        Self::Refused {
            message,
            code: "ambiguous-time",
            field: Some(field),
        }
    }
    fn conflict(message: &'static str) -> Self {
        Self::Refused {
            message: message.into(),
            code: "conflict",
            field: None,
        }
    }
}
impl From<WorldError> for Error {
    fn from(error: WorldError) -> Self {
        Self::World(error)
    }
}
impl From<StoreError> for Error {
    fn from(error: StoreError) -> Self {
        Self::World(error.into())
    }
}
impl From<AccessError> for Error {
    fn from(error: AccessError) -> Self {
        Self::World(error.into())
    }
}

struct Edit {
    window: Arc<Window>,
    expected: Option<u64>,
    snapshot: Arc<Snapshot>,
}
pub(crate) struct OperatorMaintenance {
    current: watch::Sender<Arc<Snapshot>>,
    serial: Mutex<()>,
}
impl Default for OperatorMaintenance {
    fn default() -> Self {
        Self {
            current: watch::channel(Arc::new(Snapshot::default())).0,
            serial: Mutex::new(()),
        }
    }
}
impl OperatorMaintenance {
    pub(crate) fn snapshot(&self) -> Arc<Snapshot> {
        self.current.borrow().clone()
    }
    pub(crate) fn active(&self) -> bool {
        self.current.borrow().active
    }

    /// Gameplay permission is checked separately. Creators retain their
    /// existing paused-world editing permission during a hold.
    pub(crate) fn allow_ordinary(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
    ) -> Result<(), WorldError> {
        if self.active()
            && !authority.current_operations(scope, |_, capabilities, _| {
                capabilities.contains(&Capability::Create)
            })?
        {
            return Err(WorldError::OperatorMaintenance);
        }
        Ok(())
    }
    pub(crate) async fn initialize(&self, clock: &GameClock) -> Result<(), WorldError> {
        let game = clock.game();
        let windows = game.store.operator_windows(game.world_id()).await?;
        let loaded = Arc::new(Snapshot::new(windows, 0, None, game.host.budget())?);
        let due = loaded.live().is_some_and(|w| {
            w.notice.status == Status::Scheduled && w.notice.starts_at <= now_ms()
        });
        let active = loaded.active;
        self.current.send_replace(loaded);
        if active {
            clock.set_maintenance(self.snapshot(), None, None).await?;
        } else if due {
            self.start_due(clock).await?;
        }
        Ok(())
    }

    pub(crate) async fn request(
        &self,
        clock: &GameClock,
        actor: (Arc<Authority>, Arc<AuthorizedScope>),
        request: Request,
    ) -> Result<Arc<Window>, Error> {
        actor
            .0
            .current(&actor.1, Capability::Create, false, |_, _| ())?;
        let _serial = self.serial.lock().await;
        let _scratch = clock
            .game()
            .host
            .budget()
            .reserve(crate::store::operator_maintenance::WORKSPACE_BYTES)
            .map_err(|_| StoreError::Capacity)?;
        let current = self.snapshot();
        let by = &actor.1.scope.account_id;
        let now = now_ms();
        let (mut window, expected, change) = match request {
            Request::Schedule(plan) => {
                if plan.expected_revision.is_some() || plan.id.is_nil() {
                    return Err(Error::invalid("Choose a new maintenance window.", None));
                }
                if current
                    .windows
                    .iter()
                    .any(|window| window.notice.id == plan.id)
                {
                    return Err(Error::conflict("This maintenance window already exists."));
                }
                if current.live().is_some() {
                    return Err(Error::conflict(
                        "A maintenance window is already scheduled or in progress. Change or cancel it instead.",
                    ));
                }
                let (start, end) = clock.game().store.resolve_maintenance_dates(&plan).await?;
                let message = message(plan.message)?.unwrap_or_default();
                let starts_at = start.unwrap_or(now);
                check_schedule(starts_at, end, now, start.is_none())?;
                let mut window = Window {
                    notice: Notice {
                        id: plan.id,
                        revision: 1,
                        status: Status::Scheduled,
                        starts_at,
                        ends_at: end,
                        time_zone: plan.time_zone,
                        message,
                        last_change: Change::Scheduled,
                        updated_at: now,
                        started_at: None,
                        completed_at: None,
                    },
                    world_id: clock.game().world_id().to_owned(),
                    created_by: by.clone(),
                    changes: Vec::new(),
                    _storage: None,
                };
                window.audit(Change::Scheduled, now, Some(by));
                let change = (starts_at <= now).then_some(Change::Started);
                (window, None, change)
            }
            Request::Update(plan) => {
                let existing = find(&current, plan.id, plan.expected_revision.unwrap_or(0))?;
                let (start, end) = clock.game().store.resolve_maintenance_dates(&plan).await?;
                let mut next = existing.copy();
                let change = match existing.notice.status {
                    Status::Active => {
                        if start.is_some() {
                            return Err(Error::invalid(
                                "Maintenance already started; only its end can change.",
                                None,
                            ));
                        }
                        if end <= now {
                            return Err(Error::invalid(
                                "The new estimated end must be in the future.",
                                Some(Field::End),
                            ));
                        }
                        if end - now > MAX {
                            return Err(Error::invalid(
                                "Extend at most 7 days ahead; extend again later if needed.",
                                Some(Field::End),
                            ));
                        }
                        Change::Extended
                    }
                    Status::Scheduled => {
                        next.notice.starts_at = start.unwrap_or(next.notice.starts_at);
                        check_schedule(next.notice.starts_at, end, now, false)?;
                        Change::Rescheduled
                    }
                    _ => {
                        return Err(Error::conflict(
                            "Maintenance changed since you loaded it. Refresh and try again.",
                        ));
                    }
                };
                next.notice.ends_at = end;
                next.notice.time_zone = plan.time_zone;
                if let Some(message) = message(plan.message)? {
                    next.notice.message = message;
                }
                (next, Some(existing.notice.revision), Some(change))
            }
            other => {
                let (input, status, change, wrong_phase) = match other {
                    Request::Start(input) => (
                        input,
                        Status::Scheduled,
                        Change::Started,
                        "Only a scheduled window can start now.",
                    ),
                    Request::Cancel(input) => (
                        input,
                        Status::Scheduled,
                        Change::Cancelled,
                        "Maintenance already started. Mark the world ready to resume instead.",
                    ),
                    Request::Ready(input) => (
                        input,
                        Status::Active,
                        Change::Completed,
                        "Only maintenance in progress can be marked ready.",
                    ),
                    _ => unreachable!(),
                };
                let existing = find(&current, input.id, input.expected_revision)?;
                if existing.notice.status != status {
                    return Err(Error::invalid(wrong_phase, None));
                }
                if matches!(change, Change::Completed) && clock.saving_failed() {
                    return Err(Error::invalid(
                        "The world is not ready. Saving must recover before maintenance can end.",
                        None,
                    ));
                }
                (existing.copy(), Some(input.expected_revision), Some(change))
            }
        };
        if let Some(change) = change {
            window.apply(change, now, Some(by))?;
        }
        let edit = prepare(clock, &current, window, expected)?;
        let result = edit.window.clone();
        clock
            .set_maintenance(
                edit.snapshot,
                Some((edit.window, edit.expected)),
                Some(actor),
            )
            .await?;
        Ok(result)
    }

    async fn start_due(&self, clock: &GameClock) -> Result<(), WorldError> {
        let _serial = self.serial.lock().await;
        let current = self.snapshot();
        let now = now_ms();
        let Some(existing) = current.live().filter(|window| {
            window.notice.status == Status::Scheduled && window.notice.starts_at <= now
        }) else {
            return Ok(());
        };
        let _scratch = clock
            .game()
            .host
            .budget()
            .reserve(crate::store::operator_maintenance::WORKSPACE_BYTES)
            .map_err(|_| StoreError::Capacity)?;
        let mut next = existing.copy();
        next.apply(Change::Started, now, None)?;
        let edit = prepare(clock, &current, next, Some(existing.notice.revision))?;
        clock
            .set_maintenance(edit.snapshot, Some((edit.window, edit.expected)), None)
            .await
    }

    pub(crate) async fn run(&self, clock: &GameClock, mut stop: watch::Receiver<bool>) {
        let mut changed = self.current.subscribe();
        while !*stop.borrow() {
            let delay = changed
                .borrow_and_update()
                .live()
                .filter(|window| window.notice.status == Status::Scheduled)
                .map(|window| {
                    Duration::from_millis(
                        window.notice.starts_at.saturating_sub(now_ms()).max(0) as u64
                    )
                });
            let Some(delay) = delay else {
                tokio::select! { _ = stop.changed() => break, _ = changed.changed() => continue }
            };
            tokio::select! {
                _ = stop.changed() => break,
                _ = changed.changed() => continue,
                _ = tokio::time::sleep(delay) => {},
            }
            match self.start_due(clock).await {
                Ok(()) => {}
                Err(error) if error.is_admission_refusal() => {
                    tokio::select! { _ = stop.changed() => break, _ = tokio::time::sleep(Duration::from_secs(1)) => {} }
                }
                Err(error) => {
                    clock.fail_maintenance(error);
                    break;
                }
            }
        }
    }

    pub(crate) fn publish(&self, value: Arc<Snapshot>) {
        self.current.send_replace(value);
    }
}

fn prepare(
    clock: &GameClock,
    current: &Snapshot,
    window: Window,
    expected: Option<u64>,
) -> Result<Edit, StoreError> {
    let budget = clock.game().host.budget();
    let id = window.notice.id;
    let updated = window.notice.updated_at;
    let window = window.validated(budget, clock.game().world_id(), &id.to_string(), updated)?;
    let next_active = window.notice.status == Status::Active;
    let generation = if next_active != current.active {
        Some(Uuid::new_v4().to_string())
    } else {
        current.generation.clone()
    };
    let revision = current
        .revision
        .checked_add(1)
        .ok_or(StoreError::InvalidRecord)?;
    let mut windows = Vec::with_capacity(HISTORY + 1);
    windows.push(window.clone());
    let scheduled_or_active = matches!(window.notice.status, Status::Scheduled | Status::Active);
    let retained_before_edit = HISTORY - usize::from(!scheduled_or_active);
    windows.extend(
        current
            .windows
            .iter()
            .filter(|previous| previous.notice.id != id)
            .take(retained_before_edit)
            .cloned(),
    );
    let snapshot = Arc::new(Snapshot::new(windows, revision, generation, budget)?);
    Ok(Edit {
        window,
        expected,
        snapshot,
    })
}

fn find(current: &Snapshot, id: Uuid, expected: u64) -> Result<&Window, Error> {
    current
        .windows
        .iter()
        .find(|w| w.notice.id == id && w.notice.revision == expected)
        .map(AsRef::as_ref)
        .ok_or_else(|| {
            Error::conflict("Maintenance changed since you loaded it. Refresh and try again.")
        })
}

fn message(value: Option<String>) -> Result<Option<String>, Error> {
    let result = value.map(|text| openlegend_simulation::encoding::js_trim(&text).to_owned());
    if result
        .as_ref()
        .is_some_and(|text| text.encode_utf16().count() > MESSAGE)
    {
        return Err(Error::invalid(
            "Use at most 280 characters for the maintenance message.",
            None,
        ));
    }
    Ok(result)
}

fn check_schedule(start: i64, end: i64, now: i64, starts_now: bool) -> Result<(), Error> {
    if !starts_now && start < now - MINUTE {
        return Err(Error::invalid(
            "The start time has already passed.",
            Some(Field::Start),
        ));
    }
    if start > now + LEAD {
        return Err(Error::invalid(
            "Schedule maintenance within the next year.",
            None,
        ));
    }
    if end - start < MIN {
        return Err(Error::invalid(
            "The estimated end must be at least 5 minutes after the start.",
            Some(Field::End),
        ));
    }
    if end - start > MAX {
        return Err(Error::invalid(
            "Announce at most 7 days; extend later if needed.",
            Some(Field::End),
        ));
    }
    Ok(())
}

impl Window {
    fn copy(&self) -> Self {
        Self {
            notice: self.notice.clone(),
            world_id: self.world_id.clone(),
            created_by: self.created_by.clone(),
            changes: self.changes.clone(),
            _storage: None,
        }
    }
    fn audit(&mut self, change: Change, now: i64, by: Option<&String>) {
        if self.changes.len() == HISTORY {
            self.changes.remove(0);
        }
        self.changes.push(Audit {
            at: now,
            by: by.cloned(),
            change,
            starts_at: self.notice.starts_at,
            ends_at: self.notice.ends_at,
        });
    }
    fn apply(&mut self, change: Change, now: i64, by: Option<&String>) -> Result<(), StoreError> {
        self.notice.revision = self
            .notice
            .revision
            .checked_add(1)
            .ok_or(StoreError::InvalidRecord)?;
        self.notice.last_change = change;
        self.notice.updated_at = now;
        match change {
            Change::Started => {
                self.notice.status = Status::Active;
                self.notice.started_at = Some(now);
            }
            Change::Completed => {
                self.notice.status = Status::Completed;
                self.notice.completed_at = Some(now);
            }
            Change::Cancelled => self.notice.status = Status::Cancelled,
            _ => {}
        }
        self.audit(change, now, by);
        Ok(())
    }
}
