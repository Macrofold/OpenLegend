//! Exact dependency ordering for structured personal manifests. A later alias
//! of an existing proof joins that proof's original insertion position.
use super::*;

#[derive(Serialize)]
pub(super) struct ManifestDependency {
    source: Value,
    ordinal: Option<u64>,
    aliases: Vec<String>,
}
pub(super) fn observation_dependencies(
    originals: &[&Value],
) -> Result<Vec<ManifestDependency>, ExperienceError> {
    let mut dependencies: IndexMap<String, (Value, Option<u64>, IndexSet<String>)> =
        IndexMap::new();
    fn add(
        deps: &mut IndexMap<String, (Value, Option<u64>, IndexSet<String>)>,
        source: &Value,
        ordinal: Option<u64>,
        aliases: Vec<String>,
    ) -> Result<(), ExperienceError> {
        let decoded: EvidenceSource = serde_json::from_value(source.clone())
            .map_err(|_| ExperienceError::InvalidBody("manifest dependency"))?;
        decoded
            .validate()
            .map_err(|_| ExperienceError::InvalidBody("manifest dependency"))?;
        let key = json_record(&(&decoded, ordinal))
            .map_err(|_| ExperienceError::InvalidBody("manifest dependency encoding"))?;
        let entry = deps
            .entry(key)
            .or_insert_with(|| (source.clone(), ordinal, IndexSet::new()));
        entry.2.extend(aliases);
        Ok(())
    }
    fn fact(
        deps: &mut IndexMap<String, (Value, Option<u64>, IndexSet<String>)>,
        value: &Value,
        aliases: Vec<String>,
    ) -> Result<(), ExperienceError> {
        let value = object(value)?;
        add(
            deps,
            value
                .get("source")
                .ok_or(ExperienceError::InvalidBody("manifest fact"))?,
            Some(integer(value, "ordinal")?),
            aliases,
        )
    }
    fn list(body: &Map<String, Value>, key: &'static str) -> Result<Vec<String>, ExperienceError> {
        body.get(key)
            .map(|v| strings(v, key))
            .transpose()
            .map(|v| v.unwrap_or_default())
    }
    for original in originals {
        let original = object(original)?;
        let origin = object(
            original
                .get("origin")
                .ok_or(ExperienceError::InvalidBody("manifest origin"))?,
        )?;
        let source = serde_json::json!({"family":"native-exposure","observer":original.get("observer").ok_or(ExperienceError::InvalidBody("manifest observer"))?,"id":text(original,"id")?,"revision":integer(original,"revision")?});
        add(
            &mut dependencies,
            &source,
            None,
            if text(origin, "kind")? == "occurrence" {
                vec![text(origin, "eventId")?.into()]
            } else {
                Vec::new()
            },
        )?;
        for field in original
            .get("facets")
            .and_then(Value::as_array)
            .ok_or(ExperienceError::InvalidBody("manifest facets"))?
        {
            let field = object(field)?;
            if let Some(proof) = field.get("support").map(object).transpose()? {
                let original = proof
                    .get("original")
                    .ok_or(ExperienceError::InvalidBody("manifest original proof"))?;
                let ordinal = integer(object(original)?, "ordinal")?;
                fact(&mut dependencies, original, list(proof, "aliases")?)?;
                add(
                    &mut dependencies,
                    proof
                        .get("confirmation")
                        .ok_or(ExperienceError::InvalidBody("manifest confirmation"))?,
                    Some(ordinal),
                    Vec::new(),
                )?;
            }
            let value = object(
                field
                    .get("value")
                    .ok_or(ExperienceError::InvalidBody("manifest facet"))?,
            )?;
            match text(value, "kind")? {
                "claim" => {
                    let aliases = value
                        .get("supportAliases")
                        .and_then(Value::as_array)
                        .map(|values| {
                            values
                                .iter()
                                .map(|v| text(object(v)?, "id").map(str::to_owned))
                                .collect::<Result<Vec<_>, _>>()
                        })
                        .transpose()?
                        .unwrap_or_default();
                    for support in value
                        .get("support")
                        .and_then(Value::as_array)
                        .ok_or(ExperienceError::InvalidBody("manifest claim support"))?
                    {
                        fact(&mut dependencies, support, aliases.clone())?;
                    }
                }
                "physical-boundary" => {
                    let boundary = object(
                        value
                            .get("boundary")
                            .ok_or(ExperienceError::InvalidBody("manifest boundary"))?,
                    )?;
                    for side in ["nearSurface", "farSurface"] {
                        let support = object(
                            boundary
                                .get(side)
                                .ok_or(ExperienceError::InvalidBody("manifest boundary side"))?,
                        )?
                        .get("support")
                        .ok_or(ExperienceError::InvalidBody("manifest boundary support"))?;
                        let id = text(
                            object(object(support)?.get("source").ok_or(
                                ExperienceError::InvalidBody("manifest boundary source"),
                            )?)?,
                            "id",
                        )?;
                        fact(
                            &mut dependencies,
                            support,
                            vec![personal_fact_alias(
                                id,
                                integer(object(support)?, "ordinal")?,
                            )?],
                        )?;
                    }
                }
                "observed-motion" => {
                    for name in ["earlier", "later"] {
                        let sample = object(
                            value
                                .get(name)
                                .ok_or(ExperienceError::InvalidBody("manifest motion"))?,
                        )?;
                        let original = sample
                            .get("original")
                            .ok_or(ExperienceError::InvalidBody("manifest motion proof"))?;
                        fact(&mut dependencies, original, list(sample, "aliases")?)?;
                        add(
                            &mut dependencies,
                            sample
                                .get("confirmation")
                                .ok_or(ExperienceError::InvalidBody(
                                    "manifest motion confirmation",
                                ))?,
                            Some(integer(object(original)?, "ordinal")?),
                            Vec::new(),
                        )?;
                    }
                }
                _ => {}
            }
        }
    }
    Ok(dependencies
        .into_values()
        .map(|(source, ordinal, aliases)| ManifestDependency {
            source,
            ordinal,
            aliases: aliases.into_iter().collect(),
        })
        .collect())
}
pub(super) fn observation_aliases(originals: &[&Value]) -> Result<Vec<String>, ExperienceError> {
    let mut aliases = IndexSet::new();
    for dependency in observation_dependencies(originals)? {
        aliases.insert(text(object(&dependency.source)?, "id")?.to_owned());
        aliases.extend(dependency.aliases);
    }
    Ok(aliases.into_iter().collect())
}
