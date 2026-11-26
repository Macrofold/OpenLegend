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
        let mut size = RequestFit::new(&state, self.judgment_characters)?;
        for action in actions {
            let label = format!("Option {}", questions.len() + 1);
            let candidate: Value = action.description.into();
            let mut question = template.question.clone();
            question["instructions"] = prefix.replacen("Option 1", &label, 1).into();
            if !size.include(action.id, &label, &candidate, &question)? {
                continue;
            }
            state["candidates"]
                .as_object_mut()
                .ok_or(RenderError::Contract)?
                .insert(label, candidate);
            questions.insert(action.id.to_owned(), question);
        }
        Ok(BoundAttention {
            state,
            questions: Value::Object(questions),
            _custody: custody,
        })
    }

    /// Render one bounded relevance map over already permitted optional facts.
    /// Unfitted facts keep their original ordinal and never enter the request.
    /// The returned owner funds the independent graph through provider encoding.
    /// docs/memory-architecture.md#4-jev-attention-before-context-inclusion
    pub(crate) fn recall_attention(
        &self,
        fields: &Map<String, Value>,
        candidates: &[Value],
        budget: &ByteBudget,
    ) -> Result<BoundAttention, RenderError> {
        let template = &self.recall_attention;
        let prefix = template.question["instructions"]
            .as_str()
            .ok_or(RenderError::Contract)?;
        let bytes = fields.iter().fold(
            tree_bytes(&template.question)
                .saturating_add(template.policy.len())
                .saturating_add(2048),
            |bytes, (key, value)| {
                bytes
                    .saturating_add(128)
                    .saturating_add(key.len())
                    .saturating_add(tree_bytes(value))
            },
        );
        let mut custody = budget.reserve(bytes).map_err(|_| RenderError::Capacity)?;
        let mut state = Value::Object(fields.clone());
        state["attentionPolicy"] = template.policy.as_str().into();
        state["candidates"] = Value::Object(Map::new());
        let mut questions = Map::new();
        let mut size = RequestFit::new(&state, self.judgment_characters)?;
        for (ordinal, candidate) in candidates.iter().enumerate() {
            let id = format!("c{ordinal}");
            let mut question = template.question.clone();
            question["instructions"] = prefix.replace("@rgs:recall-candidate", &id).into();
            if !size.include(&id, &id, candidate, &question)? {
                continue;
            }
            let bytes = custody
                .bytes()
                .saturating_add(tree_bytes(candidate))
                .saturating_add(tree_bytes(&question))
                .saturating_add(2 * id.len() + 256);
            custody.resize(bytes).map_err(|_| RenderError::Capacity)?;
            state["candidates"]
                .as_object_mut()
                .ok_or(RenderError::Contract)?
                .insert(id.clone(), candidate.clone());
            questions.insert(id, question);
        }
        Ok(BoundAttention {
            state,
            questions: Value::Object(questions),
            _custody: custody,
        })
    }

    pub(crate) fn recall_includes(&self, score: Option<f64>) -> bool {
        score.is_some_and(|score| score >= self.recall_threshold)
    }
}

struct RequestFit {
    state: usize,
    request: usize,
    longest: usize,
    count: usize,
    limits: [usize; 2],
}

impl RequestFit {
    fn new(state: &Value, limits: [usize; 2]) -> Result<Self, RenderError> {
        let state = units(state)?;
        Ok(Self {
            state,
            // The wrapper owns these separators before any question is added.
            request: state + r#"{"state":,"questions":{}}"#.len(),
            longest: 0,
            count: 0,
            limits,
        })
    }

    fn include(
        &mut self,
        id: &str,
        label: &str,
        candidate: &Value,
        question: &Value,
    ) -> Result<bool, RenderError> {
        let comma = usize::from(self.count != 0);
        let addition = units(&Members {
            name: label,
            value: candidate,
        })? - 2
            + comma;
        let question_addition = units(&Members {
            name: id,
            value: question,
        })? - 2
            + comma;
        let longest = self.longest.max(units(question)?);
        let [whole, per_question] = self.limits;
        if self.state + addition + longest > per_question
            || self.request + addition + question_addition > whole
        {
            return Ok(false);
        }
        self.state += addition;
        self.request += addition + question_addition;
        self.longest = longest;
        self.count += 1;
        Ok(true)
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
