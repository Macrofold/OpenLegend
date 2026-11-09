//! Bounded scans of actually received bodies and boundaries. Partial pages
//! cannot clear an alarm, and a lost witness is never negative evidence.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::reception::{
    LocationGeometrySample, ReceivedSceneBody, ReceivedSceneRead, current_received_geometry,
};
use crate::state::Point;
mod measurement;
use measurement::{Body, PointSample, Span};

struct Anchor {
    key: String,
    source_id: String,
}
struct Opportunity {
    anchors: Vec<Anchor>,
    families: IndexMap<String, IndexSet<AttentionRelationFamily>>,
    candidates: u64,
}
pub(super) fn elapsed_deadline(start: f64, seconds: f64) -> f64 {
    let mut at = start + seconds;
    while at - start < seconds {
        at += (at.abs() * f64::EPSILON).max(f64::from_bits(1));
    }
    at
}
fn anchors(
    world: &crate::simulation::SimulationState,
    observer: &str,
    state: &AttentionState,
    journal: &mut CurrentJournal,
) -> Result<Vec<Anchor>, ReceivedError> {
    let mut result = vec![Anchor {
        key: SELF_RELATION_KEY.into(),
        source_id: observer.into(),
    }];
    let scope = CurrentBodyReadScope::prepare(
        &world.reception,
        &world.physical.entities,
        &world.installed,
        &world.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?;
    let mut selected = IndexSet::new();
    for entry in &state.entries {
        if scope
            .as_ref()
            .map(|s| s.native_body(&entry.source_id))
            .transpose()?
            .flatten()
            .is_none_or(|b| b.field.id != entry.lease_id)
        {
            continue;
        }
        result.push(Anchor {
            key: entry.key.clone(),
            source_id: entry.source_id.clone(),
        });
        selected.insert(entry.key.as_str());
    }
    let candidates = build_candidates(
        &world.physical,
        &world.reception,
        &world.installed,
        &world.experience,
        observer,
        state,
        journal,
    )?;
    let target = target(&world.physical, observer);
    for key in relation_keys(state, target, world.physical.header.sim_time) {
        if key == SELF_RELATION_KEY || selected.contains(key.as_str()) {
            continue;
        }
        let Some(candidate) = candidates.get(&key) else {
            continue;
        };
        let annotation = &candidate.annotation;
        if scope
            .as_ref()
            .map(|s| s.native_body(&annotation.source_id))
            .transpose()?
            .flatten()
            .is_some_and(|b| b.field.id == annotation.lease_id)
            && (Some(annotation.source_id.as_str()) == target
                || annotation.direct
                    && annotation.direct_through.unwrap_or(f64::INFINITY)
                        > world.physical.header.sim_time)
        {
            result.push(Anchor {
                key,
                source_id: annotation.source_id.clone(),
            });
        }
    }
    Ok(result)
}
fn opportunity(
    world: &crate::simulation::SimulationState,
    observer: &str,
    state: &mut AttentionState,
    journal: &mut CurrentJournal,
) -> Result<Option<Opportunity>, ReceivedError> {
    let now = world.physical.header.sim_time;
    let policy = &world.installed.attention.value().relation;
    let anchors = anchors(world, observer, state, journal)?;
    let admitted: IndexSet<_> = anchors.iter().map(|a| a.key.as_str()).collect();
    let keys: IndexSet<_> = state
        .relation_dirty
        .keys()
        .chain(state.relation_scans.keys())
        .chain(state.latches.keys())
        .cloned()
        .collect();
    for key in keys {
        let (anchor, _): (String, AttentionRelationFamily) =
            serde_json::from_str(&key).map_err(|_| invalid())?;
        if admitted.contains(anchor.as_str()) {
            continue;
        }
        state.relation_dirty.shift_remove(&key);
        state.relation_scans.shift_remove(&key);
        if let Some(latch) = state.latches.get_mut(&key) {
            latch.clear_since = None;
        }
    }
    let mut families = IndexMap::new();
    let mut due = Vec::new();
    for anchor in anchors {
        let mut pending = IndexSet::new();
        for family in [
            AttentionRelationFamily::ClosingBody,
            AttentionRelationFamily::ClosingDrop,
        ] {
            let key = relation_key(&anchor.key, family)?;
            if !state.relation_dirty.contains_key(&key)
                && state.latches.get(&key).is_some_and(|l| {
                    l.active
                        && l.clear_since
                            .is_some_and(|at| now >= elapsed_deadline(at, policy.clear_seconds))
                })
            {
                state.relation_revision = state
                    .relation_revision
                    .checked_add(1)
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(invalid)?;
                let latch = state.latches.get_mut(&key).ok_or_else(invalid)?;
                let same = state
                    .relation_scans
                    .get(&key)
                    .is_some_and(|s| !s.revision.is_empty() && s.revision == latch.revision);
                state
                    .relation_dirty
                    .insert(key.clone(), state.relation_revision);
                if same {
                    let revision = state.relation_revision.to_string();
                    state
                        .relation_scans
                        .get_mut(&key)
                        .ok_or_else(invalid)?
                        .revision = revision.clone();
                    latch.revision = revision;
                } else {
                    latch.clear_since = None;
                }
            }
            if state.relation_dirty.contains_key(&key) {
                pending.insert(family);
            }
        }
        if !pending.is_empty() {
            families.insert(anchor.key.clone(), pending);
            due.push(anchor);
        }
    }
    if due.is_empty() {
        return Ok(None);
    }
    state.next_relation_at = now + policy.interval_seconds;
    let start = (state.relation_cursor as usize) % due.len();
    state.relation_cursor = ((start + 1) % due.len()) as u64;
    due.rotate_left(start);
    Ok(Some(Opportunity {
        anchors: due,
        families,
        candidates: policy.candidates,
    }))
}
struct Page {
    evaluation: Option<AttentionRelationEvaluation>,
    visited: u64,
}
fn page<T>(
    state: &mut AttentionState,
    policy: &crate::attention::RelationAttentionPolicy,
    anchor: &Anchor,
    family: AttentionRelationFamily,
    values: &[T],
    due: bool,
    allowance: u64,
    mut measure: impl FnMut(&T) -> Result<Option<AttentionRelationWitness>, ExecutionError>,
    prior: Option<AttentionRelationWitness>,
    prior_required: bool,
    known_complete: bool,
) -> Result<Page, ExecutionError> {
    let key = relation_key(&anchor.key, family)?;
    let reserved = u64::from(prior_required && allowance > 0);
    if !due {
        return Ok(Page {
            evaluation: None,
            visited: allowance
                .saturating_sub(reserved)
                .min(values.len() as u64)
                .min(
                    state
                        .relation_scans
                        .get(&key)
                        .map_or(values.len() as u64, |s| s.remaining),
                )
                + reserved,
        });
    }
    let revision = state
        .relation_dirty
        .get(&key)
        .ok_or_else(invalid)?
        .to_string();
    let scan = state
        .relation_scans
        .entry(key)
        .or_insert_with(|| AttentionRelationScan {
            cursor: 0,
            remaining: values.len() as u64,
            revision: String::new(),
            clear_supported: true,
        });
    if scan.revision != revision {
        scan.revision = revision.clone();
        scan.remaining = values.len() as u64;
        scan.clear_supported = true;
    }
    let count = allowance
        .saturating_sub(reserved)
        .min(values.len() as u64)
        .min(scan.remaining);
    let mut witnesses = Vec::with_capacity(count as usize + usize::from(prior.is_some()));
    let clear = if family == AttentionRelationFamily::ClosingBody {
        policy.body.clear
    } else {
        policy.drop.clear
    };
    for at in 0..count {
        let value = &values[((scan.cursor + at) % values.len() as u64) as usize];
        let Some(witness) = measure(value)? else {
            scan.clear_supported = false;
            continue;
        };
        if !(witness.distance_lower > clear
            || witness.decrease_lower < policy.minimum_decrease
            || family == AttentionRelationFamily::ClosingDrop
                && witness.drop_lower.unwrap_or(f64::NEG_INFINITY) < policy.drop.minimum_drop)
        {
            scan.clear_supported = false;
        }
        witnesses.push(witness);
    }
    scan.cursor = if values.is_empty() {
        0
    } else {
        (scan.cursor + count) % values.len() as u64
    };
    scan.remaining -= count;
    let prior_present = prior.is_some();
    if let Some(prior) = prior {
        if !witnesses.iter().any(|v| v.id == prior.id) {
            witnesses.push(prior);
        }
    }
    let exhausted = scan.remaining == 0;
    let complete = exhausted && known_complete;
    let clear_supported = scan.clear_supported && (!prior_required || prior_present);
    // A real prior witness is required to clear an active alarm. Track presence
    // independently of whether it was already included in the ordinary page.
    if exhausted {
        scan.remaining = values.len() as u64;
        scan.clear_supported = true;
    }
    Ok(Page {
        evaluation: Some(AttentionRelationEvaluation {
            anchor_key: anchor.key.clone(),
            family,
            revision,
            exhausted,
            complete,
            clear_supported,
            witnesses,
        }),
        visited: count + reserved,
    })
}
fn proof(body: &ReceivedSceneBody) -> Vec<ObservationFactKey> {
    std::iter::once(&body.sample.fact)
        .chain(std::iter::once(&body.location.sample.fact))
        .chain(
            body.motion
                .iter()
                .flat_map(|m| [&m.earlier.sample.fact, &m.later.sample.fact]),
        )
        .cloned()
        .collect()
}
fn apply(
    state: &mut AttentionState,
    policy: &crate::attention::RelationAttentionPolicy,
    anchors: &IndexSet<String>,
    evaluations: Vec<AttentionRelationEvaluation>,
    now: f64,
) -> Result<(), ReceivedError> {
    for evaluation in evaluations {
        if !anchors.contains(&evaluation.anchor_key) {
            continue;
        }
        let key = relation_key(&evaluation.anchor_key, evaluation.family)?;
        if evaluation.exhausted {
            state.relation_dirty.shift_remove(&key);
        }
        let (enter, clear) = if evaluation.family == AttentionRelationFamily::ClosingBody {
            (policy.body.enter, policy.body.clear)
        } else {
            (policy.drop.enter, policy.drop.clear)
        };
        let witness = evaluation.witnesses.iter().find(|w| {
            w.distance_upper <= enter
                && w.decrease_lower >= policy.minimum_decrease
                && (evaluation.family != AttentionRelationFamily::ClosingDrop
                    || w.drop_lower.unwrap_or(f64::NEG_INFINITY) >= policy.drop.minimum_drop)
        });
        if witness.is_none() && state.latches.get(&key).is_none_or(|l| !l.active) {
            continue;
        }
        let latch = state
            .latches
            .entry(key)
            .or_insert_with(|| AttentionRelationLatch {
                anchor_key: evaluation.anchor_key.clone(),
                family: evaluation.family,
                generation: 0,
                active: false,
                clear_since: None,
                entry_proof: None,
                newest_proof: None,
                revision: evaluation.revision.clone(),
                entered_at: None,
                witness_id: None,
            });
        let same = latch.revision == evaluation.revision;
        latch.revision = evaluation.revision;
        let supported = evaluation.clear_supported
            && (!latch.active
                || evaluation
                    .witnesses
                    .iter()
                    .any(|w| latch.witness_id.as_ref() == Some(&w.id)))
            && evaluation.witnesses.iter().all(|w| {
                w.distance_lower > clear
                    || w.decrease_lower < policy.minimum_decrease
                    || evaluation.family == AttentionRelationFamily::ClosingDrop
                        && w.drop_lower.unwrap_or(f64::NEG_INFINITY) < policy.drop.minimum_drop
            });
        if let Some(witness) = witness {
            latch.clear_since = None;
            latch.newest_proof = Some(witness.proof.clone());
            if !latch.active {
                latch.active = true;
                latch.generation = latch
                    .generation
                    .checked_add(1)
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(invalid)?;
                latch.entry_proof = Some(witness.proof.clone());
                latch.entered_at = Some(now);
                latch.witness_id = Some(witness.id.clone());
            }
        } else if evaluation.complete && supported {
            let start = *latch.clear_since.get_or_insert(now);
            if now - start >= policy.clear_seconds {
                latch.active = false;
                latch.entry_proof = None;
                latch.newest_proof = None;
                latch.witness_id = None;
            }
        } else if !same || evaluation.exhausted || !supported {
            latch.clear_since = None;
        }
    }
    Ok(())
}
pub(crate) fn evaluate_attention_relations(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(prior) = owner(&core.state.reception, observer).and_then(|o| o.attention.as_ref())
    else {
        return Ok(());
    };
    let now = core.state.physical.header.sim_time;
    if now < prior.next_relation_at {
        return Ok(());
    }
    let policy = &core.state.installed.attention.value().relation;
    let receiver = owner(&core.state.reception, observer).ok_or_else(invalid)?;
    let anchor_count = prior
        .annotations
        .len()
        .checked_add(prior.entries.len())
        .and_then(|n| n.checked_add(1))
        .ok_or(ExecutionError::Capacity)?;
    let mut max_id = observer.len();
    let mut max_track = observer.len();
    for contact in receiver.current.values() {
        for original in contact.content.originals.values() {
            max_id = max_id.max(original.id.len());
        }
        for group in &contact.content.groups {
            max_track = max_track.max(
                crate::encoding::json_record_len(&(
                    &group.received.grant.exposure,
                    &group.received.grant.channel.id,
                    group.received.grant.channel.version,
                    &group.received.grant.channel.digest,
                ))
                .map_err(|_| invalid())?,
            );
        }
    }
    for sample in receiver.motion_samples.iter().flat_map(IndexMap::values) {
        max_id = max_id.max(sample.earlier.original.id.len());
    }
    if let Some(geometry) = &receiver.geometry {
        for feature in geometry
            .fragments
            .iter()
            .map(|f| &f.observation)
            .chain(geometry.boundaries.iter().map(|f| &f.observation))
        {
            max_id = max_id.max(feature.id.len());
        }
    }
    let rows = receiver
        .current
        .len()
        .checked_add(receiver.geometry.as_ref().map_or(0, |g| g.boundaries.len()))
        .ok_or(ExecutionError::Capacity)?;
    let visits = (policy.candidates as usize).min(
        rows.checked_mul(anchor_count)
            .ok_or(ExecutionError::Capacity)?,
    );
    let witnesses = visits
        .checked_add(
            anchor_count
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    let fact = size_of::<ObservationFactKey>()
        .checked_add(max_id)
        .and_then(|n| n.checked_add(observer.len()))
        .ok_or(ExecutionError::Capacity)?;
    let mut max_relation = crate::encoding::json_record_len(&(
        SELF_RELATION_KEY,
        AttentionRelationFamily::ClosingBody,
    ))
    .map_err(|_| invalid())?;
    for key in prior
        .annotations
        .keys()
        .chain(prior.entries.iter().map(|e| &e.key))
    {
        max_relation = max_relation.max(
            crate::encoding::json_record_len(&(key, AttentionRelationFamily::ClosingBody))
                .map_err(|_| invalid())?,
        );
    }
    let pairs = anchor_count
        .checked_mul(2)
        .ok_or(ExecutionError::Capacity)?;
    let row_storage = heap_sum([
        map_storage::<String, AttentionRelationScan>(pairs).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, AttentionRelationLatch>(pairs).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, u64>(pairs).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, IndexSet<AttentionRelationFamily>>(anchor_count)
            .ok_or(ExecutionError::Capacity)?,
        anchor_count
            .checked_mul(3 * size_of::<Anchor>() + 2 * size_of::<AttentionRelationEvaluation>())
            .ok_or(ExecutionError::Capacity)?,
        // Both families can each own a dirty key, scan key and latch key,
        // plus their transient lookup/copy during opportunity/application.
        anchor_count
            .checked_mul(
                max_relation
                    .checked_mul(12)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
        receiver
            .current
            .len()
            .checked_mul(size_of::<&str>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let bound = heap_sum([
        prior
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(6)
            .ok_or(ExecutionError::Capacity)?,
        witnesses
            .checked_mul(
                heap_sum([
                    fact.checked_mul(8).ok_or(ExecutionError::Capacity)?,
                    max_track.max(max_id),
                    size_of::<AttentionRelationWitness>() * 2,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
        row_storage,
    ])
    .ok_or(ExecutionError::Capacity)?;
    core.journal.current.reserve_growth(bound)?;
    let mut state = prior.clone();
    // Build candidates borrows the same immutable cut; only its allocation
    // journal is mutable while the opportunity retires stale scan metadata.
    let Some(opportunity) = opportunity(
        &*core.state,
        observer,
        &mut state,
        &mut core.journal.current,
    )?
    else {
        *core
            .journal
            .current
            .attention_mut(&mut core.state.reception, observer)? = Some(state);
        core.journal.current.settle_attention(&mut core.state.reception, observer)?;
        return Ok(());
    };
    let mut scene = ReceivedSceneRead::prepare(core.state, observer, budget)?;
    let catalogue: Vec<&str> = scene
        .as_ref()
        .into_iter()
        .flat_map(|s| s.source_ids())
        .collect();
    let geometry = current_received_geometry(core.state, observer, budget)?;
    let boundaries: Vec<_> = geometry
        .observations()
        .flat_map(|o| {
            o.facets.iter().filter_map(move |f| match &f.value {
                SensoryFacet::PhysicalBoundary { boundary } => Some((o, f.ordinal, boundary)),
                _ => None,
            })
        })
        .collect();
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    let point = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let profile = crate::status::effective_body_profile(entity, budget)?;
    let held = receiver.geometry.as_ref();
    let old = held.and_then(|g| {
        if crate::spatial::distance(g.frame.position_at_observation, point)
            > geometry::RECEIVED_GEOMETRY_EPSILON
        {
            Some((g.frame_at, &g.frame))
        } else {
            g.prior_frame.as_ref().map(|f| (f.at, &f.frame))
        }
    });
    let own_point = PointSample {
        span: Span {
            from: now,
            through: now,
        },
        point: Some((point, 0.0)),
    };
    let own = Body {
        position: point,
        extent: crate::spatial::Extent {
            radius: profile.radius,
            height: profile.height,
        },
        span: Span {
            from: now,
            through: now,
        },
        location: Some(own_point),
        motion: old
            .filter(|(at, _)| {
                *at < now
                    && now - held.map_or(0.0, |g| g.frame_at)
                        < core
                            .state
                            .installed
                            .attention
                            .value()
                            .geometry
                            .interval_seconds
            })
            .map(|(at, frame)| {
                (
                    PointSample {
                        span: Span {
                            from: at,
                            through: at,
                        },
                        point: Some((frame.position_at_observation, 0.0)),
                    },
                    own_point,
                )
            }),
    };
    let mut remaining = opportunity.candidates;
    let mut evaluations = Vec::new();
    for (ordinal, anchor) in opportunity.anchors.iter().enumerate() {
        let captured = if anchor.source_id == observer {
            None
        } else {
            scene
                .as_mut()
                .map(|s| s.body(&anchor.source_id, budget))
                .transpose()?
                .flatten()
        };
        let body = if anchor.source_id == observer {
            own
        } else {
            let Some(body) = &captured else { continue };
            Body::received(&body.value)
        };
        let anchor_proof = captured.as_ref().map_or_else(Vec::new, |b| proof(&b.value));
        let families = opportunity.families.get(&anchor.key).ok_or_else(invalid)?;
        let share = remaining / (opportunity.anchors.len() - ordinal) as u64;
        let body_key = relation_key(&anchor.key, AttentionRelationFamily::ClosingBody)?;
        let body_latch = state.latches.get(&body_key);
        let active = body_latch.is_some_and(|l| l.active);
        let prior = if families.contains(&AttentionRelationFamily::ClosingBody) && share > 0 {
            match body_latch.and_then(|l| l.witness_id.as_deref()) {
                Some(track) => scene
                    .as_mut()
                    .map(|s| s.body_by_track(track, budget))
                    .transpose()?
                    .flatten(),
                None => None,
            }
        } else {
            None
        };
        let measure_body = |neighbor: &ReceivedSceneBody| {
            if neighbor.source_id == anchor.source_id {
                return Some(AttentionRelationWitness {
                    id: neighbor.track.clone(),
                    distance_lower: f64::INFINITY,
                    distance_upper: f64::INFINITY,
                    decrease_lower: 0.0,
                    drop_lower: None,
                    proof: Vec::new(),
                });
            }
            let separation = measurement::body(&body, &Body::received(neighbor))?;
            if separation.decrease.is_none() && separation.lower <= policy.body.clear {
                return None;
            }
            Some(AttentionRelationWitness {
                id: neighbor.track.clone(),
                distance_lower: separation.lower,
                distance_upper: separation.upper,
                decrease_lower: separation.decrease.unwrap_or(0.0),
                drop_lower: None,
                proof: anchor_proof
                    .iter()
                    .cloned()
                    .chain(proof(neighbor))
                    .take(8)
                    .collect(),
            })
        };
        let prior = prior.as_ref().and_then(|b| measure_body(&b.value));
        let body_page = page(
            &mut state,
            policy,
            anchor,
            AttentionRelationFamily::ClosingBody,
            &catalogue,
            families.contains(&AttentionRelationFamily::ClosingBody),
            share / 2 + share % 2,
            |id| {
                Ok(scene
                    .as_mut()
                    .map(|s| s.body(id, budget))
                    .transpose()?
                    .flatten()
                    .as_ref()
                    .and_then(|b| measure_body(&b.value)))
            },
            prior,
            active,
            true,
        )?;
        remaining -= body_page.visited;
        if let Some(e) = body_page.evaluation {
            evaluations.push(e)
        }
        let drop_key = relation_key(&anchor.key, AttentionRelationFamily::ClosingDrop)?;
        let drop_latch = state.latches.get(&drop_key);
        let active = drop_latch.is_some_and(|l| l.active);
        let measure_drop =
            |(o, ordinal, boundary): &(&ObservationContribution, u64, &ObservedBoundary)| {
                let value = measurement::boundary(
                    &body,
                    boundary,
                    o.acquired_at,
                    geometry.supported_through(),
                    core.state.installed.spatial.epsilon,
                )?;
                if value.decrease.is_none() && value.lower <= policy.drop.clear {
                    return None;
                }
                let fact = ObservationFactKey {
                    source: EvidenceSource {
                        family: EvidenceFamily::NativeExposure,
                        id: o.id.clone(),
                        revision: SourceRevision::Number(o.revision),
                        observer: o.observer.clone(),
                    },
                    ordinal: *ordinal,
                };
                Some(AttentionRelationWitness {
                    id: o.id.clone(),
                    distance_lower: value.lower,
                    distance_upper: value.upper,
                    decrease_lower: value.decrease.unwrap_or(0.0),
                    drop_lower: Some(boundary.drop_lower),
                    proof: anchor_proof
                        .iter()
                        .cloned()
                        .chain(std::iter::once(fact))
                        .take(8)
                        .collect(),
                })
            };
        let prior = if families.contains(&AttentionRelationFamily::ClosingDrop)
            && share > body_page.visited
        {
            drop_latch
                .and_then(|l| l.witness_id.as_ref())
                .and_then(|id| boundaries.iter().find(|(o, _, _)| &o.id == id))
                .and_then(measure_drop)
        } else {
            None
        };
        let drop_page = page(
            &mut state,
            policy,
            anchor,
            AttentionRelationFamily::ClosingDrop,
            &boundaries,
            families.contains(&AttentionRelationFamily::ClosingDrop),
            share.saturating_sub(body_page.visited),
            |b| Ok(measure_drop(b)),
            prior,
            active,
            geometry.complete(),
        )?;
        remaining -= drop_page.visited;
        if let Some(e) = drop_page.evaluation {
            evaluations.push(e)
        }
    }
    let admitted = opportunity.anchors.into_iter().map(|a| a.key).collect();
    apply(&mut state, policy, &admitted, evaluations, now)?;
    drop((scene, geometry, profile));
    *core
        .journal
        .current
        .attention_mut(&mut core.state.reception, observer)? = Some(state);
        core.journal.current.settle_attention(&mut core.state.reception, observer)?;
    Ok(())
}
