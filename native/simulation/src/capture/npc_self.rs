//! Only the NPC's own facts consumed by the stand-alone formatter. The
//! accepted read owns these values independently of the live world.
use super::OwnActorProduct;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::plans::{PendingIntent, PlanMode};
use crate::reception::{AttributeDisplay, AttributeKnowledge, AttributeView, KnowledgeDocument};
use crate::records::SqlCell;
use crate::simulation::SimulationState;
use crate::state::{CharacterTrait, Goal, Named, Point};
use crate::text::JsText;
use crate::values::AttributeValue;
use std::{mem::size_of, sync::Arc};

#[derive(Clone, Copy)]
pub enum RuntimeNpcSelfSelection {
    Frame,
    Prompt,
}

pub struct RuntimeNpcSelf {
    pub(crate) frame: Arc<RuntimeNpcDecisionFrame>,
    prompt: Option<RuntimeNpcSelfPrompt>,
}
impl std::ops::Deref for RuntimeNpcSelf {
    type Target = RuntimeNpcDecisionFrame;
    fn deref(&self) -> &Self::Target {
        &self.frame
    }
}
#[derive(serde::Serialize)]
pub struct RuntimeNpcDecisionFrame {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub heading: f64,
    pub support: Option<String>,
    #[serde(skip)]
    _storage: ByteReservation,
}
impl RuntimeNpcDecisionFrame {
    pub fn position(&self) -> Point {
        Point {
            x: self.x,
            y: self.y,
            z: self.z,
        }
    }
    pub(crate) fn matches(&self, actor: &crate::state::Entity) -> bool {
        match actor.placement.as_ref() {
            Some(crate::state::Placement::World {
                position,
                support_surface_id,
                ..
            }) => {
                self.position() == *position
                    && self.heading == actor.spatial.heading
                    && self.support.as_deref() == support_surface_id.as_deref()
            }
            _ => false,
        }
    }
}

pub struct RuntimeNpcSelfPrompt {
    pub observer_name: Named,
    pub species: Option<String>,
    pub traits: Vec<CharacterTrait>,
    pub attributes: Vec<RuntimeNpcOwnAttribute>,
    pub action_status_labels: Vec<String>,
    pub action: Option<String>,
    pub speech: bool,
    pub expressions: bool,
    pub goals: Vec<Goal>,
    pub plan_revision: u64,
    pub documents: Vec<RuntimeNpcOwnDocument>,
    pub notepad: Option<KnowledgeDocument>,
    intentions: Vec<PendingIntent>,
    storage: ByteReservation,
}

pub struct RuntimeNpcOwnAttribute {
    pub name: String,
    pub status: AttributeKnowledge,
    pub display: AttributeDisplay,
    pub value: Option<AttributeValue>,
    pub unit: Option<String>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub concern: Option<JsText>,
    pub meaning: Option<String>,
}

pub struct RuntimeNpcOwnDocument {
    pub id: String,
    pub text: JsText,
}

pub struct RuntimeNpcIntention<'a> {
    pub id: &'a str,
    pub description: &'a JsText,
    pub normalized: &'a JsText,
    pub target_entity_id: Option<&'a str>,
    pub slots: Option<&'a SqlCell>,
    pub mode: PlanMode,
    pub manifest_revision: u64,
    pub status: &'a str,
    pub resolution: Option<&'a SqlCell>,
}

impl RuntimeNpcSelf {
    pub fn prompt(&self) -> Option<&RuntimeNpcSelfPrompt> {
        self.prompt.as_ref()
    }

    /// Share the original funded pose with the formatter and response ticket.
    pub(crate) fn into_frame(self) -> Arc<RuntimeNpcDecisionFrame> {
        self.frame
    }
}

impl RuntimeNpcSelfPrompt {
    /// Memory search uses the first goal and this actor's private documents.
    /// Compare only those inputs, without preparing another physical view.
    pub(crate) fn memory_query_current(&self, state: &SimulationState, actor_id: &str) -> bool {
        let Some(actor) = state
            .physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
        else {
            return false;
        };
        let Some(mind) = state
            .minds
            .minds
            .as_ref()
            .and_then(|minds| minds.get(actor_id))
        else {
            return false;
        };
        actor.agency.goals.first().map(|goal| &goal.objective)
            == self.goals.first().map(|goal| &goal.objective)
            && mind.documents.len() == self.documents.len()
            && mind
                .documents
                .iter()
                .zip(&self.documents)
                .all(|(current, captured)| {
                    current.id == captured.id && current.text == captured.text
                })
    }

    /// Part of the independent provider prompt budget. Allow for displayed
    /// UTF-16 escapes, text copies and provider JSON field carriers rather
    /// than lending the captured fact's backing to the rendered request.
    pub fn projection_bytes(&self) -> Option<usize> {
        self.storage.bytes().checked_mul(6)
    }

    pub fn intentions(&self) -> impl Iterator<Item = RuntimeNpcIntention<'_>> {
        self.intentions.iter().map(|intent| RuntimeNpcIntention {
            id: &intent.id,
            description: &intent.description,
            normalized: &intent.normalized,
            target_entity_id: intent.target_entity_id.as_deref(),
            slots: intent.slots.as_ref().map(|slots| slots.value()),
            mode: intent.mode,
            manifest_revision: intent.manifest_revision,
            status: &intent.status,
            resolution: intent
                .resolution
                .as_ref()
                .map(|resolution| resolution.value()),
        })
    }
}

fn optional_text(value: Option<&str>) -> usize {
    value.map_or(0, str::len)
}

fn slice_bytes<T>(source: &[T], measure: impl Fn(&T) -> Option<usize>) -> Option<usize> {
    source
        .iter()
        .try_fold(source.len().checked_mul(size_of::<T>())?, |bytes, item| {
            bytes.checked_add(measure(item)?)
        })
}

fn attribute_concern(attribute: &AttributeView) -> Option<&JsText> {
    attribute.condition.as_ref().or(attribute.concern.as_ref())
}

fn prompt_facts(
    own: &OwnActorProduct<'_>,
    budget: &ByteBudget,
) -> Result<RuntimeNpcSelfPrompt, ExecutionError> {
    let agency = own.agency.ok_or(ExecutionError::Invariant)?;
    let mind = own.mind.ok_or(ExecutionError::Invariant)?;
    let npc = own.npc.as_ref().ok_or(ExecutionError::Invariant)?;
    let notepad = own.knowledge.and_then(|entries| entries.get("general"));
    let traits = own.identity.traits.unwrap_or_default();
    let action = own.action.as_ref().map(|action| action.kind);
    let name = &own.observer_name;
    let bytes = (|| {
        heap_sum([
            optional_text(own.identity.species),
            name.name.storage_bytes(),
            optional_text(name.name_form),
            optional_text(name.indefinite_article),
            slice_bytes(traits, |trait_| {
                heap_sum([
                    trait_.id.len(),
                    trait_.name.heap_bytes()?,
                    trait_.description.heap_bytes()?,
                ])
            })?,
            own.attributes.iter().try_fold(
                own.attributes
                    .len()
                    .checked_mul(size_of::<RuntimeNpcOwnAttribute>())?,
                |bytes, attr| {
                    heap_sum([
                        bytes,
                        attr.name.len(),
                        attr.value.heap_bytes()?,
                        attr.unit.heap_bytes()?,
                        attribute_concern(attr).map_or(Some(0), HeapBytes::heap_bytes)?,
                        attr.meaning.heap_bytes()?,
                    ])
                },
            )?,
            own.action_status_labels
                .iter()
                .try_fold(0usize, |bytes, label| {
                    heap_sum([bytes, size_of::<String>(), label.len()])
                })?,
            optional_text(action),
            slice_bytes(&agency.goals, HeapBytes::heap_bytes)?,
            slice_bytes(&agency.attempts, HeapBytes::heap_bytes)?,
            mind.documents.iter().try_fold(
                mind.documents
                    .len()
                    .checked_mul(size_of::<RuntimeNpcOwnDocument>())?,
                |bytes, doc| heap_sum([bytes, doc.id.len(), doc.text.heap_bytes()?]),
            )?,
            notepad.map_or(Some(0), |entry| entry.heap_bytes())?,
        ])
    })()
    .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    Ok(RuntimeNpcSelfPrompt {
        observer_name: Named {
            name: name.name.to_owned(),
            name_form: name.name_form.map(str::to_owned),
            indefinite_article: name.indefinite_article.map(str::to_owned),
        },
        species: own.identity.species.map(str::to_owned),
        traits: traits.to_vec(),
        attributes: own
            .attributes
            .iter()
            .map(|attr| RuntimeNpcOwnAttribute {
                name: attr.name.clone(),
                status: attr.status,
                display: attr.display,
                value: attr.value.clone(),
                unit: attr.unit.clone(),
                min: attr.min,
                max: attr.max,
                concern: attribute_concern(attr).cloned(),
                meaning: attr.meaning.clone(),
            })
            .collect(),
        action_status_labels: own
            .action_status_labels
            .iter()
            .map(|label| (*label).to_owned())
            .collect(),
        action: action.map(str::to_owned),
        speech: own.speech,
        expressions: npc.expressions,
        goals: agency.goals.clone(),
        plan_revision: agency.plan.as_ref().map_or(0, |plan| plan.revision),
        documents: mind
            .documents
            .iter()
            .map(|doc| RuntimeNpcOwnDocument {
                id: doc.id.clone(),
                text: doc.text.clone(),
            })
            .collect(),
        notepad: notepad.map(|entry| (**entry).clone()),
        intentions: agency.attempts.clone(),
        storage,
    })
}

pub(crate) fn capture_npc_self(
    own: &OwnActorProduct<'_>,
    selection: RuntimeNpcSelfSelection,
    budget: &ByteBudget,
) -> Result<RuntimeNpcSelf, ExecutionError> {
    let storage = budget.reserve(
        optional_text(own.support_surface_id)
            + size_of::<RuntimeNpcDecisionFrame>()
            + 2 * size_of::<usize>(),
    )?;
    let prompt = matches!(selection, RuntimeNpcSelfSelection::Prompt)
        .then(|| prompt_facts(own, budget))
        .transpose()?;
    Ok(RuntimeNpcSelf {
        frame: Arc::new(RuntimeNpcDecisionFrame {
            x: own.position.x,
            y: own.position.y,
            z: own.position.z,
            heading: own.heading,
            support: own.support_surface_id.map(str::to_owned),
            _storage: storage,
        }),
        prompt,
    })
}
