//! Bounded feature selection and sequential visibility certification.
use super::*;
impl GeometryReceptionCursor {
    pub(super) fn accept_features(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        // The provider may return valid long authored feature IDs. Fund their
        // actual selected copies and escaped extent keys before map/candidate
        // construction; a visit count alone does not bound string storage.
        let feature_heap = answer
            .features
            .iter()
            .flat_map(|q| q.values.iter())
            .chain(answer.feature_ids.iter().flatten())
            .try_fold(0usize, |largest, f| {
                Some(largest.max(f.id.capacity().checked_add(f.source_id.capacity())?))
            })
            .ok_or(ExecutionError::Capacity)?;
        let feature_count = answer
            .features
            .iter()
            .try_fold(answer.feature_ids.len(), |n, q| {
                n.checked_add(q.values.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        let strings = feature_heap
            .checked_mul(
                (self.policy.visits as usize)
                    .checked_add(feature_count)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_mul(32))
            .ok_or(ExecutionError::Capacity)?;
        let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(strings)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let query = answer.features.pop().ok_or_else(invalid)?;
        let state = self.state.as_mut().ok_or_else(invalid)?;
        state.visited += query.visited;
        state.feature_cursor = query.cursor;
        state.finished = state.feature_cursor.is_none();
        state.unknown |= !matches!(query.status, PhysicalQueryStatus::Complete)
            && state.feature_cursor.is_none();
        self.features = query
            .values
            .into_iter()
            .map(|f| (f.id.clone(), f))
            .collect();
        let input = self.input.as_ref().ok_or_else(invalid)?;
        if let Some(previous) = self
            .previous
            .as_ref()
            .filter(|p| p.source_basis == input.source_basis)
        {
            let ids = self.request_ids(previous);
            for (id, feature) in ids.into_iter().zip(answer.feature_ids) {
                if let Some(feature) = feature {
                    if previous
                        .fragments
                        .iter()
                        .filter(|f| f.feature_id == id)
                        .any(|f| {
                            self.anchors.iter().any(|a| {
                                distance_bounds(&bounds(&points(&feature, &Extent::of(f))), *a)
                                    <= self.radius
                            })
                        })
                    {
                        self.features.insert(feature.id.clone(), feature);
                    }
                }
            }
        }
        self.language = Some(
            CollationRequest::prepare(
                self.binding(core)?,
                self.features.keys().map(String::as_str),
                budget,
            )
            .map_err(|_| ExecutionError::Capacity)?,
        );
        self.phase = Phase::Language;
        Ok(())
    }
    fn request_ids(&self, previous: &ReceivedGeometryState) -> Vec<String> {
        let mut ids = Vec::new();
        for f in &previous.fragments {
            if !ids.contains(&f.feature_id) {
                ids.push(f.feature_id.clone());
            }
        }
        ids
    }
    fn enqueue(
        &mut self,
        extent: Extent,
        feature: PhysicalFeature,
        old: Option<GeometryFragment>,
        allowance: u64,
    ) -> Result<(), ExecutionError> {
        let key = extent.key().map_err(|_| invalid())?;
        if self.keys.contains(&key) {
            return Ok(());
        }
        let state = self.state.as_mut().ok_or_else(invalid)?;
        if state.visited >= allowance {
            state.unknown = true;
            return Ok(());
        }
        state.visited += 1;
        self.keys.insert(key);
        let b = bounds(&points(&feature, &extent));
        let priority = self
            .anchors
            .iter()
            .map(|a| distance_bounds(&b, *a))
            .fold(f64::INFINITY, f64::min);
        if priority <= self.radius {
            self.pending.push_back(Candidate {
                extent,
                feature,
                old,
                priority,
            });
        }
        Ok(())
    }
    pub(super) fn select(&mut self, _core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let input = self.input.as_ref().ok_or_else(invalid)?;
        let eye = input.eye;
        let selection_limit = self
            .state
            .as_ref()
            .ok_or_else(invalid)?
            .visited
            .max(self.policy.visits / 2);
        let held = self
            .previous
            .as_ref()
            .filter(|p| p.source_basis == input.source_basis)
            .map(|p| p.fragments.clone())
            .unwrap_or_default();
        for fragment in &held {
            if let Some(feature) = self
                .features
                .get(&fragment.feature_id)
                .filter(|f| front(f, eye))
                .cloned()
            {
                self.enqueue(
                    Extent::of(fragment),
                    feature,
                    Some(fragment.clone()),
                    selection_limit,
                )?;
            }
        }
        let mut closest: Vec<_> = self.features.values().cloned().collect();
        let ranks = self.ranks.as_ref().ok_or_else(invalid)?;
        closest.sort_by(|a, b| {
            let distance = |f: &PhysicalFeature| {
                self.anchors
                    .iter()
                    .map(|p| distance_bounds(&f.bounds, *p))
                    .fold(f64::INFINITY, f64::min)
            };
            distance(a).total_cmp(&distance(b)).then_with(|| {
                ranks
                    .compare(&a.id, &b.id)
                    .expect("All offered feature IDs are ranked")
            })
        });
        for feature in closest {
            if !front(&feature, eye) {
                continue;
            }
            let whole = feature
                .vertices
                .iter()
                .all(|p| self.input.as_ref().expect("Prepared receptor").contains(*p));
            for at in 0..self.anchors.len() {
                if self.state.as_ref().ok_or_else(invalid)?.visited >= selection_limit {
                    self.state.as_mut().ok_or_else(invalid)?.unknown = true;
                    break;
                }
                let point = self.anchors[at];
                if distance_bounds(&feature.bounds, point) > self.radius {
                    continue;
                }
                if held.iter().any(|f| {
                    f.feature_id == feature.id
                        && distance_bounds(&bounds(&points(&feature, &Extent::of(f))), point)
                            <= EPSILON
                }) {
                    continue;
                }
                let extent = if whole {
                    Extent {
                        feature_id: feature.id.clone(),
                        u0: 0.0,
                        u1: 1.0,
                        v0: 0.0,
                        v1: 1.0,
                    }
                } else {
                    local(&feature, point, self.policy.extent_metres)
                };
                self.enqueue(extent, feature.clone(), None, selection_limit)?;
            }
        }
        let mut pending: Vec<_> = self.pending.drain(..).collect();
        let ranks = self.ranks.as_ref().ok_or_else(invalid)?;
        let feature_priority = |f: &PhysicalFeature| match f.kind {
            PhysicalFeatureKind::Support => self.policy.feature_priority.support,
            PhysicalFeatureKind::SolidFace => self.policy.feature_priority.solid_face,
        };
        pending.sort_by(|a, b| {
            feature_priority(&a.feature)
                .total_cmp(&feature_priority(&b.feature))
                .then_with(|| a.priority.total_cmp(&b.priority))
                .then_with(|| b.old.is_some().cmp(&a.old.is_some()))
                .then_with(|| {
                    ranks
                        .compare(&a.feature.id, &b.feature.id)
                        .expect("Offered feature IDs")
                })
        });
        let mut seen = IndexSet::new();
        let mut additional = VecDeque::new();
        for candidate in pending {
            if seen.insert(candidate.feature.source_id.clone()) {
                self.pending.push_back(candidate)
            } else {
                additional.push_back(candidate)
            }
        }
        self.pending.append(&mut additional);
        self.certificate_limit = self.state.as_ref().ok_or_else(invalid)?.visited.max(
            self.policy.visits.saturating_sub(
                self.policy
                    .max_views
                    .min((self.pending.len() as u64).max(2)),
            ),
        );
        Ok(())
    }
    pub(super) fn certificate_result(
        &mut self,
        entry: Candidate,
        visible: Option<ConvexViewAnswer>,
    ) -> Result<(), ExecutionError> {
        let state = self.state.as_mut().ok_or_else(invalid)?;
        state.visited += visible.as_ref().map_or(0, |v| v.visited);
        let input = self.input.as_ref().ok_or_else(invalid)?;
        let vertices = points(&entry.feature, &entry.extent);
        if !visible.as_ref().is_some_and(|v| v.clear) {
            state.unknown = true;
            if visible.as_ref().is_none_or(|v| v.complete)
                && distance(vertices[0], vertices[1]).max(distance(vertices[0], vertices[3]))
                    > self.policy.error_metres * 2.0
            {
                let partitions = visible
                    .as_ref()
                    .and_then(|v| v.blocking_vertices.as_ref())
                    .and_then(|v| shadow(&entry.feature, &entry.extent, input.eye, v));
                let front = partitions.is_some();
                let extents = partitions
                    .unwrap_or_else(|| split(&entry.extent, &entry.feature).into_iter().collect());
                let before = self.pending.len();
                for extent in extents {
                    self.enqueue(extent, entry.feature.clone(), None, self.certificate_limit)?;
                }
                if front {
                    let mut next = self.pending.split_off(before);
                    next.append(&mut self.pending);
                    self.pending = next;
                }
            }
            return Ok(());
        }
        if entry.extent.partial() {
            state.unknown = true;
        }
        let edge = |physical| {
            if physical {
                SurfaceEdge::PhysicalBoundary
            } else {
                SurfaceEdge::CoverageLimit
            }
        };
        let patch = ObservedSurfacePatch {
            vertices,
            normal: entry.feature.normal,
            error_radius: self.policy.error_metres,
            edges: [
                edge(entry.extent.v0 == 0.0),
                edge(entry.extent.u1 == 1.0),
                edge(entry.extent.v1 == 1.0),
                edge(entry.extent.u0 == 0.0),
            ],
            frame: input.frame.clone(),
        };
        self.certified.push(Certified {
            candidate: entry,
            patch,
        });
        Ok(())
    }
}
