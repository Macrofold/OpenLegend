//! One admitted definition adjacency for a request. Direct pages and trace
//! expansions share directions, ordering, bounds and cursor identity.

use super::*;

pub(super) struct Projection<'a> {
    outgoing: Vec<usize>,
    incoming: Vec<usize>,
    pub(super) links: Links<'a>,
}

#[derive(Clone, Copy)]
pub(super) struct Scope<'a> {
    pub world: &'a str,
    pub timeline: &'a str,
    pub account: &'a str,
}

impl<'a> Projection<'a> {
    pub(super) fn new(mut links: Links<'a>) -> Result<Self, Failure> {
        links
            .edges
            .sort_unstable_by(|left, right| left.id.cmp(&right.id));
        links.edges.dedup_by(|left, right| left.id == right.id);
        let size = links.edges.len();
        links.claim(2 * size * size_of::<usize>())?;
        // Indices use one contiguous allocation per direction. Within each
        // subject the edge IDs retain the same order as the primary array.
        let mut outgoing: Vec<_> = (0..size).collect();
        let mut incoming: Vec<_> = (0..size).collect();
        outgoing.sort_unstable_by_key(|&index| (links.edges[index].source, index));
        incoming.sort_unstable_by_key(|&index| (links.edges[index].target, index));
        Ok(Self {
            outgoing,
            incoming,
            links,
        })
    }

    pub(super) fn snapshot(
        &self,
        scope: Scope<'_>,
        root: usize,
        target: Option<usize>,
    ) -> Result<String, Failure> {
        find::fingerprint(&(
            scope.world,
            scope.timeline,
            "installed-recipe-projection",
            &self.links.nodes[root].reference,
            target.map(|index| &self.links.nodes[index].reference),
            LinkIds(&self.links.edges),
        ))
    }

    pub(super) fn neighborhood<'b>(
        &'b self,
        root: usize,
        direction: Direction,
        relations: &'b [String],
    ) -> Neighborhood<'b, 'a> {
        let edges = &self.links.edges;
        let outgoing = match direction {
            Direction::In => &[][..],
            _ => for_node(&self.outgoing, root, |edge| edges[edge].source),
        };
        let incoming = match direction {
            Direction::Out => &[][..],
            _ => for_node(&self.incoming, root, |edge| edges[edge].target),
        };
        Neighborhood {
            graph: self,
            root,
            direction,
            relations,
            outgoing,
            incoming,
        }
    }

    pub(super) fn edge(&self, index: usize) -> Edge<'_> {
        let link = &self.links.edges[index];
        Edge {
            id: &link.id,
            fact: self.links.fact(link),
        }
    }

    pub(super) fn opposite(&self, root: usize, index: usize) -> usize {
        let link = &self.links.edges[index];
        if link.source == root {
            link.target
        } else {
            link.source
        }
    }
}

fn for_node(indices: &[usize], root: usize, endpoint: impl Fn(usize) -> usize) -> &[usize] {
    let first = indices.partition_point(|&edge| endpoint(edge) < root);
    let count = indices[first..].partition_point(|&edge| endpoint(edge) <= root);
    &indices[first..first + count]
}

pub(super) struct Neighborhood<'a, 'b> {
    graph: &'a Projection<'b>,
    root: usize,
    direction: Direction,
    relations: &'a [String],
    outgoing: &'a [usize],
    incoming: &'a [usize],
}

pub(super) struct Scan {
    indices: [usize; MAX_PAGE],
    len: usize,
    pub next: Option<usize>,
}

impl Scan {
    pub(super) fn indices(&self) -> &[usize] {
        &self.indices[..self.len]
    }
}

impl<'a, 'b: 'a> Neighborhood<'a, 'b> {
    fn count(&self) -> usize {
        self.outgoing.len() + self.incoming.len()
    }

    fn topology(&self, scope: Scope<'_>) -> Result<String, Failure> {
        // A trace frontier uses the same root-scoped identity as a direct
        // query, independent of any other roots present in the projection.
        find::fingerprint(&(
            scope.world,
            scope.timeline,
            "graph-neighborhood",
            &self.graph.links.nodes[self.root],
            NeighborhoodIds(self),
        ))
    }

    fn binding(&self, scope: Scope<'_>, topology: &str) -> Result<String, Failure> {
        find::fingerprint(&(topology, scope.account, self.direction, self.relations))
    }

    pub(super) fn cursor(
        &self,
        scope: Scope<'_>,
        offset: Option<usize>,
    ) -> Result<Option<String>, Failure> {
        offset
            .map(|offset| {
                let topology = self.topology(scope)?;
                let binding = self.binding(scope, &topology)?;
                Ok(format!("{binding}.{offset}"))
            })
            .transpose()
    }

    pub(super) fn scan(&self, mut offset: usize, limit: usize) -> Scan {
        let mut selected = Scan {
            indices: [0; MAX_PAGE],
            len: 0,
            next: None,
        };
        let end = self.count().min(offset + MAX_EXAMINED);
        let edges = &self.graph.links.edges;
        while offset < end && selected.len < limit {
            let second = offset >= self.outgoing.len();
            let index = if second {
                self.incoming[offset - self.outgoing.len()]
            } else {
                self.outgoing[offset]
            };
            offset += 1;
            let edge = &edges[index];
            if matches!(self.direction, Direction::Both) && second && edge.source == self.root {
                continue; // A self-edge was already considered on the first leg.
            }
            if !self.relations.is_empty()
                && !self
                    .relations
                    .iter()
                    .any(|relation| *relation == edge.relation)
            {
                continue;
            }
            selected.indices[selected.len] = index;
            selected.len += 1;
        }
        selected.next = (offset < self.count()).then_some(offset);
        selected
    }

    pub(super) fn page(
        &self,
        scope: Scope<'_>,
        cursor: Option<&str>,
        limit: usize,
    ) -> Result<Page<'a>, Failure> {
        let topology = self.topology(scope)?;
        let binding = self.binding(scope, &topology)?;
        let offset = find::page_offset(cursor, &binding, self.count())?;
        let selected = self.scan(offset, limit);
        let graph = self.graph;
        let links = &graph.links;
        let live = links.nodes[self.root].layer == "live";
        if live && selected.next.is_some() {
            return Err(Failure::Capacity);
        }
        let storage = links
            .budget
            .reserve((limit + 1) * (4 * size_of::<Edge>() + 64))
            .map_err(|_| Failure::Capacity)?;
        let mut nodes = IndexMap::new();
        nodes.insert(self.root, &links.nodes[self.root]);
        let mut edges = Vec::with_capacity(selected.len);
        for &index in selected.indices() {
            let link = &links.edges[index];
            nodes.insert(link.source, &links.nodes[link.source]);
            nodes.insert(link.target, &links.nodes[link.target]);
            edges.push(graph.edge(index));
        }
        Ok(Page {
            snapshot: topology,
            nodes: nodes.into_values().collect(),
            edges,
            coverage: Coverage {
                scope: "projected-neighborhood",
                status: if selected.next.is_some() {
                    "page"
                } else {
                    "complete"
                },
                impact: "not-evaluated",
                limitations: match links.nodes[self.root].reference.kind {
                    "entity" => LIVE_LIMITATIONS,
                    "item" => ITEM_LIMITATIONS,
                    _ => LIMITATIONS,
                },
            },
            next_cursor: selected.next.map(|offset| format!("{binding}.{offset}")),
            _storage: storage,
        })
    }
}

struct NeighborhoodIds<'a, 'b, 'c>(&'a Neighborhood<'b, 'c>);

impl Serialize for NeighborhoodIds<'_, '_, '_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let neighborhood = self.0;
        let mut rows = serializer.serialize_seq(Some(neighborhood.count()))?;
        for &index in neighborhood.outgoing.iter().chain(neighborhood.incoming) {
            rows.serialize_element(&neighborhood.graph.links.edges[index].id)?;
        }
        rows.end()
    }
}
