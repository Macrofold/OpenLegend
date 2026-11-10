//! The Source endpoint/causal-span order is resumable across canonical-text
//! questions. Rejected spans still count their actual closure work.
use super::history::LearningHistory;
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::map_storage;
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(super) struct LearningSlice {
    pub indices: Vec<usize>,
    pub incomplete: bool,
}
struct Endpoint {
    component: LearningSlice,
    edges: Vec<(usize, usize)>,
    next: usize,
}
pub(super) struct CandidateSlices {
    by_id: IndexMap<String, usize>,
    endpoints: Vec<usize>,
    endpoint: usize,
    active: Option<Endpoint>,
    purposes: Vec<Vec<usize>>,
    purpose: usize,
    pub examined: Vec<String>,
    pub visited: usize,
    pub incomplete: bool,
    pub more: bool,
    maximum_visits: usize,
    maximum_nodes: usize,
    maximum_candidates: usize,
    done_endpoints: bool,
    pub storage: ByteReservation,
}
impl CandidateSlices {
    pub fn new(
        history: &LearningHistory,
        state: &ActivityState,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let visits = usize::try_from(state.limits.visits).map_err(|_| ExecutionError::Capacity)?;
        let start = history.rows.len().saturating_sub(visits);
        let n = history.rows.len() - start;
        let text = history.rows[start..]
            .iter()
            .map(|r| r.entry.id.len() + r.entry.parent_id.as_ref().map_or(0, String::len))
            .sum::<usize>();
        let links = history.rows[start..]
            .iter()
            .map(|r| r.entry.connections.len())
            .sum::<usize>();
        let bytes = map_storage::<String, usize>(n)
            .and_then(|b| b.checked_add(text.checked_mul(4)?))
            .and_then(|b| {
                b.checked_add(
                    (n.checked_mul(12)?.checked_add(links.checked_mul(4)?)?)
                        .checked_mul(size_of::<usize>())?,
                )
            })
            .and_then(|b| b.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut by_id = IndexMap::with_capacity(n);
        let mut endpoints = Vec::new();
        let mut purposes: IndexMap<&str, Vec<usize>> = IndexMap::new();
        let prior = state
            .learning
            .get(&history.actor)
            .and_then(|c| c.examined.as_ref());
        for (at, row) in history.rows.iter().enumerate().skip(start) {
            let e = &row.entry;
            if e.actor_id == history.actor && !row.denied && e.revoked != Some(true) {
                by_id.insert(e.id.clone(), at);
            }
            if e.status == ActivityStatus::Completed && e.revoked != Some(true) && !row.denied {
                if !e.connections.is_empty() && prior.is_none_or(|p| !p.contains(&e.id)) {
                    endpoints.push(at);
                }
                if let Some(parent) = &e.parent_id {
                    purposes.entry(parent).or_default().push(at);
                }
            }
        }
        endpoints.reverse();
        Ok(Self {
            by_id,
            endpoints,
            endpoint: 0,
            active: None,
            purposes: purposes.into_values().collect(),
            purpose: 0,
            examined: Vec::new(),
            visited: 0,
            incomplete: start != 0,
            more: false,
            maximum_visits: visits,
            maximum_nodes: usize::try_from(state.limits.nodes)
                .map_err(|_| ExecutionError::Capacity)?,
            maximum_candidates: usize::try_from(state.limits.candidates)
                .map_err(|_| ExecutionError::Capacity)?,
            done_endpoints: false,
            storage,
        })
    }
    fn closure<'a>(
        &mut self,
        history: &'a LearningHistory,
        seeds: impl IntoIterator<Item = &'a str>,
        material: bool,
    ) -> LearningSlice {
        let mut pending: Vec<&str> = seeds.into_iter().collect();
        let mut selected = Vec::new();
        let mut incomplete = false;
        while !pending.is_empty()
            && self.visited < self.maximum_visits
            && selected.len() < self.maximum_nodes
        {
            let id = pending.pop().expect("nonempty pending");
            if self.by_id.get(id).is_some_and(|at| selected.contains(at)) {
                continue;
            }
            self.visited += 1;
            let Some(&at) = self.by_id.get(id) else {
                self.incomplete = true;
                incomplete = true;
                continue;
            };
            selected.push(at);
            for connection in &history.rows[at].entry.connections {
                if material
                    || matches!(
                        connection.relation,
                        ConnectionKind::Support | ConnectionKind::State
                    )
                {
                    pending.push(&connection.from);
                }
            }
        }
        if !pending.is_empty() {
            self.incomplete = true;
            incomplete = true;
        }
        selected.sort_unstable();
        LearningSlice {
            indices: selected,
            incomplete,
        }
    }
    pub fn next(&mut self, history: &LearningHistory, candidates: usize) -> Option<LearningSlice> {
        loop {
            if let Some(mut active) = self.active.take() {
                if candidates < self.maximum_candidates.saturating_sub(1) {
                    while let Some(&(at, link)) = active.edges.get(active.next) {
                        active.next += 1;
                        let from = history.rows[at].entry.connections[link].from.as_str();
                        if !self.by_id.contains_key(from) {
                            self.incomplete = true;
                            continue;
                        }
                        let ids = self.closure(
                            history,
                            [from, history.rows[at].entry.id.as_str()],
                            false,
                        );
                        self.active = Some(active);
                        return Some(ids);
                    }
                }
                if candidates >= self.maximum_candidates {
                    self.incomplete = true;
                } else {
                    return Some(active.component);
                }
            }
            if !self.done_endpoints {
                if let Some(&at) = self.endpoints.get(self.endpoint) {
                    if candidates > 0 || self.visited >= self.maximum_visits / 2 {
                        self.more = true;
                        self.done_endpoints = true;
                        continue;
                    }
                    self.endpoint += 1;
                    self.examined.push(history.rows[at].entry.id.clone());
                    let component =
                        self.closure(history, [history.rows[at].entry.id.as_str()], true);
                    let mut edges = Vec::new();
                    for &member in &component.indices {
                        for (link, c) in history.rows[member].entry.connections.iter().enumerate() {
                            if matches!(
                                c.relation,
                                ConnectionKind::Material | ConnectionKind::State
                            ) {
                                edges.push((member, link));
                            }
                        }
                    }
                    edges.sort_by_key(|&(at, link)| {
                        history.rows[at].entry.connections[link].relation
                            != ConnectionKind::Material
                    });
                    self.active = Some(Endpoint {
                        component,
                        edges,
                        next: 0,
                    });
                    continue;
                }
                self.done_endpoints = true;
            }
            if candidates < self.maximum_candidates {
                if let Some(indices) = self.purposes.get(self.purpose) {
                    self.purpose += 1;
                    return Some(LearningSlice {
                        indices: indices.clone(),
                        incomplete: false,
                    });
                }
            }
            return None;
        }
    }
}
