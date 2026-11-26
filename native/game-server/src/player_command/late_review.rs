//! A release which needs a new review at its readiness boundary keeps the
//! original signed choice. This presentation is transient. The original
//! command receipt and the active native action have separate owners.
use super::*;
use crate::world_input::ReviewedAttack;
use openlegend_simulation::runtime::{NativeWorldSession, TimedReleaseReview};

pub(crate) struct ReleaseReviewRequest {
    input: Arc<PreparedRequest>,
    choice: ReviewedAttack,
    _custody: ByteReservation,
}
impl ReleaseReviewRequest {
    pub(super) fn prepare(
        input: Arc<PreparedRequest>,
        turn: &AttackTurn,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, RuntimeError> {
        let custody = budget.reserve(std::mem::size_of::<Self>() + turn.begin.len() + 32)?;
        Ok(Arc::new(Self {
            input,
            choice: ReviewedAttack {
                operation: turn.operation,
                begin: turn.begin.clone(),
            },
            _custody: custody,
        }))
    }

    pub(crate) fn action(&self) -> Option<&str> {
        let input = &self.input.request.command;
        input
            .aim_id
            .as_deref()
            .or(input.expected_action_id.as_deref())
    }

    pub(super) fn command(&self) -> &CommandInput {
        &self.input.request.command
    }

    pub(super) fn choice(&self) -> &ReviewedAttack {
        &self.choice
    }
}

pub(crate) struct LateReviewInvite {
    owner: Arc<contact::Reviews>,
    pending: Arc<contact::Pending>,
    references: Arc<ReferenceIssuer>,
}
impl LateReviewInvite {
    pub(super) fn new(
        owner: Arc<contact::Reviews>,
        pending: Arc<contact::Pending>,
        references: Arc<ReferenceIssuer>,
    ) -> Self {
        Self {
            owner,
            pending,
            references,
        }
    }

    pub(crate) fn id(&self) -> Uuid {
        self.pending.id()
    }

    /// At final synchronous disclosure, require this exact current review,
    /// held action, observed life, and still permitted name.
    pub(crate) fn current(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        budget: &ByteBudget,
    ) -> Result<bool, WorldError> {
        let Some((request, view)) = self.pending.late() else {
            return Ok(false);
        };
        if !self.owner.still_selected(scope, &self.pending)? {
            return Ok(false);
        }
        let action = request.action().ok_or(StoreError::InvalidRecord)?;
        if !session.with_player_attack(&scope.account_id, &scope.actor_id, |current| {
            current == Some((action, false))
        })? {
            return Ok(false);
        }
        let source = request.command();
        if let Some(contact) = source.target_id.as_deref() {
            let body = source
                .aim_basis
                .as_ref()
                .and_then(|basis| basis.body_reference.as_deref())
                .or(source.body_reference.as_deref());
            if self
                .references
                .resolve_contact_body(session, scope, contact, body, budget)?
                .is_none_or(|contact| contact.life.is_none())
            {
                return Ok(false);
            }
        }
        let permission = &self.pending.permission;
        session
            .with_player_contacts(&scope.account_id, &scope.actor_id, |body| {
                body.source_id == permission.target_id()
                    && body.actor
                    && body.physical_life.unwrap_or(0) == permission.target_life()
                    && (&body.name.name == &view.target_label
                        || body.known_name == Some(&view.target_label)
                        || body.nickname == Some(&view.target_label))
            })
            .map_err(WorldError::from)
    }
}

impl Serialize for LateReviewInvite {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Selected<'a> {
            #[serde(rename = "type")]
            kind: CommandKind,
            #[serde(skip_serializing_if = "Option::is_none")]
            aim_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            target_id: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            body_reference: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            aim_point: Option<Point>,
            #[serde(skip_serializing_if = "Option::is_none")]
            aim_basis: Option<&'a AimBasis>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Invite<'a> {
            action_id: &'a str,
            review: &'a contact::ReviewDisplay,
            command: Selected<'a>,
        }
        let (source, review) = self
            .pending
            .late()
            .ok_or_else(|| serde::ser::Error::custom("missing independently retained review"))?;
        let command = source.command();
        Invite {
            action_id: source
                .action()
                .ok_or_else(|| serde::ser::Error::custom("missing action"))?,
            review,
            command: Selected {
                kind: command.kind,
                aim_id: command.aim_id.as_deref(),
                expected_action_id: command.expected_action_id.as_deref(),
                target_id: command.target_id.as_deref(),
                body_reference: command.body_reference.as_deref(),
                aim_point: command.aim_point,
                aim_basis: command.aim_basis.as_ref(),
            },
        }
        .serialize(serializer)
    }
}

/// One preadmitted update from one matching native review and live input.
pub(crate) struct StagedLateReview {
    pub(crate) pending: Arc<contact::Pending>,
    pub(crate) request: Arc<ReleaseReviewRequest>,
}

/// Stage only the covered release that produced this native result. Native
/// readiness or a copied point alone grants no authority to show a review.
pub(crate) fn prepare_late_review(
    scope: &AuthorizedScope,
    request: Arc<ReleaseReviewRequest>,
    offer: &TimedReleaseReview,
    budget: &ByteBudget,
) -> Result<StagedLateReview, RuntimeError> {
    if request.action() != Some(offer.action_id()) || scope.scope.actor_id != offer.actor_id() {
        return Err(RuntimeError::application_refused(
            "Attack review scope changed.",
        ));
    }
    let pending = contact::Reviews::prepare_late(&scope.scope, request.clone(), offer.offer(), budget)
        .map_err(WorldError::candidate_refusal)?;
    Ok(StagedLateReview { pending, request })
}
