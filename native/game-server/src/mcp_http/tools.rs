//! Select existing public inspection products. The connector can never
//! read actors or submit actions, even when a context handle is supplied.

use super::{Access, REPLY_BYTES, RequestLease};
use crate::world::HostedWorld;
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{
        json_record, json_record_len, json_tree_allocation_bound, sha256_hex, write_json_record,
    },
    host::{ByteBudget, ByteReservation},
    runtime::{RuntimeDefinitionInspection, RuntimeDefinitionKind, RuntimeWorldInspection},
    text::{JsText, TextRef},
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

const CONTEXT: &str = "ol_context";
const INSPECT: &str = "ol_inspect";
const ITEM_DEFINITION: &str = "item-definition";
const ATTRIBUTE: &str = "attribute";
const BODY_POLICY: &str = "body-policy";
const RECIPE: &str = "recipe";
const RESULT_BYTES: usize = 64 * 1024;
const CONTEXT_DESCRIPTION: &str =
    "Inspect the current world profile, installed revision, policy and available read tools.";
const INSPECT_DESCRIPTION: &str = "Read an exact installed item, attribute, body policy or recipe definition. No live bodies, inventory, memory or private authoring data.";

#[derive(Clone)]
pub(super) struct WorldTools {
    access: Arc<Access>,
    world: Arc<HostedWorld>,
    timeline: Arc<str>,
    budget: ByteBudget,
}

impl WorldTools {
    pub(super) fn new(
        access: Arc<Access>,
        world: Arc<HostedWorld>,
        timeline: Arc<str>,
        budget: ByteBudget,
    ) -> Self {
        Self {
            access,
            world,
            timeline,
            budget,
        }
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
        Ok(ListToolsResult {
            tools: vec![
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
            ],
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
        let selected = match read_selection(&request.name, request.arguments.unwrap_or_default()) {
            Ok(selected) => selected,
            Err(failure) => return Ok(failure.result().into()),
        };
        if !self.access.current() {
            return Ok(Failure::Expired.result().into());
        }
        let access = self.access.clone();
        let budget = self.budget.clone();
        let timeline = self.timeline.clone();
        let prepared = tokio::select! {
            biased;
            _ = context.ct.cancelled() => return Ok(Failure::Expired.result().into()),
            result = self.world.capture(move |world| {
                world.inspect_world(selected.definition(), |read| {
                    if !access.current() || access.config.world_id != read.progress.world_id {
                        return Err(Failure::Expired);
                    }
                    selected.reply(read, &timeline, &budget)
                })
            }) => result.map_err(|_| Failure::Unavailable).and_then(|value| value),
        };
        if !self.access.current() || context.ct.is_cancelled() {
            return Ok(Failure::Expired.result().into());
        }
        match prepared {
            Ok(reply) => {
                let mut memory = lease.reply.lock().map_err(|_| {
                    ErrorData::internal_error("Connector reply custody is unavailable.", None)
                })?;
                *memory = Some(reply.memory);
                Ok(reply.result.into())
            }
            Err(failure) => Ok(failure.result().into()),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct InspectInput {
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
}

fn valid(value: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&value.encode_utf16().count())
}

fn read_selection(name: &str, mut arguments: JsonObject) -> Result<Selection, Failure> {
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
        CONTEXT if arguments.is_empty() => Ok(Selection::Context),
        INSPECT => {
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
            if matches!(input.kind.as_str(), "entity" | "item" | "memory-record") {
                return Err(Failure::Forbidden);
            }
            if input.sections.as_ref().is_some_and(|sections| {
                sections
                    .iter()
                    .any(|section| matches!(section, Section::Relationships))
            }) {
                return Err(Failure::Unavailable);
            }
            let kind = match input.kind.as_str() {
                ITEM_DEFINITION => RuntimeDefinitionKind::Item,
                ATTRIBUTE => RuntimeDefinitionKind::Attribute,
                BODY_POLICY => RuntimeDefinitionKind::BodyPolicy,
                RECIPE => RuntimeDefinitionKind::Recipe,
                _ => return Err(Failure::Unavailable),
            };
            Ok(Selection::Inspect(input, kind))
        }
        _ => Err(Failure::Invalid),
    }
}

impl Selection {
    fn definition(&self) -> Option<(RuntimeDefinitionKind, &str)> {
        match self {
            Self::Context => None,
            Self::Inspect(input, kind) => Some((*kind, &input.id)),
        }
    }

    fn reply(
        &self,
        read: RuntimeWorldInspection<'_>,
        timeline: &str,
        budget: &ByteBudget,
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
                    definition_kinds: &[ITEM_DEFINITION, ATTRIBUTE, BODY_POLICY, RECIPE],
                    tools: [
                        Description {
                            name: CONTEXT,
                            description: CONTEXT_DESCRIPTION,
                        },
                        Description {
                            name: INSPECT,
                            description: INSPECT_DESCRIPTION,
                        },
                    ],
                    limitations: &[
                        "This connector reads public installed definitions. It has no account, model spending or write authority.",
                    ],
                },
                budget,
            ),
            Self::Inspect(input, _) => match read.definition.ok_or(Failure::Unavailable)? {
                RuntimeDefinitionInspection::Complete { name, payload } => {
                    definition_reply(snapshot, input, name, payload, budget)
                }
                RuntimeDefinitionInspection::Recipe(source) => {
                    recipe_reply(snapshot, input, source, budget)
                }
            },
        }
    }
}

/// Match Source's exact `recipe` inspection, including its public field order.
/// Borrow nested values from the installed row and fund only this read's output.
/// docs/world-agent-mcp.md#stand-alone-rust-read-scope
fn recipe_reply(
    snapshot: Snapshot<'_>,
    input: &InspectInput,
    source: &str,
    budget: &ByteBudget,
) -> Result<PreparedReply, Failure> {
    let workspace = json_tree_allocation_bound(source).ok_or(Failure::Capacity)?;
    let _workspace = budget.reserve(workspace).map_err(|_| Failure::Capacity)?;
    let mut fields: IndexMap<String, &RawValue> =
        serde_json::from_str(source).map_err(|_| Failure::Unavailable)?;
    fields.shift_remove("provenance");
    let name: JsText = serde_json::from_str(fields.get("name").ok_or(Failure::Unavailable)?.get())
        .map_err(|_| Failure::Unavailable)?;
    let bytes = json_record_len(&fields).map_err(|_| Failure::Unavailable)?;
    if bytes > RESULT_BYTES {
        return Err(Failure::Capacity);
    }
    let _payload = budget.reserve(bytes).map_err(|_| Failure::Capacity)?;
    let mut output = Vec::with_capacity(bytes);
    write_json_record(&fields, &mut output).map_err(|_| Failure::Unavailable)?;
    let payload = std::str::from_utf8(&output).map_err(|_| Failure::Unavailable)?;
    definition_reply(snapshot, input, (&name).into(), payload, budget)
}

fn definition_reply(
    snapshot: Snapshot<'_>,
    input: &InspectInput,
    name: TextRef<'_>,
    payload: &str,
    budget: &ByteBudget,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ContextData<'a> {
    profile: Profile<'a>,
    controlled_actor_id: Option<&'a str>,
    manifest_revision: u64,
    policy: &'a RawValue,
    definition_kinds: &'static [&'static str],
    tools: [Description; 2],
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

struct PreparedReply {
    result: CallToolResult,
    memory: ByteReservation,
}

fn result<T: Serialize>(
    snapshot: Snapshot<'_>,
    data: T,
    budget: &ByteBudget,
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
    Ok(PreparedReply { result, memory })
}

enum Failure {
    Invalid,
    Stale,
    Forbidden,
    Expired,
    Unavailable,
    Capacity,
}

impl Failure {
    fn result(self) -> CallToolResult {
        let (status, message) = match self {
            Self::Invalid => ("invalid", "Arguments do not match the tool."),
            Self::Stale => ("stale", "Definition changed. Read its current version."),
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
        };
        CallToolResult::structured_error(
            json!({ "status": status, "message": message, "cost": "no-paid-work" }),
        )
    }
}
