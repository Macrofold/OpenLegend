//! A private notes page borrows the character's current documents and active
//! feelings. It prepares a bounded selection only for an admitted browser read.
use super::*;
use crate::appraisals::{ACTIVE_PAGE, RuntimePrivateFeeling, private_appraisal_page};
use crate::encoding::js_string_cmp;
use crate::reception::{
    KnowledgeDocument, KnowledgeOrigin, KnowledgeSubject, MapMarker, ObserverSubject,
};
use crate::text::{JsText, TextRef};
use crate::worlds::InstalledPersonalNameReader;
use indexmap::IndexMap;
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::mem::size_of;

mod subjects;
pub use subjects::{RuntimePersonPage, RuntimePersonPosition, RuntimePersonRead};
pub(super) use subjects::{person_note_subject, person_notepad};

const NOTE_PAGE: usize = 40;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Notepad<'a> {
    subject_id: Option<&'a KnowledgeSubject>,
    origin: KnowledgeOrigin,
    label: TextRef<'a>,
    text: &'a JsText,
    revision: u64,
    characters: usize,
    max_characters: u64,
}

#[derive(Clone, Copy, Serialize)]
pub struct RuntimeMindFile<'a> {
    pub id: &'a str,
    pub text: &'a JsText,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePrivateNotes<'a> {
    actor_id: &'a str,
    name: &'a JsText,
    world_id: &'a str,
    generation: &'a str,
    revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    knowledge_limits: Option<Limits>,
    notepads: Vec<Notepad<'a>>,
    #[serde(skip)]
    pub files: Vec<RuntimeMindFile<'a>>,
    #[serde(skip)]
    pub appraisals: Vec<RuntimePrivateFeeling<'a>>,
    #[serde(skip)]
    pub next_notes: Option<&'a str>,
    #[serde(skip)]
    pub next_appraisals: Option<&'a str>,
    #[serde(skip)]
    pub fence: String,
}

#[derive(Clone, Copy, Serialize)]
struct Limits {
    general: u64,
    subject: u64,
}

struct Key<'a>(&'a str, &'a KnowledgeDocument);
impl PartialEq for Key<'_> {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}
impl Eq for Key<'_> {}
impl PartialOrd for Key<'_> {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Key<'_> {
    fn cmp(&self, other: &Self) -> Ordering {
        js_string_cmp(self.0, other.0)
    }
}

impl NativeWorldSession {
    /// Borrow the permitted owner page through its synchronous response
    /// encoding. Neither page selection nor a cursor grants private access.
    pub fn with_private_notes<T>(
        &self,
        actor: &str,
        scope: &str,
        notes_after: Option<&str>,
        appraisals_after: Option<&str>,
        expected_fence: Option<&str>,
        consume: impl FnOnce(RuntimePrivateNotes<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let entity = state
            .physical
            .entities
            .get(actor)
            .filter(|entity| entity.actor.is_some())
            .ok_or_else(|| failure("private notes owner unavailable"))?;
        let body = entity.actor.as_ref().expect("selected actor");
        let _request = self.budget.reserve(4096)?;
        let fence = continuity_fence(state, scope, actor, body.physical_life.unwrap_or(0))?;
        if expected_fence.is_some_and(|expected| expected != fence) {
            return Ok(None);
        }
        let mind = state
            .minds
            .minds
            .as_ref()
            .and_then(|minds| minds.get(actor));
        let revision = state
            .minds
            .inner_worlds
            .as_ref()
            .and_then(|minds| minds.get(actor))
            .map_or(0, |mind| mind.revision);
        let documents = state
            .reception
            .actor_knowledge
            .as_ref()
            .and_then(|actors| actors.get(actor));
        let limits = state
            .installed
            .retained
            .knowledge_limits
            .as_ref()
            .map(|policy| Limits {
                general: policy.max_characters.general,
                subject: policy.max_characters.subject,
            });
        let scratch = (NOTE_PAGE + 1) * (size_of::<Key<'_>>() + size_of::<Notepad<'_>>())
            + ACTIVE_PAGE * size_of::<RuntimePrivateFeeling<'_>>()
            + mind.map_or(0, |mind| mind.documents.len()) * size_of::<RuntimeMindFile<'_>>();
        let _scratch = self.budget.reserve(scratch)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )
        .map_err(failure)?;
        let markers = state
            .reception
            .map_markers
            .as_ref()
            .and_then(|map| map.get(actor));
        let mut page = BinaryHeap::with_capacity(NOTE_PAGE);
        let mut more_notes = false;
        if let Some((documents, after)) = documents.zip(notes_after) {
            for (key, document) in documents {
                if js_string_cmp(key, after).is_le() {
                    continue;
                }
                let value = Key(key, document);
                if page.len() < NOTE_PAGE {
                    page.push(value);
                } else {
                    let mut largest = page.peek_mut().expect("nonempty full page");
                    if value < *largest {
                        *largest = value;
                    }
                    more_notes = true;
                }
            }
        }
        let page = page.into_sorted_vec();
        let general = documents
            .and_then(|documents| documents.get("general"))
            .filter(|_| !page.iter().any(|key| key.0 == "general"));
        let mut notepads = Vec::with_capacity(page.len() + usize::from(general.is_some()));
        if let Some(general) = general {
            notepads.push(project_notepad(general, limits, &names, markers)?);
        }
        for key in &page {
            notepads.push(project_notepad(key.1, limits, &names, markers)?);
        }
        let (appraisals, next_appraisals) = match appraisals_after {
            Some(after) => private_appraisal_page(state, actor, after, &names).map_err(failure)?,
            None => (Vec::new(), None),
        };
        Ok(Some(consume(RuntimePrivateNotes {
            actor_id: actor,
            name: &entity.name,
            world_id: &state.physical.header.id,
            generation: &state.generation,
            revision,
            knowledge_limits: limits,
            notepads,
            files: mind
                .into_iter()
                .flat_map(|mind| &mind.documents)
                .map(|doc| RuntimeMindFile {
                    id: &doc.id,
                    text: &doc.text,
                })
                .collect(),
            appraisals,
            next_notes: page.last().filter(|_| more_notes).map(|key| key.0),
            next_appraisals,
            fence,
        })))
    }
}

fn project_notepad<'a, 'view>(
    note: &'a KnowledgeDocument,
    limits: Option<Limits>,
    names: &'view InstalledPersonalNameReader<'a>,
    markers: Option<&'a IndexMap<String, MapMarker>>,
) -> Result<Notepad<'view>, RuntimeError> {
    let label = match &note.subject_id {
        None => "General knowledge".into(),
        Some(KnowledgeSubject::Place { .. }) => "Place note".into(),
        Some(KnowledgeSubject::MapMarker { marker_id }) => markers
            .and_then(|markers| markers.get(marker_id))
            .map_or("Map marker note".into(), |marker| (&marker.label).into()),
        Some(KnowledgeSubject::Entity { entity_id }) => names
            .subject_label(&ObserverSubject::Entity {
                entity_id: entity_id.clone(),
            })
            .map_err(failure)?,
        Some(KnowledgeSubject::Individual { individual_id }) => names
            .subject_label(&ObserverSubject::Individual {
                individual_id: individual_id.clone(),
            })
            .map_err(failure)?,
    };
    let limits = limits.ok_or_else(|| failure("private note policy unavailable"))?;
    Ok(Notepad {
        subject_id: note.subject_id.as_ref(),
        origin: note.origin,
        label,
        text: &note.text,
        revision: note.revision,
        characters: note.text.character_count(),
        max_characters: if note.subject_id.is_some() {
            limits.subject
        } else {
            limits.general
        },
    })
}

fn continuity_fence(
    state: &crate::simulation::SimulationState,
    scope: &str,
    actor: &str,
    life: u64,
) -> Result<String, RuntimeError> {
    let notes_revision = state
        .reception
        .knowledge_revisions
        .as_ref()
        .and_then(|actors| actors.get(actor))
        .copied()
        .unwrap_or(0);
    let privacy = state
        .experience
        .actor(actor)
        .map_or(0, |history| history.privacy.revision());
    let value = json_record(&(
        scope,
        &state.generation,
        actor,
        life,
        notes_revision,
        state.appraisals.content_witness(actor),
        privacy,
    ))
    .map_err(failure)?;
    Ok(crate::encoding::sha256_hex(value.as_bytes()))
}
