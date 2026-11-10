//! Attribution is merged from admitted originals and child manifests, never
//! from a model's summary. ICU is needed only for the final reference order.
use super::*;
use crate::records::SqlCell;

fn bad() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
}
pub(super) fn array<'a>(value: &'a SqlCell, key: &str) -> Result<&'a [SqlCell], ExecutionError> {
    value
        .get(key)
        .map(|v| v.as_array().ok_or_else(bad))
        .transpose()
        .map(|v| v.unwrap_or(&[]))
}
fn text<'a>(value: &'a SqlCell, key: &str) -> Result<&'a str, ExecutionError> {
    value.get(key).and_then(SqlCell::as_str).ok_or_else(bad)
}
fn number(value: &SqlCell, key: &str) -> Result<f64, ExecutionError> {
    value
        .get(key)
        .and_then(SqlCell::as_f64)
        .filter(|n| n.is_finite())
        .ok_or_else(bad)
}
fn key(value: &SqlCell) -> Result<String, ExecutionError> {
    // This is an internal equality key, not Source canonical output. Fixed
    // speech-role records have Unicode scalar schema keys; arbitrary quoted
    // prose stays in exact SqlCell text and is never normalized.
    fn normalized(value: &SqlCell) -> Result<SqlCell, ExecutionError> {
        Ok(match value {
            SqlCell::Object(fields) => {
                let mut keys: Vec<_> = fields.keys().collect();
                keys.sort_unstable();
                SqlCell::Object(
                    keys.into_iter()
                        .map(|k| Ok((k.clone(), normalized(&fields[k])?)))
                        .collect::<Result<_, ExecutionError>>()?,
                )
            }
            SqlCell::Array(values) => {
                SqlCell::Array(values.iter().map(normalized).collect::<Result<_, _>>()?)
            }
            SqlCell::ExactObject(_) => return Err(bad()),
            other => other.clone(),
        })
    }
    crate::encoding::json_record(&normalized(value)?).map_err(|_| bad())
}
pub(super) fn reference_cell(reference: &PersonalSourceRef) -> Result<SqlCell, ExecutionError> {
    cell(reference)
}
pub(super) fn reference_key(reference: &SqlCell) -> Result<String, ExecutionError> {
    crate::encoding::json_record(&[
        text(reference, "kind")?,
        text(reference, "id")?,
        text(reference, "revision")?,
    ])
    .map_err(|_| bad())
}
fn coverage_key<'a>(values: impl Iterator<Item = &'a SqlCell>) -> Result<String, ExecutionError> {
    let mut keys = values.map(reference_key).collect::<Result<Vec<_>, _>>()?;
    // Source manifestCoverageKey uses Array.sort(), distinct from its ICU
    // coverage array order. Ref IDs/revisions are validated scalar strings.
    keys.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    crate::encoding::json_record(&keys).map_err(|_| bad())
}
fn object(fields: impl IntoIterator<Item = (String, SqlCell)>) -> SqlCell {
    SqlCell::Object(fields.into_iter().collect())
}
fn observation_key(value: &SqlCell) -> Result<String, ExecutionError> {
    let observer = value.get("observer").ok_or_else(bad)?;
    key(&SqlCell::Array(vec![
        observer.clone(),
        value.get("id").ok_or_else(bad)?.clone(),
        value.get("revision").ok_or_else(bad)?.clone(),
    ]))
}
fn receipt_key(value: &SqlCell) -> Result<String, ExecutionError> {
    key(&SqlCell::Array(
        [
            "actorId",
            "physicalLife",
            "epoch",
            "batchOrder",
            "entryIndex",
        ]
        .into_iter()
        .map(|k| value.get(k).cloned().ok_or_else(bad))
        .collect::<Result<_, _>>()?,
    ))
}
pub(super) struct Manifest {
    coverage: IndexMap<String, SqlCell>,
    observations: IndexMap<String, SqlCell>,
    speech: IndexMap<String, SqlCell>,
    receipts: IndexMap<String, SqlCell>,
}
impl Manifest {
    pub(super) fn new() -> Self {
        Self {
            coverage: IndexMap::new(),
            observations: IndexMap::new(),
            speech: IndexMap::new(),
            receipts: IndexMap::new(),
        }
    }
    fn add_observation(&mut self, value: &SqlCell) -> Result<(), ExecutionError> {
        let k = observation_key(value)?;
        if self
            .observations
            .get(&k)
            .is_some_and(|prior| prior != value)
        {
            return Err(bad());
        }
        self.observations.insert(k, value.clone());
        Ok(())
    }
    fn add_receipt(&mut self, value: &SqlCell) -> Result<(), ExecutionError> {
        self.receipts.insert(receipt_key(value)?, value.clone());
        Ok(())
    }
    fn add_group(&mut self, group: &SqlCell) -> Result<(), ExecutionError> {
        let roles: IndexMap<_, _> = group
            .as_object()
            .ok_or_else(bad)?
            .iter()
            .filter(|(k, _)| {
                !matches!(
                    k.as_str(),
                    "supportKey" | "sources" | "firstAt" | "lastAt" | "sourceCount" | "utterances"
                )
            })
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        let group_sources = array(group, "sources")?;
        let unresolved = !roles.contains_key("sourceSubject") && !roles.contains_key("speakerId");
        let k = key(&SqlCell::Array(vec![
            SqlCell::Object(roles.clone()),
            if unresolved {
                SqlCell::Array(group_sources.to_vec())
            } else {
                SqlCell::Null
            },
        ]))?;
        let prior = self.speech.get(&k);
        let mut sources = IndexMap::new();
        let mut utterances: IndexMap<String, SqlCell> = IndexMap::new();
        if let Some(prior) = prior {
            for source in array(prior, "sources")? {
                sources.insert(reference_key(source)?, source.clone());
            }
            for utterance in array(prior, "utterances")? {
                utterances.insert(
                    reference_key(utterance.get("source").ok_or_else(bad)?)?,
                    utterance.clone(),
                );
            }
        }
        for source in group_sources {
            sources.insert(reference_key(source)?, source.clone());
        }
        for utterance in array(group, "utterances")? {
            let k = reference_key(utterance.get("source").ok_or_else(bad)?)?;
            if utterances.get(&k).is_some_and(|prior| prior != utterance) {
                return Err(bad());
            }
            utterances.insert(k, utterance.clone());
        }
        let first = number(group, "firstAt")?.min(
            prior
                .map(|p| number(p, "firstAt"))
                .transpose()?
                .unwrap_or(f64::INFINITY),
        );
        let last = number(group, "lastAt")?.max(
            prior
                .map(|p| number(p, "lastAt"))
                .transpose()?
                .unwrap_or(f64::NEG_INFINITY),
        );
        let support = coverage_key(sources.values())?;
        let mut output = roles;
        output.insert(
            "sources".into(),
            SqlCell::Array(sources.into_values().collect()),
        );
        output.insert("supportKey".into(), support.into());
        output.insert("firstAt".into(), cell(&first)?);
        output.insert("lastAt".into(), cell(&last)?);
        output.insert(
            "sourceCount".into(),
            cell(&output["sources"].as_array().ok_or_else(bad)?.len())?,
        );
        output.insert(
            "utterances".into(),
            SqlCell::Array(utterances.into_values().collect()),
        );
        self.speech.insert(k, SqlCell::Object(output));
        Ok(())
    }
    pub(super) fn add(&mut self, source: &Source) -> Result<(), ExecutionError> {
        let body = &source.value;
        let reference = reference_cell(&source.reference)?;
        let child = if source.reference.kind == PersonalSourceKind::Awareness {
            None
        } else {
            body.get("manifest")
        };
        if source.reference.kind != PersonalSourceKind::Summary {
            if let Some(receipt) = body.get("sourceReceipt") {
                self.add_receipt(receipt)?;
            }
        }
        if let Some(child) = child {
            for receipt in array(child, "receipts")? {
                self.add_receipt(receipt)?;
            }
        }
        self.coverage
            .insert(reference_key(&reference)?, reference.clone());
        if let Some(child) = child {
            for reference in array(child, "coverage")? {
                self.coverage
                    .insert(reference_key(reference)?, reference.clone());
            }
        }
        let mut originals = Vec::new();
        if source.reference.kind != PersonalSourceKind::Summary {
            if let Some(original) = body.get("observation") {
                originals.push(original);
            }
            originals.extend(array(body, "observations")?);
            if source.reference.kind == PersonalSourceKind::Memory {
                if let Some(evidence) = body.get("evidence") {
                    if let Some(original) = evidence.get("observation") {
                        originals.push(original);
                    }
                    originals.extend(array(evidence, "observations")?);
                }
            }
        }
        if let Some(child) = child {
            for original in array(child, "observations")? {
                self.add_observation(original)?;
            }
            for group in array(child, "speech")? {
                self.add_group(group)?;
            }
        } else {
            for original in &originals {
                self.add_observation(original)?;
            }
        }
        let awareness = match source.reference.kind {
            PersonalSourceKind::Awareness => Some(body),
            PersonalSourceKind::Memory => body.get("evidence"),
            PersonalSourceKind::Summary => None,
        };
        if let Some(awareness) = awareness {
            if let Some(heard) = awareness.get("speech") {
                let mut group = IndexMap::new();
                group.insert(
                    "supportKey".into(),
                    coverage_key(std::iter::once(&reference))?.into(),
                );
                group.insert("sources".into(), SqlCell::Array(vec![reference.clone()]));
                for (from, to) in [
                    ("sourceId", "speakerId"),
                    ("targetId", "targetId"),
                    ("sourceSubject", "sourceSubject"),
                ] {
                    if let Some(value) = awareness.get(from) {
                        group.insert(to.into(), value.clone());
                    }
                }
                for name in ["speaker", "addressee", "addressing"] {
                    group.insert(name.into(), heard.get(name).cloned().ok_or_else(bad)?);
                }
                let relation = match text(heard, "perception")? {
                    "self" => "self",
                    "seen" => "seen",
                    _ if awareness
                        .get("targetId")
                        .is_some_and(|v| Some(v) == awareness.get("actorId")) =>
                    {
                        "addressed"
                    }
                    _ if text(heard, "addressing")? == "ambient" => "ambient",
                    _ => "overheard",
                };
                group.insert("observerRelation".into(), relation.into());
                group.insert(
                    "acquisition".into(),
                    heard.get("perception").cloned().ok_or_else(bad)?,
                );
                group.insert(
                    "intelligibility".into(),
                    heard.get("intelligibility").cloned().ok_or_else(bad)?,
                );
                let at = number(body, "at")?;
                group.insert("firstAt".into(), cell(&at)?);
                group.insert("lastAt".into(), cell(&at)?);
                group.insert("sourceCount".into(), cell(&1_u64)?);
                let contributed = originals.iter().any(|o| {
                    array(o, "facets").is_ok_and(|facets| {
                        facets.iter().any(|f| {
                            f.get("value").is_some_and(|v| {
                                v.get("kind").and_then(SqlCell::as_str) == Some("speech")
                                    && v.get("speech") == Some(heard)
                            })
                        })
                    })
                });
                group.insert(
                    "utterances".into(),
                    SqlCell::Array(if contributed {
                        Vec::new()
                    } else {
                        vec![object([
                            ("source".into(), reference),
                            ("at".into(), cell(&at)?),
                            ("speech".into(), heard.clone()),
                        ])]
                    }),
                );
                self.add_group(&SqlCell::Object(group))?;
            }
        }
        Ok(())
    }
    pub(super) fn collation_keys(&self) -> impl Iterator<Item = &str> + Clone {
        self.coverage.keys().map(String::as_str)
    }
    pub(super) fn finish(
        self,
        ranks: &crate::language::CollationRanks,
    ) -> Result<SqlCell, ExecutionError> {
        let mut coverage: Vec<_> = self.coverage.into_iter().collect();
        // Stable ties preserve original Map insertion order, as Source sort.
        coverage.sort_by(|a, b| {
            ranks
                .compare(&a.0, &b.0)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        for (key, _) in &coverage {
            ranks.rank(key).map_err(|_| bad())?;
        }
        let coverage_key = coverage_key(coverage.iter().map(|(_, v)| v))?;
        let mut result = IndexMap::new();
        result.insert("version".into(), cell(&1_u64)?);
        result.insert("coverageKey".into(), coverage_key.into());
        result.insert(
            "coverage".into(),
            SqlCell::Array(coverage.into_iter().map(|(_, v)| v).collect()),
        );
        result.insert(
            "observations".into(),
            SqlCell::Array(self.observations.into_values().collect()),
        );
        result.insert(
            "speech".into(),
            SqlCell::Array(self.speech.into_values().collect()),
        );
        if !self.receipts.is_empty() {
            result.insert(
                "receipts".into(),
                SqlCell::Array(self.receipts.into_values().collect()),
            );
        }
        Ok(SqlCell::Object(result))
    }
}
