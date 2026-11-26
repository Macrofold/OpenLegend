//! Creator inspection borrows actor-private continuity and its exact retained
//! memory proof under one disclosure fence. The application owns permissions,
//! language formatting and the final HTTP encoding.
use super::*;
use crate::cognition::{InnerRecord, MindDocument, PrivateThought, ThoughtKind};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCreatorMind<'a> {
    #[serde(flatten)]
    notes: RuntimePrivateNotes<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    corrections: Option<&'a IndexMap<String, String>>,
    documents: &'a [MindDocument],
    records: &'a [InnerRecord],
    thoughts: Vec<&'a PrivateThought>,
    legacy_thoughts: Vec<&'a PrivateThought>,
    status_effects: Vec<StatusRow<'a>>,
    #[serde(skip)]
    pub skills: Vec<crate::activity::RuntimeInspectedSkill>,
}

impl<'a> RuntimeCreatorMind<'a> {
    pub fn notes(&self) -> &RuntimePrivateNotes<'a> {
        &self.notes
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusRow<'a> {
    id: &'a str,
    label: &'a str,
    elapsed_seconds: f64,
}

impl NativeWorldSession {
    /// Published notes, accepted mind contents and selected history must
    /// remain in this same actor's authorized world turn until encoded.
    pub fn with_creator_mind<T>(
        &self,
        history: &RuntimePrivateHistoryRead,
        scope: &str,
        concise: impl Fn(&JsText) -> Result<bool, RuntimeError>,
        consume: impl FnOnce(RuntimeCreatorMind<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        use crate::status::{AttributeAudience, project_status_effects};
        let Some(_lease) = self.history_publication(history)? else {
            return Ok(None);
        };
        let actor = history.actor_id();
        let state = &self.session.publication_read().map_err(failure)?.state;
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("private mind owner unavailable"))?;
        let (skills, _skill_storage) =
            crate::activity::inspected_activities(state, actor, &self.budget).map_err(failure)?;
        let mind = state
            .minds
            .minds
            .as_ref()
            .and_then(|minds| minds.get(actor));
        let statuses = project_status_effects(
            entity,
            &state.installed.status_policy,
            AttributeAudience::Owner,
            &self.budget,
        )
        .map_err(failure)?;
        let previous = entity.status_effects.as_ref();
        let status_count = statuses.rows().len();
        let thought_count = mind.map_or(0, |mind| mind.thoughts.len());
        let _view = self.budget.reserve(
            status_count * size_of::<StatusRow<'_>>()
                + thought_count * 4 * size_of::<&PrivateThought>(),
        )?;
        let status_effects = statuses
            .rows()
            .iter()
            .map(|row| StatusRow {
                id: &row.id,
                label: &row.label,
                elapsed_seconds: previous
                    .and_then(|states| states.get(&row.id))
                    .map_or(0.0, |state| state.elapsed_seconds),
            })
            .collect();
        let mut thoughts = Vec::new();
        let mut legacy_thoughts = Vec::new();
        for thought in mind.into_iter().flat_map(|mind| &mind.thoughts) {
            if thought.kind != ThoughtKind::Thought && concise(&thought.text)? {
                thoughts.push(thought);
            } else {
                legacy_thoughts.push(thought);
            }
        }
        self.project_private_notes(state, actor, scope, Some(""), Some(""), None, |notes| {
            consume(RuntimeCreatorMind {
                notes,
                corrections: state
                    .experience
                    .actor(actor)
                    .map(|owner| owner.privacy.corrections()),
                documents: mind.map_or(&[], |mind| mind.documents.as_slice()),
                records: mind.map_or(&[], |mind| mind.records.as_slice()),
                thoughts,
                legacy_thoughts,
                status_effects,
                skills,
            })
        })
    }
}
