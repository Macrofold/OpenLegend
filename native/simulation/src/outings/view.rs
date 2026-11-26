//! Live terms are disclosures of the participant's own acquired agreement.
//! A raw consent row, another actor's account or an unseen location cannot
//! supply the player's private projection.
use super::*;
use crate::worlds::base_outings::TravelOperation;
use crate::{
    experience::{PersonalSourceKind, PersonalSourceRef},
    plans::{PlanMode, PlanStatus},
    simulation::SimulationState,
    state::Point,
    text::{JsText, TextRef},
    worlds::{InstalledMovementTerms, InstalledMovementTermsStatus, InstalledPersonalNameReader},
};

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerOuting {
    id: String,
    revision: u64,
    destination: JsText,
    companion: JsText,
    distance: Option<f64>,
    kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<JsText>,
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    deadline: Option<f64>,
    company: String,
    description: String,
    choices: Vec<Choice>,
}

#[derive(Serialize, PartialEq)]
struct Choice {
    id: &'static str,
    label: JsText,
    description: String,
    command: ChoiceCommand,
}

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ChoiceCommand {
    #[serde(rename = "type")]
    kind: &'static str,
    outing_operation: TravelOperation,
    outing_id: String,
    expected_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    amendment_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    outing_mode: Option<PlanMode>,
}

pub struct OutingViews {
    pub entries: Vec<PlayerOuting>,
    _custody: ByteReservation,
}

pub(crate) struct PreparedOutings {
    pub(crate) views: Option<OutingViews>,
    references: Vec<(String, u64, PersonalSourceRef)>,
    privacy: u64,
    _proof_custody: ByteReservation,
}

type Known = IndexMap<String, (InstalledMovementTerms, PersonalSourceRef)>;

/// Match the newest eligible acquired terms for the selected live records.
/// This read does not build descriptions, choices or transport products.
fn known_terms<'a>(
    state: &SimulationState,
    actor: &str,
    ids: impl IntoIterator<Item = &'a str>,
    budget: &ByteBudget,
) -> Result<(Known, ByteReservation), ExecutionError> {
    let Some(history) = state.experience.actor(actor) else {
        return Ok((IndexMap::new(), budget.reserve(0)?));
    };
    let Ok(awareness) = history.collection(PersonalSourceKind::Awareness) else {
        return Ok((IndexMap::new(), budget.reserve(0)?));
    };
    let rules = &state.installed.ordinary_actions.value().travel;
    // The current store installs these acquired awareness records and
    // accepted native writes maintain them. We inspect only the newest
    // eligible agreement(s) for the actor's finite indexed live rows.
    let mut selected = IndexMap::<String, (InstalledMovementTerms, PersonalSourceRef)>::new();
    let mut keys = IndexMap::new();
    let mut scratch = budget.reserve(0)?;
    for id in ids {
        let row = state.outings.get(id).ok_or(ExecutionError::Invariant)?;
        if !matches!(row.kind(), OutingKind::Travel | OutingKind::CombatHelp) {
            continue;
        }
        scratch.resize(
            scratch
                .bytes()
                .checked_add(384 + 3 * id.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = crate::encoding::json_record(&(&rules.agreement_family, id))
            .map_err(|_| ExecutionError::Invariant)?;
        keys.insert(key, id);
    }
    if keys.is_empty() {
        return Ok((selected, scratch));
    }
    let key_column = state
        .installed
        .schema
        .layout(PersonalSourceKind::Awareness.table())
        .map_err(|_| ExecutionError::Invariant)?
        .columns
        .iter()
        .position(|column| column == "agreement_key")
        .ok_or(ExecutionError::Invariant)?;
    for record in awareness.records().rev() {
        let header = record.header();
        if !header.personal_agreement
            || header.event_type.as_deref() != Some(rules.event_type.as_str())
            || history.privacy.revoked(&header.reference.id)
            || header
                .event_id
                .as_deref()
                .is_some_and(|id| history.privacy.revoked(id))
        {
            continue;
        }
        let Some(key) = record.columns().get(key_column).and_then(SqlCell::as_str) else {
            continue;
        };
        let Some(id) = keys.get(key).copied() else {
            continue;
        };
        if selected.contains_key(id) {
            continue;
        }
        let value = crate::capture::movement_terms_from_record(actor, record.payload(), budget)?;
        let row = state.outings.get(id).ok_or(ExecutionError::Invariant)?;
        if value.id().as_unicode() != Some(id)
            || value.status() == InstalledMovementTermsStatus::Ended
            || value.revision() != row.revision()
        {
            // The newest admitted receipt is the observed state. Older
            // notices cannot restore a later terminated or changed offer.
            keys.shift_remove(key);
            continue;
        }
        scratch.resize(
            scratch
                .bytes()
                .checked_add(
                    header
                        .reference
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        selected.insert(id.into(), (value, header.reference.clone()));
        if selected.len() == keys.len() {
            break;
        }
    }
    Ok((selected, scratch))
}

/// Existence of a current received agreement, not just a raw participant id.
pub(crate) fn knows_current(
    state: &SimulationState,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let (known, _custody) = known_terms(state, actor, [id], budget)?;
    Ok(!known.is_empty())
}

/// Project reply choices from the same personal receipts as the player's view.
/// The callback borrows the display and exact revision. The ordinary command
/// checks the actor's acquired terms again when a selected reply executes.
pub(crate) fn visit_replies(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
    mut emit: impl FnMut(
        &str,
        &JsText,
        &JsText,
        &JsText,
        crate::commands::PlayerTravelIntent<'_>,
    ) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    let Some(read) = PreparedOutings::prepare(state, actor, budget)? else {
        return Ok(());
    };
    if let Some(views) = read.views {
        for outing in &views.entries {
            for choice in &outing.choices {
                let cmd = &choice.command;
                emit(
                    choice.id,
                    &choice.label,
                    &outing.companion,
                    &outing.destination,
                    crate::commands::PlayerTravelIntent::Remedy {
                        operation: cmd.outing_operation,
                        invitation: &cmd.outing_id,
                        revision: cmd.expected_revision,
                        amendment_revision: cmd.amendment_revision,
                        mode: cmd.outing_mode,
                    },
                )?;
            }
        }
    }
    Ok(())
}

impl PreparedOutings {
    /// A detached stream must check the exact prior acquired sources again
    /// before serializing potentially newly withdrawn private terms.
    pub(crate) fn current(&self, state: &SimulationState, actor: &str) -> bool {
        let Some(history) = state.experience.actor(actor) else {
            return false;
        };
        if history.privacy.revision() != self.privacy {
            return false;
        }
        let Ok(awareness) = history.collection(PersonalSourceKind::Awareness) else {
            return false;
        };
        self.references.iter().all(|(id, revision, reference)| {
            state
                .outings
                .get(id)
                .is_some_and(|row| row.revision() == *revision)
                && awareness
                    .resident_record(&reference.id)
                    .is_some_and(|row| &row.header().reference == reference)
        })
    }

    pub(crate) fn prepare(
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        // Journeys are optional. Ordinary play and third-party streams do
        // not open history or build any agreement products.
        let mut related = state.outings.actor_ids(actor, budget)?.peekable();
        if related.peek().is_none() {
            return Ok(None);
        }
        let Some(history) = state.experience.actor(actor) else {
            return Ok(None);
        };
        let installed = &state.installed;
        let ordinary = installed.ordinary_actions.value();
        let rules = &ordinary.travel;
        let mut views = Vec::new();
        let mut references = Vec::new();
        let mut output_storage = budget.reserve(0)?;
        let mut proof_storage = budget.reserve(0)?;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            installed,
            &state.experience,
            actor,
        )?;
        let own = state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let (selected, _selected_custody) = known_terms(state, actor, related, budget)?;
        for (id, (terms, reference)) in selected {
            let row = state.outings.get(&id).ok_or(ExecutionError::Invariant)?;
            let companion = row
                .participants()
                .into_iter()
                .find(|id| *id != actor)
                .ok_or(ExecutionError::Invariant)?;
            let value = terms.value();
            let fields = value.get("destination").ok_or(ExecutionError::Invariant)?;
            let label = fields
                .get("label")
                .and_then(SqlCell::as_text)
                .ok_or(ExecutionError::Invariant)?;
            let point = if row.kind() == OutingKind::Travel {
                let place = fields.get("point").ok_or(ExecutionError::Invariant)?;
                let coordinate = |key| {
                    place
                        .get(key)
                        .and_then(SqlCell::as_f64)
                        .ok_or(ExecutionError::Invariant)
                };
                Some(Point {
                    x: coordinate("x")?,
                    y: coordinate("y")?,
                    z: coordinate("z")?,
                })
            } else {
                None
            };
            let mut status = if row.status() == OutingStatus::Pending {
                "pending"
            } else if row.kind() == OutingKind::CombatHelp {
                "helping"
            } else {
                "traveling"
            };
            if status == "traveling"
                && value.get("ownArrived").and_then(SqlCell::as_bool) == Some(true)
            {
                status = "arrived";
            }
            let deadline = if status == "pending" {
                value.get("expiresAt").and_then(SqlCell::as_f64)
            } else {
                None
            };
            if deadline.is_some_and(|at| at <= state.physical.header.sim_time) {
                continue;
            }
            let purpose = value.get("purpose").and_then(SqlCell::as_text);
            let body = own.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
            let busy = body.action.is_some()
                || body.agency.suspended_plan().is_some()
                || body.agency.plan.as_ref().is_some_and(|plan| {
                    matches!(plan.status, PlanStatus::Active | PlanStatus::Blocked)
                });
            let name = names.observer_name(companion)?.name;
            let words = &ordinary.travel;
            let output_bytes = 2048
                + 8 * (label.storage_bytes()
                    + name.storage_bytes()
                    + id.len()
                    + words.description.len()
                    + purpose.map_or(0, JsText::storage_bytes));
            output_storage.resize(
                output_storage
                    .bytes()
                    .checked_add(output_bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let choices = |key, label, operation, mode| Choice {
                id: key,
                label,
                description: rules.agreement_description.clone(),
                command: ChoiceCommand {
                    kind: crate::worlds::base_outings::travel_command_type(),
                    outing_operation: operation,
                    outing_id: id.clone(),
                    expected_revision: row.revision(),
                    amendment_revision: None,
                    outing_mode: mode,
                },
            };
            let render = |template: &str| {
                ordinary
                    .plan
                    .text(template, &[("place", TextRef::from(label))])
            };
            let choices = if row.status() == OutingStatus::Pending && row.participants()[1] == actor
            {
                vec![
                    choices(
                        "outing-accept",
                        render(if busy {
                            &rules.templates.accept_replace
                        } else {
                            &rules.templates.accept_idle
                        }),
                        TravelOperation::Accept,
                        Some(if busy {
                            PlanMode::Replace
                        } else {
                            PlanMode::Enqueue
                        }),
                    ),
                    choices(
                        "outing-decline",
                        render(&rules.templates.decline),
                        TravelOperation::Decline,
                        None,
                    ),
                ]
            } else {
                let label = if row.status() == OutingStatus::Pending {
                    render(&rules.templates.withdraw)
                } else {
                    rules.leave_label.as_str().into()
                };
                vec![choices("outing-leave", label, TravelOperation::Leave, None)]
            };
            let company = if names.current_body_grant(companion)?.is_some() {
                &rules.company_labels.visible
            } else {
                &rules.company_labels.hidden
            };
            proof_storage.resize(
                proof_storage
                    .bytes()
                    .checked_add(
                        256 + id.len() + reference.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            references.push((id, row.revision(), reference));
            views.push(PlayerOuting {
                id: row.id().into(),
                revision: row.revision(),
                destination: label.clone(),
                companion: name.to_owned(),
                distance: own
                    .world_position()
                    .zip(point)
                    .map(|(at, point)| crate::spatial::distance(at, point)),
                kind: row.kind().name().to_owned(),
                purpose: purpose.cloned(),
                status,
                deadline,
                company: company.clone(),
                description: rules.description.clone(),
                choices,
            });
        }
        if let Some(policy) = installed
            .retained
            .social_offer_read
            .as_ref()
            .and_then(|policy| policy.cooperation.as_ref())
        {
            crate::worlds::base_outings::visit_receipts(
                state,
                actor,
                budget,
                |received, reference, other| {
                    if !received.available_at(state.physical.header.sim_time) {
                        return Ok(());
                    }
                    let Some(row) = state.outings.get(&received.id).filter(|row| {
                        row.revision() == received.revision && row.kind() == OutingKind::Cooperate
                    }) else {
                        return Ok(());
                    };
                    let companion = names.observer_name(other)?.name.to_owned();
                    let kind = received
                        .terms
                        .get("purpose")
                        .and_then(SqlCell::as_str)
                        .ok_or(ExecutionError::Invariant)?;
                    let label = received
                        .terms
                        .get("destination")
                        .or_else(|| received.terms.get("meetingPlace"))
                        .and_then(|t| t.get("label"))
                        .and_then(SqlCell::as_text)
                        .or_else(|| {
                            received
                                .terms
                                .get("task")
                                .and_then(|t| t.get("outputLabel").or_else(|| t.get("itemLabel")))
                                .and_then(SqlCell::as_text)
                        })
                        .unwrap_or(&policy.description);
                    let pending = received.status == "pending";
                    let amendment = received
                        .amendment
                        .as_ref()
                        .and_then(|v| v.get("revision"))
                        .and_then(SqlCell::as_u64);
                    let proposer = received
                        .amendment
                        .as_ref()
                        .and_then(|v| v.get("proposedBy"))
                        .and_then(SqlCell::as_str)
                        .unwrap_or(&received.proposer_id);
                    let build = |key, operation, label_key: &str, amendment_revision| Choice {
                        id: key,
                        label: policy
                            .labels
                            .get(label_key)
                            .unwrap_or(&policy.description)
                            .clone(),
                        description: policy.description.as_unicode().unwrap_or_default().into(),
                        command: ChoiceCommand {
                            kind: crate::worlds::base_outings::travel_command_type(),
                            outing_operation: operation,
                            outing_id: received.id.clone(),
                            expected_revision: received.revision,
                            amendment_revision,
                            outing_mode: (operation == TravelOperation::Accept)
                                .then_some(PlanMode::Enqueue),
                        },
                    };
                    output_storage.resize(
                        output_storage
                            .bytes()
                            .checked_add(
                                4096 + 8
                                    * (received.id.len()
                                        + label.storage_bytes()
                                        + companion.storage_bytes()
                                        + policy.description.storage_bytes()
                                        + policy
                                            .labels
                                            .values()
                                            .map(JsText::storage_bytes)
                                            .max()
                                            .unwrap_or_default()),
                            )
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let mut choices = Vec::new();
                    if pending || amendment.is_some() {
                        if proposer == actor {
                            choices.push(build(
                                "cooperation-withdraw",
                                TravelOperation::Withdraw,
                                "withdraw",
                                amendment,
                            ));
                        } else {
                            choices.push(build(
                                "cooperation-accept",
                                TravelOperation::Accept,
                                if amendment.is_some() {
                                    "acceptAmendment"
                                } else {
                                    "accept"
                                },
                                amendment,
                            ));
                            choices.push(build(
                                "cooperation-decline",
                                TravelOperation::Decline,
                                if amendment.is_some() {
                                    "declineAmendment"
                                } else {
                                    "decline"
                                },
                                amendment,
                            ));
                        }
                    }
                    if !pending {
                        choices.push(build(
                            "cooperation-leave",
                            TravelOperation::Leave,
                            "leave",
                            None,
                        ));
                        choices.push(build(
                            "cooperation-conclude",
                            TravelOperation::Conclude,
                            "conclude",
                            None,
                        ));
                    }
                    proof_storage.resize(
                        proof_storage.bytes() + 512 + received.id.len() + reference.id.len(),
                    )?;
                    references.push((row.id().into(), row.revision(), reference.clone()));
                    views.push(PlayerOuting {
                        id: received.id.clone(),
                        revision: received.revision,
                        destination: label.clone(),
                        companion,
                        distance: None,
                        kind: kind.into(),
                        purpose: None,
                        status: if pending { "pending" } else { "accepted" },
                        deadline: if pending {
                            Some(received.expires_at)
                        } else {
                            received.end_at
                        },
                        company: String::new(),
                        description: policy.description.as_unicode().unwrap_or_default().into(),
                        choices,
                    });
                    Ok(())
                },
            )?;
        }
        if views.is_empty() {
            return Ok(None);
        }
        Ok(Some(Self {
            views: Some(OutingViews {
                entries: views,
                _custody: output_storage,
            }),
            references,
            privacy: history.privacy.revision(),
            _proof_custody: proof_storage,
        }))
    }
}
