//! Own progress and checked resident evidence. A retained support without
//! its description uses the installed wording for that case.

use super::{Arc, SceneError};
use openlegend_simulation::{
    activity::{ActivityDisplayLimits, project_activity},
    capture::PlayerSelfFacts,
    encoding::json_record,
    host::ByteReservation,
    state::ReleaseSupport,
    status::PracticeProfile,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PracticePolicy {
    definitions: Vec<Definition>,
    evidence_header: String,
    display_limits: DisplayLimits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DisplayLimits {
    nodes: usize,
    depth: usize,
    facts: usize,
    detail_entries: usize,
    text: usize,
    display_bytes: usize,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Definition {
    id: Arc<str>,
    name: Arc<str>,
    profile: Arc<PracticeProfile>,
}

impl PracticePolicy {
    pub(super) fn has_attribute(&self, id: &str) -> bool {
        self.definitions
            .iter()
            .any(|definition| definition.id.as_ref() == id)
    }
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PracticeView {
    id: Arc<str>,
    name: Arc<str>,
    value: u8,
    starting: bool,
    releases: usize,
    independent_required: u64,
    coached_required: u64,
    coached: bool,
    scope: String,
    effect: String,
    rank_label: String,
    progress_text: String,
    authored_starting_text: String,
    evidence_heading: String,
    evidence_item_template: String,
    evidence: Vec<Evidence>,
}

#[derive(PartialEq, Serialize)]
struct Evidence {
    #[serde(flatten)]
    support: ReleaseSupport,
    description: JsText,
}

pub(super) fn project_practice(
    actor: &PlayerSelfFacts<'_>,
    policy: &PracticePolicy,
    custody: &mut ByteReservation,
) -> Result<Vec<PracticeView>, SceneError> {
    let Some(installed) = actor.practice else {
        return Ok(Vec::new());
    };
    let d = &policy.display_limits;
    let limits = ActivityDisplayLimits {
        nodes: d.nodes,
        depth: d.depth,
        facts: d.facts,
        detail_entries: d.detail_entries,
        text: d.text,
        display_bytes: d.display_bytes,
    };
    let mut result = Vec::new();
    for definition in &policy.definitions {
        let Some(progress) = installed.get(definition.id.as_ref()) else {
            continue;
        };
        let profile = &definition.profile;
        let view = &profile.presentation;
        let bound = [
            view.effect.len(),
            view.progress.len(),
            view.ranks[0].len(),
            view.ranks[1].len(),
            view.authored_starting.len(),
            view.evidence_heading.len(),
            view.evidence_item.len(),
            profile.scope.len(),
        ]
        .into_iter()
        .try_fold(4 * size_of::<PracticeView>() + 128, usize::checked_add)
        .ok_or(SceneError::Capacity)?;
        custody.resize(
            custody
                .bytes()
                .checked_add(bound)
                .ok_or(SceneError::Capacity)?,
        )?;
        let releases = progress.releases.len();
        let coached = progress.coaching.is_some();
        let starting = progress.starting == 1;
        let value = progress.rank(profile) == 1;
        let mut evidence = Vec::new();
        for support in &progress.releases {
            let activity = actor
                .practice_records()
                .find(|(id, _)| *id == support.occurrence_id)
                .map(|(_, activity)| activity);
            let retained = custody.bytes();
            let workspace = if activity.is_some() {
                limits
                    .display_bytes
                    .checked_mul(16)
                    .ok_or(SceneError::Capacity)?
            } else {
                view.evidence_fallback.len()
            };
            custody.resize(
                retained
                    .checked_add(workspace)
                    .ok_or(SceneError::Capacity)?,
            )?;
            let description = if let Some(activity) = activity {
                project_activity(
                    activity,
                    Some(&policy.evidence_header),
                    &limits,
                    limits.display_bytes,
                    limits.depth,
                )
                .map_err(|_| SceneError::Unsupported("the installed practice activity display"))?
                .text
            } else {
                view.evidence_fallback.as_str().into()
            };
            custody.resize(
                retained
                    .checked_add(description.storage_bytes())
                    .and_then(|n| n.checked_add(support.occurrence_id.len()))
                    .and_then(|n| n.checked_add(support.event_id.len()))
                    .and_then(|n| n.checked_add(4 * size_of::<Evidence>()))
                    .ok_or(SceneError::Capacity)?,
            )?;
            evidence.push(Evidence {
                support: support.clone(),
                description,
            });
        }
        result.push(PracticeView {
            id: definition.id.clone(),
            name: definition.name.clone(),
            value: u8::from(value),
            starting,
            releases,
            independent_required: profile.independent_releases,
            coached_required: profile.coached_releases,
            coached,
            scope: profile.scope.clone(),
            effect: view.effect.replace(
                "{missReductionPercent}",
                &json_record(&(profile.miss_reduction * 100.0))?,
            ),
            rank_label: view.ranks[usize::from(value)].clone(),
            progress_text: view
                .progress
                .replace("{releases}", &releases.to_string())
                .replace(
                    "{independentRequired}",
                    &profile.independent_releases.to_string(),
                )
                .replace("{coached}", if coached { "yes" } else { "no" }),
            authored_starting_text: view.authored_starting.clone(),
            evidence_heading: view.evidence_heading.clone(),
            evidence_item_template: view.evidence_item.clone(),
            evidence,
        });
    }
    Ok(result)
}
