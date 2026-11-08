//! Complete feature/boundary bundles admit originals before the geometry owner is replaced.
use super::*;
impl GeometryReceptionCursor {
    fn admit(
        &mut self,
        core: &mut CoreMutation<'_>,
        at: usize,
    ) -> Result<Option<usize>, ExecutionError> {
        let candidate = self.certified.get(at).ok_or_else(invalid)?;
        let key = candidate.candidate.extent.key().map_err(|_| invalid())?;
        let state = self.state.as_ref().ok_or_else(invalid)?;
        if let Some(at) = state.fragments.iter().position(|f| f.key == key) {
            return Ok(Some(at));
        }
        if state.fragments.len() + state.boundaries.len() >= self.policy.max_views as usize {
            return Ok(None);
        }
        let retained = candidate.candidate.old.as_ref();
        let result = if let Some(old) = retained {
            let bytes = json_record_len(&old.observation).map_err(|_| invalid())? as u64;
            (state.bytes + bytes <= self.policy.max_bytes).then(|| (old.observation.clone(), bytes))
        } else {
            self.admitted(
                core,
                SensoryFacet::SurfacePatch {
                    patch: candidate.patch.clone(),
                },
                &key,
                self.policy.max_bytes - state.bytes,
            )?
        };
        let Some((observation, bytes)) = result else {
            return Ok(None);
        };
        let candidate = self.certified.get(at).ok_or_else(invalid)?;
        let extent = &candidate.candidate.extent;
        let recording = candidate
            .candidate
            .old
            .as_ref()
            .and_then(|f| f.recording.clone());
        let state = self.state.as_mut().ok_or_else(invalid)?;
        let at = state.fragments.len();
        state.fragments.push(GeometryFragment {
            feature_id: extent.feature_id.clone(),
            u0: extent.u0,
            u1: extent.u1,
            v0: extent.v0,
            v1: extent.v1,
            key,
            observation: observation.clone(),
            recording,
        });
        state.bytes += bytes;
        if candidate.candidate.old.is_none() {
            self.acquired.push(observation);
        }
        Ok(Some(at))
    }
    fn admitted(
        &self,
        core: &mut CoreMutation<'_>,
        value: SensoryFacet,
        key: &str,
        available: u64,
    ) -> Result<Option<(ObservationContribution, u64)>, ExecutionError> {
        let input = self.input.as_ref().ok_or_else(invalid)?;
        let state = self.state.as_ref().ok_or_else(invalid)?;
        let now = core.state.physical.header.sim_time;
        let origin = ObservationOrigin::Exposure {
            episode_id: state.episode_id.clone(),
            detector_id: encoded(&(value.kind(), key))?,
            measured_from: now,
            measured_through: now,
            source: None,
        };
        let observation = ObservationContribution {
            id: format!(
                "perception-observation-{}",
                crate::identity::MAX_SAFE_INTEGER
            ),
            revision: 1,
            observer: input.observer.clone(),
            origin: origin.clone(),
            acquired_at: now,
            received_order: crate::identity::MAX_SAFE_INTEGER,
            modality: Modality::Sight,
            channel: Some(input.channel.clone()),
            detector: input.detector.clone(),
            context: None,
            facets: vec![ObservationFacet {
                support: None,
                ordinal: 0,
                role: FacetRole::Direct,
                as_of: now,
                measured_from: now,
                measured_through: now,
                acquired_at: now,
                value: value.clone(),
            }],
        };
        let bound = json_record_len(&observation).map_err(|_| invalid())? as u64;
        if bound > available {
            return Ok(None);
        }
        let original = core.journal.originals.acquire(
            &mut core.state.reception,
            core.state
                .physical
                .entities
                .get(&self.observer)
                .ok_or(ExecutionError::MissingActor)?,
            ReceivedObservationInput {
                origin,
                modality: Modality::Sight,
                channel: Some(input.channel.clone()),
                detector: input.detector.clone(),
                context: None,
                facets: vec![ObservationFacetInput {
                    support: None,
                    role: FacetRole::Direct,
                    as_of: now,
                    measured_from: now,
                    measured_through: now,
                    acquired_at: None,
                    prepared_pose: None,
                    value,
                }],
            },
            now,
            core.state.physical.header.sequence,
            None,
            &mut core.state.physical.identity,
            &core.state.activity.display,
            &mut core.journal.meters,
        )?;
        let observation = materialize_observation(
            core.state
                .reception
                .received_values
                .as_ref()
                .ok_or_else(invalid)?,
            &original,
        )?;
        let bytes = json_record_len(&observation).map_err(|_| invalid())? as u64;
        if bytes > bound {
            return Err(invalid());
        }
        Ok(Some((observation, bytes)))
    }
    pub(super) fn finish_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let mut supports: Vec<usize> = self
            .certified
            .iter()
            .enumerate()
            .filter(|(_, c)| c.candidate.feature.kind == PhysicalFeatureKind::Support)
            .map(|(i, _)| i)
            .collect();
        supports.sort_by(|a, b| {
            bounds(&self.certified[*a].patch.vertices)
                .min
                .y
                .total_cmp(&bounds(&self.certified[*b].patch.vertices).min.y)
        });
        let mut near = supports.clone();
        near.sort_by(|a, b| {
            bounds(&self.certified[*b].patch.vertices)
                .max
                .y
                .total_cmp(&bounds(&self.certified[*a].patch.vertices).max.y)
        });
        for a in near {
            for b in &supports {
                let state = self.state.as_mut().ok_or_else(invalid)?;
                if state.visited >= self.policy.visits {
                    state.unknown = true;
                    break;
                }
                state.visited += 1;
                let near = &self.certified[a];
                let far = &self.certified[*b];
                if near.candidate.feature.source_id == far.candidate.feature.source_id {
                    continue;
                }
                let Some(edge) = boundary_edge(&near.patch, &bounds(&far.patch.vertices)) else {
                    continue;
                };
                let lower = edge
                    .iter()
                    .map(|p| p.y - height(&far.patch, *p))
                    .fold(f64::INFINITY, f64::min)
                    - self.policy.error_metres * 2.0;
                if lower <= 0.0 {
                    continue;
                }
                let near_key = near.candidate.extent.key().map_err(|_| invalid())?;
                let far_key = far.candidate.extent.key().map_err(|_| invalid())?;
                let key = encoded(&(&near_key, &far_key, edge))?;
                let state = self.state.as_mut().ok_or_else(invalid)?;
                if state.boundary_keys.contains(&key) {
                    continue;
                }
                let needed = state.fragments.len()
                    + state.boundaries.len()
                    + usize::from(!state.fragments.iter().any(|f| f.key == near_key))
                    + usize::from(!state.fragments.iter().any(|f| f.key == far_key))
                    + 1;
                if needed > self.policy.max_views as usize {
                    state.unknown = true;
                    continue;
                }
                let (Some(ai), Some(bi)) = (self.admit(core, a)?, self.admit(core, *b)?) else {
                    self.state.as_mut().ok_or_else(invalid)?.unknown = true;
                    continue;
                };
                let near = &self.certified[a];
                let far = &self.certified[*b];
                let state = self.state.as_ref().ok_or_else(invalid)?;
                let middle = Point {
                    x: (edge[0].x + edge[1].x) / 2.0,
                    y: (edge[0].y + edge[1].y) / 2.0,
                    z: (edge[0].z + edge[1].z) / 2.0,
                };
                let fact = |index: usize| {
                    let original = &state.fragments[index].observation;
                    ObservationFactKey {
                        source: EvidenceSource {
                            family: EvidenceFamily::NativeExposure,
                            id: original.id.clone(),
                            revision: SourceRevision::Number(original.revision),
                            observer: original.observer.clone(),
                        },
                        ordinal: 0,
                    }
                };
                let value = ObservedBoundary {
                    a: edge[0],
                    b: edge[1],
                    error_radius: self.policy.error_metres,
                    near_surface: ReceivedSurface {
                        point: middle,
                        normal: near.patch.normal,
                        support: fact(ai),
                    },
                    far_surface: ReceivedSurface {
                        point: Point {
                            y: height(&far.patch, middle),
                            ..middle
                        },
                        normal: far.patch.normal,
                        support: fact(bi),
                    },
                    drop_lower: lower,
                };
                let old = self.previous.as_ref().and_then(|p| {
                    p.boundary_keys
                        .iter()
                        .position(|k| k == &key)
                        .and_then(|i| p.boundaries.get(i))
                });
                let retained=old.filter(|o|matches!(&o.observation.facets[0].value,SensoryFacet::PhysicalBoundary{boundary}if boundary==&value));
                let result = if let Some(old) = retained {
                    Some((
                        old.observation.clone(),
                        json_record_len(&old.observation).map_err(|_| invalid())? as u64,
                    ))
                } else {
                    self.admitted(
                        core,
                        SensoryFacet::PhysicalBoundary { boundary: value },
                        &key,
                        self.policy.max_bytes - state.bytes,
                    )?
                };
                let Some((observation, bytes)) =
                    result.filter(|(_, bytes)| state.bytes + bytes <= self.policy.max_bytes)
                else {
                    self.state.as_mut().ok_or_else(invalid)?.unknown = true;
                    continue;
                };
                let recording = retained.and_then(|o| o.recording.clone());
                let fresh = retained.is_none();
                let state = self.state.as_mut().ok_or_else(invalid)?;
                state.boundaries.push(ReceivedGeometryFeature {
                    observation: observation.clone(),
                    recording,
                });
                state.boundary_keys.push(key);
                state.bytes += bytes;
                if fresh {
                    self.acquired.push(observation);
                }
            }
        }
        for at in 0..self.certified.len() {
            if self.admit(core, at)?.is_none() {
                self.state.as_mut().ok_or_else(invalid)?.unknown = true;
            }
        }
        let mut state = self.state.take().ok_or_else(invalid)?;
        if state.fragments.len() + state.boundaries.len() >= self.policy.max_views as usize
            || state.bytes >= self.policy.max_bytes
        {
            state.finished = true;
        }
        state.complete = state.finished && !state.unknown;
        if let Some(previous) = &self.previous {
            for (observation, recording) in previous
                .fragments
                .iter()
                .map(|f| (&f.observation, &f.recording))
                .chain(
                    previous
                        .boundaries
                        .iter()
                        .map(|f| (&f.observation, &f.recording)),
                )
            {
                if !state
                    .fragments
                    .iter()
                    .any(|f| f.observation.id == observation.id)
                    && !state
                        .boundaries
                        .iter()
                        .any(|f| f.observation.id == observation.id)
                {
                    super::recording::close_geometry_feature(
                        core,
                        &self.observer,
                        observation,
                        recording.as_ref(),
                        previous.supported_through,
                        crate::received::TemporalChange::Loss,
                        budget,
                    )?;
                }
            }
        }
        super::recording::record_geometry(core, &self.observer, &mut state, budget)?;
        core.journal
            .current
            .replace_geometry(&mut core.state.reception, &self.observer, state)?;
        attention_control::dirty_attention_relations(
            &core.state.physical,
            &mut core.state.reception,
            &mut core.journal.current,
            &self.observer,
            &[AttentionRelationFamily::ClosingDrop],
        )?;
        self.changed = true;
        Ok(())
    }
}
