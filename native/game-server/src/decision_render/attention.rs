use super::{DecisionPolicy, OfferedAction, RenderError, schema::tree_bytes};
use openlegend_simulation::{
    encoding::write_json_record,
    host::{ByteBudget, ByteReservation},
};
use serde::{Serialize, ser::SerializeMap};
use serde_json::{Map, Value};
use std::io;

pub(crate) struct BoundAttention {
    pub(crate) state: Value,
    pub(crate) questions: Value,
    _custody: ByteReservation,
}

struct Members<'a> {
    name: &'a str,
    value: &'a Value,
}
impl Serialize for Members<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut object = serializer.serialize_map(Some(1))?;
        object.serialize_entry(self.name, self.value)?;
        object.end()
    }
}

impl DecisionPolicy {
    /// Build the installed questions for the same offered aliases the native
    /// admission ticket owns. Count the actual emitted UTF-16 units without
    /// generating a second serialized provider body.
    pub(crate) fn action_attention(
        &self,
        fields: &Value,
        actions: &[OfferedAction<'_>],
        choose: bool,
        budget: &ByteBudget,
    ) -> Result<BoundAttention, RenderError> {
        let template = &self.action_attention[usize::from(choose)];
        let bytes = actions
            .iter()
            .map(|action| {
                action
                    .description
                    .len()
                    .saturating_add(action.id.len())
                    .saturating_add(tree_bytes(&template.question))
                    .saturating_add(640)
            })
            .fold(
                tree_bytes(fields)
                    .saturating_add(template.policy.len())
                    .saturating_add(2048),
                usize::saturating_add,
            );
        let custody = budget.reserve(bytes).map_err(|_| RenderError::Capacity)?;
        let context = fields
            .as_object()
            .ok_or(RenderError::Contract)?
            .iter()
            .filter(|(key, _)| {
                !matches!(
                    key.as_str(),
                    "knowledgeInstructions" | "navigation" | "planOffers"
                )
            })
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect::<Map<_, _>>();
        let prefix = template.question["instructions"]
            .as_str()
            .ok_or(RenderError::Contract)?;
        let mut questions = Map::new();
        let mut state = serde_json::json!({"decisionContext":context,"attentionPolicy":template.policy,"candidates":{}});
        let [whole, per_question] = self.judgment_characters;
        let mut state_size = units(&state)?;
        // `{"state":...,"questions":{}}` owns these separators before offers.
        let mut request_size = state_size + r#"{"state":,"questions":{}}"#.len();
        let mut largest = 0;
        for action in actions {
            let label = format!("Option {}", questions.len() + 1);
            let candidate: Value = action.description.into();
            let mut question = template.question.clone();
            question["instructions"] = prefix.replacen("Option 1", &label, 1).into();
            let question_units = units(&question)?;
            let comma = usize::from(!questions.is_empty());
            let addition = units(&Members {
                name: &label,
                value: &candidate,
            })? - 2
                + comma;
            let question_addition = units(&Members {
                name: action.id,
                value: &question,
            })? - 2
                + comma;
            let longest = largest.max(question_units);
            if state_size + addition + longest > per_question
                || request_size + addition + question_addition > whole
            {
                continue;
            }
            state["candidates"]
                .as_object_mut()
                .ok_or(RenderError::Contract)?
                .insert(label, candidate);
            questions.insert(action.id.to_owned(), question);
            state_size += addition;
            request_size += addition + question_addition;
            largest = longest;
        }
        Ok(BoundAttention {
            state,
            questions: Value::Object(questions),
            _custody: custody,
        })
    }
}

fn units(value: &impl Serialize) -> Result<usize, RenderError> {
    #[derive(Default)]
    struct Count(usize);
    impl io::Write for Count {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            // Continuation/surrogate boundaries can span writer calls; only
            // count the leading byte of each emitted scalar value.
            self.0 += bytes
                .iter()
                .map(|&byte| {
                    if byte < 0x80 || (0xc0..0xf0).contains(&byte) {
                        1
                    } else if byte >= 0xf0 {
                        2
                    } else {
                        0
                    }
                })
                .sum::<usize>();
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    let mut count = Count::default();
    write_json_record(value, &mut count).map_err(|_| RenderError::Contract)?;
    Ok(count.0)
}
