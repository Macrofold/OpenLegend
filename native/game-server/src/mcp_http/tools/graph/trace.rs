//! Read-only first-discovery witnesses through the admitted definition graph.
//! See docs/world-agent-inspection-and-edits.md#bounded-relationship-traces.

use super::{
    ByteBudget, Direction, Edge, Failure, LIMITATIONS, LinkedNode, MAX_PAGE, PreparedReply,
    Recipient, Reference, RootReference, Snapshot, find,
    index::{Projection, Scope},
    present, result, validate_relations,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::mem::size_of;
use tokio_util::sync::CancellationToken;

const MAX_DEPTH: usize = 12;
const MAX_NODES: usize = 100;
const MAX_PAGES: usize = 16;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(in crate::mcp_http::tools) struct Input {
    pub(super) root: RootReference,
    #[serde(default, deserialize_with = "present")]
    pub(super) target: Option<RootReference>,
    #[serde(default = "out")]
    direction: Direction,
    #[serde(default)]
    relations: Vec<String>,
    #[serde(default = "default_depth")]
    max_depth: f64,
    #[serde(default = "default_nodes")]
    max_nodes: f64,
}

fn out() -> Direction {
    Direction::Out
}

fn default_depth() -> f64 {
    4.
}

fn default_nodes() -> f64 {
    40.
}

impl Input {
    pub(in crate::mcp_http::tools) fn parse(
        arguments: Map<String, Value>,
    ) -> Result<Self, Failure> {
        let mut input: Self =
            serde_json::from_value(Value::Object(arguments)).map_err(|_| Failure::Invalid)?;
        input.root.validate()?;
        if let Some(target) = &input.target {
            target.validate()?;
        }
        validate_relations(&mut input.relations)?;
        if !(1.0..=MAX_DEPTH as f64).contains(&input.max_depth)
            || input.max_depth.fract() != 0.0
            || !(2.0..=MAX_NODES as f64).contains(&input.max_nodes)
            || input.max_nodes.fract() != 0.0
        {
            return Err(Failure::Invalid);
        }
        Ok(input)
    }

    pub(super) fn read(
        &self,
        graph: &Projection<'_>,
        root: usize,
        target: Option<usize>,
        snapshot: Snapshot<'_>,
        scope: Scope<'_>,
        budget: &ByteBudget,
        recipient: &Recipient,
        stopped: &CancellationToken,
    ) -> Result<PreparedReply, Failure> {
        let max_depth = self.max_depth as usize;
        let max_nodes = self.max_nodes as usize;
        let per_node = 4 * size_of::<(usize, Visit)>()
            + 2 * size_of::<Frontier>()
            + 4 * size_of::<Edge>()
            + 128;
        let _workspace = budget
            .reserve(2048 + max_nodes * per_node)
            .map_err(|_| Failure::Capacity)?;
        let mut visited = IndexMap::with_capacity(max_nodes);
        let mut frontier = Vec::with_capacity(max_nodes);
        let mut examined = 0;
        let mut pages = 0;
        let mut limit = None;
        let mut found = target == Some(root);
        visited.insert(
            root,
            Visit {
                depth: 0,
                witness: None,
            },
        );
        while examined < visited.len() && !found && limit.is_none() {
            find::ensure_current(stopped)?;
            let (&current, &visit) = visited.get_index(examined).ok_or(Failure::Unavailable)?;
            examined += 1;
            let reference = &graph.links.nodes[current].reference;
            if visit.depth >= max_depth {
                frontier.push(Frontier {
                    reference,
                    depth: visit.depth,
                    cursor: None,
                });
                continue;
            }
            let neighborhood = graph.neighborhood(current, self.direction, &self.relations);
            let mut offset = None;
            loop {
                find::ensure_current(stopped)?;
                if pages >= MAX_PAGES {
                    limit = Some("page-limit");
                    frontier.push(Frontier {
                        reference,
                        depth: visit.depth,
                        cursor: neighborhood.cursor(scope, offset)?,
                    });
                    break;
                }
                pages += 1;
                let scan = neighborhood.scan(offset.unwrap_or_default(), MAX_PAGE);
                for &index in scan.indices() {
                    let neighbor = graph.opposite(current, index);
                    if visited.contains_key(&neighbor) {
                        continue;
                    }
                    if visited.len() >= max_nodes {
                        limit = Some("node-limit");
                        // Reopen at this page's start. Previously encountered
                        // edges may repeat, and unexamined ones remain reachable.
                        frontier.push(Frontier {
                            reference,
                            depth: visit.depth,
                            cursor: neighborhood.cursor(scope, offset)?,
                        });
                        break;
                    }
                    visited.insert(
                        neighbor,
                        Visit {
                            depth: visit.depth + 1,
                            witness: Some((current, index)),
                        },
                    );
                    if target == Some(neighbor) {
                        found = true;
                        break;
                    }
                }
                offset = scan.next;
                if offset.is_none() || found || limit.is_some() {
                    break;
                }
            }
        }
        if found {
            frontier.clear();
        } else {
            frontier.extend(
                visited
                    .iter()
                    .skip(examined)
                    .map(|(&node, visit)| Frontier {
                        reference: &graph.links.nodes[node].reference,
                        depth: visit.depth,
                        cursor: None,
                    }),
            );
        }

        let path = target
            .map(|mut next| {
                let mut edges = Vec::new();
                if found {
                    while next != root {
                        let (previous, index) = visited
                            .get(&next)
                            .and_then(|visit| visit.witness)
                            .ok_or(Failure::Unavailable)?;
                        edges.push(graph.edge(index));
                        next = previous;
                    }
                    edges.reverse();
                }
                Ok::<_, Failure>(Path {
                    status: if found {
                        "found"
                    } else if frontier.is_empty() {
                        "not-found-in-projection"
                    } else {
                        "unresolved"
                    },
                    edges,
                })
            })
            .transpose()?;
        let nodes = visited
            .keys()
            .map(|&index| &graph.links.nodes[index])
            .collect();
        let edges = visited
            .values()
            .filter_map(|visit| visit.witness)
            .map(|(_, index)| graph.edge(index))
            .collect();
        let limitations = LIMITATIONS.iter().copied().chain(std::iter::once(
            "Witness edges show the first paths found in this projection. Other connections can exist outside it.",
        )).collect();
        let coverage = Coverage {
            scope: "projected-reachability-witnesses",
            status: if found {
                "target-found"
            } else if frontier.is_empty() {
                "complete"
            } else {
                "bounded"
            },
            reason: if frontier.is_empty() {
                None
            } else {
                limit.or(Some("depth-limit"))
            },
            impact: "not-evaluated",
            limitations,
        };
        result(
            snapshot,
            Trace {
                snapshot: graph.snapshot(scope, root, target)?,
                nodes,
                edges,
                path,
                coverage,
                frontier,
                work: Work {
                    pages,
                    visited_nodes: visited.len(),
                    max_depth,
                    max_nodes,
                },
            },
            budget,
            recipient,
        )
    }
}

#[derive(Clone, Copy)]
struct Visit {
    depth: usize,
    witness: Option<(usize, usize)>,
}

#[derive(Serialize)]
struct Trace<'a> {
    snapshot: String,
    nodes: Vec<&'a LinkedNode<'a>>,
    edges: Vec<Edge<'a>>,
    path: Option<Path<'a>>,
    coverage: Coverage,
    frontier: Vec<Frontier<'a>>,
    work: Work,
}

#[derive(Serialize)]
struct Path<'a> {
    status: &'static str,
    edges: Vec<Edge<'a>>,
}

#[derive(Serialize)]
struct Coverage {
    scope: &'static str,
    status: &'static str,
    reason: Option<&'static str>,
    impact: &'static str,
    limitations: Vec<&'static str>,
}

#[derive(Serialize)]
struct Frontier<'a> {
    #[serde(rename = "ref")]
    reference: &'a Reference<'a>,
    depth: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Work {
    pages: usize,
    visited_nodes: usize,
    max_depth: usize,
    max_nodes: usize,
}
