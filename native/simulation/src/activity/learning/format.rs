//! Finite Source captions use the installed world's wording. Native owns the
//! selected attempts, structural candidates, canonical templates and effects.
use super::*;
use crate::execution::ExecutionError;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use std::mem::size_of;
use std::sync::{Arc, OnceLock};

#[derive(Serialize)]
struct Profile {
    id: String,
    version: u64,
}
#[derive(Serialize)]
pub(crate) struct LearningFormatRequest {
    pub binding: GeometryBinding,
    profile: Profile,
    input: Input,
    #[serde(skip)]
    limits: crate::activity::ActivityDisplayLimits,
    #[serde(skip)]
    storage: ByteReservation,
}

#[derive(Serialize)]
#[serde(tag = "kind", content = "entries", rename_all = "lowercase")]
enum Input {
    Names(Vec<Option<OwnedName>>),
    Descriptions(Vec<OwnedDescription>),
}

#[derive(Serialize)]
struct OwnedName {
    command: OwnedNameCommand,
    #[serde(skip_serializing_if = "Option::is_none")]
    effect: Option<OwnedEffect>,
}

#[derive(Serialize)]
struct OwnedNameCommand {
    #[serde(rename = "type")]
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation: Option<&'static str>,
}

#[derive(Serialize)]
struct OwnedEffect {
    label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    activate: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    deactivate: Option<String>,
}

#[derive(Serialize)]
struct OwnedDescription {
    name: JsText,
    entries: Vec<OwnedDescriptionEntry>,
    incomplete: bool,
    failures: Vec<ActivityView>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnedDescriptionEntry {
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_name: Option<JsText>,
    view: ActivityView,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct LearningFormatAnswer {
    pub binding: GeometryBinding,
    pub texts: Vec<Option<JsText>>,
    #[serde(skip)]
    storage: Option<ByteReservation>,
}
impl LearningFormatAnswer {
    pub(crate) fn decode(
        text: &str,
        budget: &ByteBudget,
    ) -> Result<Self, crate::simulation::DriveError> {
        use crate::simulation::DriveError;
        let storage = crate::install::reserve_typed_parse::<Self>(
            text,
            size_of::<Option<JsText>>(),
            None,
            budget,
        )
        .map_err(|e| match e {
            crate::install::InstallError::Capacity => DriveError::Capacity,
            _ => DriveError::MalformedResponse,
        })?;
        let mut answer: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        answer.storage = Some(storage);
        Ok(answer)
    }
}
pub(super) struct LearningTexts {
    pub texts: Vec<Option<JsText>>,
    pub storage: ByteReservation,
}
impl LearningFormatRequest {
    fn count(&self) -> usize {
        match &self.input {
            Input::Names(entries) => entries.len(),
            Input::Descriptions(entries) => entries.len(),
        }
    }
    pub fn names(
        binding: GeometryBinding,
        state: &crate::simulation::SimulationState,
        entries: Vec<Option<NameRead<'_>>>,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let bytes = entries
            .iter()
            .flatten()
            .try_fold(
                entries.len() * size_of::<Option<OwnedName>>(),
                |bytes, name| {
                    bytes
                        .checked_add(name.command.purpose.map_or(0, JsText::storage_bytes))?
                        .checked_add(name.effect.as_ref().map_or(0, |words| {
                            words.label.len()
                                + words.activate.map_or(0, str::len)
                                + words.deactivate.map_or(0, str::len)
                        }))
                },
            )
            .ok_or(ExecutionError::Capacity)?;
        Self::prepare(binding, state, bytes, budget, || {
            Input::Names(
                entries
                    .into_iter()
                    .map(|name| {
                        name.map(|name| OwnedName {
                            command: OwnedNameCommand {
                                kind: name.command.kind,
                                purpose: name.command.purpose.cloned(),
                                operation: name.command.operation,
                            },
                            effect: name.effect.map(|effect| OwnedEffect {
                                label: effect.label.to_owned(),
                                activate: effect.activate.map(str::to_owned),
                                deactivate: effect.deactivate.map(str::to_owned),
                            }),
                        })
                    })
                    .collect(),
            )
        })
    }
    pub fn descriptions(
        binding: GeometryBinding,
        state: &crate::simulation::SimulationState,
        entries: Vec<DescriptionRead<'_>>,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let bytes = entries
            .iter()
            .try_fold(
                entries.len() * size_of::<OwnedDescription>(),
                |bytes, description| {
                    let body = description.entries.iter().try_fold(
                        bytes + description.name.storage_bytes(),
                        |bytes, entry| {
                            bytes
                                .checked_add(
                                    size_of::<OwnedDescriptionEntry>()
                                        + entry.parent_id.map_or(0, str::len)
                                        + entry.parent_name.map_or(0, JsText::storage_bytes),
                                )?
                                .checked_add(entry.view.heap_bytes()?)
                        },
                    )?;
                    description.failures.iter().try_fold(body, |bytes, view| {
                        bytes
                            .checked_add(size_of::<ActivityView>())?
                            .checked_add(view.heap_bytes()?)
                    })
                },
            )
            .ok_or(ExecutionError::Capacity)?;
        Self::prepare(binding, state, bytes, budget, || {
            Input::Descriptions(
                entries
                    .into_iter()
                    .map(|description| OwnedDescription {
                        name: description.name.clone(),
                        incomplete: description.incomplete,
                        entries: description
                            .entries
                            .into_iter()
                            .map(|entry| OwnedDescriptionEntry {
                                parent_id: entry.parent_id.map(str::to_owned),
                                parent_name: entry.parent_name.cloned(),
                                view: entry.view.clone(),
                            })
                            .collect(),
                        failures: description.failures.into_iter().cloned().collect(),
                    })
                    .collect(),
            )
        })
    }
    fn prepare(
        binding: GeometryBinding,
        state: &crate::simulation::SimulationState,
        bytes: usize,
        budget: &ByteBudget,
        input: impl FnOnce() -> Input,
    ) -> Result<Arc<Self>, ExecutionError> {
        let profile = &state.installed.content.profile;
        let storage = budget.reserve(
            bytes
                .checked_add(profile.id.len() + size_of::<Self>() + 96)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Arc::new(Self {
            binding,
            profile: Profile {
                id: profile.id.clone(),
                version: profile.version,
            },
            input: input(),
            limits: *state.activity.display,
            storage,
        }))
    }
    pub fn validate(&self, answer: &LearningFormatAnswer) -> Result<(), ExecutionError> {
        if answer.binding != self.binding || answer.texts.len() != self.count() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Ok(())
    }
    pub fn finish(
        &self,
        mut answer: LearningFormatAnswer,
    ) -> Result<LearningTexts, ExecutionError> {
        self.validate(&answer)?;
        Ok(LearningTexts {
            texts: answer.texts,
            storage: answer.storage.take().ok_or(ExecutionError::Invariant)?,
        })
    }

    /// Pure formatting. The request retains the exact admitted history and
    /// the answer receives independent custody for its actual text backing.
    pub(crate) fn format(
        &self,
        budget: &ByteBudget,
    ) -> Result<LearningFormatAnswer, ExecutionError> {
        let mut storage = budget.reserve(
            self.storage
                .bytes()
                .checked_mul(12)
                .and_then(|n| n.checked_add(4096))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let profile = (self.profile.id.as_str(), self.profile.version);
        let texts: Vec<_> = match &self.input {
            Input::Names(entries) => entries
                .iter()
                .map(|entry| {
                    entry
                        .as_ref()
                        .map(|name| {
                            crate::worlds::activity_display::shared_name(
                                profile,
                                name.command.kind,
                                name.command.purpose.as_ref(),
                                name.command.operation,
                                name.effect.as_ref().map(|words| {
                                    (
                                        words.label.as_str(),
                                        words.activate.as_deref(),
                                        words.deactivate.as_deref(),
                                    )
                                }),
                            )
                            .ok_or(ExecutionError::UnsupportedFamily)
                        })
                        .transpose()
                })
                .collect::<Result<_, _>>()?,
            Input::Descriptions(entries) => entries
                .iter()
                .map(|entry| entry.render(&self.limits).map(Some))
                .collect::<Result<_, _>>()?,
        };
        let bytes = texts
            .iter()
            .try_fold(
                texts.capacity() * size_of::<Option<JsText>>(),
                |bytes, text| bytes.checked_add(text.as_ref().map_or(0, JsText::storage_bytes)),
            )
            .ok_or(ExecutionError::Capacity)?;
        storage.resize(bytes)?;
        Ok(LearningFormatAnswer {
            binding: self.binding,
            texts,
            storage: Some(storage),
        })
    }
}

impl OwnedDescription {
    fn render(
        &self,
        limits: &crate::activity::ActivityDisplayLimits,
    ) -> Result<JsText, ExecutionError> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Copy {
            evidence: String,
            incomplete: String,
            other_attempts: String,
        }
        static COPY: OnceLock<Copy> = OnceLock::new();
        let copy = COPY.get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../../../packages/domain/src/activity-learning-copy.json"
            ))
            .expect("checked activity learning copy")
        });
        let purpose = self.entries.first().and_then(|entry| {
            let name = entry.parent_name.as_ref().filter(|name| !name.is_empty())?;
            self.entries
                .iter()
                .all(|other| {
                    other.parent_id == entry.parent_id && other.parent_name.as_ref() == Some(name)
                })
                .then_some(name)
        });
        let wrap = |name, children| ActivityView {
            name,
            children: Some(children),
            actor: None,
            target: None,
            tool: None,
            facts: Vec::new(),
            result: None,
        };
        let scene = wrap(
            purpose.unwrap_or(&self.name).clone(),
            self.entries
                .iter()
                .map(|entry| {
                    match entry.parent_name.as_ref().filter(|name| {
                        purpose.is_none() && !name.is_empty() && **name != entry.view.name
                    }) {
                        Some(name) => wrap(name.clone(), vec![entry.view.clone()]),
                        None => entry.view.clone(),
                    }
                })
                .collect(),
        );
        let project = |view: &ActivityView, header| {
            crate::activity::project_activity(
                view,
                header,
                limits,
                limits.display_bytes,
                limits.depth,
            )
            .map(|value| value.text)
            .map_err(|error| match error {
                crate::activity::ActivityError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })
        };
        let text = project(&scene, Some("What happened"))?;
        let mut units: Vec<_> = text.units().chain(copy.evidence.encode_utf16()).collect();
        if self.incomplete {
            units.extend(copy.incomplete.encode_utf16());
        }
        if !self.failures.is_empty() {
            units.extend(copy.other_attempts.encode_utf16());
            for (index, view) in self.failures.iter().enumerate() {
                if index > 0 {
                    units.extend("; ".encode_utf16());
                }
                units.extend(project(view, None)?.units());
            }
            units.push(u16::from(b'.'));
        }
        Ok(JsText::from_units(units))
    }
}
#[derive(Serialize)]
pub(super) struct NameRead<'a> {
    command: NameCommand<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    effect: Option<Effect<'a>>,
}
#[derive(Serialize)]
struct NameCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation: Option<&'static str>,
}
#[derive(Serialize)]
struct Effect<'a> {
    label: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    activate: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    deactivate: Option<&'a str>,
}
pub(super) fn name_read<'a>(
    entry: &'a ActivityOccurrence,
    state: &'a crate::simulation::SimulationState,
) -> Option<NameRead<'a>> {
    use crate::commands::{NativeCommand, StatusOperation};
    if !matches!(
        entry.command,
        NativeCommand::Move { .. }
            | NativeCommand::Say { .. }
            | NativeCommand::StatusEffect { .. }
            | NativeCommand::Follow { .. }
            | NativeCommand::Strike { .. }
    ) {
        return None;
    }
    let (operation, effect) = if let NativeCommand::StatusEffect {
        definition_id,
        operation,
        ..
    } = &entry.command
    {
        (
            Some(if *operation == StatusOperation::Activate {
                "activate"
            } else {
                "deactivate"
            }),
            state
                .installed
                .status_policy
                .definitions
                .iter()
                .find(|d| d.id == *definition_id)
                .map(|d| Effect {
                    label: &d.label,
                    activate: d.actions.as_ref().map(|a| a.activate.as_str()),
                    deactivate: d.actions.as_ref().map(|a| a.deactivate.as_str()),
                }),
        )
    } else {
        (None, None)
    };
    Some(NameRead {
        command: NameCommand {
            kind: entry.command.kind(),
            purpose: entry.command.envelope().purpose.as_ref(),
            operation,
        },
        effect,
    })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DescriptionRead<'a> {
    pub name: &'a JsText,
    pub entries: Vec<DescriptionEntry<'a>>,
    pub incomplete: bool,
    pub failures: Vec<&'a ActivityView>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DescriptionEntry<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_name: Option<&'a JsText>,
    pub view: &'a ActivityView,
}
pub(super) fn manifest_shape(
    state: &crate::simulation::SimulationState,
    budget: &ByteBudget,
) -> Result<(SqlCell, ByteReservation), ExecutionError> {
    // One immutable installed manifest is projected once per batch. Replacing
    // complete definitions by their verified pins is the existing Source key.
    let raw = &state.installed.manifest.row.payload;
    let storage = budget.reserve(
        crate::experience::encoded_body_bound(raw)
            .map_err(|_| ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut value: SqlCell = serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
    let SqlCell::Object(object) = &mut value else {
        return Err(ExecutionError::Invariant);
    };
    object.shift_remove("revision");
    for (field, pin) in [
        ("definitions", "pins"),
        ("senses", "sensePins"),
        ("bodyPolicy", "bodyPolicyPin"),
        ("acoustics", "acousticsPin"),
        ("rangedPolicy", "rangedPolicyPin"),
    ] {
        let value = object.get(pin).ok_or(ExecutionError::Invariant)?.clone();
        object.insert(field.to_owned(), value);
    }
    Ok((value, storage))
}
