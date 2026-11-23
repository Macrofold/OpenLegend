//! Project only established links from the selected installed definition.
//! See docs/invention-graph.md#graph-reader-implementation and Source's
//! world-graph.ts. Ordinary play never prepares or retains this page.

use super::{
    Definition, DefinitionRef, Failure, InspectInput, KINDS, Node, PreparedReply, Recipient,
    Snapshot, find, present, raw, result, valid, with_public_definition,
};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    runtime::{
        RuntimeDefinitionCatalogue, RuntimeDefinitionInspection, RuntimeDefinitionKind,
        RuntimeLiveInspection, RuntimeLiveItemInspection, RuntimeLiveSupport,
    },
    text::{JsText, TextRef},
};
use serde::{Deserialize, Serialize, Serializer, ser::SerializeSeq};
use serde_json::{Map, Value, value::RawValue};
use std::{borrow::Cow, mem::size_of};
use tokio_util::sync::CancellationToken;

mod index;
mod recipes;
mod trace;
pub(super) use trace::Input as TraceInput;

const DEFAULT_PAGE: usize = 40;
const MAX_PAGE: usize = 100;
const MAX_LINKS: usize = 1024;
const MAX_EXAMINED: usize = 1024;
const MAX_DEFINITIONS: usize = 50_000;
const MAX_RECIPE_CANDIDATES: usize = 200_000;
const LIMITATIONS: &[&str] = &[
    "This neighborhood covers installed recipe inputs, outputs, compiled dependencies and exact bases.",
    "Recipe families, compiled assembly dependencies and historical bases without inspection bodies are reference-only.",
    "Host, body, status, cognition, assembly internals and other unavailable relationships are outside this projection.",
    "Impact, live relationships and interaction validity require separate reads.",
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RootReference {
    kind: String,
    id: String,
    version: String,
}

impl RootReference {
    fn validate(&self) -> Result<(), Failure> {
        if !valid(&self.kind, 1, 200) || !valid(&self.id, 1, 500) || !valid(&self.version, 1, 100) {
            return Err(Failure::Invalid);
        }
        if !supported(&self.kind)
            && !matches!(
                self.kind.as_str(),
                "family" | "recipe-base" | "assembly-family"
            )
        {
            return Err(Failure::Unavailable);
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum Direction {
    Out,
    In,
    #[default]
    Both,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Input {
    root: RootReference,
    #[serde(default)]
    direction: Direction,
    #[serde(default)]
    relations: Vec<String>,
    #[serde(default, deserialize_with = "present")]
    cursor: Option<String>,
    #[serde(default = "default_page")]
    limit: f64,
}

fn default_page() -> f64 {
    DEFAULT_PAGE as f64
}

impl Input {
    pub(super) fn parse(arguments: Map<String, Value>) -> Result<Self, Failure> {
        let mut input: Self =
            serde_json::from_value(Value::Object(arguments)).map_err(|_| Failure::Invalid)?;
        input.root.validate()?;
        if input
            .cursor
            .as_ref()
            .is_some_and(|cursor| !valid(cursor, 1, 512))
            || !(1.0..=MAX_PAGE as f64).contains(&input.limit)
            || input.limit.fract() != 0.0
        {
            return Err(Failure::Invalid);
        }
        validate_relations(&mut input.relations)?;
        Ok(input)
    }
}

// Public protocol vocabulary. Each emitted relationship retains its original direction.
const RELATIONS: &[&str] = &[
    "requires",
    "produces",
    "derives_from",
    "implements",
    "defined_by",
    "instance_of",
    "inventory_owner",
    "supported_by",
    "uses",
    "operated_by",
    "has_participant",
    "contributes_to",
    "observes",
    "governed_by",
    "represented_by",
    "held_by",
    "evidenced_by",
    "reads",
];

fn validate_relations(relations: &mut Vec<String>) -> Result<(), Failure> {
    if relations.len() > RELATIONS.len()
        || relations
            .iter()
            .any(|relation| !RELATIONS.contains(&relation.as_str()))
    {
        return Err(Failure::Invalid);
    }
    relations.sort_unstable();
    relations.dedup();
    Ok(())
}

pub(super) fn supported(kind: &str) -> bool {
    matches!(kind, "recipe" | "item-definition" | "item-handling-policy")
}

pub(super) enum Request {
    Inspect(InspectInput),
    Page(Input),
    Trace(TraceInput),
}

impl Request {
    pub(super) fn read(
        self,
        catalogue: &RuntimeDefinitionCatalogue,
        snapshot: Snapshot<'_>,
        budget: &ByteBudget,
        recipient: &Recipient,
        stopped: &CancellationToken,
    ) -> Result<PreparedReply, Failure> {
        let Recipient::Signed(account) = recipient else {
            return Err(Failure::Forbidden);
        };
        let scope = index::Scope {
            world: snapshot.world_id,
            timeline: snapshot.generation,
            account,
        };
        if let Self::Inspect(input) = &self {
            return inspect_definition(
                input, catalogue, snapshot, budget, recipient, scope, stopped,
            );
        }
        let (root, target) = match &self {
            Self::Page(input) => (&input.root, None),
            Self::Trace(input) => (&input.root, input.target.as_ref()),
            Self::Inspect(_) => unreachable!(),
        };
        let local = matches!(&self, Self::Page(page) if matches!(page.direction, Direction::Out))
            && supported(&root.kind);
        let mut links = Links::empty(
            catalogue,
            budget,
            if local {
                MAX_LINKS
            } else {
                MAX_RECIPE_CANDIDATES
            },
        )?;
        if supported(&root.kind) {
            links.current(&root.kind, &root.id)?;
        }
        if let Some(target) = target.filter(|target| supported(&target.kind)) {
            links.current(&target.kind, &target.id)?;
        }
        if local {
            if root.kind == "recipe" {
                let index = links.resolve(root)?;
                links.recipe(index, recipe_source(catalogue, &root.id)?, stopped)?;
            }
        } else {
            links.definitions(stopped)?;
        }
        let selected_root = links.resolve(root)?;
        let selected_target = target.map(|target| links.resolve(target)).transpose()?;
        let graph = index::Projection::new(links)?;
        match &self {
            Self::Page(input) => {
                let page = graph
                    .neighborhood(selected_root, input.direction, &input.relations)
                    .page(scope, input.cursor.as_deref(), input.limit as usize)?;
                result(snapshot, page, budget, recipient)
            }
            Self::Trace(input) => input.read(
                &graph,
                selected_root,
                selected_target,
                snapshot,
                scope,
                budget,
                recipient,
                stopped,
            ),
            Self::Inspect(_) => unreachable!(),
        }
    }
}

fn inspect_definition(
    input: &InspectInput,
    catalogue: &RuntimeDefinitionCatalogue,
    snapshot: Snapshot<'_>,
    budget: &ByteBudget,
    recipient: &Recipient,
    scope: index::Scope<'_>,
    stopped: &CancellationToken,
) -> Result<PreparedReply, Failure> {
    let (kind, definition_kind) = KINDS
        .iter()
        .copied()
        .find(|(name, _)| *name == input.kind)
        .ok_or(Failure::Unavailable)?;
    let definition = catalogue
        .definition(definition_kind, &input.id)
        .ok_or(Failure::Unavailable)?;
    let source = match &definition {
        RuntimeDefinitionInspection::Recipe(source) => Some(*source),
        _ => None,
    };
    with_public_definition(definition, budget, |name, payload| {
        let version = sha256_hex(payload.as_bytes());
        if input
            .version
            .as_deref()
            .is_some_and(|expected| expected != version)
        {
            return Err(Failure::Stale);
        }
        let mut links = Links::new(catalogue, budget, kind, &input.id, &version, name)?;
        if let Some(source) = source {
            links.recipe(0, source, stopped)?;
        }
        let graph = index::Projection::new(links)?;
        let page = graph
            .neighborhood(0, Direction::Out, &[])
            .page(scope, None, DEFAULT_PAGE)?;
        let reference = DefinitionRef {
            kind,
            id: &input.id,
            version: &version,
        };
        let definition = Definition {
            node: Node {
                reference: &reference,
                label: name,
                layer: "definition",
                can_inspect: true,
            },
            reference: &reference,
            data: raw(payload)?,
        };
        result(
            snapshot,
            Inspected {
                definition,
                relationships: page,
                browse_relationships: supported(kind),
            },
            budget,
            recipient,
        )
    })
}

fn recipe_source<'a>(
    catalogue: &'a RuntimeDefinitionCatalogue,
    id: &str,
) -> Result<&'a str, Failure> {
    match catalogue.definition(RuntimeDefinitionKind::Recipe, id) {
        Some(RuntimeDefinitionInspection::Recipe(source)) => Ok(source),
        _ => Err(Failure::Unavailable),
    }
}

const LIVE_LIMITATIONS: &[&str] = &[
    "Current support and installed attribute and sense bindings only.",
    "Action and equipped object relationships continue in the separate live arrangement read.",
    "This page does not evaluate impact or interaction validity.",
];

const ITEM_LIMITATIONS: &[&str] = &[
    "Current item definition and immediate inventory owner only.",
    "The link reports custody in this view and does not establish title.",
];

pub(super) fn live_entity(
    input: &InspectInput,
    read: RuntimeLiveInspection<'_>,
    snapshot: Snapshot<'_>,
    budget: &ByteBudget,
    recipient: &Recipient,
) -> Result<PreparedReply, Failure> {
    let entity = &read.entity;
    let version = find::fingerprint(entity)?;
    if input
        .version
        .as_deref()
        .is_some_and(|expected| expected != version)
    {
        return Err(Failure::Stale);
    }
    let Recipient::Signed(_) = recipient else {
        return Err(Failure::Forbidden);
    };
    let mut links = Links::new(
        &read.definitions,
        budget,
        "entity",
        entity.id,
        &version,
        entity.name.into(),
    )?;
    match read.support {
        Some(RuntimeLiveSupport::Surface(surface)) => {
            let reference = Version::Exact(Cow::Owned(find::fingerprint(surface)?));
            let target = links.add_node(
                "surface",
                &surface.id,
                reference,
                surface.name.as_str().into(),
                false,
            )?;
            links.link(target, "supported_by", None, None)?;
        }
        Some(RuntimeLiveSupport::Terrain(revision)) => {
            #[derive(Serialize)]
            struct Terrain {
                revision: u64,
                provider: &'static str,
            }
            let reference = Version::Exact(Cow::Owned(find::fingerprint(&Terrain {
                revision,
                provider: "native-terrain",
            })?));
            let target = links.add_node(
                "support",
                "terrain",
                reference,
                "Native terrain".into(),
                false,
            )?;
            links.link(target, "supported_by", None, None)?;
        }
        None => (),
    };
    for (kind, id, role) in entity
        .attribute_ids
        .iter()
        .map(|id| ("attribute", *id, "attribute-binding"))
        .chain(
            entity
                .sense_ids
                .iter()
                .map(|id| ("sense", id.as_str(), "sense-binding")),
        )
    {
        let target = links.current(kind, id)?;
        links.link(target, "uses", Some(role), None)?;
    }
    live_reply(links, entity, snapshot, recipient)
}

pub(super) fn live_item(
    input: &InspectInput,
    read: RuntimeLiveItemInspection<'_>,
    snapshot: Snapshot<'_>,
    budget: &ByteBudget,
    recipient: &Recipient,
) -> Result<PreparedReply, Failure> {
    let Recipient::Signed(_) = recipient else {
        return Err(Failure::Forbidden);
    };
    let item = &read.item;
    let version = find::fingerprint(item)?;
    if input
        .version
        .as_deref()
        .is_some_and(|expected| expected != version)
    {
        return Err(Failure::Stale);
    }
    let owner = read.owner.facts().map_err(super::live::runtime_failure)?;
    let mut links = Links::new(
        &read.definitions,
        budget,
        "item",
        item.id,
        &version,
        read.name.into(),
    )?;
    let definition = links.current("item-definition", item.definition_id)?;
    links.link(definition, "instance_of", None, None)?;
    let holder = links.add_node(
        "entity",
        owner.id,
        Version::Exact(Cow::Owned(find::fingerprint(&owner)?)),
        owner.name.into(),
        true,
    )?;
    links.link(holder, "inventory_owner", None, None)?;
    live_reply(links, item, snapshot, recipient)
}

fn live_reply<T: Serialize>(
    links: Links<'_>,
    data: &T,
    snapshot: Snapshot<'_>,
    recipient: &Recipient,
) -> Result<PreparedReply, Failure> {
    let Recipient::Signed(account) = recipient else {
        return Err(Failure::Forbidden);
    };
    let graph = index::Projection::new(links)?;
    let root = &graph.links.nodes[0];
    let page = graph.neighborhood(0, Direction::Out, &[]).page(
        index::Scope {
            world: snapshot.world_id,
            timeline: snapshot.generation,
            account,
        },
        None,
        DEFAULT_PAGE,
    )?;
    result(
        snapshot,
        LiveInspection {
            node: root,
            reference: &root.reference,
            data,
            relationships: LivePage {
                page,
                subject: LiveSubject {
                    kind: root.reference.kind,
                    id: root.reference.id,
                },
            },
        },
        graph.links.budget,
        recipient,
    )
}

#[derive(Serialize)]
struct LiveInspection<'a, T> {
    node: &'a LinkedNode<'a>,
    #[serde(rename = "ref")]
    reference: &'a Reference<'a>,
    data: &'a T,
    relationships: LivePage<'a>,
}

#[derive(Serialize)]
struct LivePage<'a> {
    #[serde(flatten)]
    page: Page<'a>,
    subject: LiveSubject<'a>,
}

#[derive(Serialize)]
struct LiveSubject<'a> {
    kind: &'a str,
    id: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Inspected<'a> {
    #[serde(flatten)]
    definition: Definition<'a>,
    relationships: Page<'a>,
    // A readable source need not have an indexed neighborhood or a trace.
    browse_relationships: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<'a> {
    snapshot: String,
    nodes: Vec<&'a LinkedNode<'a>>,
    edges: Vec<Edge<'a>>,
    coverage: Coverage,
    next_cursor: Option<String>,
    #[serde(skip)]
    _storage: ByteReservation,
}

#[derive(Serialize)]
struct Coverage {
    scope: &'static str,
    status: &'static str,
    impact: &'static str,
    limitations: &'static [&'static str],
}

#[derive(Serialize)]
struct Reference<'a> {
    kind: &'a str,
    id: &'a str,
    version: Version<'a>,
}

#[derive(Serialize)]
#[serde(untagged)]
enum Version<'a> {
    Exact(Cow<'a, str>),
    Pinned(&'a str),
    Recorded(&'a RawValue),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LinkedNode<'a> {
    #[serde(rename = "ref")]
    reference: Reference<'a>,
    label: JsText,
    layer: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    can_inspect: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    availability: Option<&'static str>,
}

#[derive(Serialize)]
struct Edge<'a> {
    id: &'a str,
    #[serde(flatten)]
    fact: Fact<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Fact<'a> {
    source: &'a Reference<'a>,
    target: &'a Reference<'a>,
    relation: &'static str,
    assertion: &'static str,
    source_record: &'a Reference<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    role: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quantity: Option<u64>,
}

struct Link<'a> {
    id: String,
    source: usize,
    target: usize,
    relation: &'static str,
    role: Option<&'a str>,
    quantity: Option<u64>,
}

struct Links<'a> {
    catalogue: &'a RuntimeDefinitionCatalogue,
    budget: &'a ByteBudget,
    nodes: Vec<LinkedNode<'a>>,
    places: IndexMap<(&'a str, &'a str), usize>,
    reference_only: IndexMap<(&'a str, &'a str, &'a str), usize>,
    edges: Vec<Link<'a>>,
    link_limit: usize,
    memory: ByteReservation,
}

impl<'a> Links<'a> {
    fn empty(
        catalogue: &'a RuntimeDefinitionCatalogue,
        budget: &'a ByteBudget,
        link_limit: usize,
    ) -> Result<Self, Failure> {
        let memory = budget.reserve(2048).map_err(|_| Failure::Capacity)?;
        Ok(Self {
            catalogue,
            budget,
            nodes: Vec::new(),
            places: IndexMap::new(),
            reference_only: IndexMap::new(),
            edges: Vec::new(),
            link_limit,
            memory,
        })
    }

    fn new(
        catalogue: &'a RuntimeDefinitionCatalogue,
        budget: &'a ByteBudget,
        kind: &'static str,
        id: &'a str,
        version: &'a str,
        label: TextRef<'_>,
    ) -> Result<Self, Failure> {
        let mut result = Self::empty(catalogue, budget, MAX_LINKS)?;
        result.add_node(
            kind,
            id,
            Version::Exact(Cow::Borrowed(version)),
            label,
            true,
        )?;
        Ok(result)
    }

    fn resolve(&self, exact: &RootReference) -> Result<usize, Failure> {
        let id = exact.id.as_str();
        if exact.kind == "recipe-base" {
            let version = json_record(&exact.version).map_err(|_| Failure::Invalid)?;
            return self
                .reference_only
                .get(&(exact.kind.as_str(), id, version.as_str()))
                .copied()
                .ok_or(Failure::Unavailable);
        }
        if exact.kind == "assembly-family" {
            return self
                .reference_only
                .get(&(exact.kind.as_str(), id, exact.version.as_str()))
                .copied()
                .ok_or(Failure::Unavailable);
        }
        let index = *self
            .places
            .get(&(exact.kind.as_str(), id))
            .ok_or(Failure::Unavailable)?;
        let Version::Exact(version) = &self.nodes[index].reference.version else {
            return Err(Failure::Unavailable);
        };
        if version.as_ref() != exact.version {
            return Err(Failure::Stale);
        }
        Ok(index)
    }

    fn recipe(
        &mut self,
        source_index: usize,
        source: &'a str,
        stopped: &CancellationToken,
    ) -> Result<usize, Failure> {
        let catalogue = self.catalogue;
        let budget = self.budget;
        recipes::visit(source, budget, stopped, |edge| {
            let target = match edge.target {
                recipes::Target::Definition(kind, id) => self.current(kind, id)?,
                // The admitted recipe owns this exact declared pin. Show
                // its dependency without inventing an assembly body reader.
                recipes::Target::Dependency("assembly-family", pin) => self.add_node(
                    "assembly-family",
                    pin.id,
                    Version::Pinned(pin.digest),
                    pin.id.into(),
                    false,
                )?,
                recipes::Target::Dependency(kind, pin) => self.current(kind, pin.id)?,
                recipes::Target::Family(pin) => {
                    let admitted = catalogue
                        .recipe_family_pin(pin.id)
                        .filter(|current| {
                            current.version == pin.version && current.digest == pin.digest
                        })
                        .ok_or(Failure::Unavailable)?;
                    self.add_node(
                        "family",
                        &admitted.id,
                        Version::Exact(Cow::Borrowed(&admitted.digest)),
                        admitted.id.as_str().into(),
                        false,
                    )?
                }
                recipes::Target::Base(base) => {
                    let installed =
                        match catalogue.definition(RuntimeDefinitionKind::Recipe, base.recipe_id) {
                            Some(RuntimeDefinitionInspection::Recipe(payload)) => {
                                base.matches(&recipes::exact_base(payload)?)
                            }
                            _ => false,
                        };
                    if installed {
                        self.current("recipe", base.recipe_id)?
                    } else {
                        if !base.digest.get().starts_with('"') {
                            return Err(Failure::Unavailable);
                        }
                        // This is the recorded reference only. Private
                        // provenance and its old body stay with their owner.
                        self.add_node(
                            "recipe-base",
                            base.recipe_id,
                            Version::Recorded(base.digest),
                            "Historical recipe base".into(),
                            false,
                        )?
                    }
                }
            };
            self.link_between(
                source_index,
                target,
                edge.relation,
                edge.role,
                edge.quantity,
            )
        })
    }

    /// Prepare a request-local definition graph. This runs on the existing
    /// off-turn capture and visits every installed recipe at most once.
    fn definitions(&mut self, stopped: &CancellationToken) -> Result<(), Failure> {
        let catalogue = self.catalogue;
        let count = catalogue.count(RuntimeDefinitionKind::Recipe);
        if count > MAX_DEFINITIONS {
            return Err(Failure::Capacity);
        }
        let mut examined = 0;
        for index in 0..count {
            find::ensure_current(stopped)?;
            let source_id = catalogue
                .id_at(RuntimeDefinitionKind::Recipe, index)
                .ok_or(Failure::Unavailable)?;
            let source = self.current("recipe", source_id)?;
            examined += self.recipe(source, recipe_source(catalogue, source_id)?, stopped)?;
            if examined > MAX_RECIPE_CANDIDATES {
                return Err(Failure::Capacity);
            }
        }
        Ok(())
    }

    fn claim(&mut self, bytes: usize) -> Result<(), Failure> {
        let next = self
            .memory
            .bytes()
            .checked_add(bytes)
            .ok_or(Failure::Capacity)?;
        self.memory.resize(next).map_err(|_| Failure::Capacity)
    }

    fn current(&mut self, kind: &'a str, id: &'a str) -> Result<usize, Failure> {
        if let Some(index) = self.places.get(&(kind, id)) {
            return Ok(*index);
        }
        let (_, kind_id) = KINDS
            .iter()
            .copied()
            .find(|(name, _)| *name == kind)
            .ok_or(Failure::Unavailable)?;
        let catalogue = self.catalogue;
        let budget = self.budget;
        let definition = catalogue
            .definition(kind_id, id)
            .ok_or(Failure::Unavailable)?;
        with_public_definition(definition, budget, |name, payload| {
            self.claim(64)?;
            self.add_node(
                kind,
                id,
                Version::Exact(Cow::Owned(sha256_hex(payload.as_bytes()))),
                name,
                true,
            )
        })
    }

    fn add_node(
        &mut self,
        kind: &'a str,
        id: &'a str,
        version: Version<'a>,
        label: TextRef<'_>,
        current: bool,
    ) -> Result<usize, Failure> {
        let reference_only = match &version {
            Version::Recorded(digest) => Some((*digest).get()),
            Version::Pinned(digest) => Some(*digest),
            Version::Exact(_) => None,
        };
        let existing = if let Some(digest) = reference_only {
            self.reference_only.get(&(kind, id, digest))
        } else {
            self.places.get(&(kind, id))
        };
        if let Some(index) = existing {
            return Ok(*index);
        }
        if self.nodes.len() >= MAX_DEFINITIONS {
            return Err(Failure::Capacity);
        }
        self.claim(
            4 * (size_of::<LinkedNode>() + size_of::<((&str, &str), usize)>())
                + 2 * label.storage_bytes(),
        )?;
        let index = self.nodes.len();
        self.nodes.push(LinkedNode {
            reference: Reference { kind, id, version },
            label: label.to_owned(),
            layer: if matches!(kind, "entity" | "item" | "surface" | "support") {
                "live"
            } else {
                "definition"
            },
            can_inspect: if matches!(kind, "surface" | "support") {
                Some(false)
            } else {
                current.then_some(true)
            },
            availability: (!current && !matches!(kind, "surface" | "support"))
                .then_some("reference-only"),
        });
        if let Some(digest) = reference_only {
            self.reference_only.insert((kind, id, digest), index);
        } else {
            self.places.insert((kind, id), index);
        }
        Ok(index)
    }

    fn link(
        &mut self,
        target: usize,
        relation: &'static str,
        role: Option<&'a str>,
        quantity: Option<u64>,
    ) -> Result<(), Failure> {
        self.link_between(0, target, relation, role, quantity)
    }

    fn link_between(
        &mut self,
        source: usize,
        target: usize,
        relation: &'static str,
        role: Option<&'a str>,
        quantity: Option<u64>,
    ) -> Result<(), Failure> {
        if self.edges.len() >= self.link_limit {
            return Err(Failure::Capacity);
        }
        self.claim(4 * size_of::<Link>() + 128)?;
        let mut link = Link {
            id: String::new(),
            source,
            target,
            relation,
            role,
            quantity,
        };
        link.id = find::fingerprint(&self.fact(&link))?;
        self.edges.push(link);
        Ok(())
    }

    fn fact(&self, link: &Link<'a>) -> Fact<'_> {
        let source = &self.nodes[link.source];
        Fact {
            source: &source.reference,
            target: &self.nodes[link.target].reference,
            relation: link.relation,
            assertion: if source.layer == "live" {
                "observed"
            } else {
                "compiler-derived"
            },
            source_record: &source.reference,
            role: link.role,
            quantity: link.quantity,
        }
    }
}

struct LinkIds<'a>(&'a [Link<'a>]);

impl Serialize for LinkIds<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut rows = serializer.serialize_seq(Some(self.0.len()))?;
        for edge in self.0 {
            rows.serialize_element(&edge.id)?;
        }
        rows.end()
    }
}
