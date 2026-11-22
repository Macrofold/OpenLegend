//! The first response can request a read-only continuation. A question must
//! never share a provider result with effects or an invention.
use super::{CallFailure, provider};
use openlegend_simulation::{
    attention::SceneAttentionPolicy,
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
    runtime::{
        RuntimeNpcBindingRequest, RuntimeNpcRead, RuntimeNpcSeparation,
        RuntimeNpcSeparationEvidence,
    },
};
use serde::Serialize;
use serde::ser::SerializeSeq;
use std::mem::size_of;

mod bodies;
mod boundaries;
mod regions;
use bodies::{BodyPage, BodyQueryRead};
pub(super) use regions::Regions;

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
    visited: u64,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(Serialize)]
struct Answer<'a> {
    query: &'a SqlCell,
    result: QueryResult<'a>,
}

#[derive(Serialize)]
#[serde(untagged)]
enum QueryResult<'a> {
    Separation(Separation),
    Bodies(BodyPage<'a>),
    Boundaries(boundaries::Boundaries),
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

impl Separation {
    fn prepare(evidence: RuntimeNpcSeparationEvidence, reference_scope: &str) -> Self {
        Self {
            measurement: evidence.measurement,
            support: support(evidence.supporting_facets, reference_scope),
        }
    }

    fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        bind_support(&self.support, binding)
    }
}

fn bind_support(
    support: &[(usize, String)],
    binding: &mut RuntimeNpcBindingRequest,
) -> Result<(), CallFailure> {
    for (ordinal, alias) in support {
        binding
            .bind_query_facet(alias, *ordinal)
            .map_err(super::prepare::packet_failure)?;
    }
    Ok(())
}

fn support<const N: usize>(facets: [Option<usize>; N], scope: &str) -> Vec<(usize, String)> {
    let count = facets.iter().flatten().count();
    let mut result = Vec::with_capacity(count);
    for ordinal in facets.into_iter().flatten() {
        if !result.iter().any(|(previous, _)| *previous == ordinal) {
            result.push((
                ordinal,
                super::prepare::alias(scope, "scene-evidence", ordinal),
            ));
        }
    }
    result
}

impl Answers<'_> {
    /// Only results kept under the installed byte limit enter the final
    /// disclosure ticket. Each reference owns the original facet ordinal.
    pub(super) fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        for answer in &self.results {
            match &answer.result {
                QueryResult::Separation(result) => result.bind(binding)?,
                QueryResult::Bodies(result) => result.bind(binding)?,
                QueryResult::Boundaries(result) => result.bind(binding)?,
            }
        }
        Ok(())
    }

    pub(super) fn added_references(&self) -> impl Iterator<Item = &str> {
        self.results
            .iter()
            .filter_map(|answer| match &answer.result {
                QueryResult::Bodies(result) => Some(result.added_references()),
                _ => None,
            })
            .flatten()
    }

    pub(super) fn extend_references(
        &self,
        entities: &[String],
        physical: &[String],
        budget: &ByteBudget,
    ) -> Result<([Vec<String>; 2], ByteReservation), CallFailure> {
        let size = |len: usize| len.checked_add(size_of::<String>());
        let mut bytes = 0_usize;
        for value in entities
            .iter()
            .chain(physical)
            .map(String::as_str)
            .chain(self.added_references())
        {
            bytes = bytes
                .checked_add(size(value.len()).ok_or_else(capacity)?)
                .ok_or_else(capacity)?;
        }
        let add = self.added_references().count();
        // Both schema sets may issue the same newly disclosed physical alias.
        bytes = bytes
            .checked_add(
                add.checked_mul(size_of::<String>() + 24)
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?;
        let custody = budget.reserve(bytes).map_err(super::response_capacity)?;
        let extend = |original: &[String]| -> Result<Vec<String>, CallFailure> {
            let mut result = Vec::new();
            result
                .try_reserve_exact(original.len().checked_add(add).ok_or_else(capacity)?)
                .map_err(|_| capacity())?;
            result.extend(original.iter().cloned());
            for alias in self.added_references() {
                if !result.iter().any(|reference| reference == alias) {
                    result.push(alias.to_owned());
                }
            }
            Ok(result)
        };
        Ok(([extend(entities)?, extend(physical)?], custody))
    }
}

pub(super) fn answer<'a>(
    questions: &'a [SqlCell],
    binding: &RuntimeNpcBindingRequest,
    original: &'a RuntimeNpcRead,
    current: &RuntimeNpcRead,
    policy: &SceneAttentionPolicy,
    budget: &ByteBudget,
    reference_scope: &str,
    frame: &super::prepare::ReceivedFrame,
    regions: Option<&Regions>,
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
        visited: 0,
        _custody: custody,
    };
    let maximum = usize::try_from(policy.expansion_bytes).map_err(|_| CallFailure::Invalid)?;
    let mut remaining = policy.query_visits;
    let mut bodies = BodyQueryRead::new(
        original,
        current,
        binding,
        budget,
        reference_scope,
        frame,
        regions,
    );
    let encoded_size = |answers: &Answers<'_>| {
        openlegend_simulation::encoding::json_record_len(answers).map_err(|_| CallFailure::Invalid)
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
            "separation" => QueryResult::Separation(Separation::prepare(
                binding.received_separation(original, current, field("first")?, field("second")?),
                reference_scope,
            )),
            "near" => QueryResult::Bodies(
                bodies.near(
                    field("anchor")?,
                    fields
                        .get("radius")
                        .and_then(SqlCell::as_f64)
                        .ok_or(CallFailure::Invalid)?,
                    &mut remaining,
                )?,
            ),
            "expand" => QueryResult::Bodies(bodies.expand(field("region")?, &mut remaining)?),
            "boundaries" => QueryResult::Boundaries(boundaries::answer(
                binding.received_anchor(original, current, field("anchor")?),
                original,
                &mut remaining,
                budget,
                reference_scope,
                frame,
            )?),
            _ => return Err(CallFailure::Stale("situation-query-family-unavailable")),
        };
        answers.visited = policy.query_visits - remaining;
        answers.results.push(Answer { query, result });
        let mut excess = encoded_size(&answers)?.saturating_sub(maximum);
        if excess != 0 {
            excess = match answers.results.last_mut().map(|answer| &mut answer.result) {
                Some(QueryResult::Bodies(last)) => last.trim(excess)?,
                Some(QueryResult::Boundaries(last)) => last.trim(excess)?,
                _ => excess,
            };
            if excess != 0 {
                answers.results.pop();
                answers.coverage = "partial";
                break;
            }
        }
    }
    if encoded_size(&answers)? > maximum {
        return Err(CallFailure::Invalid);
    }
    Ok(answers)
}

/// Fit only the disclosed rows. Dropping a row also drops its citations,
/// and frees its exact encoded length plus the preceding comma if present.
fn trim_rows<T: Serialize>(
    status: &mut &'static str,
    rows: &mut Vec<T>,
    mut excess: usize,
) -> Result<usize, CallFailure> {
    excess = excess.saturating_sub(status.len() - "partial".len());
    *status = "partial";
    while excess != 0 {
        let Some(row) = rows.pop() else {
            break;
        };
        let bytes = openlegend_simulation::encoding::json_record_len(&row)
            .map_err(|_| CallFailure::Invalid)?;
        excess = excess.saturating_sub(bytes + usize::from(!rows.is_empty()));
    }
    Ok(excess)
}

fn capacity() -> CallFailure {
    super::response_capacity(openlegend_simulation::host::CapacityError)
}
