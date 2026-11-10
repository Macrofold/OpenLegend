//! Eligibility is read from actual selected hosts, current bodies and the
//! installed closed social/inventory owners. The formatting batch only names
//! these already selected rows; it can introduce no choice or command.
use super::*;
use crate::text::JsText;
use crate::worlds::base_decision_offers::ActivityChoiceKind;

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub(super) enum ActivityLabel {
    CampOwn,
    Hands { label: JsText },
    Person { name: crate::state::Named },
}
pub(super) struct NpcActivityPreparation {
    pub queries: Option<GeometryQueries>,
    reachable: Vec<usize>,
    visibility_count: usize,
    _storage: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Choice {
    id: String,
    label: JsText,
    kind: &'static str,
    roles: Vec<&'static str>,
    request_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    distance: Option<f64>,
    accessible: bool,
}
#[derive(Serialize)]
struct Available {
    choices: Vec<Choice>,
    warnings: Vec<JsText>,
}
#[derive(Serialize)]
pub(super) struct NpcActivityRead {
    outing: &'static str,
    available: Available,
    #[serde(skip)]
    pub labels: Vec<ActivityLabel>,
    #[serde(skip)]
    storage: ByteReservation,
}
impl NpcActivityPreparation {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        actor: &str,
        targets: &[Target],
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let hosts = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .activity_choices;
        for host in hosts {
            if !core
                .state
                .installed
                .manifest
                .activity_hosts
                .contains(&host.pin)
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let observer = core
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        if observer
            .actor
            .as_ref()
            .is_some_and(|actor| actor.inventory_inspection.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        // These owners were minted from complete current entity/resource/social
        // collections; no selected writer creates a positive member here.
        let _inventory = core
            .state
            .inventory
            .project(&core.state.administration.object_membership);
        core.state.physical.participation.require_closed_social();
        let count = targets.len();
        let storage = budget.reserve(
            count
                .checked_mul(size_of::<usize>() + size_of::<SightRay>())
                .and_then(|n| n.checked_add(size_of::<Self>() + size_of::<GeometryQueries>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut reachable = Vec::with_capacity(count);
        let mut rays = Vec::with_capacity(count);
        let social = core
            .state
            .installed
            .retained
            .social_offer_read
            .as_ref()
            .is_some_and(|policy| policy.incoming > 0 && policy.outgoing > 0);
        let recipients = social
            && hosts.iter().any(|host| {
                matches!(host.kind, ActivityChoiceKind::Outings)
                    && (host.travel_request.is_some() || host.combat_request.is_some())
            });
        if recipients {
            let profile = crate::status::effective_body_profile(observer, budget)?;
            let mut from = observer
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            from.y += profile.interaction_height;
            for (index, target) in targets
                .iter()
                .enumerate()
                .filter(|(_, target)| target.visible)
            {
                let other = core
                    .state
                    .physical
                    .entities
                    .get(&target.id)
                    .ok_or(ExecutionError::MissingEntity)?;
                if !crate::worlds::base_decision_offers::activity_recipient_eligible(
                    &core.state.installed,
                    other,
                )? {
                    continue;
                }
                let profile = crate::status::effective_body_profile(other, budget)?;
                let mut to = other
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                to.y += profile.interaction_height;
                if crate::spatial::distance(from, to)
                    <= core.state.installed.retained.item_handling_read.reach
                {
                    reachable.push(index);
                    rays.push(SightRay { from, to });
                }
            }
        }
        let queries = if rays.is_empty() {
            None
        } else {
            let mut query = GeometryQueries::new(GeometryBinding::new(
                candidate,
                core.state.installed.geometry.spatial.revision,
                core.journal.next_provider_serial()?,
            ));
            query.sight = rays;
            Some(query)
        };
        Ok(Self {
            queries,
            reachable,
            visibility_count: targets.iter().filter(|target| target.visible).count(),
            _storage: storage,
        })
    }
    pub(super) fn answer(&mut self, answer: GeometryAnswers) -> Result<(), ExecutionError> {
        let queries = self
            .queries
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        queries
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let mut ordinal = 0;
        self.reachable.retain(|_| {
            let clear = answer.sight[ordinal];
            ordinal += 1;
            clear
        });
        Ok(())
    }
    pub(super) fn finish(
        self,
        core: &CoreMutation<'_>,
        actor: &str,
        targets: &[Target],
        budget: &ByteBudget,
    ) -> Result<NpcActivityRead, ExecutionError> {
        if self.queries.is_some() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .activity_choices;
        let maximum = rules
            .len()
            .checked_mul(
                targets
                    .len()
                    .checked_mul(3)
                    .and_then(|n| n.checked_add(1))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(
            maximum
                .checked_mul(size_of::<Choice>() + size_of::<ActivityLabel>())
                .and_then(|n| n.checked_add(rules.len() * size_of::<JsText>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut read = NpcActivityRead {
            outing: "",
            available: Available {
                choices: Vec::with_capacity(maximum),
                warnings: Vec::with_capacity(rules.len()),
            },
            labels: Vec::with_capacity(maximum),
            storage: budget.reserve(0)?,
        };
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            actor,
        )?;
        let observer = core
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        for host in rules {
            match host.kind {
                ActivityChoiceKind::Camp => {
                    if let Some(request) = &host.own_supply_request {
                        read.append(
                            actor,
                            "sourceId",
                            request,
                            Some(0.),
                            ActivityLabel::CampOwn,
                            &mut storage,
                        )?;
                    }
                }
                ActivityChoiceKind::Work => {
                    if let Some(hands) = &host.hands {
                        storage.resize(
                            storage
                                .bytes()
                                .checked_add(
                                    hands.label.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                )
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        read.append(
                            actor,
                            "instrumentId",
                            &hands.request_id,
                            None,
                            ActivityLabel::Hands {
                                label: hands.label.clone(),
                            },
                            &mut storage,
                        )?;
                    }
                }
                ActivityChoiceKind::Outings => {
                    for (index, target) in targets
                        .iter()
                        .enumerate()
                        .filter(|(_, target)| target.visible)
                    {
                        let other = core
                            .state
                            .physical
                            .entities
                            .get(&target.id)
                            .ok_or(ExecutionError::MissingEntity)?;
                        let name = names.capture_observer_name(&target.id, budget)?;
                        for (request, role, eligible) in [
                            (
                                host.travel_request.as_ref(),
                                "recipientId",
                                self.reachable.contains(&index),
                            ),
                            (
                                host.combat_request.as_ref(),
                                "recipientId",
                                self.reachable.contains(&index),
                            ),
                            (
                                host.combat_request.as_ref(),
                                "opponentId",
                                crate::worlds::base_decision_offers::activity_opponent_permitted(
                                    &core.state.installed,
                                    observer,
                                    other,
                                ),
                            ),
                        ] {
                            if let Some(request) = request.filter(|_| eligible) {
                                storage.resize(
                                    storage
                                        .bytes()
                                        .checked_add(
                                            name.name()
                                                .heap_bytes()
                                                .ok_or(ExecutionError::Capacity)?,
                                        )
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                read.append(
                                    &target.id,
                                    role,
                                    request,
                                    None,
                                    ActivityLabel::Person {
                                        name: name.name().clone(),
                                    },
                                    &mut storage,
                                )?;
                            }
                        }
                    }
                }
                ActivityChoiceKind::Reservoir => {}
            }
            if self.visibility_count > host.maximum_visible {
                if let Some(warning) = &host.visible_warning {
                    storage.resize(
                        storage
                            .bytes()
                            .checked_add(warning.heap_bytes().ok_or(ExecutionError::Capacity)?)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    read.available.warnings.push(warning.clone());
                }
            }
        }
        read.storage = storage;
        Ok(read)
    }
}
impl NpcActivityRead {
    fn append(
        &mut self,
        id: &str,
        role: &'static str,
        request: &str,
        distance: Option<f64>,
        label: ActivityLabel,
        storage: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        storage.resize(
            storage
                .bytes()
                .checked_add(id.len() + request.len() + size_of::<&str>() + size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.available.choices.push(Choice {
            id: id.into(),
            label: JsText::default(),
            kind: "entity",
            roles: vec![role],
            request_ids: vec![request.into()],
            distance,
            accessible: true,
        });
        self.labels.push(label);
        Ok(())
    }
    pub(super) fn finish_labels(&mut self, labels: Vec<JsText>) -> Result<(), ExecutionError> {
        if labels.len() != self.available.choices.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.storage.resize(
            self.storage
                .bytes()
                .checked_add(
                    labels
                        .iter()
                        .try_fold(0usize, |n, label| n.checked_add(label.heap_bytes()?))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        for (choice, label) in self.available.choices.iter_mut().zip(labels) {
            choice.label = label;
        }
        self.labels = Vec::new();
        Ok(())
    }
}
