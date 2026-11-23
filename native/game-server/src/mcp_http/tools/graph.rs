//! Project only established links from the selected installed definition.
//! See docs/invention-graph.md#graph-reader-implementation and Source's
//! world-graph.ts. Ordinary play never prepares or retains this page.

use super::{
    Definition, DefinitionRef, Failure, InspectInput, KINDS, Node, PreparedReply, Recipient,
    Snapshot, find, present, raw, result, valid, with_public_definition,
};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{json_tree_allocation_bound, sha256_hex},
    host::{ByteBudget, ByteReservation},
    runtime::{
        RuntimeDefinitionCatalogue, RuntimeDefinitionKind, RuntimeLiveEntity,
        RuntimeLiveInspection, RuntimeLiveSupport,
    },
    text::{JsText, TextRef},
    values::DefinitionPin,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, value::RawValue};
use std::{borrow::Cow, collections::HashSet, mem::size_of};
use tokio_util::sync::CancellationToken;

const DEFAULT_PAGE: usize = 40;
const MAX_PAGE: usize = 100;
const MAX_LINKS: usize = 1024;
const LIMITATIONS: &[&str] = &[
    "Direct outgoing recipe inputs, outputs, installed dependencies and recorded bases only.",
    "A family with no retained inspection body and a historical base are reference-only.",
    "This page does not evaluate impact, live relationships or interaction validity.",
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RootReference {
    kind: String,
    id: String,
    version: String,
}

#[derive(Default, Deserialize)]
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
        if !valid(&input.root.kind, 1, 200)
            || !valid(&input.root.id, 1, 500)
            || !valid(&input.root.version, 1, 100)
            || input
                .cursor
                .as_ref()
                .is_some_and(|cursor| !valid(cursor, 1, 512))
            || !(1.0..=MAX_PAGE as f64).contains(&input.limit)
            || input.limit.fract() != 0.0
            || input.relations.len() > RELATIONS.len()
            || input
                .relations
                .iter()
                .any(|relation| !RELATIONS.contains(&relation.as_str()))
        {
            return Err(Failure::Invalid);
        }
        if !matches!(input.direction, Direction::Out) || !supported(&input.root.kind) {
            return Err(Failure::Unavailable);
        }
        input.relations.sort_unstable();
        input.relations.dedup();
        Ok(input)
    }
}

// Public protocol vocabulary. Only actual outgoing relations are emitted.
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

pub(super) fn supported(kind: &str) -> bool {
    matches!(kind, "recipe" | "item-definition" | "item-handling-policy")
}

pub(super) enum Request {
    Inspect(InspectInput),
    Page(Input),
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
        let (kind, id, expected, relations, cursor, limit) = match &self {
            Self::Inspect(input) => (
                input.kind.as_str(),
                input.id.as_str(),
                input.version.as_deref(),
                &[][..],
                None,
                DEFAULT_PAGE,
            ),
            Self::Page(input) => (
                input.root.kind.as_str(),
                input.root.id.as_str(),
                Some(input.root.version.as_str()),
                input.relations.as_slice(),
                input.cursor.as_deref(),
                input.limit as usize,
            ),
        };
        let (kind_name, definition_kind) = KINDS
            .iter()
            .copied()
            .find(|(name, _)| *name == kind)
            .ok_or(Failure::Unavailable)?;
        let definition = catalogue
            .definition(definition_kind, id)
            .ok_or(Failure::Unavailable)?;
        let source = if matches!(definition_kind, RuntimeDefinitionKind::Recipe) {
            let openlegend_simulation::runtime::RuntimeDefinitionInspection::Recipe(source) =
                &definition
            else {
                return Err(Failure::Unavailable);
            };
            Some(*source)
        } else {
            None
        };
        with_public_definition(definition, budget, |name, payload| {
            let version = sha256_hex(payload.as_bytes());
            if expected.is_some_and(|expected| expected != version) {
                return Err(Failure::Stale);
            }
            let account = match recipient {
                Recipient::Signed(account) => account,
                Recipient::Connector => return Err(Failure::Forbidden),
            };
            let _workspace = if let Some(source) = source {
                let bound = json_tree_allocation_bound(source).ok_or(Failure::Capacity)?;
                Some(budget.reserve(bound).map_err(|_| Failure::Capacity)?)
            } else {
                None
            };
            let recipe: Option<Recipe<'_>> = source
                .map(serde_json::from_str)
                .transpose()
                .map_err(|_| Failure::Unavailable)?;
            let mut links = Links::new(catalogue, budget, kind_name, id, &version, name)?;
            if let Some(recipe) = &recipe {
                links.recipe(recipe, stopped)?;
            }
            let page = links.page(&snapshot, account, relations, cursor, limit)?;
            match &self {
                Self::Inspect(_) => {
                    let reference = DefinitionRef {
                        kind: kind_name,
                        id,
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
                        },
                        budget,
                        recipient,
                    )
                }
                Self::Page(_) => result(snapshot, page, budget, recipient),
            }
        })
    }
}

const LIVE_LIMITATIONS: &[&str] = &[
    "Current support and installed attribute and sense bindings only.",
    "Action and equipped object relationships continue in the separate live arrangement read.",
    "This page does not evaluate impact or interaction validity.",
];

pub(super) fn live_entity(
    input: &InspectInput,
    read: RuntimeLiveInspection<'_>,
    timeline: &str,
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
    let Recipient::Signed(account) = recipient else {
        return Err(Failure::Forbidden);
    };
    let snapshot = Snapshot {
        world_id: read.progress.world_id,
        generation: timeline,
        sequence: read.progress.sequence,
        sim_time: read.progress.at,
    };
    let mut links = Links::new(
        &read.definitions,
        budget,
        "entity",
        entity.id,
        &version,
        entity.name.into(),
    )?;
    let count = entity
        .attribute_ids
        .len()
        .checked_add(entity.sense_ids.len())
        .and_then(|count| count.checked_add(1))
        .filter(|count| *count <= MAX_LINKS)
        .ok_or(Failure::Capacity)?;
    links.claim(count * (4 * size_of::<Link>() + 256))?;
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
    links.finish();
    let page = links.page(&snapshot, account, &[], None, DEFAULT_PAGE)?;
    result(
        snapshot,
        LiveInspection {
            node: &links.nodes[0],
            reference: &links.nodes[0].reference,
            data: entity,
            relationships: LivePage {
                page,
                subject: LiveSubject {
                    kind: "entity",
                    id: entity.id,
                },
            },
        },
        budget,
        recipient,
    )
}

#[derive(Serialize)]
struct LiveInspection<'a> {
    node: &'a LinkedNode<'a>,
    #[serde(rename = "ref")]
    reference: &'a Reference<'a>,
    data: &'a RuntimeLiveEntity<'a>,
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
    kind: &'static str,
    id: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Recipe<'a> {
    #[serde(borrow)]
    inputs: Vec<InputMaterial<'a>>,
    #[serde(borrow)]
    outputs: Vec<OutputMaterial<'a>>,
    #[serde(borrow, rename = "dependencyReferences")]
    dependencies: Vec<Dependency<'a>>,
    source: RecipeSource,
    #[serde(borrow)]
    provenance: Provenance<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InputMaterial<'a> {
    definition_id: &'a str,
    role: &'a str,
    quantity: u64,
}

#[derive(Deserialize)]
struct OutputMaterial<'a> {
    #[serde(borrow)]
    definition: Id<'a>,
    port: &'a str,
    quantity: u64,
}

#[derive(Deserialize)]
struct Id<'a> {
    id: &'a str,
}

#[derive(Deserialize)]
struct Dependency<'a> {
    kind: &'a str,
    #[serde(borrow)]
    pin: Id<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecipeSource {
    family_pin: Option<DefinitionPin>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Provenance<'a> {
    source: &'a str,
    #[serde(borrow)]
    derived_from: Option<Base<'a>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Base<'a> {
    recipe_id: &'a str,
    version: u64,
    #[serde(borrow)]
    digest: &'a RawValue,
}

#[derive(Deserialize)]
struct SavedBase<'a> {
    version: u64,
    #[serde(borrow)]
    digest: &'a RawValue,
}

#[derive(Serialize)]
struct Inspected<'a> {
    #[serde(flatten)]
    definition: Definition<'a>,
    relationships: Page<'a>,
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
    edges: Vec<Link<'a>>,
    memory: ByteReservation,
}

impl<'a> Links<'a> {
    fn new(
        catalogue: &'a RuntimeDefinitionCatalogue,
        budget: &'a ByteBudget,
        kind: &'static str,
        id: &'a str,
        version: &'a str,
        label: TextRef<'_>,
    ) -> Result<Self, Failure> {
        let memory = budget.reserve(2048).map_err(|_| Failure::Capacity)?;
        let mut result = Self {
            catalogue,
            budget,
            memory,
            nodes: Vec::new(),
            places: IndexMap::new(),
            edges: Vec::new(),
        };
        result.add_node(
            kind,
            id,
            Version::Exact(Cow::Borrowed(version)),
            label,
            true,
        )?;
        Ok(result)
    }

    fn recipe(
        &mut self,
        recipe: &'a Recipe<'a>,
        stopped: &CancellationToken,
    ) -> Result<(), Failure> {
        let count = recipe
            .inputs
            .len()
            .checked_add(recipe.outputs.len())
            .and_then(|count| count.checked_add(recipe.dependencies.len()))
            .and_then(|count| count.checked_add(2))
            .filter(|count| *count <= MAX_LINKS)
            .ok_or(Failure::Capacity)?;
        self.claim(count * (4 * size_of::<Link>() + 256))?;
        let inputs: HashSet<_> = recipe
            .inputs
            .iter()
            .map(|input| input.definition_id)
            .collect();
        for input in &recipe.inputs {
            find::ensure_current(stopped)?;
            let node = self.current("item-definition", input.definition_id)?;
            self.link(node, "requires", Some(input.role), Some(input.quantity))?;
        }
        for output in &recipe.outputs {
            find::ensure_current(stopped)?;
            let node = self.current("item-definition", output.definition.id)?;
            self.link(node, "produces", Some(output.port), Some(output.quantity))?;
        }
        for dependency in &recipe.dependencies {
            find::ensure_current(stopped)?;
            if dependency.kind == "item-definition" && inputs.contains(dependency.pin.id) {
                continue;
            }
            let node = self.current(dependency.kind, dependency.pin.id)?;
            self.link(node, "uses", Some("family-dependency"), None)?;
        }
        if let Some(pin) = &recipe.source.family_pin {
            let catalogue = self.catalogue;
            let admitted = catalogue
                .recipe_family_pin(&pin.id)
                .filter(|current| *current == pin)
                .ok_or(Failure::Unavailable)?;
            let node = self.add_node(
                "family",
                &admitted.id,
                Version::Exact(Cow::Borrowed(&admitted.digest)),
                admitted.id.as_str().into(),
                false,
            )?;
            self.link(node, "implements", None, None)?;
        }
        if let Some(base) = recipe
            .provenance
            .derived_from
            .as_ref()
            .filter(|_| recipe.provenance.source != "authored-world")
        {
            let installed = match self
                .catalogue
                .definition(RuntimeDefinitionKind::Recipe, base.recipe_id)
            {
                Some(openlegend_simulation::runtime::RuntimeDefinitionInspection::Recipe(
                    payload,
                )) => {
                    let exact: SavedBase<'_> =
                        serde_json::from_str(payload).map_err(|_| Failure::Unavailable)?;
                    exact.version == base.version && exact.digest.get() == base.digest.get()
                }
                _ => false,
            };
            let node = if installed {
                self.current("recipe", base.recipe_id)?
            } else {
                // Only the recorded base binding is public. Do not expose
                // the rest of the provenance or the old record body.
                if !base.digest.get().starts_with('"') {
                    return Err(Failure::Unavailable);
                }
                self.add_node(
                    "recipe-base",
                    base.recipe_id,
                    Version::Recorded(base.digest),
                    "Historical recipe base".into(),
                    false,
                )?
            };
            self.link(node, "derives_from", None, None)?;
        }
        self.finish();
        Ok(())
    }

    fn finish(&mut self) {
        self.edges
            .sort_unstable_by(|left, right| left.id.cmp(&right.id));
        self.edges.dedup_by(|left, right| left.id == right.id);
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
        if let Some(index) = self.places.get(&(kind, id)) {
            return Ok(*index);
        }
        self.claim(
            4 * (size_of::<LinkedNode>() + size_of::<((&str, &str), usize)>())
                + 2 * label.storage_bytes(),
        )?;
        let index = self.nodes.len();
        self.nodes.push(LinkedNode {
            reference: Reference { kind, id, version },
            label: label.to_owned(),
            layer: if matches!(kind, "entity" | "surface" | "support") {
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
        self.places.insert((kind, id), index);
        Ok(index)
    }

    fn link(
        &mut self,
        target: usize,
        relation: &'static str,
        role: Option<&'a str>,
        quantity: Option<u64>,
    ) -> Result<(), Failure> {
        let mut link = Link {
            id: String::new(),
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
        let source = &self.nodes[0].reference;
        Fact {
            source,
            target: &self.nodes[link.target].reference,
            relation: link.relation,
            assertion: if self.nodes[0].layer == "live" {
                "observed"
            } else {
                "compiler-derived"
            },
            source_record: source,
            role: link.role,
            quantity: link.quantity,
        }
    }

    fn page(
        &self,
        snapshot: &Snapshot<'_>,
        account: &str,
        relations: &[String],
        cursor: Option<&str>,
        limit: usize,
    ) -> Result<Page<'_>, Failure> {
        let topology = find::fingerprint(&(
            snapshot.world_id,
            snapshot.generation,
            "outgoing-definition",
            &self.nodes,
            self.edges
                .iter()
                .map(|edge| edge.id.as_str())
                .collect::<Vec<_>>(),
        ))?;
        let binding = find::fingerprint(&(&topology, account, relations))?;
        let mut offset = find::page_offset(cursor, &binding, self.edges.len())?;
        let storage = self
            .budget
            .reserve((limit + 1) * (4 * size_of::<Edge>() + 64))
            .map_err(|_| Failure::Capacity)?;
        let mut nodes = IndexMap::new();
        nodes.insert(0, &self.nodes[0]);
        let mut edges = Vec::with_capacity(limit);
        while offset < self.edges.len() && edges.len() < limit {
            let link = &self.edges[offset];
            offset += 1;
            if !relations.is_empty() && !relations.iter().any(|relation| relation == link.relation)
            {
                continue;
            }
            nodes.insert(link.target, &self.nodes[link.target]);
            edges.push(Edge {
                id: &link.id,
                fact: self.fact(link),
            });
        }
        let more = offset < self.edges.len();
        if more && self.nodes[0].layer == "live" {
            return Err(Failure::Capacity);
        }
        Ok(Page {
            snapshot: topology,
            nodes: nodes.into_values().collect(),
            edges,
            coverage: Coverage {
                scope: "projected-neighborhood",
                status: if more { "page" } else { "complete" },
                impact: "not-evaluated",
                limitations: if self.nodes[0].layer == "live" {
                    LIVE_LIMITATIONS
                } else {
                    LIMITATIONS
                },
            },
            next_cursor: more.then(|| format!("{binding}.{offset}")),
            _storage: storage,
        })
    }
}
