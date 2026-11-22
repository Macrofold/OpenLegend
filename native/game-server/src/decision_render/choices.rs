use super::DecisionPolicy;
use crate::world::WorldError;
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound},
    host::ByteBudget,
    narration::{NameArticle, name_phrase},
    runtime::{RuntimeProvider, RuntimeProviderInput},
    state::{Named, Point},
};
use openlegend_world_host::pool::HostError;
use serde::{Deserialize, Serialize};
use serde_json::{Value, value::RawValue};

impl DecisionPolicy {
    /// Name the actual installed offers supplied by the live candidate. The
    /// decoded labels contain no executable command and the candidate checks
    /// its own binding before retaining the answer.
    pub(crate) fn answer_choices(
        &self,
        question: &RuntimeProvider,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeProviderInput>, WorldError> {
        question.with_request(|request| {
            #[derive(Deserialize)]
            struct Request<'a> {
                kind: &'a str,
                value: &'a RawValue,
            }
            let request: Request<'_> = serde_json::from_str(request).map_err(invalid)?;
            if request.kind != "choice-descriptions" {
                return Ok(None);
            }
            let size =
                json_tree_allocation_bound(request.value.get()).ok_or(WorldError::ProviderKind)?;
            let _decoded = budget.reserve(size).map_err(HostError::from)?;
            let input: Value = serde_json::from_str(request.value.get()).map_err(invalid)?;
            let offers = input["offers"].as_array().ok_or(WorldError::ProviderKind)?;
            let labels = input["activityLabels"]
                .as_array()
                .ok_or(WorldError::ProviderKind)?;
            let allocations = size
                .checked_add(4096)
                .and_then(|n| n.checked_add(4096 * (offers.len() + labels.len())))
                .ok_or(HostError::Capacity)?;
            let mut custody = budget.reserve(allocations).map_err(HostError::from)?;
            let descriptions = offers
                .iter()
                .map(|offer| self.offer(&input, offer))
                .collect::<Result<Vec<_>, _>>()?;
            let activity_labels = labels
                .iter()
                .map(|label| self.activity(label))
                .collect::<Result<Vec<_>, _>>()?;
            #[derive(Serialize)]
            #[serde(rename_all = "camelCase")]
            struct Answer<'a> {
                binding: &'a Value,
                descriptions: Vec<String>,
                activity_labels: Vec<String>,
            }
            let answer = json_record(&Answer {
                binding: &input["binding"],
                descriptions,
                activity_labels,
            })
            .map_err(invalid)?;
            custody.resize(answer.capacity()).map_err(HostError::from)?;
            Ok(Some(RuntimeProviderInput::new(answer, custody)))
        })?
    }

    fn offer(&self, input: &Value, offer: &Value) -> Result<String, WorldError> {
        let wording = &self.choices;
        let source = &input["self"];
        let meaning = &offer["meaning"];
        let kind = text(&meaning["kind"])?;
        let target = if let Some(ordinal) = meaning["body"].as_u64() {
            input["bodies"]
                .as_array()
                .and_then(|list| {
                    list.iter()
                        .find(|item| item["ordinal"].as_u64() == Some(ordinal))
                })
                .ok_or(WorldError::ProviderKind)?
        } else {
            source
        };
        let definition = || {
            meaning["definition"]
                .as_u64()
                .and_then(|id| usize::try_from(id).ok())
                .ok_or(WorldError::ProviderKind)
        };
        let mut result = match kind {
            "activities" | "inspection" => text(&wording[kind])?.to_owned(),
            "activity-page" => openlegend_simulation::activity::inspection_next_label(
                meaning["page"].as_str().ok_or(WorldError::ProviderKind)?,
            )
            .ok_or(WorldError::ProviderKind)?
            .to_owned(),
            "continuation" => match meaning["actionType"].as_str() {
                Some(action) => fill(text(&wording[kind][0])?, &[("action", action)]),
                None => text(&wording[kind][if meaning["planPending"] == true { 1 } else { 2 }])?
                    .to_owned(),
            },
            "follow" => fill(
                text(&wording[kind])?,
                &[("name", &name(&target["name"], NameArticle::Definite)?)],
            ),
            "status" => {
                let definition = definition()?;
                let status = text(
                    &wording["activations"][definition][if meaning["active"] == true {
                        "deactivate"
                    } else {
                        "activate"
                    }],
                )?;
                if meaning["body"].is_null() {
                    fill(text(&wording[kind][0])?, &[("label", status)])
                } else {
                    fill(
                        text(&wording[kind][1])?,
                        &[("label", status), ("name", text(&target["name"]["name"])?)],
                    )
                }
            }
            "approach" => fill(
                text(&wording[kind])?,
                &[
                    ("name", &name(&target["name"], NameArticle::Definite)?),
                    ("distance", &format!("{:.1}", number(&meaning["distance"])?)),
                    ("reach", &number_text(&meaning["reach"])?),
                ],
            ),
            "probe" => {
                let index = meaning["probe"]
                    .as_u64()
                    .and_then(|id| usize::try_from(id).ok())
                    .ok_or(WorldError::ProviderKind)?;
                fill(
                    text(&wording[kind])?,
                    &[("direction", text(&wording["probes"][index])?)],
                )
            }
            "strike" => fill(
                text(&wording["strikes"][definition()?][usize::from(meaning["hunting"] == true)])?,
                &[("name", &name(&target["name"], NameArticle::Definite)?)],
            ),
            // The capture supplies the selected recipe or cast text. This
            // formatter adds the common target and work details.
            "fish" | "cook" => String::new(),
            _ => return Err(WorldError::ProviderKind),
        };
        if let Some(temporary) = offer["temporary"].as_object() {
            let next = offer.get("nextAt").map(number_text).transpose()?;
            result.push_str(&fill(
                text(&wording["temporary"][usize::from(next.is_some())])?,
                &[
                    (
                        "reason",
                        text(temporary.get("message").ok_or(WorldError::ProviderKind)?)?,
                    ),
                    ("next", next.as_deref().unwrap_or_default()),
                ],
            ));
        }
        if source["hasAction"] == true && offer["hasCommand"] == true {
            result.push_str(text(&wording["transitions"][text(&offer["transition"])?])?);
        }
        if matches!(kind, "follow" | "status" | "strike" | "fish" | "cook")
            && (meaning["body"].is_null() || target["visible"] == true)
        {
            let distance = if meaning["body"].is_null() {
                0.0
            } else {
                let a: Point =
                    serde_json::from_value(source["position"].clone()).map_err(invalid)?;
                let b: Point =
                    serde_json::from_value(target["position"].clone()).map_err(invalid)?;
                (a.x - b.x).hypot((a.y - b.y).hypot(a.z - b.z))
            };
            let health = self.health(&target["health"])?;
            result.push_str(&fill(
                text(&wording["target"][usize::from(!health.is_empty())])?,
                &[
                    ("name", &name(&target["name"], NameArticle::Indefinite)?),
                    ("health", &health),
                    ("distance", &format!("{distance:.1}")),
                ],
            ));
        }
        Ok(result)
    }

    fn activity(&self, label: &Value) -> Result<String, WorldError> {
        let wording = &self.choices["activity"];
        match label["kind"].as_str() {
            Some("camp-own") => Ok(text(&wording["camp"])?.to_owned()),
            Some("hands") => Ok(fill(
                text(&wording["hands"])?,
                &[("label", text(&label["label"])?)],
            )),
            Some("person") => Ok(fill(
                text(&wording["person"])?,
                &[("name", &name(&label["name"], NameArticle::Definite)?)],
            )),
            _ => Err(WorldError::ProviderKind),
        }
    }

    fn health(&self, value: &Value) -> Result<String, WorldError> {
        let Some(amount) = value["value"].as_f64() else {
            return Ok(String::new());
        };
        let max = value.get("max").map(number_text).transpose()?;
        let min = value
            .get("min")
            .filter(|value| value.as_f64().is_some_and(|v| v != 0.0))
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
        let amount = json_record(&amount).map_err(invalid)?;
        Ok(fill(
            text(&self.choices["health"][form])?,
            &[
                ("attr", text(&value["name"])?),
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
fn number(value: &Value) -> Result<f64, WorldError> {
    value.as_f64().ok_or(WorldError::ProviderKind)
}
fn number_text(value: &Value) -> Result<String, WorldError> {
    json_record(&number(value)?).map_err(invalid)
}

fn name(value: &Value, article: NameArticle) -> Result<String, WorldError> {
    let named: Named = serde_json::from_value(value.clone()).map_err(invalid)?;
    let phrase = name_phrase(&named, article, false);
    phrase
        .as_unicode()
        .map(str::to_owned)
        .ok_or(WorldError::ProviderKind)
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
