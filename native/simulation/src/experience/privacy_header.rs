//! Rebuildable privacy-routing facts from the one immutable personal body.
//! Account aliases, one-way learning and selected association facts remain
//! separate; none can grant an independently supplied header effect authority.

use super::*;

#[derive(Clone, Debug)]
pub struct AssociationPrivacyFact {
    pub observation_id: String,
    pub ordinal: u64,
    pub learning_sources: Vec<String>,
}
#[derive(Clone, Debug)]
pub struct PersonalPrivacyHeader {
    pub primary_observation: Option<String>,
    pub direct_observations: Vec<String>,
    /// Source recognitionEntries includes remembered evidence copies, but not
    /// a memory's manifest. Summary manifest facts have their separate role.
    pub learning_observations: Vec<String>,
    pub learning_sources: Vec<String>,
    pub associations: Vec<AssociationPrivacyFact>,
}
fn observations(
    body: &Map<String, Value>,
) -> Result<impl Iterator<Item = &Value>, ExperienceError> {
    let multiple = body
        .get("observations")
        .map(|value| {
            value
                .as_array()
                .ok_or(ExperienceError::InvalidBody("observations"))
        })
        .transpose()?;
    Ok(body
        .get("observation")
        .into_iter()
        .chain(multiple.into_iter().flatten()))
}
fn sources(
    body: &Map<String, Value>,
    meaning: &impl PersonalEvidenceMeaning,
) -> Result<Vec<String>, ExperienceError> {
    body.get("learningSupport")
        .map(|keys| {
            strings(keys, "learningSupport").map(|keys| meaning.recognition_source_ids(&keys))
        })
        .transpose()
        .map(Option::unwrap_or_default)
}
pub(super) fn derive(
    body: &Map<String, Value>,
    kind: PersonalSourceKind,
    meaning: &impl PersonalEvidenceMeaning,
) -> Result<PersonalPrivacyHeader, ExperienceError> {
    let primary_observation = body
        .get("observation")
        .map(|value| text(object(value)?, "id").map(str::to_owned))
        .transpose()?;
    let mut direct = IndexSet::new();
    let mut originals = Vec::new();
    for observation in observations(body)? {
        let observation = object(observation)?;
        direct.insert(text(observation, "id")?.to_owned());
        originals.push(observation);
    }
    let recognition = if kind == PersonalSourceKind::Awareness {
        body.get("recognition")
    } else {
        body.get("evidence")
            .map(object)
            .transpose()?
            .and_then(|evidence| evidence.get("recognition"))
    };
    let mut learning = IndexSet::new();
    if let Some(recognition) = recognition {
        learning.extend(sources(object(recognition)?, meaning)?);
    }
    if kind == PersonalSourceKind::Memory {
        if let Some(evidence) = body.get("evidence") {
            for observation in observations(object(evidence)?)? {
                originals.push(object(observation)?);
            }
        }
    }
    let mut owned = IndexSet::new();
    for observation in &originals {
        owned.insert(text(observation, "id")?.to_owned());
    }
    let mut associations = Vec::new();
    let mut visit =
        |observation: &Map<String, Value>, learn: bool| -> Result<(), ExperienceError> {
            let id = text(observation, "id")?;
            for facet in observation
                .get("facets")
                .and_then(Value::as_array)
                .ok_or(ExperienceError::InvalidBody("observation.facets"))?
            {
                let facet = object(facet)?;
                let value = object(
                    facet
                        .get("value")
                        .ok_or(ExperienceError::InvalidBody("facet.value"))?,
                )?;
                match text(value, "kind")? {
                    "association" => {
                        let dependencies = sources(value, meaning)?;
                        if learn {
                            learning.extend(dependencies.iter().cloned());
                        }
                        associations.push(AssociationPrivacyFact {
                            observation_id: id.to_owned(),
                            ordinal: integer(facet, "ordinal")?,
                            learning_sources: dependencies,
                        });
                    }
                    "physical-boundary" if learn => {
                        let boundary = object(
                            value
                                .get("boundary")
                                .ok_or(ExperienceError::InvalidBody("boundary"))?,
                        )?;
                        for side in ["nearSurface", "farSurface"] {
                            let support = object(
                                object(
                                    boundary
                                        .get(side)
                                        .ok_or(ExperienceError::InvalidBody("boundary side"))?,
                                )?
                                .get("support")
                                .ok_or(ExperienceError::InvalidBody("boundary support"))?,
                            )?;
                            learning.insert(
                                text(
                                    object(
                                        support
                                            .get("source")
                                            .ok_or(ExperienceError::InvalidBody("fact.source"))?,
                                    )?,
                                    "id",
                                )?
                                .to_owned(),
                            );
                        }
                    }
                    _ => {}
                }
            }
            Ok(())
        };
    if kind == PersonalSourceKind::Summary {
        let manifest = object(
            body.get("manifest")
                .ok_or(ExperienceError::InvalidBody("manifest"))?,
        )?;
        for observation in manifest
            .get("observations")
            .and_then(Value::as_array)
            .ok_or(ExperienceError::InvalidBody("manifest.observations"))?
        {
            visit(object(observation)?, false)?;
        }
    } else {
        for observation in originals {
            visit(observation, true)?;
        }
    }
    Ok(PersonalPrivacyHeader {
        primary_observation,
        direct_observations: direct.into_iter().collect(),
        learning_observations: owned.into_iter().collect(),
        learning_sources: learning.into_iter().collect(),
        associations,
    })
}
