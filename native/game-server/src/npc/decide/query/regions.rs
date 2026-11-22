//! A region summarizes original received membership without disclosing which
//! bodies it contains. Its opaque handle can select only the issued subtree.
use super::{CallFailure, capacity};
use crate::{
    npc::decide::prepare,
    spatial::index::{ReceivedIndex, RegionPath},
};
use openlegend_simulation::{
    attention::SceneRegionLimits,
    host::{ByteBudget, ByteReservation},
    runtime::RuntimeNpcRead,
    state::Bounds,
};
use serde::Serialize;
use serde_json::{Value, json};
use std::mem::size_of;

pub(in crate::npc::decide) struct Regions {
    pub(super) index: ReceivedIndex,
    rows: Vec<RegionRow>,
    at: f64,
    _custody: ByteReservation,
}

#[derive(Serialize)]
struct RegionRow {
    reference: String,
    #[serde(skip)]
    path: RegionPath,
    count: usize,
    bounds: RelativeBounds,
    detail: &'static str,
}

#[derive(Serialize)]
struct RelativeBounds {
    right: [f64; 2],
    above: [f64; 2],
    forward: [f64; 2],
}

impl Regions {
    /// Prepare once, only for the first generation that can ask a query.
    /// Keep the issued rows and their funded tree for either query family.
    pub(in crate::npc::decide) fn offer(
        original: &RuntimeNpcRead,
        limits: SceneRegionLimits,
        scope: &str,
        frame: &prepare::ReceivedFrame,
        situation: &Value,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, CallFailure> {
        let bounds = original.received_query_bounds();
        if bounds.len() == 0 || limits.max_rows == 0 || limits.node_visits == 0 {
            return Ok(None);
        }
        let at = original.decision_origin().at;
        let maximum = usize::try_from(limits.max_bytes).map_err(|_| CallFailure::Invalid)?;
        // Leave space for the new member names, timestamp and delimiters.
        // Measure the existing situation once and resize whole regions only.
        let bytes = encoded_len(situation)?
            .checked_add(encoded_len(&at)? + r#","broad":,"broadMeasuredAt":"#.len())
            .ok_or_else(capacity)?;
        if bytes >= maximum {
            return Ok(None);
        }
        let index =
            ReceivedIndex::build(bounds, budget).map_err(super::super::response_capacity)?;
        let visits = (limits.node_visits - 1) / 2;
        let row_limit = limits.max_rows.min(visits + 1);
        let mut limit = index
            .len()
            .min(usize::try_from(row_limit).unwrap_or(usize::MAX));
        if limit == 0 {
            return Ok(None);
        }
        // A row retains its typed graph as well as the JSON object in the
        // outgoing prompt. A scalar-only row has a fixed allocation shape.
        let row_custody = size_of::<RegionRow>() + 2 * 24 + 24 * size_of::<Value>() + 512;
        let custody = budget
            .reserve(limit.checked_mul(row_custody).ok_or_else(capacity)?)
            .map_err(super::super::response_capacity)?;
        let mut rows = Vec::new();
        rows.try_reserve_exact(limit).map_err(|_| capacity())?;
        loop {
            rows.clear();
            index.cover(limit - 1, |path, bounds, count| {
                rows.push(RegionRow {
                    reference: prepare::alias(scope, "scene-region", rows.len()),
                    path,
                    count,
                    bounds: RelativeBounds::from_received(bounds, frame),
                    detail: "unexpanded",
                });
            });
            if encoded_len(&rows)? <= maximum - bytes {
                break;
            }
            limit = rows.len() / 2;
            if limit == 0 {
                return Ok(None);
            }
        }
        Ok(Some(Self {
            index,
            rows,
            at,
            _custody: custody,
        }))
    }

    pub(in crate::npc::decide) fn present(&self, situation: &mut Value) -> Result<(), CallFailure> {
        situation["broad"] = serde_json::to_value(&self.rows).map_err(|_| CallFailure::Invalid)?;
        situation["broadMeasuredAt"] = json!(self.at);
        Ok(())
    }

    pub(super) fn resolve(&self, reference: &str) -> Option<RegionPath> {
        self.rows
            .iter()
            .find(|row| row.reference == reference)
            .map(|row| row.path)
    }
}

fn encoded_len(value: &impl Serialize) -> Result<usize, CallFailure> {
    openlegend_simulation::encoding::json_record_len(value).map_err(|_| CallFailure::Invalid)
}

impl RelativeBounds {
    fn from_received(bounds: &Bounds, frame: &prepare::ReceivedFrame) -> Self {
        let (sin, cos) = frame.heading.sin_cos();
        let mut right = [f64::INFINITY, f64::NEG_INFINITY];
        let mut forward = right;
        for x in [bounds.min.x - frame.x, bounds.max.x - frame.x] {
            for z in [bounds.min.z - frame.z, bounds.max.z - frame.z] {
                let r = -cos * x + sin * z;
                let f = sin * x + cos * z;
                right = [right[0].min(r), right[1].max(r)];
                forward = [forward[0].min(f), forward[1].max(f)];
            }
        }
        Self {
            right,
            above: [bounds.min.y - frame.y, bounds.max.y - frame.y],
            forward,
        }
    }
}
