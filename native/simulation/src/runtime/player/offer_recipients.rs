//! Read the current recipient choices for one exact carried gift.
use super::*;
use crate::{
    capture::{ActorReadPurpose, PlayerObservedBody, capture_actor_perception},
    geometry::{SightRay, interaction_reach},
    handover::{GiftSelection, ProposalWindow, gift_participant, prepare_trade_lot},
    reception::SightBatch,
    text::JsText,
    values::{deserialize_present_safe_integer, deserialize_safe_integer},
    worlds::base_handover::GIFT_COPY,
};
use serde::Serialize;
use sha2::{Digest, Sha256};

/// Limit the examined contacts and the returned page independently.
/// docs/limits/interface.md#iw01--inventory-task-workspace
const SCAN: usize = 200;
const PAGE: usize = 40;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeOfferSource {
    pub item_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub placement_revision: u64,
    #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
    pub contents_revision: Option<u64>,
    pub container_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub container_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct RuntimeOfferCursor {
    state: String,
    offset: usize,
}

pub struct RuntimeOfferRecipient<'a> {
    pub body: PlayerObservedBody<'a>,
    pub reason: Option<&'a JsText>,
}

pub struct RuntimeOfferPage<'a> {
    pub recipients: Vec<RuntimeOfferRecipient<'a>>,
    pub next: Option<RuntimeOfferCursor>,
}

pub enum RuntimeOfferProblem<'a> {
    Unavailable,
    ChangedSource,
    ChangedPage,
    BlockedSource(&'a str),
}

pub struct RuntimeOfferSelection<'a> {
    pub item: &'a RuntimeOfferSource,
    pub query: &'a JsText,
    pub cursor: Option<&'a RuntimeOfferCursor>,
    pub location: &'a str,
}

impl NativeWorldSession {
    /// Prepare one permitted contact capture, then test at most one page of
    /// eligible contacts against the same physical queries and offer admission
    /// as execution. No body, draft or geometry result outlives this read.
    pub fn with_player_offer_recipients<T>(
        &self,
        account: &str,
        actor: &str,
        selection: RuntimeOfferSelection<'_>,
        compute: impl FnOnce(
            &GeometryQueries,
        ) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
        consume: impl FnOnce(
            Result<RuntimeOfferPage<'_>, RuntimeOfferProblem<'_>>,
            &ByteBudget,
        ) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        use RuntimeOfferProblem as Problem;
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let state = &simulation.state;
        let budget = &self.budget;
        let available = simulation
            .player_inventory_available(account, actor, state.physical.header.paused, true)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let installed = &state.installed;
        let owner = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("missing gift owner"))?;
        let Some(policy) = installed.retained.social_offer_read.as_ref() else {
            return consume(Err(Problem::Unavailable), budget);
        };
        if !available
            || owner.world_position().is_none()
            || !gift_participant(state, owner).map_err(failure)?
        {
            return consume(Err(Problem::Unavailable), budget);
        };
        let item = selection.item;
        let _source = budget.reserve(1024 + 2 * item.item_id.len())?;
        let selected = GiftSelection {
            item_id: item.item_id.clone(),
            quantity: item.quantity,
            expected_revision: Some(item.revision),
            placement_revision: Some(item.placement_revision),
            expected_contents_revision: item.contents_revision,
        };
        if let Err((code, message)) = prepare_trade_lot(state, actor, &selected) {
            let problem = if matches!(code, "stale" | "item-unavailable") {
                Problem::ChangedSource
            } else {
                Problem::BlockedSource(message)
            };
            return consume(Err(problem), budget);
        }
        let entities = &state.physical.entities;
        let source = entities
            .get(&item.item_id)
            .and_then(crate::install::inventory_parent)
            .filter(|parent| *parent == item.container_id)
            .and_then(|parent| entities.get(parent));
        if source.is_none_or(|source| {
            item.container_revision != source.inventory_revision.unwrap_or_default()
        }) {
            return consume(Err(Problem::ChangedSource), budget);
        }
        let window = ProposalWindow::new(state, actor, None, policy);
        if window.item_busy(state, &item.item_id) {
            return consume(
                Err(Problem::BlockedSource(GIFT_COPY.already_offered)),
                budget,
            );
        }

        let capture = capture_actor_perception(state, actor, ActorReadPurpose::PlayerView, budget)
            .map_err(failure)?;
        let perception = PlayerPerception::new(&capture).map_err(failure)?;
        let stamp = recipient_stamp(&perception, owner, state.geometry_revision())?;
        let first = match selection.cursor {
            Some(cursor) if cursor.state == stamp && cursor.offset < perception.bodies().len() => {
                cursor.offset
            }
            Some(_) => return consume(Err(Problem::ChangedPage), budget),
            None => 0,
        };
        let through = first.saturating_add(SCAN).min(perception.bodies().len());
        let slots = through - first;
        let bytes = slots
            .checked_mul(
                size_of::<(usize, PlayerObservedBody<'_>, SightRay)>()
                    + size_of::<&str>()
                    + 4 * size_of::<SightRay>(),
            )
            .and_then(|bytes| bytes.checked_add(PAGE * size_of::<RuntimeOfferRecipient<'_>>()))
            .ok_or(CapacityError)?;
        let _rows = budget.reserve(bytes + 1024)?;
        let mut roles = Vec::with_capacity(slots);
        let mut targets = Vec::with_capacity(slots);
        let mut reaches = Vec::with_capacity(slots);
        for (index, body) in perception.bodies().enumerate().skip(first).take(slots) {
            let body = body.ok_or_else(|| failure("missing received gift contact"))?;
            if body.source_id == actor || !body.actor || !body.trade_eligible {
                continue;
            }
            if !selection.query.is_empty() {
                let _words = budget
                    .reserve(4 * (body.name.name.storage_bytes() + selection.location.len() + 1))?;
                if !JsText::concat(&[&body.name.name, &" ".into(), &selection.location.into()])
                    .lowercase()
                    .contains(selection.query)
                {
                    continue;
                }
            }
            let Some(target) = state
                .physical
                .entities
                .get(body.source_id)
                .filter(|target| {
                    target.physical_life() == body.physical_life
                        && target.world_position().is_some()
                })
            else {
                continue;
            };
            if !gift_participant(state, target).map_err(failure)? {
                continue;
            }
            let Some(ray) = interaction_reach(
                owner,
                target,
                installed.retained.item_handling_read.reach,
                budget,
            )
            .map_err(failure)?
            else {
                continue;
            };
            targets.push(body.source_id);
            reaches.push(ray);
            roles.push((index, body));
        }
        let mut recipients = Vec::with_capacity(PAGE);
        let mut offset = through;
        if !roles.is_empty() {
            let binding = GeometryBinding::new(
                CandidateKey {
                    id: 0,
                    base_cut: state.accepted_cut,
                    generation: self.session.operational_generation(),
                },
                state.geometry_revision(),
                0,
            );
            let sight =
                SightBatch::prepare(&state.physical, installed, actor, &targets, binding, budget)
                    .map_err(failure)?;
            let mut queries = GeometryQueries::new(binding);
            let sight_count = sight.queries().sight.len();
            queries.sight.reserve_exact(sight_count + reaches.len());
            queries.sight.extend_from_slice(&sight.queries().sight);
            queries.sight.extend(reaches);
            let (answers, _answers) = compute(&queries)?;
            queries.validate_answers(&answers).map_err(failure)?;
            let sight = sight
                .finish_sight(answers.binding, &answers.sight[..sight_count])
                .map_err(failure)?;
            for (((index, body), (sighted, visible)), reachable) in roles
                .into_iter()
                .zip(sight.iter())
                .zip(answers.sight[sight_count..].iter())
            {
                if sighted != body.source_id {
                    return Err(failure("gift sight order changed"));
                }
                if !reachable || !visible {
                    continue;
                }
                if recipients.len() == PAGE {
                    offset = index;
                    break;
                }
                recipients.push(RuntimeOfferRecipient {
                    reason: window
                        .recipient_problem(body.source_id, policy)
                        .map(|(_, message)| message),
                    body,
                });
            }
        }
        let next = (offset < perception.bodies().len()).then_some(RuntimeOfferCursor {
            state: stamp,
            offset,
        });
        consume(Ok(RuntimeOfferPage { recipients, next }), budget)
    }
}

/// Keep continuation tied to the same received membership and observer pose.
/// Current reach, body eligibility and offer terms are still tested per page.
fn recipient_stamp(
    perception: &PlayerPerception<'_>,
    observer: &crate::state::Entity,
    spatial_revision: u64,
) -> Result<String, RuntimeError> {
    let mut digest = Sha256::new();
    let point = observer
        .world_position()
        .ok_or_else(|| failure("missing gift origin"))?;
    for part in [point.x, point.y, point.z, observer.spatial.heading] {
        digest.update(part.to_bits().to_le_bytes());
    }
    digest.update(spatial_revision.to_le_bytes());
    digest.update(observer.physical_life().unwrap_or_default().to_le_bytes());
    for body in perception.bodies() {
        let body = body.ok_or_else(|| failure("missing received contact"))?;
        digest.update((body.source_id.len() as u64).to_le_bytes());
        digest.update(body.source_id.as_bytes());
        digest.update((body.lease_id.len() as u64).to_le_bytes());
        digest.update(body.lease_id.as_bytes());
    }
    let mut output = String::with_capacity(64);
    crate::encoding::append_hex(&mut output, &digest.finalize());
    Ok(output)
}
