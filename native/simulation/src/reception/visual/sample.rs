//! One Source subject patch: originals and location retention occur first;
//! measured member retention and current installation then share its real sample
//! transition. Updating a pose never renews the body's onset pose.
use super::*;
use crate::state::Placement;

struct Prior {
    field: CurrentStoredField,
    grant: CurrentFacetGrant,
    original: Arc<ReceivedObservation>,
    times: CurrentFacetTimes,
    revision: u64,
    availability: Option<CurrentAvailability>,
}
fn prior(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    kind: &str,
) -> Result<Option<Prior>, ExecutionError> {
    let Some(input) = current_native_facet_at(
        Some(owner(core, observer)?),
        subject,
        kind,
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?
    else {
        return Ok(None);
    };
    let bound = heap_sum([
        input.field.heap_bytes().ok_or(ExecutionError::Capacity)?,
        input.grant.heap_bytes().ok_or(ExecutionError::Capacity)?,
        super::super::current_admission::value_bound(&core.state.reception, &input.field.value)?
            .checked_mul(3)
            .ok_or(ExecutionError::Capacity)?,
        input
            .metadata
            .availability
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    core.journal.current.reserve_growth(bound)?;
    let owner = owner(core, observer)?;
    let input = current_native_facet_at(
        Some(owner),
        subject,
        kind,
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?
    .ok_or_else(invalid)?;
    Ok(Some(Prior {
        field: input.field.clone(),
        grant: input.grant.clone(),
        original: owner
            .current
            .get(subject)
            .and_then(|c| c.content.originals.get(&input.grant.original))
            .cloned()
            .ok_or_else(invalid)?,
        times: input.metadata.times.expanded(),
        revision: input.metadata.revision,
        availability: input.metadata.availability.clone(),
    }))
}
fn sample_token(
    core: &mut CoreMutation<'_>,
    token: &mut Option<u64>,
) -> Result<u64, ExecutionError> {
    if let Some(token) = token {
        return Ok(*token);
    }
    let next = core
        .state
        .physical
        .identity
        .allocate("received-sample")?
        .sequence;
    *token = Some(next);
    Ok(next)
}
fn acquire(
    core: &mut CoreMutation<'_>,
    phase: &VisualReception,
    episode: String,
    detector_id: String,
    values: &[SensoryFacet],
    pose: &ObservedBodyPose,
    token: &mut Option<u64>,
) -> Result<Arc<ReceivedObservation>, ExecutionError> {
    let now = core.state.physical.header.sim_time;
    let count = values.len();
    let bytes = heap_sum([
        count
            .checked_mul(size_of::<ObservationFacetInput>())
            .ok_or(ExecutionError::Capacity)?,
        values
            .iter()
            .try_fold(0usize, |sum, v| sum.checked_add(v.heap_bytes()?))
            .ok_or(ExecutionError::Capacity)?,
        pose.heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(count)
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    core.journal.current.reserve_growth(bytes)?;
    let mut facets = Vec::new();
    facets
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for value in values {
        facets.push(ObservationFacetInput {
            support: None,
            role: FacetRole::Direct,
            as_of: now,
            measured_from: now,
            measured_through: now,
            acquired_at: None,
            prepared_pose: (value.kind() == "location").then(|| pose.clone()),
            value: value.clone(),
        });
    }
    let token = sample_token(core, token)?;
    Ok(core.journal.originals.acquire(
        &mut core.state.reception,
        core.state
            .physical
            .entities
            .get(&phase.observer.actor_id)
            .ok_or(ExecutionError::MissingActor)?,
        ReceivedObservationInput {
            origin: ObservationOrigin::Exposure {
                episode_id: episode,
                detector_id,
                measured_from: now,
                measured_through: now,
                source: None,
            },
            modality: Modality::Sight,
            channel: Some(phase.channel.clone()),
            detector: phase.detector.clone(),
            context: None,
            facets,
        },
        now,
        core.state.physical.header.sequence,
        Some(token),
        &mut core.state.physical.identity,
        &core.state.activity.display,
        &mut core.journal.meters,
    )?)
}
fn semantic_changed(a: &SensoryFacet, b: &SensoryFacet) -> bool {
    match (a, b) {
        (SensoryFacet::Body { body: a }, SensoryFacet::Body { body: b }) => {
            a.kind != b.kind
                || a.appearance != b.appearance
                || a.activity != b.activity
                || a.radius != b.radius
                || a.height != b.height
                || a.description != b.description
                || a.assembly != b.assembly
                || a.animation
                    .as_ref()
                    .and_then(Option::as_ref)
                    .map(|a| (&a.id, a.phase))
                    != b.animation
                        .as_ref()
                        .and_then(Option::as_ref)
                        .map(|a| (&a.id, a.phase))
                || a.body_plan != b.body_plan
                || a.subtype != b.subtype
                || a.effects != b.effects
                || a.heat_lit != b.heat_lit
                || a.remains_phase != b.remains_phase
                || a.storage.is_some() != b.storage.is_some()
                || a.outward != b.outward
                || a.label != b.label
        }
        (SensoryFacet::Description { text: a }, SensoryFacet::Description { text: b }) => a != b,
        (
            SensoryFacet::PublicAttributes { attributes: a },
            SensoryFacet::PublicAttributes { attributes: b },
        ) => {
            // Number detail changes are still a new measurement; only category
            // samples change the Source public-attribute meaning.
            if a.len() != b.len() {
                return true;
            }
            a.iter().zip(b).any(|(a, b)| {
                a.id != b.id
                    || a.version != b.version
                    || a.name != b.name
                    || a.presentation != b.presentation
                    || a.body_health != b.body_health
                    || a.unit != b.unit
                    || a.display != b.display
                    || a.status != b.status
                    || a.critical != b.critical
                    || a.editor_critical != b.editor_critical
                    || a.min != b.min
                    || a.max != b.max
                    || a.editor_critical_comparison != b.editor_critical_comparison
                    || a.meaning != b.meaning
                    || a.concern != b.concern
                    || a.condition != b.condition
                    || a.change_feedback != b.change_feedback
                    || (a.display == AttributeDisplay::Category && a.value != b.value)
            })
        }
        (_, SensoryFacet::Carried { .. } | SensoryFacet::PileContents { .. }) => true,
        _ => false,
    }
}
fn earlier(
    core: &CoreMutation<'_>,
    observer: &str,
    subject: &str,
    p: &Prior,
) -> Result<EarlierMotion, ExecutionError> {
    let input = current_native_facet_at(
        Some(owner(core, observer)?),
        subject,
        "location",
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?
    .ok_or_else(invalid)?;
    let mut times = p.times;
    if let Some(check) =
        effective_current_check(owner(core, observer)?, input.grant, input.metadata, false)?
    {
        times = current_partition_with_check(input.metadata, check, false)?
            .times
            .expanded();
    }
    let aliases = match &p.original.origin {
        ObservationOrigin::Occurrence { event_id, .. } => Some(vec![event_id.clone()]),
        ObservationOrigin::Exposure {
            source: Some(source),
            ..
        } => Some(vec![source.id.clone()]),
        _ => None,
    };
    Ok(EarlierMotion {
        value: p.field.value.clone(),
        times: [
            times.value_measured_from,
            times.value_measured_through,
            times.value_acquired_at,
            times.confirmed_from,
            times.confirmed_through,
        ],
        original: MotionOriginal {
            id: p.original.id.clone(),
            revision: p.original.revision,
            ordinal: p.field.original_ordinal,
        },
        confirmation: MotionConfirmation {
            id: p.field.id.clone(),
            revision: p.revision,
        },
        aliases,
    })
}
struct Sample {
    input: CurrentFacetInput,
    value: CurrentValueMode,
    unchanged_confirmation: [f64; 2],
}
pub(super) fn receive_subject(
    phase: &mut VisualReception,
    core: &mut CoreMutation<'_>,
    subject: &str,
    sight: &SightResults,
    detailed: bool,
    budget: &ByteBudget,
) -> Result<Option<u64>, ExecutionError> {
    core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
    core.journal.current.set_gap(
        &mut core.state.reception,
        &phase.observer.actor_id,
        subject,
        None,
    )?;
    let (placement_revision, continuity, life) = match core
        .state
        .physical
        .entities
        .get(subject)
        .ok_or(ExecutionError::MissingEntity)?
    {
        entity if matches!(&entity.placement, Some(Placement::World { .. })) => {
            let Some(Placement::World {
                revision,
                motion_continuity_revision,
                ..
            }) = &entity.placement
            else {
                unreachable!()
            };
            (
                *revision,
                motion_continuity_revision.unwrap_or(0),
                entity.physical_life(),
            )
        }
        _ => return Ok(None),
    };
    phase.checked.insert(subject.into());
    if detailed {
        phase.detailed.insert(subject.into());
    }
    let mut prepared = super::super::visual_source::prepare_visual_source(
        core.state,
        &phase.observer.actor_id,
        subject,
        sight,
        detailed,
        budget,
    )?;
    let held = current_native_facet_at(
        Some(owner(core, &phase.observer.actor_id)?),
        subject,
        "body",
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?;
    let measured = owner(core, &phase.observer.actor_id)?
        .current
        .get(subject)
        .and_then(|c| c.visual_measurement.as_ref());
    if !phase.unchecked.contains(subject)
        && held.zip(measured).is_some_and(|(body, m)| {
            m.lease_id == body.field.id
                && m.original == body.original_source as *const _ as usize
                && m.token == prepared.token
                && (!detailed || m.detailed)
        })
    {
        if owner(core, &phase.observer.actor_id)?
            .motion_samples
            .as_ref()
            .and_then(|m| m.get(subject))
            .is_some_and(|m| core.state.physical.header.sim_time > m.through)
        {
            phase.retired_motion.insert(subject.into());
            phase.attention_changes.insert(subject.into());
        }
        return Ok(None);
    }
    let now = core.state.physical.header.sim_time;
    let bound = prepared
        .facets
        .heap_bytes()
        .ok_or(ExecutionError::Capacity)?
        .checked_mul(4)
        .and_then(|n| n.checked_add(14 * size_of::<SensoryFacet>() + 7 * size_of::<Sample>()))
        .ok_or(ExecutionError::Capacity)?;
    phase.reserve(bound)?;
    prepared
        .facets
        .try_reserve_exact(1)
        .map_err(|_| ExecutionError::Capacity)?;
    prepared.facets.insert(
        1,
        SensoryFacet::Location {
            location: prepared.location.clone(),
            frame: phase.frame.clone(),
        },
    );
    let mut token = None;
    let onset = prior(core, &phase.observer.actor_id, subject, "detected")?;
    let mut admitted = None;
    let original = if let Some(onset) = &onset {
        Arc::clone(&onset.original)
    } else {
        let episode = core
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|m| m.get(&phase.observer.actor_id))
            .and_then(|m| m.get(subject))
            .cloned()
            .unwrap_or_else(String::new);
        let episode = if episode.is_empty() {
            core.state
                .physical
                .identity
                .allocate("perception-exposure")?
                .id
        } else {
            episode
        };
        let before = owner(core, &phase.observer.actor_id)?.received.len();
        let source = acquire(
            core,
            phase,
            episode,
            phase.detector.id.clone(),
            &prepared.facets,
            &prepared.pose,
            &mut token,
        )?;
        if owner(core, &phase.observer.actor_id)?.received.len() > before {
            admitted = Some(Arc::clone(&source));
        }
        source
    };
    let exposure = original.id.clone();
    let mut samples = Vec::new();
    samples
        .try_reserve_exact(prepared.facets.len())
        .map_err(|_| ExecutionError::Capacity)?;
    let mut earlier_location = None;
    for (ordinal, facet) in prepared.facets.into_iter().enumerate() {
        core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
        let kind = facet.kind();
        let mut old = prior(core, &phase.observer.actor_id, subject, kind)?;
        let previous = old
            .as_ref()
            .map(|p| {
                received_facet_value(
                    &core.state.reception.received_values.as_ref(),
                    &p.field.value,
                )
            })
            .transpose()?
            .flatten();
        let reacquired = phase.unchecked.contains(subject);
        if !reacquired {
            if let (Some(SensoryFacet::Body { body: a }), SensoryFacet::Body { body: b }) =
                (&previous, &facet)
            {
                let (a, _) = split_observed_body(a.clone());
                let (b, _) = split_observed_body(b.clone());
                if a == b {
                    continue;
                }
            }
        }
        let pose_changed = if kind == "location" {
            old.as_ref().is_none_or(|p|p.field.source_placement_revision!=Some(placement_revision)||
                !matches!(core.state.reception.received_values.as_ref().value_at(&p.field.value.reference),Some(ReceivedValueFragment::BodyPose(v)) if v.pose==prepared.pose))
        } else {
            false
        };
        let changed = reacquired
            || previous.is_none()
            || pose_changed
            || match (&previous, &facet) {
                (
                    Some(SensoryFacet::Location { location: a, .. }),
                    SensoryFacet::Location { location: b, .. },
                ) => a != b,
                (Some(a), b) => a != b,
                _ => true,
            };
        if !changed {
            continue;
        }
        phase.attention_changes.insert(subject.into());
        if kind == "location" {
            phase.geometry_changes.insert(subject.into());
        }
        if let (Some(SensoryFacet::Body { body: a }), SensoryFacet::Body { body: b }) =
            (&previous, &facet)
        {
            let (ad, ap) = split_observed_body(a.clone());
            let (bd, bp) = split_observed_body(b.clone());
            if ap != bp || ad.radius != bd.radius || ad.height != bd.height {
                phase.geometry_changes.insert(subject.into());
            }
            if phase.collect_notices {
                if let Some(detail) = core
                    .state
                    .installed
                    .observation_rules
                    .value()
                    .changed_outward_notice(a, b)
                {
                    phase.reserve(detail.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    phase.notices.insert(subject.into(), detail);
                }
            }
        } else if kind == "body" {
            phase.geometry_changes.insert(subject.into());
        }
        if kind == "location" && !reacquired {
            if let (
                Some(p),
                Some(SensoryFacet::Location {
                    location:
                        ObservedLocation::Point {
                            point: a,
                            error_radius: ea,
                        },
                    ..
                }),
                SensoryFacet::Location {
                    location:
                        ObservedLocation::Point {
                            point: b,
                            error_radius: eb,
                        },
                    ..
                },
            ) = (&old, &previous, &facet)
            {
                if p.field.motion_continuity_revision.unwrap_or(0) == continuity
                    && p.field
                        .source_placement_revision
                        .is_none_or(|r| placement_revision > r)
                    && crate::spatial::distance(a.position(), b.position()) > ea + eb
                {
                    let earlier = earlier(core, &phase.observer.actor_id, subject, p)?;
                    if earlier.times[1] < now {
                        earlier_location = Some(earlier);
                    }
                }
            }
        }
        let mut source = Arc::clone(&original);
        let mut fresh = admitted.as_ref().is_some_and(|a| Arc::ptr_eq(a, &source));
        if let (Some(p), Some(before)) = (&mut old, &previous) {
            if semantic_changed(before, &facet) {
                source = acquire(
                    core,
                    phase,
                    exposure.clone(),
                    format!(
                        "{}:{}:{}:{}",
                        phase.detector.id,
                        kind,
                        p.field.id,
                        p.revision + 1
                    ),
                    std::slice::from_ref(&facet),
                    &prepared.pose,
                    &mut token,
                )?;
                fresh = true;
                if matches!(kind, "body" | "public-attributes") {
                    p.grant.original = crate::encoding::json_record(&(&source.id, source.revision))
                        .map_err(|_| invalid())?;
                    p.original = Arc::clone(&source);
                    p.field.original_ordinal = 0;
                    p.times.confirmed_from = now;
                } else {
                    let channel = p.grant.channel.clone();
                    phase.remove_member(
                        core,
                        subject,
                        kind,
                        &channel,
                        TemporalChange::Unchecked,
                        budget,
                    )?;
                    old = None;
                }
            }
        }
        // Source's existing visual sample carries its held confirmation
        // separately from the new measurement clock. Equal content preserves
        // that start; the completed sight check extends its support later.
        let unchanged_confirmation = old.as_ref().map_or([now, now], |p| {
            [p.times.confirmed_from, p.times.confirmed_through]
        });
        let (mut field, grant, times, revision, availability) = if let Some(p) = old {
            source = Arc::clone(&p.original);
            (
                p.field,
                p.grant,
                CurrentFacetTimes {
                    value_measured_from: now,
                    value_measured_through: now,
                    value_acquired_at: now,
                    confirmed_from: if reacquired {
                        now
                    } else {
                        p.times.confirmed_from
                    },
                    confirmed_through: now,
                },
                p.revision
                    .checked_add(1)
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(invalid)?,
                p.availability,
            )
        } else {
            let lease = core
                .state
                .physical
                .identity
                .allocate("perception-lease")?
                .id;
            if !fresh
                || source
                    .facets
                    .get(ordinal)
                    .is_none_or(|f| f.value.kind != kind)
                    && source.facets.first().is_none_or(|f| f.value.kind != kind)
            {
                source = acquire(
                    core,
                    phase,
                    exposure.clone(),
                    format!("{}:{}:{}", phase.detector.id, kind, lease),
                    std::slice::from_ref(&facet),
                    &prepared.pose,
                    &mut token,
                )?;
            }
            let original_ordinal = if source.facets.len() == 1 {
                0
            } else {
                ordinal as u64
            };
            (
                CurrentStoredField {
                    id: lease,
                    body_lease_id: None,
                    local_subject: None,
                    motion_continuity_revision: None,
                    source_placement_revision: None,
                    value: source
                        .facets
                        .get(original_ordinal as usize)
                        .ok_or_else(invalid)?
                        .value
                        .clone(),
                    original_ordinal,
                    semantic_revision: 1,
                },
                CurrentFacetGrant {
                    subject_id: subject.into(),
                    subject_physical_life: life,
                    original: crate::encoding::json_record(&(&source.id, source.revision))
                        .map_err(|_| invalid())?,
                    exposure: exposure.clone(),
                    modality: Modality::Sight,
                    channel: phase.channel.clone(),
                },
                CurrentFacetTimes {
                    value_measured_from: now,
                    value_measured_through: now,
                    value_acquired_at: now,
                    confirmed_from: now,
                    confirmed_through: now,
                },
                1,
                None,
            )
        };
        // The same physical body may have just rebound its semantic source.
        // Current membership and source ordinal follow that actual acquisition.
        if matches!(kind, "body" | "public-attributes") && fresh {
            field.original_ordinal = if source.facets.len() == 1 {
                0
            } else {
                ordinal as u64
            };
        }
        let value = if admitted.as_ref().is_some_and(|a| Arc::ptr_eq(a, &source)) {
            field.value = source
                .facets
                .get(ordinal)
                .ok_or_else(invalid)?
                .value
                .clone();
            CurrentValueMode::Retained
        } else if kind == "location" {
            let (retained, added) = super::super::originals::retain_facet(
                &mut core.state.reception.received_values,
                facet,
                Some(prepared.pose.clone()),
                Some(&field.value),
                now,
                core.state.physical.header.sequence,
                &mut core.state.physical.identity,
                &core.state.activity.display,
                budget,
            )?;
            if added > 0 {
                core.journal
                    .meters
                    .charge(&[(WorkUnit::OutputBytes, added)])?;
            }
            field.value = retained;
            CurrentValueMode::Retained
        } else {
            CurrentValueMode::Measured {
                value: facet,
                prepared_pose: None,
            }
        };
        if kind == "location" {
            field.motion_continuity_revision = Some(continuity);
            field.source_placement_revision = Some(placement_revision);
        }
        samples.push(Sample {
            input: CurrentFacetInput {
                field,
                grant,
                original: source,
                times,
                revision,
                availability,
            },
            value,
            unchanged_confirmation,
        });
    }
    if !samples.is_empty() {
        let before = CurrentCohort::capture(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            &phase.observer.actor_id,
            budget,
        )?;
        let token = sample_token(core, &mut token)?;
        let transition = core.journal.acquisitions.begin_received(
            &phase.observer.actor_id,
            phase.observer.physical_life,
            Some(token),
        )?;
        for Sample {
            input,
            value,
            unchanged_confirmation,
        } in samples
        {
            if let Some(pending) = prepare_current_sample(
                core,
                &phase.observer.actor_id,
                input,
                value,
                unchanged_confirmation,
                budget,
            )? {
                close_current_sample_history(core, &phase.observer.actor_id, &pending, budget)?;
                let kind = pending.kind().to_owned();
                let confirmed_revision = pending.revision();
                let frame_ref = Some(pending.received_frame().unwrap_or(&phase.frame_ref).clone());
                let (status, parts) = apply_current_sample(
                    &mut core.journal.current,
                    &mut core.state.reception,
                    pending,
                    CurrentReceptionStamp {
                        received_at: now,
                        received_order: token,
                        confirmed_revision,
                        frame_ref,
                    },
                )?;
                phase.current.installed_sample(
                    core,
                    subject,
                    &kind,
                    status,
                    parts,
                    before.as_ref(),
                    token,
                    budget,
                )?;
            }
        }
        super::super::retirement::finish_received(core, transition)?;
    }
    let stored = current_native_facet_at(
        Some(owner(core, &phase.observer.actor_id)?),
        subject,
        "location",
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?;
    if let (Some(earlier), Some(location)) = (earlier_location, stored) {
        let policy = routine_sight_policy(
            &core.state.installed,
            core.state
                .physical
                .entities
                .get(&phase.observer.actor_id)
                .ok_or(ExecutionError::MissingActor)?,
        );
        let epoch = core
            .state
            .reception
            .sensory
            .as_ref()
            .map_or(0.0, |s| s.epoch_at);
        let period = policy.and_then(|p| {
            if phase.before_attention.contains(subject) {
                p.detail_seconds.or(p.seconds)
            } else {
                p.seconds
            }
        });
        let expires_at = period.map_or(now, |p| epoch + (((now - epoch) / p).floor() + 1.0) * p);
        let continuity_revision = location.field.motion_continuity_revision.unwrap_or(0);
        core.journal.current.set_motion(
            &mut core.state.reception,
            &phase.observer.actor_id,
            subject,
            Some(CurrentMotionSample {
                earlier,
                through: now,
                continuity_revision,
                expires_at,
            }),
        )?;
    } else if owner(core, &phase.observer.actor_id)?
        .motion_samples
        .as_ref()
        .and_then(|m| m.get(subject))
        .is_some_and(|m| now > m.through)
    {
        phase.retired_motion.insert(subject.into());
    }
    let body = current_native_facet_at(
        Some(owner(core, &phase.observer.actor_id)?),
        subject,
        "body",
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?;
    if let Some(body) = body {
        let original = body.original_source as *const _ as usize;
        let lease_id = body.field.id.clone();
        core.journal.current.set_visual_measurement(
            &mut core.state.reception,
            &phase.observer.actor_id,
            subject,
            Some(VisualMeasurement {
                original,
                lease_id,
                token: prepared.token,
                detailed,
            }),
        )?;
    }
    if let Some(token) = token {
        phase.sample_tokens.insert(subject.into(), token);
    }
    Ok(token)
}
