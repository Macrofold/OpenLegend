use super::DecisionPolicy;
use crate::world::WorldError;
use openlegend_simulation::{
    capture::{NpcActivityLabel, NpcDescriptionOffer, NpcDescriptionsRequest, NpcGuardTool, NpcOfferMeaning},
    commands::WorkTransitionMode,
    encoding::json_record,
    host::ByteBudget,
    narration::{NameArticle, name_phrase},
    reception::AttributeView,
    runtime::{LocalFormat, RuntimeProvider, RuntimeProviderInput},
    state::Named,
    text::{JsText, TextRef, substitute_fields},
    values::AttributeValue,
};
use openlegend_world_host::pool::HostError;
use serde_json::Value;

impl DecisionPolicy {
    /// Render the selected facts directly and return independently funded
    /// labels. The candidate still owns their bindings and all commands.
    pub(crate) fn answer_choices(
        &self,
        question: &RuntimeProvider,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeProviderInput>, WorldError> {
        question
            .with_choice_descriptions(|binding, request| {
                let count = request
                    .offers()
                    .len()
                    .checked_add(request.activity_labels().len())
                    .ok_or(HostError::Capacity)?;
                let bytes = request
                    .admitted_bytes()
                    .checked_mul(2)
                    .and_then(|bytes| bytes.checked_add(4096usize.checked_mul(count)?))
                    .and_then(|bytes| bytes.checked_add(4096))
                    .ok_or(HostError::Capacity)?;
                let custody = budget.reserve(bytes).map_err(HostError::from)?;
                let descriptions = request
                    .offers()
                    .iter()
                    .map(|offer| self.offer(request, offer))
                    .collect::<Result<Vec<_>, _>>()?;
                let activity_labels = request
                    .activity_labels()
                    .iter()
                    .map(|label| self.activity(label).map(JsText::from))
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(RuntimeProviderInput::local_format(
                    binding,
                    LocalFormat::ChoiceDescriptions {
                        descriptions,
                        activity_labels,
                    },
                    custody,
                )?)
            })?
            .transpose()
    }

    fn offer(
        &self,
        input: &NpcDescriptionsRequest,
        offer: &NpcDescriptionOffer,
    ) -> Result<JsText, WorldError> {
        use NpcOfferMeaning as Meaning;
        if matches!(offer.meaning, Meaning::Handover { .. }) {
            return Ok(JsText::default());
        }
        let words = &self.choices;
        let body = match offer.meaning {
            Meaning::Follow { body }
            | Meaning::Approach { body, .. }
            | Meaning::Strike { body, .. }
            | Meaning::EquippedStrike { body, .. }
            | Meaning::Ranged { body }
            | Meaning::Fish { body }
            | Meaning::Cook { body }
            | Meaning::FireCare { body } => Some(body),
            Meaning::Status { body, .. } | Meaning::Guard { body, .. } => body,
            _ => None,
        };
        let target = match body {
            Some(ordinal) => input.subject(ordinal).ok_or(WorldError::ProviderKind)?,
            None => input.myself(),
        };
        let mut result = match &offer.meaning {
            Meaning::Activities => text(&words["activities"])?.to_owned(),
            Meaning::Inspection => text(&words["inspection"])?.to_owned(),
            Meaning::ActivityPage { page } => {
                openlegend_simulation::activity::inspection_next_label(page)
                    .ok_or(WorldError::ProviderKind)?
                    .to_owned()
            }
            Meaning::Continuation {
                action_type,
                plan_pending,
            } => match action_type {
                Some(action) => fill(text(&words["continuation"][0])?, &[("action", action)]),
                None => text(&words["continuation"][if *plan_pending { 1 } else { 2 }])?.to_owned(),
            },
            Meaning::Follow { .. } => fill(
                text(&words["follow"])?,
                &[("name", &name(target.name, NameArticle::Definite)?)],
            ),
            Meaning::Status {
                definition, active, ..
            } => {
                let status = text(
                    &words["activations"][*definition]
                        [if *active { "deactivate" } else { "activate" }],
                )?;
                if body.is_none() {
                    fill(text(&words["status"][0])?, &[("label", status)])
                } else {
                    fill(
                        text(&words["status"][1])?,
                        &[("label", status), ("name", unicode(&target.name.name)?)],
                    )
                }
            }
            Meaning::Approach {
                distance, reach, ..
            } => fill(
                text(&words["approach"])?,
                &[
                    ("name", &name(target.name, NameArticle::Definite)?),
                    ("distance", &format!("{distance:.1}")),
                    ("reach", &number_text(*reach)?),
                ],
            ),
            Meaning::Probe { probe } => fill(
                text(&words["probe"])?,
                &[("direction", text(&words["probes"][*probe])?)],
            ),
            Meaning::Strike {
                definition,
                hunting,
                ..
            } => fill(
                text(&words["strikes"][*definition][usize::from(*hunting)])?,
                &[("name", &name(target.name, NameArticle::Definite)?)],
            ),
            Meaning::Guard { .. } | Meaning::EquippedStrike { .. } | Meaning::Evade { .. } => {
                String::new()
            }
            // Their core actions supplied an installed activity description.
            Meaning::Fish { .. } | Meaning::Cook { .. } | Meaning::FireCare { .. }
            | Meaning::Ranged { .. }
            | Meaning::Handover { .. } => String::new(),
        };
        if let Some(temporary) = &offer.temporary {
            let next = offer.next_at.map(number_text).transpose()?;
            result.push_str(&fill(
                text(&words["temporary"][usize::from(next.is_some())])?,
                &[
                    ("reason", unicode(&temporary.message)?),
                    ("next", next.as_deref().unwrap_or_default()),
                ],
            ));
        }
        if input.has_action() && offer.has_command {
            let mode = match offer.transition {
                WorkTransitionMode::Continue => "continue",
                WorkTransitionMode::Enqueue => "enqueue",
                WorkTransitionMode::Replace => "replace",
                WorkTransitionMode::Interrupt => "interrupt",
            };
            result.push_str(text(&words["transitions"][mode])?);
        }
        if matches!(
            offer.meaning,
            Meaning::Follow { .. }
                | Meaning::Status { .. }
                | Meaning::Strike { .. }
                | Meaning::EquippedStrike { .. }
                | Meaning::Ranged { .. }
                | Meaning::Fish { .. }
                | Meaning::Cook { .. }
                | Meaning::FireCare { .. }
        ) && target.visible
        {
            let distance = if body.is_none() {
                0.0
            } else {
                let a = input.myself().position;
                let b = target.position;
                (a.x - b.x).hypot((a.y - b.y).hypot(a.z - b.z))
            };
            let health = self.health(target.health)?;
            result.push_str(&fill(
                text(&words["target"][usize::from(!health.is_empty())])?,
                &[
                    ("name", &name(target.name, NameArticle::Indefinite)?),
                    ("health", &health),
                    ("distance", &format!("{distance:.1}")),
                ],
            ));
        }
        if let Meaning::Guard { tool, .. } = &offer.meaning {
            let mut description = self.guard(tool, body.map(|_| &target.name.name))?;
            description.push_str(&result);
            return Ok(description);
        }
        if let Meaning::Evade { choice } = &offer.meaning {
            let mut description = choice.description.clone();
            description.push_str(&result);
            return Ok(description);
        }
        Ok(result.into())
    }

    fn guard(&self, tool: &NpcGuardTool, target: Option<&JsText>) -> Result<JsText, WorldError> {
        let choice = &self.choices["guard"];
        let mut result = tool.equipment.clone();
        if !result.is_empty() {
            result.push_str(" ");
        }
        result.push_text(&substitute_fields(
            text(
                &choice[if target.is_some() {
                    "facing"
                } else {
                    "direction"
                }],
            )?,
            &[
                ("label", TextRef::Unicode(&tool.label)),
                ("shield", TextRef::Text(&tool.shield)),
                ("name", target.map_or(TextRef::Unicode(""), TextRef::Text)),
            ],
        ));
        result.push_str(". ");
        result.push_text(&substitute_fields(
            text(&choice["detail"])?,
            &[
                ("preparation", TextRef::Unicode(&number_text(tool.preparation)?)),
                ("ready", TextRef::Unicode(&number_text(tool.ready)?)),
                ("reduction", TextRef::Unicode(&number_text(tool.reduction * 100.0)?)),
                ("coverage", TextRef::Unicode(&number_text(tool.coverage)?)),
                ("recovery", TextRef::Unicode(&number_text(tool.recovery)?)),
            ],
        ));
        Ok(result)
    }

    fn activity(&self, label: &NpcActivityLabel) -> Result<String, WorldError> {
        let words = &self.choices["activity"];
        match label {
            NpcActivityLabel::CampOwn => Ok(text(&words["camp"])?.to_owned()),
            NpcActivityLabel::Hands { label } => {
                Ok(fill(text(&words["hands"])?, &[("label", unicode(label)?)]))
            }
            NpcActivityLabel::Person { name: person } => Ok(fill(
                text(&words["person"])?,
                &[("name", &name(person, NameArticle::Definite)?)],
            )),
        }
    }

    fn health(&self, value: Option<&AttributeView>) -> Result<String, WorldError> {
        let Some(value) = value else {
            return Ok(String::new());
        };
        let Some(AttributeValue::Number(amount)) = value.value else {
            return Ok(String::new());
        };
        let max = value.max.map(number_text).transpose()?;
        let min = value
            .min
            .filter(|value| *value != 0.0)
            .map(number_text)
            .transpose()?;
        let form = if max.is_none() {
            0
        } else if min.is_none() {
            1
        } else {
            2
        };
        let amount = format!("{amount:.3e}").parse::<f64>().map_err(invalid)?;
        let amount = number_text(amount)?;
        Ok(fill(
            text(&self.choices["health"][form])?,
            &[
                ("attr", &value.name),
                ("value", &amount),
                ("min", min.as_deref().unwrap_or_default()),
                ("max", max.as_deref().unwrap_or_default()),
            ],
        ))
    }
}

fn invalid(_: impl std::fmt::Display) -> WorldError {
    WorldError::ProviderKind
}

fn text(value: &Value) -> Result<&str, WorldError> {
    value.as_str().ok_or(WorldError::ProviderKind)
}

fn number_text(value: f64) -> Result<String, WorldError> {
    json_record(&value).map_err(invalid)
}

fn unicode(value: &JsText) -> Result<&str, WorldError> {
    value.as_unicode().ok_or(WorldError::ProviderKind)
}

fn name(value: &Named, article: NameArticle) -> Result<String, WorldError> {
    Ok(unicode(&name_phrase(value, article, false))?.to_owned())
}

/// Substitute only authored template markers; literal actor text can contain
/// any of the same characters without further interpretation.
fn fill(template: &str, fields: &[(&str, &str)]) -> String {
    let mut output = String::new();
    let mut rest = template;
    while let Some(index) = rest.find('@') {
        output.push_str(&rest[..index]);
        let candidate = &rest[index + 1..];
        let length = candidate
            .bytes()
            .take_while(u8::is_ascii_alphabetic)
            .count();
        let key = &candidate[..length];
        if let Some((_, value)) = fields.iter().find(|(name, _)| *name == key) {
            output.push_str(value);
        } else {
            output.push('@');
            output.push_str(key);
        }
        rest = &candidate[length..];
    }
    output.push_str(rest);
    output
}
