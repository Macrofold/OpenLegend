//! The first response can request a read-only continuation. A question must
//! never share a provider result with effects or an invention.
use super::{CallFailure, provider};
use openlegend_simulation::{
    attention::SceneAttentionPolicy,
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
    runtime::{RuntimeNpcBindingRequest, RuntimeNpcRead, RuntimeNpcSeparation},
};
use serde::Serialize;
use serde::ser::SerializeSeq;
use std::mem::size_of;

pub(super) enum Draft {
    Decision(SqlCell, ByteReservation),
    Questions(Vec<SqlCell>, ByteReservation),
}

impl Draft {
    pub(super) fn read(parsed: provider::GenerationOutput) -> Result<Self, CallFailure> {
        let (value, custody) = parsed.into_parts();
        let SqlCell::Object(mut response) = value else {
            return Err(CallFailure::Invalid);
        };
        match response.shift_remove("queries") {
            None | Some(SqlCell::Null) => {}
            Some(SqlCell::Array(questions)) if questions.is_empty() => {}
            Some(SqlCell::Array(questions))
                if response
                    .get("operations")
                    .and_then(SqlCell::as_array)
                    .is_some_and(|operations| operations.is_empty())
                    && response.get("invention").is_none_or(SqlCell::is_null) =>
            {
                return Ok(Self::Questions(questions, custody));
            }
            _ => return Err(CallFailure::Invalid),
        }
        Ok(Self::Decision(SqlCell::Object(response), custody))
    }
}

#[derive(Serialize)]
pub(super) struct Answers<'a> {
    results: Vec<Answer<'a>>,
    coverage: &'static str,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(Serialize)]
struct Answer<'a> {
    query: &'a SqlCell,
    result: Separation,
}

#[derive(Serialize)]
struct Separation {
    #[serde(flatten)]
    measurement: RuntimeNpcSeparation,
    #[serde(skip_serializing_if = "Vec::is_empty", serialize_with = "citations")]
    support: Vec<(usize, String)>,
}

fn citations<S: serde::Serializer>(support: &[(usize, String)], out: S) -> Result<S::Ok, S::Error> {
    let mut seq = out.serialize_seq(Some(support.len()))?;
    for (_, alias) in support {
        seq.serialize_element(alias)?;
    }
    seq.end()
}

impl Answers<'_> {
    /// Only results kept under the installed byte limit enter the final
    /// disclosure ticket. Each reference owns the original facet ordinal.
    pub(super) fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        for answer in &self.results {
            for (ordinal, alias) in &answer.result.support {
                binding
                    .bind_query_facet(alias, *ordinal)
                    .map_err(super::prepare::packet_failure)?;
            }
        }
        Ok(())
    }
}

pub(super) fn answer<'a>(
    questions: &'a [SqlCell],
    binding: &RuntimeNpcBindingRequest,
    original: &RuntimeNpcRead,
    current: &RuntimeNpcRead,
    policy: &SceneAttentionPolicy,
    budget: &ByteBudget,
    reference_scope: &str,
) -> Result<Answers<'a>, CallFailure> {
    if questions.len() as u64 > policy.maximum_queries {
        return Err(CallFailure::Invalid);
    }
    let bytes = questions
        .len()
        .checked_mul(size_of::<Answer<'_>>() + 6 * (size_of::<(usize, String)>() + 24) + 128)
        .ok_or_else(|| super::response_capacity(openlegend_simulation::host::CapacityError))?;
    let custody = budget.reserve(bytes).map_err(super::response_capacity)?;
    let mut answers = Answers {
        results: Vec::with_capacity(questions.len()),
        coverage: "requested-batch",
        _custody: custody,
    };
    for query in questions {
        let fields = query.as_object().ok_or(CallFailure::Invalid)?;
        let field = |id| {
            fields
                .get(id)
                .and_then(SqlCell::as_str)
                .ok_or(CallFailure::Invalid)
        };
        let result = match field("kind")? {
            "separation" => {
                binding.received_separation(original, current, field("first")?, field("second")?)
            }
            _ => return Err(CallFailure::Stale("situation-query-family-unavailable")),
        };
        let mut support = Vec::new();
        if result.supporting_facets.iter().any(Option::is_some) {
            support
                .try_reserve_exact(result.supporting_facets.len())
                .map_err(|_| {
                    super::response_capacity(openlegend_simulation::host::CapacityError)
                })?;
            for ordinal in result.supporting_facets.into_iter().flatten() {
                if !support.iter().any(|(index, _)| *index == ordinal) {
                    support.push((
                        ordinal,
                        super::prepare::alias(reference_scope, "scene-evidence", ordinal),
                    ));
                }
            }
        }
        answers.results.push(Answer {
            query,
            result: Separation {
                measurement: result.measurement,
                support,
            },
        });
    }
    let maximum = usize::try_from(policy.expansion_bytes).map_err(|_| CallFailure::Invalid)?;
    while openlegend_simulation::encoding::json_record_len(&answers)
        .map_err(|_| CallFailure::Invalid)?
        > maximum
    {
        if answers.results.pop().is_none() {
            return Err(CallFailure::Invalid);
        }
        answers.coverage = "partial";
    }
    Ok(answers)
}
