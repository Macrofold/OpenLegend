//! On-demand roster navigation from the same accepted, authorized reader
//! that opens a live entity. See docs/world-agent-inspection-and-edits.md.

use super::{
    DefinitionRef, Failure, Node, PreparedReply, Recipient, Snapshot, find, present, result, valid,
};
use crate::{authority::RequestScope, language::LanguageProvider};
use openlegend_simulation::{
    encoding::js_string_cmp,
    host::ByteBudget,
    runtime::{RuntimeLiveRead, RuntimeLiveSelection},
};
use serde::{Deserialize, Serialize, Serializer, ser::SerializeSeq};
use serde_json::{Map, Value};
use std::mem::size_of;

// Match the existing Source directory bounds. The page visit and the
// on-demand roster identity have distinct costs and owners.
const MAX_ROSTER: usize = 50_000;
const EXAMINED: usize = 1024;
const MAX_PAGE: usize = 50;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Input {
    #[serde(default)]
    query: String,
    #[serde(default, deserialize_with = "present")]
    kind: Option<String>,
    #[serde(default, deserialize_with = "present")]
    controller: Option<String>,
    #[serde(default, deserialize_with = "present")]
    cursor: Option<String>,
    #[serde(default = "default_page")]
    limit: f64,
}

fn default_page() -> f64 {
    20.
}

impl Input {
    pub(super) fn parse(arguments: Map<String, Value>) -> Result<Self, Failure> {
        let input: Self =
            serde_json::from_value(Value::Object(arguments)).map_err(|_| Failure::Invalid)?;
        if !valid(&input.query, 0, 200)
            || input
                .kind
                .as_ref()
                .is_some_and(|value| !valid(value, 1, 200))
            || input
                .controller
                .as_ref()
                .is_some_and(|value| !valid(value, 1, 200))
            || input
                .cursor
                .as_ref()
                .is_some_and(|value| !valid(value, 1, 512))
            || !(1.0..=MAX_PAGE as f64).contains(&input.limit)
            || input.limit.fract() != 0.0
        {
            return Err(Failure::Invalid);
        }
        Ok(input)
    }

    pub(super) fn read(
        &self,
        live: &RuntimeLiveRead<'_>,
        selected: &RequestScope,
        language: Option<&LanguageProvider>,
        budget: &ByteBudget,
        recipient: &Recipient,
    ) -> Result<PreparedReply, Failure> {
        let count = live.entity_count();
        if count > MAX_ROSTER {
            return Err(Failure::Capacity);
        }
        let _ordered = budget
            .reserve(count * size_of::<RuntimeLiveSelection>())
            .map_err(|_| Failure::Capacity)?;
        let mut rows = Vec::with_capacity(count);
        // Permissions are checked once in the accepted native read. Neither
        // a hidden actor nor a hidden held object contributes to this cursor.
        for row in live.directory() {
            rows.push(row.map_err(super::live::runtime_failure)?);
        }
        rows.sort_unstable_by(|left, right| {
            js_string_cmp(left.roster_key().0, right.roster_key().0)
        });
        let roster_revision = find::fingerprint(&Roster(&rows))?;
        let folded = if self.query.is_empty() {
            None
        } else {
            let language = language.ok_or(Failure::Unavailable)?;
            let (query, custody) = language
                .lowercase_text(self.query.as_str().into(), budget)
                .map_err(find::language_failure)?;
            Some((language, query, custody))
        };
        let query = folded
            .as_ref()
            .map_or(&[][..], |(_, query, _)| query.as_slice());
        let binding = find::fingerprint(&(
            "live-entity-directory",
            selected.recovery_fields(),
            &roster_revision,
            query,
            &self.kind,
            &self.controller,
        ))?;
        let mut offset = find::page_offset(self.cursor.as_deref(), &binding, rows.len())?;
        let end = rows.len().min(offset + EXAMINED);
        let limit = self.limit as usize;
        let _page = budget
            .reserve(limit * (size_of::<DirectoryNode>() + 64) + 512)
            .map_err(|_| Failure::Capacity)?;
        let mut nodes = Vec::with_capacity(limit);
        while offset < end && nodes.len() < limit {
            let row = &rows[offset];
            offset += 1;
            let (id, label, kind, controller) = row.roster_key();
            if self.kind.as_deref().is_some_and(|filter| filter != kind)
                || self
                    .controller
                    .as_deref()
                    .is_some_and(|filter| Some(filter) != controller)
            {
                continue;
            }
            if let Some((language, query, _)) = &folded {
                if !find::folded_contains(language, label.into(), query, budget)?
                    && !find::folded_contains(language, id.into(), query, budget)?
                {
                    continue;
                }
            }
            let displayed = row.facts().map_err(super::live::runtime_failure)?;
            nodes.push(DirectoryNode {
                id,
                label,
                version: find::fingerprint(&displayed)?,
            });
        }
        let next_cursor = (offset < rows.len()).then(|| format!("{binding}.{offset}"));
        result(
            Snapshot {
                world_id: live.progress.world_id,
                generation: &selected.timeline_id,
                sequence: live.progress.sequence,
                sim_time: live.progress.at,
            },
            Page {
                nodes,
                roster_revision,
                next_cursor,
                coverage: "Current permitted entity roster. Membership, names and controllers bind the cursor. Each row describes current display facts.",
            },
            budget,
            recipient,
        )
    }
}

/// Roster identity depends on memberships and names, independent of movement,
/// health, actions or the live record version exposed only for returned rows.
struct Roster<'a>(&'a [RuntimeLiveSelection<'a>]);

impl Serialize for Roster<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut rows = serializer.serialize_seq(Some(self.0.len()))?;
        for row in self.0 {
            rows.serialize_element(&row.roster_key())?;
        }
        rows.end()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<'a> {
    nodes: Vec<DirectoryNode<'a>>,
    roster_revision: String,
    next_cursor: Option<String>,
    coverage: &'static str,
}

struct DirectoryNode<'a> {
    id: &'a str,
    label: &'a openlegend_simulation::text::JsText,
    version: String,
}

impl Serialize for DirectoryNode<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        Node {
            reference: &DefinitionRef {
                kind: "entity",
                id: self.id,
                version: &self.version,
            },
            label: self.label.into(),
            layer: "live",
            can_inspect: true,
        }
        .serialize(serializer)
    }
}
