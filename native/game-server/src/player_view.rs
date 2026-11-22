//! The embodied browser view, assembled from admitted products. Only the
//! HTTP owner can hand the selected view or patch to a current stream.

use crate::{
    authority::AuthorizedScope,
    boot::CurrentServer,
    live_save::LiveSaves,
    player_events::{PreparedPlayerEvents, SpeechReply, prepare as prepare_events},
    player_references::ReferenceIssuer,
    player_scene::{PreparedContacts, PreparedSelf, SceneError, prepare_contacts, prepare_self},
    store::{NarrationBanner, StoreError},
    world::WorldError,
    world_input::{InputScope, WorldInputs},
};
use indexmap::IndexMap;
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, FenceError},
    runtime::{RuntimeError, RuntimePlayerInputState, RuntimePlayerRead},
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use serde::Serialize;
use serde_json::value::RawValue;
use std::{error::Error, fmt, sync::Arc};

mod host;
mod patch;
mod policy;
pub(crate) mod profile;
pub(crate) use host::{ViewHostInput, capture_host, checkpoint_context};
pub(crate) use patch::{PreviousView, ViewSelection};
pub use policy::PlayerViewPolicy;
use policy::{CartographyPolicy, Daylight, MapPolicy, PublicWorld, WeatherView};

const EVENT_WINDOW: usize = 512;

#[derive(Debug)]
pub enum ViewError {
    Changed,
    Capacity,
    Unsupported(&'static str),
    Capture(SceneError),
    Event(crate::player_events::PlayerEventError),
    Store(StoreError),
    World(WorldError),
    Encoding(serde_json::Error),
}
impl ViewError {
    pub(crate) fn changed(&self) -> bool {
        matches!(self, Self::Changed | Self::Store(StoreError::StaleCut))
    }

    pub(crate) fn busy(&self) -> bool {
        matches!(
            self,
            Self::Capacity
                | Self::Capture(SceneError::Capacity)
                | Self::Event(crate::player_events::PlayerEventError::Capacity)
                | Self::Store(StoreError::Capacity)
                | Self::World(
                    WorldError::Host(HostError::Busy | HostError::Capacity)
                        | WorldError::Fence(FenceError::Busy)
                        | WorldError::Wire(crate::wire::WireError::Capacity)
                        | WorldError::Access(crate::authority::AccessError::Busy)
                )
        ) || matches!(self, Self::World(WorldError::Simulation(error)) if error.is_capacity() || error.is_busy())
    }
}
impl fmt::Display for ViewError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Changed => f.write_str("The selected player view has changed"),
            Self::Capacity => f.write_str("The player view does not fit its allowance"),
            Self::Unsupported(family) => f.write_str(family),
            Self::Capture(error) => error.fmt(f),
            Self::Event(error) => error.fmt(f),
            Self::Store(error) => error.fmt(f),
            Self::World(error) => error.fmt(f),
            Self::Encoding(error) => error.fmt(f),
        }
    }
}
impl Error for ViewError {}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAccess {
    pub scope: String,
    pub private_draft_scope: String,
    pub command_recovery_scope: String,
    pub account_id: String,
    pub actor_id: String,
    pub control_generation: u64,
    pub controlling: bool,
    pub controlled_elsewhere: bool,
    pub can_manage_saves: bool,
    pub can_operate: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub can_inspect_mind: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub can_edit_person_memory: Option<bool>,
    pub mode: AuthenticationMode,
}

#[derive(Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum AuthenticationMode {
    Local,
    Oidc,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointContext {
    pub scope: String,
    pub recovery_scope: String,
    pub timeline: String,
    pub can_load: bool,
}

#[derive(Serialize, PartialEq)]
pub struct InventoryReadRevision {
    pub bindings: u64,
    pub details: u64,
    pub disclosure: String,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum PersistenceStatus {
    Saved,
    Error,
}

#[derive(Serialize, PartialEq)]
pub struct PersistenceView {
    pub status: PersistenceStatus,
    pub message: JsText,
}

pub struct PausedStop {
    pub ok: bool,
    pub message: JsText,
    pub cut: u64,
    pub(crate) _custody: ByteReservation,
}

pub struct HistoryViewFacts {
    pub events_revision: String,
    pub revision: String,
    pub epoch: String,
    pub memory_revision: String,
    pub places_revision: String,
    pub(crate) narrator: Option<NarrationBanner>,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiView {
    pub mode: AiMode,
    pub jev_configured: bool,
    pub llm_configured: bool,
    pub message: JsText,
    pub jobs: Vec<AiJob>,
    pub allowance_limit_usd: f64,
}

#[derive(Serialize)]
pub struct AiUsageReport {
    pub budget: AiBudget,
    pub usage: AiUsage,
    #[serde(skip)]
    pub(crate) _custody: ByteReservation,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum AiMode {
    Live,
    Unconfigured,
    Degraded,
    Fixture,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiJob {
    pub id: String,
    pub kind: String,
    pub status: crate::player_events::SpeechReplyStatus,
    pub message: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_latency_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_latency_ms: Option<f64>,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiBudget {
    pub limit_usd: f64,
    pub spent_usd: f64,
    pub reserved_usd: f64,
    pub estimated: bool,
    pub per_agent: bool,
    pub period: String,
    pub accounts: IndexMap<String, AccountAmount>,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccountAmount {
    pub spent_usd: f64,
    pub reserved_usd: f64,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiUsage {
    pub jev_calls: u64,
    pub llm_calls: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub last_latency_ms: f64,
}

#[derive(Serialize, PartialEq)]
pub struct Milestone {
    pub id: String,
    pub label: String,
    pub done: bool,
}

/// Operational fields come from their live owners. An exact author-permitted
/// reply can be attached only to a selected event in this view's own read.
pub struct ViewTelemetry {
    pub ai: AiView,
    pub custody: ByteReservation,
}

pub struct ViewHostFacts {
    pub revision: u64,
    pub access: PlayerAccess,
    pub checkpoint: Option<CheckpointContext>,
    pub command_epoch: String,
    pub base_ratio: f64,
    pub persistence: PersistenceView,
    pub inventory: InventoryReadRevision,
    pub history: HistoryViewFacts,
    pub paused_stop: Option<PausedStop>,
    pub weather: Option<WeatherView>,
    pub maintenance: Option<Arc<RawValue>>,
    pub presentation_release: Option<Arc<RawValue>>,
    pub presentation_release_revision: Option<u64>,
    pub milestones: Vec<Milestone>,
    pub telemetry: ViewTelemetry,
    pub custody: ByteReservation,
}

pub struct PreparedPlayerView {
    read: RuntimePlayerRead,
    owned: ViewOwned,
}

struct ViewOwned {
    policy: Arc<PlayerViewPolicy>,
    host: ViewHostFacts,
    input_scope: Option<InputScope>,
    own: PreparedSelf,
    contacts: PreparedContacts,
    events: PreparedPlayerEvents,
    clock: ClockView,
    controls: Vec<ActionOption>,
    history_text: Option<String>,
    world_id: String,
    timeline: String,
    _custody: ByteReservation,
}

#[derive(Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum PauseReason {
    Away,
    Manual,
    Storage,
}
#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ClockView {
    seconds: f64,
    day: i64,
    hour: f64,
    speed: f64,
    base_ratio: f64,
    paused: bool,
    pause_reason: Option<PauseReason>,
    preparing_navigation: bool,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ActionOption {
    id: &'static str,
    label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<JsText>,
    command: ControlCommand,
}
#[derive(Serialize, PartialEq)]
struct ControlCommand {
    #[serde(rename = "type")]
    kind: &'static str,
}

/// Spends no model budget. The host input already owns its account snapshot,
/// and physical preparation relinquishes the world turn. The returned reader
/// still needs synchronous disclosure.
pub(crate) async fn prepare_view(
    game: &CurrentServer,
    policy: Arc<PlayerViewPolicy>,
    audience: Arc<AuthorizedScope>,
    references: Arc<ReferenceIssuer>,
    inputs: &WorldInputs,
    commands: &crate::player_command::PlayerCommands,
    saves: Arc<LiveSaves>,
    mut host: ViewHostInput,
) -> Result<PreparedPlayerView, ViewError> {
    let scope = Arc::new(audience.scope.clone());
    if !host.matches(&scope)? {
        return Err(ViewError::Changed);
    }
    let (read, (own, input_facts, revision, save_failed)) = game
        .world
        .capture_player(
            scope.account_id.clone(),
            scope.actor_id.clone(),
            EVENT_WINDOW,
            {
                let policy = Arc::clone(&policy);
                let references = Arc::clone(&references);
                let scope = Arc::clone(&scope);
                move |facts, budget| {
                    // Sample the notice before its save status. A fault that
                    // arrives later must still wake the stream for a new view.
                    let revision = saves.publication_revision();
                    let save_failed = saves.has_failed();
                    let input_facts = RuntimePlayerInputState {
                        physical_life: facts.physical_life,
                        alive: facts.alive,
                        can_steer: facts.can_steer,
                    };
                    let projected = (|| {
                        let scoped = references.scoped(&scope)?;
                        prepare_self(facts, &policy.scene, &scoped, false, false, budget)
                    })();
                    Ok((projected, input_facts, revision, save_failed))
                }
            },
        )
        .await
        .map_err(ViewError::World)?;
    let mut own = own.map_err(ViewError::Capture)?;
    if read.clock().paused
        && own.player.has_work
        && host.controlling()
        && policy.controls.stop_inactive
    {
        host.paused_stop = Some(
            commands
                .preview_paused_stop(audience.clone(), read.accepted_cut())
                .await
                .map_err(|error| match error {
                    WorldError::ProjectionChanged => ViewError::Changed,
                    other => ViewError::World(other),
                })?,
        );
    }
    let input_scope = if host.controlling() {
        Some(
            inputs
                .for_view(audience, input_facts, read.clock().paused)
                .map_err(|error| ViewError::World(WorldError::Access(error)))?,
        )
    } else {
        None
    };
    let spatial = Arc::clone(&game.spatial);
    let budget = game.host.budget().clone();
    game.host
        .compute(move || {
            let mut read = read;
            if let Some(queries) = read.control_queries() {
                let (answer, custody) = spatial
                    .compute(queries, &budget)
                    .map_err(|error| ViewError::World(error.into()))?
                    .into_parts();
                read.finish_controls_direct(answer, custody, &budget)
                    .map_err(runtime)?;
            }
            let scoped = references.scoped(&scope).map_err(ViewError::Encoding)?;
            let (mut host, narrator) =
                host.assemble(revision, save_failed, &read, &policy, &scoped, &own)?;
            if let Some(mut banner) = narrator {
                if banner
                    .select(&mut read, &scope.actor_id, &scoped, &budget)
                    .map_err(ViewError::World)?
                {
                    host.history.narrator = Some(banner);
                }
            }
            let perception = read.perception().map_err(runtime)?;
            own.name_action_target(&policy.scene.self_view, &perception)
                .map_err(ViewError::Capture)?;
            let contacts = prepare_contacts(
                perception,
                &policy.scene.observed,
                &scoped,
                own.can_speak,
                &own.trade_reader_revision,
                &budget,
            )
            .map_err(ViewError::Capture)?;
            let events = prepare_events(&read, &policy.events, &scoped, &budget)
                .map_err(ViewError::Event)?;
            let actual = read.clock();
            let paused =
                actual.paused || matches!(host.persistence.status, PersistenceStatus::Error);
            if paused {
                own.pause_action();
            }
            let pause_reason = pause_reason(
                actual,
                matches!(host.persistence.status, PersistenceStatus::Error),
            );
            let control = read.control_facts().map_err(runtime)?;
            let (day, hour) = clock_parts(actual.at, policy.world.offset_hours);
            let clock = ClockView {
                seconds: actual.at,
                day,
                hour,
                speed: actual.speed,
                base_ratio: host.base_ratio,
                paused,
                pause_reason,
                preparing_navigation: control.preparing_navigation,
            };
            let custody = control_custody(&budget, &policy, &host)?;
            let controls = controls(&policy, &host, &own, paused, control.can_recover)?;
            let history_text = history(&policy.world, actual.at);
            Ok(PreparedPlayerView {
                read,
                owned: ViewOwned {
                    policy,
                    host,
                    input_scope,
                    own,
                    contacts,
                    events,
                    clock,
                    controls,
                    history_text,
                    world_id: scope.world_id.clone(),
                    timeline: scope.timeline_id.clone(),
                    _custody: custody,
                },
            })
        })
        .await
        .map_err(ViewError::World)?
}

fn runtime(error: RuntimeError) -> ViewError {
    ViewError::World(error.into())
}
pub(crate) fn clock_parts(seconds: f64, offset: f64) -> (i64, f64) {
    let local = seconds + offset * 3600.0;
    let in_day = ((local % 86400.0) + 86400.0) % 86400.0;
    (((local / 86400.0).floor() as i64) + 1, in_day / 3600.0)
}
pub(crate) fn pause_reason(
    actual: openlegend_simulation::runtime::RuntimeClock,
    storage_failed: bool,
) -> Option<PauseReason> {
    if storage_failed {
        Some(PauseReason::Storage)
    } else if !actual.paused {
        None
    } else if actual.manually_paused {
        Some(PauseReason::Manual)
    } else {
        Some(PauseReason::Away)
    }
}
fn history(policy: &PublicWorld, seconds: f64) -> Option<String> {
    policy.history_template.as_ref().map(|template| {
        let start = clock_parts(0.0, policy.offset_hours).0;
        let label = policy
            .day_label
            .as_ref()
            .map_or_else(|| start.to_string(), |unit| format!("{unit} {start}"));
        template.replace("{startDay}", &label).replace(
            "{elapsedDays}",
            &(clock_parts(seconds, 0.0).0 - 1).to_string(),
        )
    })
}
fn control_custody(
    budget: &ByteBudget,
    policy: &PlayerViewPolicy,
    host: &ViewHostFacts,
) -> Result<ByteReservation, ViewError> {
    // Control reports, optional own history wording and two scope strings are
    // retained independently from the authority and clock read.
    let authored = &policy.controls;
    let limit = [
        authored.stop_label.len(),
        authored.no_work.len(),
        authored.paused_action.len(),
        authored.unavailable_action.len(),
        authored.recover_reason.len(),
        authored.respawn_reason.len(),
        authored.recover_label.as_ref().map_or(0, String::len),
        authored.respawn_label.as_ref().map_or(0, String::len),
        policy
            .world
            .history_template
            .as_ref()
            .map_or(0, String::len),
        host.paused_stop
            .as_ref()
            .map_or(0, |stop| stop.message.storage_bytes()),
    ]
    .into_iter()
    .try_fold(4096, usize::checked_add)
    .ok_or(ViewError::Capacity)?;
    budget.reserve(limit).map_err(|_| ViewError::Capacity)
}
fn controls(
    policy: &PlayerViewPolicy,
    host: &ViewHostFacts,
    own: &PreparedSelf,
    paused: bool,
    recover: bool,
) -> Result<Vec<ActionOption>, ViewError> {
    let words = &policy.controls;
    let can_choose = host.access.controlling
        && (words.stop_inactive
            || (!paused && !own.inactive() && own.player.alive && !own.incapacitated));
    let possible =
        own.player.has_work && (!paused || host.paused_stop.as_ref().is_some_and(|stop| stop.ok));
    let reason = if !can_choose {
        Some(
            if paused {
                words.paused_action.as_str()
            } else {
                words.unavailable_action.as_str()
            }
            .into(),
        )
    } else if possible {
        None
    } else {
        Some(host.paused_stop.as_ref().map_or_else(
            || words.no_work.as_str().into(),
            |stop| stop.message.clone(),
        ))
    };
    let mut output = vec![ActionOption {
        id: "cancel",
        label: words.stop_label.clone(),
        icon: words.stop_icon.clone(),
        enabled: can_choose && possible,
        reason,
        command: ControlCommand { kind: "cancel" },
    }];
    if recover {
        output.push(ActionOption {
            id: "recover",
            label: words.recover_label.clone().ok_or(ViewError::Changed)?,
            icon: None,
            enabled: !paused,
            reason: Some(words.recover_reason.as_str().into()),
            command: ControlCommand { kind: "recover" },
        });
    }
    if own.has_death_review() {
        output.push(ActionOption {
            id: "respawn",
            label: words.respawn_label.clone().ok_or(ViewError::Changed)?,
            icon: None,
            enabled: !paused && !own.inactive() && host.access.controlling,
            reason: Some(words.respawn_reason.as_str().into()),
            command: ControlCommand { kind: "respawn" },
        });
    }
    Ok(output)
}

impl PreparedPlayerView {
    pub(crate) fn control_preview_cut(&self) -> Option<u64> {
        self.owned.host.paused_stop.as_ref().map(|stop| stop.cut)
    }

    pub fn read(&self) -> &RuntimePlayerRead {
        &self.read
    }
    pub fn event_ids(&self) -> &[String] {
        self.owned.events.event_ids()
    }
    pub fn speech_reply_ids(&self) -> impl Iterator<Item = &str> {
        self.owned.events.speech_reply_ids()
    }

    /// Read the current installed-artwork grant only for the accepted saved
    /// binding. Call after other async projection reads and immediately before
    /// the current session/native publication gate.
    pub(crate) async fn attach_presentation_release(
        &mut self,
        installed: Option<&crate::player_http::assets::InstalledAssets>,
        store: &crate::store::Store,
    ) -> Result<(), ViewError> {
        let source = self.read.view_source().map_err(runtime)?;
        if self.owned.host.access.can_manage_saves {
            // The operator can replace an old or withdrawn installation
            // using its revision without receiving its private identity.
            self.owned.host.presentation_release_revision = Some(source.presentation_release_revision.unwrap_or(0));
        }
        let (Some(raw), Some(installed)) = (source.presentation_release(), installed) else {
            return Ok(());
        };
        let release =
            crate::store::assets::AssetRevision::from_current(raw).map_err(ViewError::Store)?;
        if installed
            .permitted_release(store, &self.owned.host.access.account_id, &release)
            .await
            .map_err(ViewError::Store)?
            .is_some()
        {
            // The independent host view owns this small exact reference even
            // after the native capture is released on stream handoff.
            self.owned.host.presentation_release = Some(Arc::from(raw.to_owned()));
            self.owned.host.presentation_release_revision = source.presentation_release_revision;
        }
        Ok(())
    }

    /// Join only the selected speech events' independently admitted job
    /// products. The original read and disclosure boundary stay intact.
    pub fn attach_speech_replies(
        mut self,
        replies: IndexMap<String, SpeechReply>,
        custody: ByteReservation,
    ) -> Result<Self, ViewError> {
        self.owned.events = self
            .owned
            .events
            .attach_replies(replies, custody)
            .map_err(ViewError::Event)?;
        Ok(self)
    }
    pub fn revision(&self) -> u64 {
        self.owned.host.revision
    }
    pub fn wire(&self, can_use_inventory: bool) -> impl Serialize + '_ {
        FullView {
            data: &self.owned,
            can_use_inventory,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerWire<'a> {
    #[serde(flatten)]
    body: &'a crate::player_scene::PlayerBodyView,
    memory_revision: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    history: Option<&'a str>,
    inventory_read_revision: &'a InventoryReadRevision,
    #[serde(skip_serializing_if = "Option::is_none")]
    construction_revision: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    input_scope: Option<&'a InputScope>,
    can_use_inventory: bool,
    work: Option<()>,
    controls: &'a [ActionOption],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresentationView<'a> {
    world_name: &'a JsText,
    location_name: &'a JsText,
    time_label: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    introduction: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    crafting: Option<&'a RawValue>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarView<'a> {
    #[serde(flatten)]
    current: &'a ClockView,
    offset_hours: f64,
    named_times: &'a [String],
    #[serde(skip_serializing_if = "Option::is_none")]
    day_label: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    daylight: Option<&'a Daylight>,
    #[serde(skip_serializing_if = "Option::is_none")]
    weather: Option<&'a WeatherView>,
}
#[derive(Serialize)]
struct MapView<'a> {
    width: f64,
    height: f64,
    spatial: &'a RawValue,
    tiles: &'a RawValue,
    terrain: &'a RawValue,
    seed: u64,
}
impl MapPolicy {
    fn wire(&self, seed: u64) -> MapView<'_> {
        MapView {
            width: self.width,
            height: self.height,
            spatial: &self.spatial,
            tiles: &self.tiles,
            terrain: &self.terrain,
            seed,
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Cartography<'a> {
    art: &'a RawValue,
    revision: u64,
    places_revision: &'a str,
    max_markers: u64,
    label_characters: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    note_characters: Option<u64>,
    marker_icons: &'a RawValue,
    markers: &'a [crate::player_scene::Marker],
}
impl ViewOwned {
    fn player(&self, can_use_inventory: bool) -> PlayerWire<'_> {
        PlayerWire {
            body: &self.own.player,
            memory_revision: &self.host.history.memory_revision,
            history: self.history_text.as_deref(),
            inventory_read_revision: &self.host.inventory,
            construction_revision: self.policy.world.construction_revision.as_deref(),
            input_scope: self.input_scope.as_ref(),
            can_use_inventory,
            work: None,
            controls: &self.controls,
        }
    }
    fn calendar(&self) -> CalendarView<'_> {
        let world = &self.policy.world;
        CalendarView {
            current: &self.clock,
            offset_hours: world.offset_hours,
            named_times: &world.named_times,
            day_label: world.day_label.as_deref(),
            daylight: world.daylight.as_ref(),
            weather: self.host.weather.as_ref(),
        }
    }
    fn cartography<'a>(&'a self, policy: &'a CartographyPolicy) -> Cartography<'a> {
        Cartography {
            art: &policy.art,
            revision: self.own.player.knowledge_revision,
            places_revision: &self.host.history.places_revision,
            max_markers: policy.max_markers,
            label_characters: policy.label_characters,
            note_characters: policy.note_characters,
            marker_icons: &policy.marker_icons,
            markers: &self.own.map_markers,
        }
    }
}
struct FullView<'a> {
    data: &'a ViewOwned,
    can_use_inventory: bool,
}
impl Serialize for FullView<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let data = self.data;
        let host = &data.host;
        let world = &data.policy.world;
        let mut wire = serializer.serialize_map(None)?;
        wire.serialize_entry("schemaVersion", &3)?;
        wire.serialize_entry("revision", &host.revision)?;
        wire.serialize_entry("worldId", &data.world_id)?;
        wire.serialize_entry("evaluationCut", &data.clock.seconds)?;
        wire.serialize_entry(
            "sightConfirmedThrough",
            &data.contacts.sight_confirmed_through,
        )?;
        wire.serialize_entry("access", &host.access)?;
        wire.serialize_entry("maintenance", &host.maintenance)?;
        if let Some(checkpoint) = &host.checkpoint {
            wire.serialize_entry("checkpoint", checkpoint)?;
        }
        wire.serialize_entry("commandEpoch", &host.command_epoch)?;
        wire.serialize_entry("saveTimeline", &data.timeline)?;
        wire.serialize_entry("worldEventsRevision", &host.history.events_revision)?;
        wire.serialize_entry("historyRevision", &host.history.revision)?;
        wire.serialize_entry("historyEpoch", &host.history.epoch)?;
        wire.serialize_entry("narrator", &host.history.narrator)?;
        wire.serialize_entry("clock", &data.calendar())?;
        wire.serialize_entry("vision", &data.own.vision)?;
        wire.serialize_entry("hearing", &data.own.hearing)?;
        wire.serialize_entry("map", &world.map.wire(data.own.seed))?;
        if let Some(cartography) = &world.cartography {
            wire.serialize_entry("cartography", &data.cartography(cartography))?;
        }
        if let Some(release) = &host.presentation_release {
            wire.serialize_entry("presentationRelease", release)?;
        }
        if let Some(revision) = &host.presentation_release_revision {
            wire.serialize_entry("presentationReleaseRevision", revision)?;
        }
        wire.serialize_entry(
            "presentation",
            &PresentationView {
                world_name: &world.name,
                location_name: data
                    .contacts
                    .current_place_label
                    .as_ref()
                    .unwrap_or(&world.name),
                time_label: &world.time_label,
                introduction: world.introduction.as_deref(),
                crafting: world.crafting.as_deref(),
            },
        )?;
        wire.serialize_entry("inventionPolicy", &world.invention_policy)?;
        wire.serialize_entry("godMode", &false)?;
        wire.serialize_entry("player", &data.player(self.can_use_inventory))?;
        wire.serialize_entry("entities", &data.contacts.entities)?;
        wire.serialize_entry(
            "communicationReferences",
            &data.own.communication_references,
        )?;
        wire.serialize_entry("recipes", &data.own.recipes)?;
        wire.serialize_entry("events", data.events.journal())?;
        wire.serialize_entry("conversation", data.events.conversation())?;
        wire.serialize_entry("ai", &host.telemetry.ai)?;
        wire.serialize_entry("milestones", &host.milestones)?;
        wire.serialize_entry("persistence", &host.persistence)?;
        wire.end()
    }
}
