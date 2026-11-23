//! Public authored definitions for signed inspection and MCP. Each ingress
//! retains its own grants and final disclosure.

use super::{Access, REPLY_BYTES, RequestLease};
use crate::{wire, world::HostedWorld};
use axum::body::Bytes;
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{
        json_record, json_record_len, json_tree_allocation_bound, sha256_hex, write_json_record,
    },
    host::{ByteBudget, ByteReservation},
    runtime::{
        RuntimeDefinitionCatalogue, RuntimeDefinitionInspection, RuntimeDefinitionKind,
        RuntimeLiveInspection, RuntimeWorldInspection,
    },
    text::{JsText, TextRef},
    values::DefinitionPin,
};
use rmcp::{
    ErrorData, RoleServer, ServerHandler,
    model::{
        CallToolRequestParams, CallToolResponse, CallToolResult, ContentBlock, Implementation,
        JsonObject, ListToolsResult, PaginatedRequestParams, ProtocolVersion, ServerCapabilities,
        ServerConfig, Tool, ToolAnnotations,
    },
    service::RequestContext,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json, value::RawValue};
use std::{borrow::Cow, sync::Arc};

use tokio::sync::watch;
use tokio_util::sync::CancellationToken;

mod find;
mod graph;

const CONTEXT: &str = "ol_context";
const INSPECT: &str = "ol_inspect";
const ITEM_DEFINITION: &str = "item-definition";
const ATTRIBUTE: &str = "attribute";
const SENSE: &str = "sense";
const BODY_POLICY: &str = "body-policy";
const RECIPE: &str = "recipe";
const ITEM_HANDLING: &str = "item-handling-policy";
const ITEM_HANDLING_LABEL: &str = "Item handling policy";
const RESULT_BYTES: usize = 64 * 1024;
const CONTEXT_DESCRIPTION: &str =
    "Inspect the current world profile, installed revision, policy and available read tools.";
const INSPECT_DESCRIPTION: &str = "Read an exact installed item, attribute, sense, body policy, recipe or item handling definition. No live bodies, inventory, memory or private authoring data.";

#[derive(Clone)]
pub(super) struct WorldTools {
    access: Arc<Access>,
    reads: Arc<DefinitionReads>,
}

impl WorldTools {
    pub(super) fn new(access: Arc<Access>, reads: Arc<DefinitionReads>) -> Self {
        Self { access, reads }
    }
}

/// Own the same immutable catalogue ordering for both transports.
/// A new running timeline creates a new owner and cursor scope.
pub(crate) struct DefinitionReads {
    world: Arc<HostedWorld>,
    world_id: Arc<str>,
    timeline: Arc<str>,
    budget: ByteBudget,
    stop: watch::Receiver<bool>,
    find: Option<Arc<find::CatalogueSearch>>,
}

enum Recipient {
    Connector,
    Signed(Arc<str>),
}

impl DefinitionReads {
    pub(crate) fn new(
        world: Arc<HostedWorld>,
        world_id: &str,
        timeline: &str,
        budget: ByteBudget,
        language: Option<Arc<crate::language::LanguageProvider>>,
        stop: watch::Receiver<bool>,
    ) -> Self {
        Self {
            world,
            world_id: world_id.into(),
            timeline: timeline.into(),
            budget,
            stop,
            find: language.map(|language| Arc::new(find::CatalogueSearch::new(language))),
        }
    }

    pub(crate) fn stop_signal(&self) -> watch::Receiver<bool> {
        self.stop.clone()
    }

    /// Borrow the accepted definition source and prepare independently funded
    /// response bytes. The caller retains and rechecks its own disclosure grant.
    pub(crate) async fn signed(
        &self,
        name: &str,
        arguments: JsonObject,
        account: Arc<str>,
        custody: impl Send + 'static,
        current: impl Fn() -> bool + Clone + Send + Sync + 'static,
        stopped: CancellationToken,
    ) -> Result<Bytes, Failure> {
        let recipient = Recipient::Signed(account);
        let selected = read_selection(name, arguments, &recipient)?;
        match self
            .prepare(selected, recipient, custody, current, stopped)
            .await?
        {
            PreparedReply::Signed(bytes) => Ok(bytes),
            PreparedReply::Connector(..) => Err(Failure::Unavailable),
        }
    }

    async fn prepare(
        &self,
        selected: Selection,
        recipient: Recipient,
        custody: impl Send + 'static,
        current: impl Fn() -> bool + Clone + Send + Sync + 'static,
        stopped: CancellationToken,
    ) -> Result<PreparedReply, Failure> {
        if !current() || stopped.is_cancelled() {
            return Err(Failure::Expired);
        }
        let selected = match selected {
            Selection::Find(input) => {
                let owner = self.find.clone().ok_or(Failure::Unavailable)?;
                return self
                    .prepare_catalogue(
                        custody,
                        current,
                        stopped,
                        move |catalogue, revision, snapshot, budget, stopped| {
                            owner.page(
                                input, catalogue, revision, snapshot, &recipient, budget, stopped,
                            )
                        },
                    )
                    .await;
            }
            Selection::Relationships(request) => {
                return self
                    .prepare_catalogue(
                        custody,
                        current,
                        stopped,
                        move |catalogue, _, snapshot, budget, stopped| {
                            request.read(&catalogue, snapshot, budget, &recipient, stopped)
                        },
                    )
                    .await;
            }
            selected => selected,
        };
        let world_id = self.world_id.clone();
        let timeline = self.timeline.clone();
        let budget = self.budget.clone();
        let find_available = self.find.is_some();
        self.world
            .capture(move |world| {
                let _custody = custody;
                world.inspect_world(selected.definition(), |read| {
                    if !current() || stopped.is_cancelled() || &*world_id != read.progress.world_id
                    {
                        return Err(Failure::Expired);
                    }
                    selected.reply(read, &timeline, &budget, &recipient, find_available)
                })
            })
            .await
            .map_err(|_| Failure::Unavailable)?
    }

    /// Capture the exact installed catalogue under the world turn, then do
    /// optional operator inspection work off-turn. Detached work keeps the
    /// same captured catalogue and all of its own request custody.
    async fn prepare_catalogue(
        &self,
        custody: impl Send + 'static,
        current: impl Fn() -> bool + Clone + Send + Sync + 'static,
        stopped: CancellationToken,
        prepare: impl FnOnce(
            RuntimeDefinitionCatalogue,
            u64,
            Snapshot<'_>,
            &ByteBudget,
            &CancellationToken,
        ) -> Result<PreparedReply, Failure>
        + Send
        + 'static,
    ) -> Result<PreparedReply, Failure> {
        let accepted = current.clone();
        let expected_world = self.world_id.clone();
        let (sequence, sim_time, revision, catalogue) = self
            .world
            .capture(move |world| {
                world.capture_definition_catalogue(|progress, revision, catalogue| {
                    if !accepted() || &*expected_world != progress.world_id {
                        return Err(Failure::Expired);
                    }
                    Ok((progress.sequence, progress.at, revision, catalogue))
                })
            })
            .await
            .map_err(|_| Failure::Unavailable)??;
        let world_id = self.world_id.clone();
        let timeline = self.timeline.clone();
        let budget = self.budget.clone();
        tokio::task::spawn_blocking(move || {
            let _custody = custody;
            if !current() || stopped.is_cancelled() {
                return Err(Failure::Expired);
            }
            prepare(
                catalogue,
                revision,
                Snapshot {
                    world_id: &world_id,
                    generation: &timeline,
                    sequence,
                    sim_time,
                },
                &budget,
                &stopped,
            )
        })
        .await
        .map_err(|_| Failure::Unavailable)?
    }
}

fn tool(name: &'static str, description: &'static str, schema: Value) -> Tool {
    Tool::new(
        name,
        description,
        schema.as_object().expect("tool input is an object").clone(),
    )
    .annotate(
        ToolAnnotations::new()
            .read_only(true)
            .destructive(false)
            .idempotent(true)
            .open_world(false),
    )
}

impl ServerHandler for WorldTools {
    fn get_info(&self) -> ServerConfig {
        let mut info = ServerConfig::new(ServerCapabilities::builder().enable_tools().build());
        info.protocol_version = ProtocolVersion::V_2025_11_25;
        info.server_info = Implementation::new("openlegend-world-agent", "1.1.0");
        info
    }

    fn supported_protocol_versions(&self) -> Cow<'static, [ProtocolVersion]> {
        const SUPPORTED: [ProtocolVersion; 1] = [ProtocolVersion::V_2025_11_25];
        Cow::Borrowed(&SUPPORTED)
    }

    async fn list_tools(
        &self,
        page: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        if page.is_some_and(|page| page.cursor.is_some()) {
            return Err(ErrorData::invalid_params(
                "The selected page is unavailable.",
                None,
            ));
        }
        let context_handle = json!({"type":"string","minLength":32,"maxLength":256});
        let mut tools = vec![
            tool(
                CONTEXT,
                CONTEXT_DESCRIPTION,
                json!({
                    "type":"object","additionalProperties":false,
                    "properties":{"contextHandle":context_handle},
                }),
            ),
            tool(
                INSPECT,
                INSPECT_DESCRIPTION,
                json!({
                    "type":"object","additionalProperties":false,"required":["kind","id"],
                    "properties":{
                        "kind":{"type":"string","minLength":1,"maxLength":200},
                        "id":{"type":"string","minLength":1,"maxLength":500},
                        "version":{"type":"string","minLength":1,"maxLength":100},
                        "sections":{"type":"array","minItems":1,"maxItems":3,
                            "items":{"enum":["facts","mechanics","relationships"]}},
                        "contextHandle":context_handle,
                    }
                }),
            ),
        ];
        if self.reads.find.is_some() {
            tools.push(find::tool(context_handle));
        }
        Ok(ListToolsResult {
            tools,
            ..Default::default()
        })
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        let Some(lease) = context
            .extensions
            .get::<axum::http::request::Parts>()
            .and_then(|parts| parts.extensions.get::<Arc<RequestLease>>())
            .cloned()
        else {
            return Err(ErrorData::internal_error(
                "Missing connector request custody.",
                None,
            ));
        };
        let recipient = Recipient::Connector;
        let selected = match read_selection(
            &request.name,
            request.arguments.unwrap_or_default(),
            &recipient,
        ) {
            Ok(selected) => selected,
            Err(failure) => return Ok(failure.result().into()),
        };
        let access = self.access.clone();
        let prepared = tokio::select! {
            biased;
            _ = context.ct.cancelled() => return Ok(Failure::Expired.result().into()),
            result = self.reads.prepare(
                selected,
                recipient,
                lease.clone(),
                move || access.current(),
                context.ct.clone(),
            ) => result,
        };
        if !self.access.current() || context.ct.is_cancelled() {
            return Ok(Failure::Expired.result().into());
        }
        match prepared {
            Ok(PreparedReply::Connector(result, custody)) => {
                let mut memory = lease.reply.lock().map_err(|_| {
                    ErrorData::internal_error("Connector reply custody is unavailable.", None)
                })?;
                *memory = Some(custody);
                Ok(result.into())
            }
            Ok(PreparedReply::Signed(_)) => Ok(Failure::Unavailable.result().into()),
            Err(failure) => Ok(failure.result().into()),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct InspectInput {
    kind: String,
    id: String,
    #[serde(default, deserialize_with = "present")]
    version: Option<String>,
    #[serde(default, deserialize_with = "present")]
    sections: Option<Vec<Section>>,
}

fn present<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(
    deserializer: D,
) -> Result<Option<T>, D::Error> {
    T::deserialize(deserializer).map(Some)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum Section {
    Facts,
    Mechanics,
    Relationships,
}

enum Selection {
    Context,
    Inspect(InspectInput, RuntimeDefinitionKind),
    Find(find::Input),
    Relationships(graph::Request),
}

const KINDS: [(&str, RuntimeDefinitionKind); 6] = [
    (ITEM_DEFINITION, RuntimeDefinitionKind::Item),
    (ATTRIBUTE, RuntimeDefinitionKind::Attribute),
    (SENSE, RuntimeDefinitionKind::Sense),
    (BODY_POLICY, RuntimeDefinitionKind::BodyPolicy),
    (RECIPE, RuntimeDefinitionKind::Recipe),
    (ITEM_HANDLING, RuntimeDefinitionKind::ItemHandling),
];

fn valid(value: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&value.encode_utf16().count())
}

fn inspect_selection(arguments: JsonObject) -> Result<InspectInput, Failure> {
    let input: InspectInput =
        serde_json::from_value(Value::Object(arguments)).map_err(|_| Failure::Invalid)?;
    if !valid(&input.kind, 1, 200)
        || !valid(&input.id, 1, 500)
        || input
            .version
            .as_ref()
            .is_some_and(|value| !valid(value, 1, 100))
        || input
            .sections
            .as_ref()
            .is_some_and(|sections| !(1..=3).contains(&sections.len()))
    {
        return Err(Failure::Invalid);
    }
    Ok(input)
}

pub(crate) fn select_live_entity(arguments: JsonObject) -> Result<InspectInput, Failure> {
    let input = inspect_selection(arguments)?;
    if input.kind != "entity" {
        return Err(Failure::Invalid);
    }
    Ok(input)
}

impl InspectInput {
    pub(crate) fn id(&self) -> &str {
        &self.id
    }
}

/// Prepare the signed response only while the caller holds both the accepted
/// live read and its current application disclosure grant.
pub(crate) fn publish_live_entity(
    input: &InspectInput,
    read: RuntimeLiveInspection<'_>,
    timeline: &str,
    account: Arc<str>,
    budget: &ByteBudget,
) -> Result<Bytes, Failure> {
    match graph::live_entity(input, read, timeline, budget, &Recipient::Signed(account))? {
        PreparedReply::Signed(bytes) => Ok(bytes),
        PreparedReply::Connector(..) => Err(Failure::Unavailable),
    }
}

fn read_selection(
    name: &str,
    mut arguments: JsonObject,
    recipient: &Recipient,
) -> Result<Selection, Failure> {
    if let Some(handle) = arguments.remove("contextHandle") {
        return Err(
            if handle.as_str().is_some_and(|value| valid(value, 32, 256)) {
                Failure::Forbidden
            } else {
                Failure::Invalid
            },
        );
    }
    match name {
        CONTEXT if arguments.is_empty() && matches!(recipient, Recipient::Connector) => {
            Ok(Selection::Context)
        }
        INSPECT => {
            let input = inspect_selection(arguments)?;
            if matches!(input.kind.as_str(), "entity" | "item" | "memory-record") {
                return Err(match recipient {
                    Recipient::Connector => Failure::Forbidden,
                    Recipient::Signed(_) => Failure::Unavailable,
                });
            }
            if input.sections.as_ref().is_some_and(|sections| {
                sections
                    .iter()
                    .any(|section| matches!(section, Section::Relationships))
            }) {
                return match recipient {
                    Recipient::Signed(_) if graph::supported(&input.kind) => {
                        Ok(Selection::Relationships(graph::Request::Inspect(input)))
                    }
                    _ => Err(Failure::Unavailable),
                };
            }
            let kind = KINDS
                .iter()
                .find(|(name, _)| *name == input.kind)
                .ok_or(Failure::Unavailable)?
                .1;
            Ok(Selection::Inspect(input, kind))
        }
        find::NAME => find::Input::parse(arguments).map(Selection::Find),
        "ol_graph" if matches!(recipient, Recipient::Signed(_)) => Ok(Selection::Relationships(
            graph::Request::Page(graph::Input::parse(arguments)?),
        )),
        "ol_entities" | "ol_trace" | "ol_activity" | "ol_evidence" | "ol_instances"
            if matches!(recipient, Recipient::Signed(_)) =>
        {
            Err(Failure::Unavailable)
        }
        _ => Err(Failure::Invalid),
    }
}

impl Selection {
    fn definition(&self) -> Option<(RuntimeDefinitionKind, &str)> {
        match self {
            Self::Context | Self::Find(_) | Self::Relationships(_) => None,
            Self::Inspect(input, kind) => Some((*kind, &input.id)),
        }
    }

    fn reply(
        &self,
        read: RuntimeWorldInspection<'_>,
        timeline: &str,
        budget: &ByteBudget,
        recipient: &Recipient,
        find_available: bool,
    ) -> Result<PreparedReply, Failure> {
        let snapshot = Snapshot {
            world_id: read.progress.world_id,
            generation: timeline,
            sequence: read.progress.sequence,
            sim_time: read.progress.at,
        };
        match self {
            Self::Context => result(
                snapshot,
                ContextData {
                    profile: Profile {
                        id: read.profile_id,
                        version: read.profile_version,
                    },
                    controlled_actor_id: None,
                    manifest_revision: read.manifest_revision,
                    policy: raw(read.policy)?,
                    definition_kinds: KINDS.map(|(name, _)| name),
                    tools: &DESCRIPTIONS[..2 + usize::from(find_available)],
                    limitations: &[
                        "This connector reads public installed definitions. It has no account, model spending or write authority.",
                    ],
                },
                budget,
                recipient,
            ),
            Self::Inspect(input, _) => {
                let definition = read.definition.ok_or(Failure::Unavailable)?;
                with_public_definition(definition, budget, |name, payload| {
                    definition_reply(snapshot, input, name, payload, budget, recipient)
                })
            }
            Self::Find(_) | Self::Relationships(_) => Err(Failure::Unavailable),
        }
    }
}

enum Projection<'a> {
    Recipe,
    ItemHandling(&'a DefinitionPin),
}

/// Read the exact public body in its canonical Source order. A projected
/// recipe or item-handling policy owns its copied bytes only for this callback.
/// docs/world-agent-mcp.md#stand-alone-rust-read-scope
fn with_public_definition<T>(
    definition: RuntimeDefinitionInspection<'_>,
    budget: &ByteBudget,
    read: impl FnOnce(TextRef<'_>, &str) -> Result<T, Failure>,
) -> Result<T, Failure> {
    let (source, projection) = match definition {
        RuntimeDefinitionInspection::Complete { name, payload } => return read(name, payload),
        RuntimeDefinitionInspection::Recipe(source) => (source, Projection::Recipe),
        RuntimeDefinitionInspection::ItemHandling { payload, pin } => {
            (payload, Projection::ItemHandling(pin))
        }
    };
    with_projection(source, projection, budget, |name, fields| {
        let bytes = json_record_len(fields).map_err(|_| Failure::Unavailable)?;
        if bytes > RESULT_BYTES {
            return Err(Failure::Capacity);
        }
        let _payload = budget.reserve(bytes).map_err(|_| Failure::Capacity)?;
        let mut output = Vec::with_capacity(bytes);
        write_json_record(fields, &mut output).map_err(|_| Failure::Unavailable)?;
        let payload = std::str::from_utf8(&output).map_err(|_| Failure::Unavailable)?;
        read(name, payload)
    })
}

fn with_projection<T>(
    source: &str,
    projection: Projection<'_>,
    budget: &ByteBudget,
    project: impl FnOnce(TextRef<'_>, &IndexMap<String, &RawValue>) -> Result<T, Failure>,
) -> Result<T, Failure> {
    let workspace = json_tree_allocation_bound(source).ok_or(Failure::Capacity)?;
    let _workspace = budget.reserve(workspace).map_err(|_| Failure::Capacity)?;
    let _pin_memory: ByteReservation;
    let policy_pin: String;
    let recipe_name: JsText;
    let mut fields: IndexMap<String, &RawValue> =
        serde_json::from_str(source).map_err(|_| Failure::Unavailable)?;
    let name = match projection {
        Projection::Recipe => {
            fields.shift_remove("provenance");
            recipe_name =
                serde_json::from_str(fields.get("name").ok_or(Failure::Unavailable)?.get())
                    .map_err(|_| Failure::Unavailable)?;
            (&recipe_name).into()
        }
        Projection::ItemHandling(pin) => {
            // Append the pin used by manufacturing without recomputing it.
            let pin_bytes = json_record_len(pin).map_err(|_| Failure::Unavailable)?;
            let memory = pin_bytes
                .checked_mul(2)
                .and_then(|bytes| {
                    bytes.checked_add(std::mem::size_of::<(String, &RawValue)>() + "pin".len())
                })
                .ok_or(Failure::Capacity)?;
            _pin_memory = budget.reserve(memory).map_err(|_| Failure::Capacity)?;
            policy_pin = json_record(pin).map_err(|_| Failure::Unavailable)?;
            fields.insert("pin".into(), raw(&policy_pin)?);
            ITEM_HANDLING_LABEL.into()
        }
    };
    project(name, &fields)
}

fn definition_reply(
    snapshot: Snapshot<'_>,
    input: &InspectInput,
    name: TextRef<'_>,
    payload: &str,
    budget: &ByteBudget,
    recipient: &Recipient,
) -> Result<PreparedReply, Failure> {
    // Source inspection versions hash the public fields in authored order.
    // A native installation or manufacturing pin may hash different fields.
    let version = sha256_hex(payload.as_bytes());
    if input
        .version
        .as_ref()
        .is_some_and(|expected| *expected != version)
    {
        return Err(Failure::Stale);
    }
    let reference = DefinitionRef {
        kind: &input.kind,
        id: &input.id,
        version: &version,
    };
    result(
        snapshot,
        Definition {
            node: Node {
                reference: &reference,
                label: name,
                layer: "definition",
                can_inspect: true,
            },
            reference: &reference,
            data: raw(payload)?,
        },
        budget,
        recipient,
    )
}

fn raw(text: &str) -> Result<&RawValue, Failure> {
    serde_json::from_str(text).map_err(|_| Failure::Unavailable)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot<'a> {
    world_id: &'a str,
    generation: &'a str,
    sequence: u64,
    sim_time: f64,
}

#[derive(Serialize)]
struct Profile<'a> {
    id: &'a str,
    version: u64,
}

#[derive(Serialize)]
struct Description {
    name: &'static str,
    description: &'static str,
}

static DESCRIPTIONS: [Description; 3] = [
    Description {
        name: CONTEXT,
        description: CONTEXT_DESCRIPTION,
    },
    Description {
        name: INSPECT,
        description: INSPECT_DESCRIPTION,
    },
    Description {
        name: find::NAME,
        description: find::DESCRIPTION,
    },
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ContextData<'a> {
    profile: Profile<'a>,
    controlled_actor_id: Option<&'a str>,
    manifest_revision: u64,
    policy: &'a RawValue,
    definition_kinds: [&'static str; KINDS.len()],
    tools: &'static [Description],
    limitations: &'static [&'static str],
}

#[derive(Serialize)]
struct DefinitionRef<'a> {
    kind: &'a str,
    id: &'a str,
    version: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Node<'a> {
    #[serde(rename = "ref")]
    reference: &'a DefinitionRef<'a>,
    label: TextRef<'a>,
    layer: &'static str,
    can_inspect: bool,
}

#[derive(Serialize)]
struct Definition<'a> {
    node: Node<'a>,
    #[serde(rename = "ref")]
    reference: &'a DefinitionRef<'a>,
    data: &'a RawValue,
}

#[derive(Serialize)]
struct ResultData<'a, T> {
    status: &'static str,
    data: T,
    snapshot: Snapshot<'a>,
    cost: &'static str,
}

enum PreparedReply {
    Connector(CallToolResult, ByteReservation),
    Signed(Bytes),
}

fn result<T: Serialize>(
    snapshot: Snapshot<'_>,
    data: T,
    budget: &ByteBudget,
    recipient: &Recipient,
) -> Result<PreparedReply, Failure> {
    let value = ResultData {
        status: "ok",
        data,
        snapshot,
        cost: "no-paid-work",
    };
    let bytes = json_record_len(&value).map_err(|_| Failure::Unavailable)?;
    if bytes > RESULT_BYTES {
        return Err(Failure::Capacity);
    }
    if matches!(recipient, Recipient::Signed(_)) {
        // Direct HTTP needs one funded body and no SDK JSON conversion.
        return wire::encode(&value, br#"{"ok":true,"result":"#, b"}", budget)
            .map(PreparedReply::Signed)
            .map_err(|error| match error {
                wire::WireError::Capacity => Failure::Capacity,
                wire::WireError::Encoding(_) => Failure::Unavailable,
            });
    }
    let mut memory = budget.reserve(bytes + 512).map_err(|_| Failure::Capacity)?;
    let text = json_record(&value).map_err(|_| Failure::Unavailable)?;
    let tree_bytes = json_tree_allocation_bound(&text).ok_or(Failure::Capacity)?;
    memory
        .resize(bytes + tree_bytes + 512)
        .map_err(|_| Failure::Capacity)?;
    // Authored Source text can contain isolated UTF-16 code units. Preserve
    // those escapes in the exact JSON text when the SDK's Value cannot hold them.
    let structured = serde_json::from_str(&text).ok();
    let mut result = CallToolResult::success(vec![ContentBlock::text(text)]);
    result.structured_content = structured;
    if json_record_len(&result).map_err(|_| Failure::Unavailable)? > REPLY_BYTES {
        return Err(Failure::Capacity);
    }
    Ok(PreparedReply::Connector(result, memory))
}

pub(crate) enum Failure {
    Invalid,
    Stale,
    ListingChanged,
    Forbidden,
    Expired,
    Unavailable,
    Capacity,
}

impl Failure {
    fn result(self) -> CallToolResult {
        let (status, message) = self.details();
        CallToolResult::structured_error(
            json!({ "status": status, "message": message, "cost": "no-paid-work" }),
        )
    }

    pub(crate) fn details(self) -> (&'static str, &'static str) {
        match self {
            Self::Invalid => ("invalid", "Arguments do not match the tool."),
            Self::Stale => ("stale", "Definition changed. Read its current version."),
            Self::ListingChanged => (
                "stale",
                "The selected source or query changed. Restart this listing.",
            ),
            Self::Forbidden => (
                "forbidden",
                "The selected inspection is unavailable to this grant.",
            ),
            Self::Expired => (
                "forbidden",
                "World read grant expired, changed, or is unavailable.",
            ),
            Self::Unavailable => ("unavailable", "The selected world read is unavailable."),
            Self::Capacity => (
                "capacity",
                "The selected result exceeds the available read space.",
            ),
        }
    }
}
