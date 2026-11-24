//! The first requested learned frontier is a sequence of ordinary speech.
//! Syntax here selects a subset of the already installed verified library; it
//! neither teaches a method nor interprets text as instructions.
use super::models::{LearningAcquisition, LearningMethod};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation, retained_size::HeapBytes};
use crate::records::SqlCell;
use crate::simulation::SimulationState;
use crate::text::JsText;
use serde::Deserialize;
use std::sync::{Arc, LazyLock};

#[derive(Deserialize)]
pub(crate) struct LearnedOutcomeCopy<'a> {
    pub code: &'a str,
    pub message: &'a str,
}
impl LearnedOutcomeCopy<'_> {
    pub fn outcome(&self, ok: bool) -> crate::commands::Outcome {
        crate::commands::Outcome {
            ok,
            code: self.code.into(),
            message: self.message.into(),
            spent: None,
            outputs: None,
            recipe_id: None,
            item_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        }
    }
}
#[derive(Deserialize)]
pub(crate) struct LearnedActivityCopy<'a> {
    pub label: &'a str,
    tentative: &'a str,
    #[serde(borrow)]
    pub unknown: LearnedOutcomeCopy<'a>,
    #[serde(borrow)]
    pub busy: LearnedOutcomeCopy<'a>,
    #[serde(borrow)]
    pub withdrawn: LearnedOutcomeCopy<'a>,
    #[serde(borrow)]
    pub queued: LearnedOutcomeCopy<'a>,
}
pub(crate) static LEARNED_ACTIVITY_COPY: LazyLock<LearnedActivityCopy<'static>> =
    LazyLock::new(|| {
        #[derive(Deserialize)]
        struct Copy<'a> {
            #[serde(borrow)]
            invocation: LearnedActivityCopy<'a>,
        }
        serde_json::from_str::<Copy>(include_str!(
            "../../../../../packages/domain/src/activity-learning-copy.json"
        ))
        .expect("repository-owned learned activity choice wording")
        .invocation
    });

pub(crate) struct LearnedSpeech<'a> {
    method: &'a LearningMethod,
    bindings: &'a SqlCell,
    children: &'a [SqlCell],
}

pub(crate) struct LearnedSpeechLeaf<'a> {
    pub key: &'a JsText,
    pub purpose: &'a JsText,
    pub text: &'a JsText,
}

impl<'a> LearnedSpeech<'a> {
    fn from_current(
        method: &'a LearningMethod,
        acquisition: &'a LearningAcquisition,
    ) -> Option<Self> {
        Self::from_bindings(method, acquisition.body().get("bindings")?)
    }

    fn from_bindings(method: &'a LearningMethod, bindings: &'a SqlCell) -> Option<Self> {
        let body = method.body();
        if !body.get("executable")?.as_bool()? {
            return None;
        }
        let roles = body.get("roles")?.as_object()?;
        if roles.values().any(|role| {
            role.get("kind").and_then(SqlCell::as_str) != Some("text")
                || role
                    .get("commandFields")
                    .and_then(SqlCell::as_array)
                    .is_none_or(|fields| fields.len() != 1 || fields[0].as_str() != Some("text"))
        }) {
            return None;
        }
        let root = body.get("root")?;
        let children = root.get("children")?.as_array()?;
        if bindings.object_len()? != roles.len() {
            return None;
        }
        let view = Self {
            method,
            bindings,
            children,
        };
        if !children.iter().all(|step| view.leaf(step).is_some()) {
            return None;
        }
        Some(view)
    }

    pub fn id(&self) -> &str {
        self.method.id()
    }

    pub fn name(&self) -> &JsText {
        self.method
            .body()
            .get("name")
            .and_then(SqlCell::as_text)
            .expect("installed learned method name")
    }

    pub fn bindings(&self) -> &SqlCell {
        self.bindings
    }

    pub fn children(&self) -> &[SqlCell] {
        self.children
    }

    /// Resolve the exact remembered words of this already admitted method leaf.
    /// The plan must check that the requested leaf is part of the method's
    /// outstanding work before using that borrowed text to prepare a command.
    pub fn leaf<'b>(&'b self, node: &'b SqlCell) -> Option<LearnedSpeechLeaf<'b>> {
        speech_leaf(node, self.bindings)
    }

    /// Hold only the acquired recipe ID and exact remembered bindings for a
    /// native reader whose rendered text can survive a provider await.
    pub(crate) fn hold_source(
        &self,
        budget: &ByteBudget,
    ) -> Result<LearnedSpeechSource, ExecutionError> {
        let bytes = self
            .bindings
            .heap_bytes()
            .and_then(|n| n.checked_add(self.id().len()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok(LearnedSpeechSource {
            method: self.id().to_owned(),
            bindings: self.bindings.clone_within_heap_bound(),
            _storage: storage,
        })
    }

    pub fn retain_choice(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<Arc<LearnedSpeechChoice>, ExecutionError> {
        let source = self.hold_source(budget)?;
        let headers = std::mem::size_of::<LearnedSpeechChoice>() + 2 * std::mem::size_of::<usize>();
        let bytes = state
            .activity
            .display
            .display_bytes
            .checked_mul(16)
            .and_then(|n| n.checked_add(LEARNED_ACTIVITY_COPY.tentative.len() * 4 + headers))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut description = crate::activity::inspection::render_method(
            self.method.body(),
            self.bindings,
            state,
            LEARNED_ACTIVITY_COPY.label,
            budget,
        )?;
        description.push_str(LEARNED_ACTIVITY_COPY.tentative);
        storage.resize(
            description
                .storage_bytes()
                .checked_add(headers)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Arc::new(LearnedSpeechChoice {
            source,
            description,
            _storage: storage,
        }))
    }
}

pub(crate) struct LearnedSpeechSource {
    method: String,
    bindings: SqlCell,
    _storage: ByteReservation,
}
impl LearnedSpeechSource {
    /// Resolve against the actor's current accepted learned row. Independent
    /// working support can preserve identical words after another correction.
    /// A changed binding or complete support loss cannot run a held choice.
    pub fn current<'a>(
        &self,
        state: &'a SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Option<LearnedSpeech<'a>>, ExecutionError> {
        Ok(current_learned_speech(state, actor, &self.method, budget)?
            .filter(|right| right.bindings == &self.bindings))
    }
}

#[derive(serde::Serialize)]
pub struct LearnedSpeechChoice {
    #[serde(skip)]
    pub(crate) source: LearnedSpeechSource,
    pub description: JsText,
    #[serde(skip)]
    _storage: ByteReservation,
}

pub(crate) fn speech_leaf<'a>(
    node: &'a SqlCell,
    bindings: &'a SqlCell,
) -> Option<LearnedSpeechLeaf<'a>> {
    if node.get("kind")?.as_str()? != "invoke"
        || node.get("command")?.as_str()? != "say"
        || node.get("requirements").is_some_and(|requirements| {
            requirements
                .as_array()
                .is_none_or(|value| !value.is_empty())
        })
        || node
            .get("outputs")
            .is_some_and(|outputs| outputs.as_array().is_none_or(|value| !value.is_empty()))
    {
        return None;
    }
    let args = node.get("args")?.as_object()?;
    if args.len() != 1 {
        return None;
    }
    let role = args.get("text")?;
    if role.object_len()? != 1 {
        return None;
    }
    let text = bindings.get_text(role.get("role")?.as_text()?)?.as_text()?;
    Some(LearnedSpeechLeaf {
        key: node.get("key")?.as_text()?,
        purpose: node.get("name")?.as_text()?,
        text,
    })
}

pub(crate) fn visit_learned_speech<'a>(
    state: &'a SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut visit: impl FnMut(LearnedSpeech<'a>) -> Result<bool, ExecutionError>,
) -> Result<(), ExecutionError> {
    super::read::visit_current_while(state, actor, budget, |method, acquisition| {
        if let Some(method) = LearnedSpeech::from_current(method, acquisition) {
            visit(method)
        } else {
            Ok(true)
        }
    })
}

pub(crate) fn current_learned_speech<'a>(
    state: &'a SimulationState,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Option<LearnedSpeech<'a>>, ExecutionError> {
    Ok(super::read::current_acquisition(state, actor, id, budget)?
        .and_then(|(method, acquisition)| LearnedSpeech::from_current(method, acquisition)))
}

/// Cold validation uses the immutable method definition even after its last
/// supporting memory was withdrawn. Settlement then applies the normal
/// current-acquisition check before executing any outstanding step.
pub(crate) fn stored_learned_speech<'a>(
    state: &'a SimulationState,
    id: &str,
    bindings: &'a SqlCell,
) -> Option<LearnedSpeech<'a>> {
    LearnedSpeech::from_bindings(state.activity.library.methods.get(id)?, bindings)
}
