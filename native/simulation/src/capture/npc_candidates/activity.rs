//! Eligibility is read from actual selected hosts, current bodies and the
//! installed closed social/inventory owners. The formatting batch only names
//! these already selected rows; it can introduce no choice or command.
use super::*;
use crate::text::JsText;
use crate::worlds::{
    InstalledActivityChoiceKind as ActivityChoiceKind,
    InstalledActivityChoiceLabel as ActivityLabel,
};

pub(super) struct NpcActivityPreparation {
    pub queries: Option<GeometryQueries>,
    reachable: Vec<usize>,
    visibility_count: usize,
    _storage: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcActivityChoice {
    pub id: String,
    pub label: JsText,
    pub kind: &'static str,
    pub roles: Vec<String>,
    pub request_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub distance: Option<f64>,
    pub accessible: bool,
}
#[derive(Serialize)]
struct Available {
    choices: Vec<NpcActivityChoice>,
    warnings: Vec<JsText>,
}
#[derive(Serialize)]
pub(super) struct NpcActivityRead {
    outing: &'static str,
    available: Available,
    #[serde(skip)]
    pub labels: Vec<ActivityLabel>,
    #[serde(skip)]
    possessions: Vec<Possession>,
    #[serde(skip)]
    values: Vec<crate::worlds::base_request_forms::fields::FormValue>,
    #[serde(skip)]
    storage: ByteReservation,
}

/// An exact, accessible lot from the decision actor's own custody snapshot.
pub struct Possession {
    pub id: String,
    pub name: crate::state::Named,
    pub lot: LotStamp,
}
#[derive(Clone, Copy, PartialEq, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LotStamp {
    pub revision: u64,
    pub placement_revision: u64,
    pub quantity: u64,
    pub available: u64,
    pub equipped: bool,
}
impl LotStamp {
    fn of(item: &crate::install::OwnedItem<'_>) -> Self {
        Self {
            revision: item.revision,
            placement_revision: item.placement_revision,
            quantity: item.quantity,
            available: item.available_quantity,
            equipped: item.equipped,
        }
    }
    pub(crate) fn current(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        id: &str,
    ) -> Result<bool, ExecutionError> {
        Ok(
            crate::install::owned_by(&state.physical, &state.installed.retained, actor, id)?
                .is_some_and(|item| *self == Self::of(&item)),
        )
    }
}
impl HeapBytes for LotStamp {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}

pub struct NpcActivityFacts<'a> {
    pub choices: &'a [NpcActivityChoice],
    pub possessions: &'a [Possession],
    pub values: &'a [crate::worlds::base_request_forms::fields::FormValue],
    pub warnings: &'a [JsText],
    pub admitted_bytes: usize,
}

impl NpcActivityRead {
    pub(super) fn facts(&self) -> NpcActivityFacts<'_> {
        NpcActivityFacts {
            choices: &self.available.choices,
            possessions: &self.possessions,
            values: &self.values,
            warnings: &self.available.warnings,
            admitted_bytes: self.storage.bytes(),
        }
    }
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
        // The selected activity options below use only the admitted social
        // and movement owners. They never claim or offer an item.
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
                if !core
                    .state
                    .installed
                    .npc_activity_choices
                    .recipient_eligible(&core.state.installed, other)?
                {
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
                core.state.geometry_revision(),
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
                .checked_mul(size_of::<NpcActivityChoice>() + size_of::<ActivityLabel>())
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
            possessions: Vec::new(),
            values: Vec::new(),
            storage: budget.reserve(0)?,
        };
        let state = &core.state;
        state.inventory.visit_owned_until(
            &state.physical.entities,
            actor,
            actor,
            &mut |entity, accessible| {
                let item = crate::install::project_owned(
                    &state.installed.retained,
                    actor,
                    entity,
                    accessible,
                    state.physical.holds.quantity(&entity.id),
                )?;
                let bytes = item
                    .named
                    .heap_bytes()
                    .and_then(|n| n.checked_add(item.id.len() + 2 * size_of::<Possession>()))
                    .ok_or(ExecutionError::Capacity)?;
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(bytes)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                read.possessions.push(Possession {
                    id: item.id.into(),
                    name: item.named.clone(),
                    lot: LotStamp::of(&item),
                });
                Ok(read.possessions.len() >= crate::install::inventory_display_limit())
            },
        )?;
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
        let policy = &core.state.installed.npc_activity_choices;
        for host in rules {
            match host.kind {
                ActivityChoiceKind::Camp => {
                    if let Some(request) = &host.own_supply_request {
                        read.append(
                            actor,
                            "sourceId",
                            request,
                            Some(0.),
                            policy.own_supply_label(),
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
                            policy.manual_instrument_label(&hands.label),
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
                                policy.opponent_permitted(&core.state.installed, observer, other),
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
                                    policy.person_label(name.name()),
                                    &mut storage,
                                )?;
                            }
                        }
                    }
                }
                ActivityChoiceKind::Installed | ActivityChoiceKind::Reservoir => {}
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
        let forms = &state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .installed_requests;
        // Traverse only the current actor's bounded selected bodies and custody
        // page. Each emitted role keeps its own request ID and projected label.
        let possessions = std::mem::take(&mut read.possessions);
        for (id, owned) in std::iter::once((actor, false))
            .chain(
                targets
                    .iter()
                    .filter(|t| t.visible)
                    .map(|t| (t.id.as_str(), false)),
            )
            .chain(possessions.iter().map(|i| (i.id.as_str(), true)))
        {
            let entity = state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::MissingEntity)?;
            let mut label = None;
            let mut prior = indexmap::IndexMap::<&str, usize>::new();
            for form in forms {
                for (field, meaning) in &form.fields {
                    if meaning.kind != crate::worlds::base_decision_offers::FieldKind::Entity
                        || !crate::worlds::base_request_forms::entity_role(
                            state, actor, form, field, entity, owned,
                        )
                    {
                        continue;
                    }
                    if let Some(&ordinal) = prior.get(field.as_str()) {
                        storage.resize(
                            storage
                                .bytes()
                                .checked_add(2 * size_of::<String>() + form.id.len())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        read.available.choices[ordinal]
                            .request_ids
                            .push(form.id.clone());
                        continue;
                    }
                    storage.resize(
                        storage
                            .bytes()
                            .checked_add(4 * size_of::<(&str, usize)>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    prior.insert(field.as_str(), read.available.choices.len());
                    let name = if let Some(name) = label.as_ref() {
                        name
                    } else {
                        label = Some(if owned {
                            crate::install::owned_by(
                                &state.physical,
                                &state.installed.retained,
                                actor,
                                id,
                            )?
                            .ok_or(ExecutionError::Invariant)?
                            .named
                            .clone()
                        } else {
                            names.capture_observer_name(id, budget)?.name().clone()
                        });
                        label.as_ref().ok_or(ExecutionError::Invariant)?
                    };
                    storage.resize(
                        storage
                            .bytes()
                            .checked_add(
                                name.heap_bytes().ok_or(ExecutionError::Capacity)?
                                    + 2 * (size_of::<NpcActivityChoice>()
                                        + size_of::<ActivityLabel>()),
                            )
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    read.append(
                        id,
                        field,
                        &form.id,
                        None,
                        policy.person_label(name),
                        &mut storage,
                    )?;
                }
            }
        }
        let empty = indexmap::IndexMap::new();
        for form in forms {
            for (field, rule) in &form.fields {
                use crate::worlds::base_request_forms::{fields, is_remembered_place};
                if !fields::sourced(form, field) {
                    continue;
                }
                let kind = if is_remembered_place(field, rule) {
                    "place"
                } else if rule.kind == crate::worlds::base_decision_offers::FieldKind::Definition {
                    "definition"
                } else {
                    "choice"
                };
                fields::visit(
                    state,
                    actor,
                    form,
                    field,
                    &empty,
                    budget,
                    |value, label, parent| {
                        // A selected recipient must already be in this actor's body
                        // projection before any dependent private term is offered.
                        if parent.is_some_and(|(name, id)| {
                            form.fields.get(name).is_some_and(|r| {
                                r.kind == crate::worlds::base_decision_offers::FieldKind::Entity
                            }) && id != actor
                                && !targets.iter().any(|t| t.visible && t.id == id)
                                && !possessions.iter().any(|lot| lot.id == id)
                        }) {
                            return Ok(());
                        }
                        let bytes = 2 * size_of::<fields::FormValue>()
                            + form.id.len()
                            + field.len()
                            + value.len()
                            + label.storage_bytes()
                            + parent.map_or(0, |(k, v)| k.len() + v.len())
                            + kind.len();
                        storage.resize(
                            storage
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        read.values.push(fields::FormValue {
                            request: form.id.clone(),
                            field: field.clone(),
                            value: value.into(),
                            label: label.clone(),
                            kind: kind.into(),
                            parent: parent.map(|(k, v)| (k.into(), v.into())),
                        });
                        Ok(())
                    },
                )?;
            }
        }
        read.possessions = possessions;
        read.storage = storage;
        Ok(read)
    }
}
impl NpcActivityRead {
    fn append(
        &mut self,
        id: &str,
        role: &str,
        request: &str,
        distance: Option<f64>,
        label: ActivityLabel,
        storage: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        storage.resize(
            storage
                .bytes()
                .checked_add(id.len() + request.len() + role.len() + 2 * size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.available.choices.push(NpcActivityChoice {
            id: id.into(),
            label: JsText::default(),
            kind: "entity",
            roles: vec![role.into()],
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
