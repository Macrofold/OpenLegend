//! Public installed-definition lookup. Keep ordering and matching off the
//! world turn; an explicit request borrows only the exact installed catalogue.

use super::{
    Access, Failure, ITEM_HANDLING_LABEL, KINDS, PreparedReply, Projection, RequestLease, Snapshot,
    present, result, with_projection,
};
use crate::{
    language::{LanguageError, LanguageProvider},
    world::HostedWorld,
};
use openlegend_simulation::{
    encoding::{hex_bytes, json_record, sha256_hex, write_json_record},
    host::{ByteBudget, ResidentReservation},
    runtime::{RuntimeDefinitionCatalogue, RuntimeDefinitionInspection},
    text::{JsText, TextRef},
};
use rmcp::model::{JsonObject, Tool};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json, value::RawValue};
use sha2::{Digest, Sha256};
use std::{
    io,
    sync::{Arc, Mutex},
};
use tokio_util::sync::CancellationToken;

pub(super) const NAME: &str = "ol_find";
pub(super) const DESCRIPTION: &str =
    "Find definitions by label/ID with lexical paging. No paid search; empty pages may continue.";
// The existing Source definition graph bounds both the ordered catalogue and
// a single page's search work. This read does not prepare the graph or edges.
const MAX_DEFINITIONS: usize = 50_000;
const EXAMINED: usize = 1_024;

pub(super) fn tool(context_handle: Value) -> Tool {
    super::tool(
        NAME,
        DESCRIPTION,
        json!({
            "type":"object", "additionalProperties":false,
            "properties":{
              "query":{"type":"string", "maxLength":200, "default":""},
              "kinds":{"type":"array", "maxItems":8,
                       "items":{"type":"string", "minLength":1, "maxLength":200}},
              "cursor":{"type":"string", "minLength":1, "maxLength":512},
              "limit":{"type":"integer", "minimum":1, "maximum":50, "default":20},
              "contextHandle":context_handle,
            }
        }),
    )
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Input {
    #[serde(default)]
    query: String,
    #[serde(default)]
    kinds: Vec<String>,
    #[serde(default, deserialize_with = "present")]
    cursor: Option<String>,
    #[serde(default = "default_limit")]
    limit: f64,
}

fn default_limit() -> f64 {
    20.0
}

impl Input {
    pub(super) fn parse(arguments: JsonObject) -> Result<Self, Failure> {
        let mut input: Self =
            serde_json::from_value(Value::Object(arguments)).map_err(|_| Failure::Invalid)?;
        // Source's string schema and MCP JSON Schema count Unicode code points.
        if input.query.chars().count() > 200
            || input.kinds.len() > 8
            || input
                .kinds
                .iter()
                .any(|kind| kind.is_empty() || kind.chars().count() > 200)
            || input
                .cursor
                .as_ref()
                .is_some_and(|cursor| cursor.is_empty() || cursor.chars().count() > 512)
            || !(1.0..=50.0).contains(&input.limit)
            || input.limit.fract() != 0.0
        {
            return Err(Failure::Invalid);
        }
        if input
            .kinds
            .iter()
            .any(|kind| !KINDS.iter().any(|(name, _)| *name == kind))
        {
            return Err(Failure::Unavailable);
        }
        input.kinds.sort_unstable();
        input.kinds.dedup();
        Ok(input)
    }
}

pub(super) struct CatalogueSearch {
    language: Arc<LanguageProvider>,
    order: Mutex<Option<Arc<OrderedDefinitions>>>,
}

#[derive(Clone, Copy)]
struct Locator {
    kind: u8,
    offset: u32,
}

struct OrderedDefinitions {
    source: RuntimeDefinitionCatalogue,
    order: Vec<Locator>,
    version: String,
    _storage: ResidentReservation,
}

impl CatalogueSearch {
    pub(super) fn new(language: Arc<LanguageProvider>) -> Self {
        Self {
            language,
            order: Mutex::new(None),
        }
    }

    fn ordered(
        &self,
        source: RuntimeDefinitionCatalogue,
        budget: &ByteBudget,
        stopped: &CancellationToken,
    ) -> Result<Arc<OrderedDefinitions>, Failure> {
        // The lock is only used by connector work on blocking threads. One
        // reader sorts each installed object. Ordinary world work never waits here.
        let mut cached = self.order.lock().map_err(|_| Failure::Unavailable)?;
        if let Some(ordered) = &*cached {
            if ordered.source.same_installation(&source) {
                return Ok(ordered.clone());
            }
        }
        let count = KINDS
            .iter()
            .map(|&(_, kind)| source.count(kind))
            .sum::<usize>();
        if count > MAX_DEFINITIONS {
            return Err(Failure::Capacity);
        }
        let claimed = |name: &str, id: &str| {
            // Worst-case JSON escapes and the fixed 64-byte version. The
            // encoder Vec may grow up to 2x, and ICU's UTF-16 Vec up to 4x.
            let key = id.len().checked_mul(6)?.checked_add(name.len() + 72)?;
            key.checked_mul(6)?
                .checked_add(size_of::<(String, Vec<u16>, i32, Locator, [u32; 4])>())
        };
        let mut temporary = 128usize;
        for (name, kind) in KINDS {
            for offset in 0..source.count(kind) {
                let id = source.id_at(kind, offset).ok_or(Failure::Unavailable)?;
                temporary = claimed(name, id)
                    .and_then(|bytes| temporary.checked_add(bytes))
                    .ok_or(Failure::Capacity)?;
            }
        }
        let _temporary = budget.reserve(temporary).map_err(|_| Failure::Capacity)?;
        let storage = budget
            .resident()
            .reserve(count * size_of::<Locator>() + size_of::<OrderedDefinitions>() + 96)
            .map_err(|_| Failure::Capacity)?;
        let mut keys = Vec::with_capacity(count);
        let mut positions = Vec::with_capacity(count);
        for (index, (name, kind)) in KINDS.into_iter().enumerate() {
            for offset in 0..source.count(kind) {
                ensure_current(stopped)?;
                let id = source.id_at(kind, offset).ok_or(Failure::Unavailable)?;
                let definition = source.definition(kind, id).ok_or(Failure::Unavailable)?;
                let version = version(&definition, budget)?;
                keys.push(json_record(&(name, id, &version)).map_err(|_| Failure::Unavailable)?);
                positions.push(Locator {
                    kind: index as u8,
                    offset: offset as u32,
                });
            }
        }
        ensure_current(stopped)?;
        let (sorted, _) = self
            .language
            .collate_selected(&keys)
            .map_err(language_failure)?;
        let mut identity = Sha256::new();
        let mut order = Vec::with_capacity(count);
        for index in sorted {
            let index = index as usize;
            identity.update(keys[index].as_bytes());
            order.push(positions[index]);
        }
        let ordered = Arc::new(OrderedDefinitions {
            source,
            order,
            version: hex_bytes(&identity.finalize()),
            _storage: storage,
        });
        *cached = Some(ordered.clone());
        Ok(ordered)
    }

    fn page(
        &self,
        input: Input,
        public: RuntimeDefinitionCatalogue,
        revision: u64,
        snapshot: Snapshot<'_>,
        budget: &ByteBudget,
        stopped: &CancellationToken,
    ) -> Result<PreparedReply, Failure> {
        let ordered = self.ordered(public, budget, stopped)?;
        let (query, _query) = self
            .language
            .lowercase_text(input.query.as_str().into(), budget)
            .map_err(language_failure)?;
        let source = fingerprint(&(
            snapshot.world_id,
            snapshot.generation,
            revision,
            &ordered.version,
        ))?;
        let binding = fingerprint(&(&source, &query, &input.kinds))?;
        let mut offset = page_offset(input.cursor.as_deref(), &binding, ordered.order.len())?;
        let end = ordered.order.len().min(offset + EXAMINED);
        let limit = input.limit as usize;
        let mut page_bytes = (limit * (size_of::<FoundNode>() + 64)) + 640;
        let mut memory = budget.reserve(page_bytes).map_err(|_| Failure::Capacity)?;
        let mut nodes = Vec::with_capacity(limit);
        while offset < end && nodes.len() < limit {
            ensure_current(stopped)?;
            let locator = ordered.order[offset];
            offset += 1;
            let (name, kind) = KINDS[locator.kind as usize];
            if !input.kinds.is_empty() && !input.kinds.iter().any(|selected| selected == name) {
                continue;
            }
            let id = ordered
                .source
                .id_at(kind, locator.offset as usize)
                .ok_or(Failure::Unavailable)?;
            let definition = ordered
                .source
                .definition(kind, id)
                .ok_or(Failure::Unavailable)?;
            with_label(&definition, budget, |label| {
                if !query.is_empty()
                    && !self.contains(label, &query, budget)?
                    && !self.contains(id.into(), &query, budget)?
                {
                    return Ok(());
                }
                page_bytes = page_bytes
                    .checked_add(label.storage_bytes())
                    .ok_or(Failure::Capacity)?;
                memory.resize(page_bytes).map_err(|_| Failure::Capacity)?;
                nodes.push(FoundNode {
                    reference: FoundRef {
                        kind: name,
                        id,
                        version: version(&definition, budget)?,
                    },
                    label: label.to_owned(),
                    layer: "definition",
                    can_inspect: true,
                });
                Ok(())
            })?;
        }
        let next_cursor = (offset < ordered.order.len()).then(|| format!("{binding}.{offset}"));
        result(
            snapshot,
            FoundPage {
                nodes,
                snapshot: source,
                next_cursor,
                coverage: "Current projected definitions; lexical matching only.",
            },
            budget,
        )
    }

    fn contains(
        &self,
        text: TextRef<'_>,
        query: &[u16],
        budget: &ByteBudget,
    ) -> Result<bool, Failure> {
        let (lower, _lower) = self
            .language
            .lowercase_text(text, budget)
            .map_err(language_failure)?;
        Ok(lower.windows(query.len()).any(|part| part == query))
    }
}

pub(super) async fn search(
    owner: Arc<CatalogueSearch>,
    world: &Arc<HostedWorld>,
    access: Arc<Access>,
    timeline: Arc<str>,
    input: Input,
    budget: ByteBudget,
    lease: Arc<RequestLease>,
    stopped: CancellationToken,
) -> Result<PreparedReply, Failure> {
    let accepted = access.clone();
    let (sequence, sim_time, revision, catalogue) = world
        .capture(move |world| {
            world.capture_definition_catalogue(|progress, revision, catalogue| {
                if !accepted.current() || accepted.config.world_id != progress.world_id {
                    return Err(Failure::Expired);
                }
                Ok((progress.sequence, progress.at, revision, catalogue))
            })
        })
        .await
        .map_err(|_| Failure::Unavailable)??;
    // Keep request custody until detached work ends even if the HTTP caller
    // disconnects. The caller still checks the world grant before delivery.
    tokio::task::spawn_blocking(move || {
        let _lease = lease;
        ensure_current(&stopped)?;
        if !access.current() {
            return Err(Failure::Expired);
        }
        owner.page(
            input,
            catalogue,
            revision,
            Snapshot {
                world_id: &access.config.world_id,
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

fn ensure_current(stopped: &CancellationToken) -> Result<(), Failure> {
    if stopped.is_cancelled() {
        Err(Failure::Expired)
    } else {
        Ok(())
    }
}

fn language_failure(error: LanguageError) -> Failure {
    if matches!(error, LanguageError::Capacity) {
        Failure::Capacity
    } else {
        Failure::Unavailable
    }
}

fn fingerprint(value: &impl Serialize) -> Result<String, Failure> {
    let mut sink = DigestSink(Sha256::new());
    write_json_record(value, &mut sink).map_err(|_| Failure::Unavailable)?;
    Ok(hex_bytes(&sink.0.finalize()))
}

struct DigestSink(Sha256);

impl io::Write for DigestSink {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.update(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn version(
    definition: &RuntimeDefinitionInspection<'_>,
    budget: &ByteBudget,
) -> Result<String, Failure> {
    match definition {
        RuntimeDefinitionInspection::Complete { payload, .. } => Ok(sha256_hex(payload.as_bytes())),
        RuntimeDefinitionInspection::Recipe(source) => {
            with_projection(source, Projection::Recipe, budget, |_, fields| {
                fingerprint(fields)
            })
        }
        RuntimeDefinitionInspection::ItemHandling { payload, pin } => with_projection(
            payload,
            Projection::ItemHandling(pin),
            budget,
            |_, fields| fingerprint(fields),
        ),
    }
}

fn with_label<T>(
    definition: &RuntimeDefinitionInspection<'_>,
    budget: &ByteBudget,
    use_label: impl FnOnce(TextRef<'_>) -> Result<T, Failure>,
) -> Result<T, Failure> {
    match definition {
        RuntimeDefinitionInspection::Complete { name, .. } => use_label(*name),
        RuntimeDefinitionInspection::ItemHandling { .. } => use_label(ITEM_HANDLING_LABEL.into()),
        RuntimeDefinitionInspection::Recipe(source) => {
            #[derive(Deserialize)]
            struct RecipeName<'a> {
                #[serde(borrow)]
                name: &'a RawValue,
            }
            let recipe: RecipeName<'_> =
                serde_json::from_str(source).map_err(|_| Failure::Unavailable)?;
            let text = recipe.name.get();
            let _label = budget
                .reserve(text.len().checked_mul(4).ok_or(Failure::Capacity)?)
                .map_err(|_| Failure::Capacity)?;
            let label: JsText = serde_json::from_str(text).map_err(|_| Failure::Unavailable)?;
            use_label((&label).into())
        }
    }
}

fn page_offset(cursor: Option<&str>, binding: &str, total: usize) -> Result<usize, Failure> {
    let Some(cursor) = cursor else {
        return Ok(0);
    };
    let (previous, offset) = cursor.split_once('.').ok_or(Failure::Invalid)?;
    let offset: usize = offset.parse().map_err(|_| Failure::Invalid)?;
    if previous.len() != 64 || !previous.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(Failure::Invalid);
    }
    if previous != binding {
        return Err(Failure::ListingChanged);
    }
    if offset > total {
        return Err(Failure::Invalid);
    }
    Ok(offset)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FoundPage<'a> {
    nodes: Vec<FoundNode<'a>>,
    snapshot: String,
    next_cursor: Option<String>,
    coverage: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FoundNode<'a> {
    #[serde(rename = "ref")]
    reference: FoundRef<'a>,
    label: JsText,
    layer: &'static str,
    can_inspect: bool,
}

#[derive(Serialize)]
struct FoundRef<'a> {
    kind: &'a str,
    id: &'a str,
    version: String,
}
