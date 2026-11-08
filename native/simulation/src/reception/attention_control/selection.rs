//! Stable selection, channel correspondence and the independent discovery slot.
use super::*;

struct Representative<'a> {
    key: &'a String,
    candidate: &'a AttentionCandidate,
    score: f64,
    urgency: f64,
    direct: bool,
    direct_through: Option<f64>,
}
fn ranking(a: &Representative<'_>, b: &Representative<'_>) -> std::cmp::Ordering {
    b.score
        .partial_cmp(&a.score)
        .unwrap_or(std::cmp::Ordering::Equal)
        .then_with(|| {
            a.candidate
                .annotation
                .order
                .cmp(&b.candidate.annotation.order)
        })
}
pub(super) struct Selection {
    pub entries: Vec<AttentionEntry>,
    pub subjects: IndexMap<String, ObserverSubject>,
}
fn take(
    selected: &mut Vec<(String, AttentionBasis)>,
    representatives: &IndexMap<&str, &str>,
    key: &str,
    basis: AttentionBasis,
    discovery: Option<&str>,
    capacity: usize,
) {
    let key = representatives.get(key).copied().unwrap_or(key);
    let reservation = usize::from(discovery.is_some_and(|discovery| {
        key != discovery && !selected.iter().any(|(key, _)| key == discovery)
    }));
    if selected.len() < capacity.saturating_sub(reservation)
        && !selected.iter().any(|(held, _)| held == key)
    {
        selected.push((
            key.to_owned(),
            if Some(key) == discovery {
                AttentionBasis::Discovery
            } else {
                basis
            },
        ));
    }
}
pub(super) fn select(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    experience: &crate::experience::ExperienceState,
    observer: &str,
    state: &mut AttentionState,
    entries_before: &[AttentionEntry],
    candidates: &IndexMap<String, AttentionCandidate>,
    capacity: usize,
    change_fed: bool,
    no_incoming_cues: bool,
) -> Result<Selection, ReceivedError> {
    let now = physical.header.sim_time;
    let policy = installed.attention.value();
    let scope = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?;
    let mut subjects = IndexMap::new();
    let mut groups: IndexMap<String, Vec<(&String, &AttentionCandidate)>> = IndexMap::new();
    for (key, candidate) in candidates {
        if let Some(subject) = &candidate.subject {
            subjects.insert(candidate.annotation.exposure.track.clone(), subject.clone());
        }
        let identity = match &candidate.subject {
            Some(ObserverSubject::Entity { entity_id }) => json_record(&("entity", entity_id)),
            Some(ObserverSubject::Individual { individual_id }) => {
                json_record(&("individual", individual_id))
            }
            None => json_record(&("track", key)),
        }
        .map_err(|_| invalid())?;
        groups.entry(identity).or_default().push((key, candidate));
    }
    let mut view: IndexMap<&str, Representative<'_>> = IndexMap::new();
    let mut representatives = IndexMap::new();
    for group in groups.values() {
        let mut body = None;
        if group.len() > 1 {
            for item in group {
                if scope
                    .as_ref()
                    .map(|scope| scope.native_body(&item.1.annotation.source_id))
                    .transpose()?
                    .flatten()
                    .is_some_and(|body| body.field.id == item.1.annotation.lease_id)
                {
                    body = Some(item);
                    break;
                }
            }
        }
        let (key, candidate) = body
            .or_else(|| {
                group
                    .iter()
                    .find(|(key, _)| entries_before.iter().any(|entry| &entry.key == *key))
            })
            .unwrap_or(&group[0]);
        let mut representative = Representative {
            key,
            candidate,
            score: candidate.score,
            urgency: candidate.annotation.urgency,
            direct: candidate.annotation.direct,
            direct_through: candidate.annotation.direct_through,
        };
        for (member, value) in group {
            representatives.insert(member.as_str(), key.as_str());
            representative.score = representative.score.max(value.score);
            representative.urgency = representative.urgency.max(value.annotation.urgency);
            if value.annotation.direct {
                representative.direct = true;
                representative.direct_through = Some(
                    representative
                        .direct_through
                        .unwrap_or(0.0)
                        .max(value.annotation.direct_through.unwrap_or(0.0)),
                );
            }
        }
        view.insert(key, representative);
    }
    let current: IndexMap<&str, &AttentionEntry> = entries_before
        .iter()
        .filter(|entry| view.contains_key(entry.key.as_str()))
        .map(|entry| (entry.key.as_str(), entry))
        .collect();
    let expired = state.annotations.values().any(|value| {
        value.urgency_through.unwrap_or(f64::INFINITY) <= now
            || value.direct_through.unwrap_or(f64::INFINITY) <= now
    });
    let retained =
        if change_fed && no_incoming_cues && !expired && target(physical, observer).is_none() {
            retained(state, entries_before, &view, capacity, policy, now)
        } else {
            None
        };
    let selected = if let Some(retained) = retained {
        retained
    } else {
        let waiting: Vec<_> = view
            .values()
            .filter(|value| {
                value.candidate.annotation.presented_description.as_ref()
                    != Some(&value.candidate.description_revision)
            })
            .collect();
        let previous_discovery = entries_before.iter().find(|entry| {
            entry.basis == AttentionBasis::Discovery
                && entry.stable_until > now
                && waiting.iter().any(|value| value.key == &entry.key)
        });
        let mut next = waiting
            .iter()
            .copied()
            .filter(|value| {
                value.candidate.annotation.order as i128 > state.discovery_cursor as i128
            })
            .collect::<Vec<_>>();
        if next.is_empty() {
            next.extend(waiting.iter().copied());
        }
        let oldest = next
            .into_iter()
            .min_by_key(|value| value.candidate.annotation.order);
        let discovery = previous_discovery
            .map(|entry| entry.key.as_str())
            .or_else(|| oldest.map(|value| value.key.as_str()));
        if let Some(discovery) = discovery.filter(|_| previous_discovery.is_none()) {
            state.discovery_cursor = view[discovery].candidate.annotation.order as i64;
        }
        let mut selected = Vec::with_capacity(capacity.min(view.len()));
        let mut urgent: Vec<&Representative<'_>> = Vec::new();
        for value in view.values() {
            if value.urgency >= policy.urgent_cue {
                let at = urgent
                    .iter()
                    .position(|held| ranking(value, held).is_lt())
                    .unwrap_or(urgent.len());
                urgent.insert(at, value);
                if urgent.len() > capacity {
                    urgent.pop();
                }
            }
        }
        for value in urgent {
            take(
                &mut selected,
                &representatives,
                value.key,
                AttentionBasis::Cue,
                discovery,
                capacity,
            );
        }
        let ongoing = ((capacity - 1) as f64 * policy.ongoing_share).ceil() as usize;
        for value in view.values() {
            if value.direct
                && value.direct_through.unwrap_or(0.0) >= now
                && selected.len() < ongoing
            {
                take(
                    &mut selected,
                    &representatives,
                    value.key,
                    AttentionBasis::Direct,
                    discovery,
                    capacity,
                );
            }
        }
        for key in &state.explicit {
            if selected.len() < ongoing {
                take(
                    &mut selected,
                    &representatives,
                    key,
                    AttentionBasis::Explicit,
                    discovery,
                    capacity,
                );
            }
        }
        for value in view.values() {
            if Some(value.candidate.annotation.source_id.as_str()) == target(physical, observer)
                && selected.len() < ongoing
            {
                take(
                    &mut selected,
                    &representatives,
                    value.key,
                    AttentionBasis::Work,
                    discovery,
                    capacity,
                );
            }
        }
        let optional_capacity = capacity.saturating_sub(
            selected.len()
                + usize::from(
                    discovery
                        .is_some_and(|discovery| !selected.iter().any(|(key, _)| key == discovery)),
                ),
        );
        let mut incumbents = current
            .values()
            .filter(|entry| {
                !selected.iter().any(|(key, _)| key == &entry.key)
                    && Some(entry.key.as_str()) != discovery
            })
            .copied()
            .collect::<Vec<_>>();
        incumbents.sort_by(|a, b| ranking(&view[a.key.as_str()], &view[b.key.as_str()]));
        let mut optional = incumbents
            .into_iter()
            .take(optional_capacity)
            .map(|entry| entry.key.as_str())
            .collect::<Vec<_>>();
        for (&key, challenger) in &view {
            if Some(key) == discovery
                || selected.iter().any(|(held, _)| held == key)
                || optional.contains(&key)
            {
                continue;
            }
            if optional.len() < optional_capacity {
                optional.push(key);
                continue;
            }
            let mut weakest = None;
            for (index, &held) in optional.iter().enumerate() {
                if current.get(held).is_some_and(|entry| {
                    entry.stable_until > now
                        && (challenger.urgency < policy.urgent_cue
                            || challenger.urgency <= view[entry.key.as_str()].urgency)
                }) {
                    continue;
                }
                if weakest.is_none_or(|weakest: usize| {
                    ranking(&view[held], &view[optional[weakest]]).is_gt()
                }) {
                    weakest = Some(index);
                }
            }
            if let Some(weakest) = weakest.filter(|&weakest| {
                challenger.score >= view[optional[weakest]].score + policy.switch_margin
            }) {
                optional[weakest] = key;
            }
        }
        for key in optional {
            take(
                &mut selected,
                &representatives,
                key,
                AttentionBasis::Cue,
                discovery,
                capacity,
            );
        }
        if let Some(discovery) = discovery {
            take(
                &mut selected,
                &representatives,
                discovery,
                AttentionBasis::Discovery,
                Some(discovery),
                capacity,
            );
        }
        selected
    };
    let mut entries = Vec::with_capacity(selected.len());
    for (key, basis) in selected {
        let candidate = candidates.get(&key).ok_or_else(invalid)?;
        let annotation = &candidate.annotation;
        let old = current.get(key.as_str()).copied();
        if let Some(old) = old.filter(|old| {
            old.basis == basis
                && old.lease_id == annotation.lease_id
                && old.description_revision == candidate.description_revision
                && old.change_revision == candidate.change_revision
                && old.subject == candidate.subject
        }) {
            entries.push(old.clone());
            continue;
        }
        entries.push(AttentionEntry {
            key,
            source_id: annotation.source_id.clone(),
            lease_id: annotation.lease_id.clone(),
            exposure: annotation.exposure.clone(),
            subject: candidate.subject.clone(),
            description_revision: candidate.description_revision.clone(),
            change_revision: candidate.change_revision.clone(),
            basis,
            started_at: old.map_or(now, |old| old.started_at),
            stable_until: old.map_or(now + policy.stability_seconds, |old| old.stable_until),
        });
    }
    Ok(Selection { entries, subjects })
}
fn retained(
    state: &AttentionState,
    entries: &[AttentionEntry],
    view: &IndexMap<&str, Representative<'_>>,
    capacity: usize,
    policy: &AttentionPolicy,
    now: f64,
) -> Option<Vec<(String, AttentionBasis)>> {
    if !state.explicit.is_empty()
        || entries.len() != capacity.min(view.len())
        || entries.iter().any(|entry| {
            !view.contains_key(entry.key.as_str())
                || !matches!(entry.basis, AttentionBasis::Cue | AttentionBasis::Discovery)
        })
        || view
            .values()
            .any(|value| value.direct || value.urgency >= policy.urgent_cue)
    {
        return None;
    }
    let waiting = view.values().any(|candidate| {
        candidate
            .candidate
            .annotation
            .presented_description
            .as_ref()
            != Some(&candidate.candidate.description_revision)
    });
    let discovery = entries
        .iter()
        .find(|entry| entry.basis == AttentionBasis::Discovery);
    let held = discovery.and_then(|entry| view.get(entry.key.as_str()));
    if if waiting {
        discovery.is_none_or(|entry| entry.stable_until <= now)
            || held.is_none_or(|held| {
                held.candidate.annotation.presented_description.as_ref()
                    == Some(&held.candidate.description_revision)
            })
    } else {
        discovery.is_some()
    } {
        return None;
    }
    let mut optional = entries
        .iter()
        .filter(|entry| entry.basis == AttentionBasis::Cue)
        .collect::<Vec<_>>();
    optional.sort_by(|a, b| ranking(&view[a.key.as_str()], &view[b.key.as_str()]));
    let mut weakest = f64::INFINITY;
    for entry in &optional {
        if entry.stable_until <= now {
            weakest = weakest.min(view[entry.key.as_str()].score);
        }
    }
    if view.iter().any(|(key, candidate)| {
        !entries.iter().any(|entry| entry.key == *key)
            && candidate.score >= weakest + policy.switch_margin
    }) {
        return None;
    }
    let mut result = optional
        .into_iter()
        .map(|entry| (entry.key.clone(), entry.basis))
        .collect::<Vec<_>>();
    if let Some(discovery) = discovery {
        result.push((discovery.key.clone(), discovery.basis));
    }
    Some(result)
}
