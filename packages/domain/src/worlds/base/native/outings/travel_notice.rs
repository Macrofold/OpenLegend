//! Source outings.ts::notice and personal-social.ts::movementOutingSnapshot.
//! Canonical agreement words belong to the existing ICU preparation owner;
//! actual event reception and plan-result linkage remain the parent command.
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CanonicalJsonAnswer, CanonicalJsonRequest, PreparedCanonicalJson};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::EventScalar;
use crate::records::SqlCell;
use crate::text::JsText;
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;
#[path = "joint_notice.rs"]
mod joint_notice;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum TravelNoticeCause {
    Declined,
    Left,
    Expired,
    Changed,
    Unavailable,
    Interrupted,
    Finished,
}
impl TravelNoticeCause {
    pub(crate) fn reason(self, messages: &super::TravelMessages) -> &str {
        match self {
            Self::Declined => &messages.declined,
            Self::Left => &messages.left,
            Self::Expired => &messages.expired,
            Self::Changed => &messages.changed,
            Self::Unavailable => &messages.unavailable,
            Self::Interrupted => &messages.interrupted,
            Self::Finished => &messages.finished,
        }
    }

    fn text(self) -> &'static str {
        match self {
            Self::Declined => "declined",
            Self::Left => "left",
            Self::Expired => "expired",
            Self::Changed => "changed",
            Self::Unavailable => "unavailable",
            Self::Interrupted => "interrupted",
            Self::Finished => "finished",
        }
    }
}
#[derive(Clone, Copy)]
pub(crate) struct TravelNoticeEnding<'a> {
    pub cause: TravelNoticeCause,
    pub actor_id: Option<&'a str>,
}
#[derive(Serialize)]
struct Destination<'a> {
    label: &'a JsText,
    point: &'a SqlCell,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot<'a> {
    family: &'a str,
    id: &'a str,
    revision: u64,
    created_at: f64,
    expires_at: f64,
    kind: &'a str,
    proposer_id: &'a str,
    recipient_id: &'a str,
    status: &'a str,
    destination: Destination<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a JsText>,
    own_arrived: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    cause: Option<TravelNoticeCause>,
}

pub(crate) struct TravelNoticePreparation {
    canonical: Option<CanonicalJsonRequest>,
    event_type: String,
    actor_id: String,
    other_id: String,
    outing_id: String,
    middle: JsText,
    destination: Option<(JsText, [f64; 3])>,
    ending: Option<TravelNoticeCause>,
    ending_actor: Option<String>,
    memory: bool,
    importance: f64,
    budget: ByteBudget,
    // Drop all finite copied metadata before releasing its allocation.
    allocation: ByteReservation,
}
fn member<'a>(value: &'a SqlCell, field: &str) -> Result<&'a SqlCell, ExecutionError> {
    value.get(field).ok_or(ExecutionError::Invariant)
}
fn text<'a>(value: &'a SqlCell, field: &str) -> Result<&'a str, ExecutionError> {
    member(value, field)?
        .as_str()
        .ok_or(ExecutionError::Invariant)
}
fn number(value: &SqlCell, field: &str) -> Result<f64, ExecutionError> {
    member(value, field)?
        .as_f64()
        .filter(|value| value.is_finite())
        .ok_or(ExecutionError::Invariant)
}
impl TravelNoticePreparation {
    /// The actual private notice has no occurrence when its source no longer
    /// has an actor component. Its parent still owns participant/term authority.
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        trip: &SqlCell,
        actor_id: &str,
        notice: &JsText,
        ending: Option<TravelNoticeEnding<'_>>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(actor) = core
            .state
            .physical
            .entities
            .get(actor_id)
            .filter(|entity| entity.actor.is_some())
        else {
            return Ok(None);
        };
        if text(trip, "kind")? != "travel" {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let rules = &core.state.installed.ordinary_actions.value().travel;
        let proposer = text(trip, "proposerId")?;
        let recipient = text(trip, "recipientId")?;
        let other = if actor_id == proposer {
            recipient
        } else {
            proposer
        };
        let id = text(trip, "id")?;
        let destination = member(trip, "destination")?;
        let point = member(destination, "point")?;
        let surface = member(point, "surfaceId")?
            .as_text()
            .ok_or(ExecutionError::Invariant)?;
        let purpose = trip
            .get("purpose")
            .map(|value| value.as_text().ok_or(ExecutionError::Invariant))
            .transpose()?
            .filter(|value| !value.is_empty());
        let ending_actor = ending
            .and_then(|ending| ending.actor_id)
            .filter(|id| !id.is_empty());
        let snapshot = Snapshot {
            family: &rules.agreement_family,
            id,
            revision: member(trip, "revision")?
                .as_u64()
                .ok_or(ExecutionError::Invariant)?,
            created_at: number(trip, "createdAt")?,
            expires_at: number(trip, "expiresAt")?,
            kind: text(trip, "kind")?,
            proposer_id: proposer,
            recipient_id: recipient,
            status: if ending.is_some() {
                "ended"
            } else {
                text(trip, "status")?
            },
            destination: Destination {
                label: member(destination, "label")?
                    .as_text()
                    .ok_or(ExecutionError::Invariant)?,
                // Preserve complete Source point extras in the personal snapshot.
                point,
            },
            purpose,
            own_arrived: member(trip, "arrived")?
                .as_array()
                .ok_or(ExecutionError::Invariant)?
                .iter()
                .any(|id| id.as_str() == Some(actor_id)),
            cause: ending.map(|ending| ending.cause),
        };
        let middle_bound = notice
            .storage_bytes()
            .checked_add(rules.companion_prefix.len())
            .and_then(|n| n.checked_add(1))
            .and_then(|n| n.checked_mul(20))
            .ok_or(ExecutionError::Capacity)?;
        let bytes = heap_sum([
            size_of::<Self>(),
            rules.event_type.len(),
            actor_id.len(),
            other.len(),
            id.len(),
            middle_bound,
            surface.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ending_actor.map_or(0, str::len),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let allocation = budget.reserve(bytes)?;
        let canonical = CanonicalJsonRequest::prepare(binding, &snapshot, budget)?;
        let mut middle = JsText::from(" ");
        middle.push_text(notice);
        middle.push_str(&rules.companion_prefix);
        Ok(Some(Self {
            canonical: Some(canonical),
            event_type: rules.event_type.clone(),
            actor_id: actor_id.into(),
            other_id: other.into(),
            outing_id: id.into(),
            middle,
            destination: Some((
                surface.clone(),
                [
                    number(point, "x")?,
                    number(point, "y")?,
                    number(point, "z")?,
                ],
            )),
            ending: ending.map(|ending| ending.cause),
            ending_actor: ending_actor.map(str::to_owned),
            memory: actor.has_memory(),
            importance: core
                .state
                .installed
                .experience_settings
                .protected_importance,
            budget: budget.clone(),
            allocation,
        }))
    }

    pub(crate) fn canonical_request(&self) -> Result<&CanonicalJsonRequest, ExecutionError> {
        self.canonical.as_ref().ok_or(ExecutionError::Invariant)
    }

    pub(crate) fn finish(
        mut self,
        answer: CanonicalJsonAnswer,
    ) -> Result<(EventEmissionIntent, ByteReservation), ExecutionError> {
        // Only this request can prepare the agreement consumed below. A raw
        // string or another request's prepared product cannot enter this API.
        let canonical = self
            .canonical
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)?;
        self.emission(canonical)
    }

    fn emission(
        mut self,
        canonical: PreparedCanonicalJson,
    ) -> Result<(EventEmissionIntent, ByteReservation), ExecutionError> {
        let keys = "outingIdpersonalAgreementagreementendingCauseendingActorIddestinationXdestinationYdestinationZdestinationSurfacesemanticTriggerimportance";
        let extra = heap_sum([
            size_of::<EventEmissionIntent>(),
            4 * size_of::<NarrationPart>(),
            size_of::<String>(),
            map_storage::<String, EventScalar>(11).ok_or(ExecutionError::Capacity)?,
            keys.len(),
            self.actor_id
                .len()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
            self.ending.map_or(0, |cause| cause.text().len()),
            1,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.allocation.resize(
            self.allocation
                .bytes()
                .checked_add(extra)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let (agreement, storage) = canonical.into_parts();
        self.allocation.merge(storage)?;
        let mut data = IndexMap::with_capacity(11);
        data.insert(
            if self.event_type == "cooperation" {
                "cooperationId"
            } else {
                "outingId"
            }
            .into(),
            EventScalar::Text(std::mem::take(&mut self.outing_id).into()),
        );
        data.insert("personalAgreement".into(), EventScalar::Boolean(true));
        data.insert("agreement".into(), EventScalar::Text(agreement.into()));
        if let Some(cause) = self.ending {
            data.insert("endingCause".into(), EventScalar::Text(cause.text().into()));
            if let Some(actor) = self.ending_actor.take() {
                data.insert("endingActorId".into(), EventScalar::Text(actor.into()));
            }
        }
        if let Some((surface, coordinates)) = self.destination.take() {
            for (field, value) in ["destinationX", "destinationY", "destinationZ"]
                .into_iter()
                .zip(coordinates)
            {
                data.insert(field.into(), EventScalar::Number(value));
            }
            data.insert("destinationSurface".into(), EventScalar::Text(surface));
        }
        data.insert("semanticTrigger".into(), EventScalar::Boolean(true));
        data.insert("importance".into(), EventScalar::Number(self.importance));
        let audience = if self.memory {
            vec![self.actor_id.clone()]
        } else {
            Vec::new()
        };
        let intent = EventEmissionIntent {
            event_type: std::mem::take(&mut self.event_type),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.actor_id.clone(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(std::mem::replace(&mut self.middle, JsText::from(""))),
                    NarrationPart::Participant {
                        entity_id: std::mem::take(&mut self.other_id),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(".".into()),
                ],
            }),
            audience: AudienceSelection::Explicit(audience),
            source_id: Some(std::mem::take(&mut self.actor_id)),
            target_id: None,
            data: Some(data),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        };
        let audience_bytes = match &intent.audience {
            AudienceSelection::Explicit(audience) => audience.heap_bytes(),
            AudienceSelection::Physical => Some(0),
        }
        .ok_or(ExecutionError::Capacity)?;
        let retained = heap_sum([
            size_of::<EventEmissionIntent>(),
            intent
                .event_type
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            intent.text.heap_bytes().ok_or(ExecutionError::Capacity)?,
            audience_bytes,
            intent
                .source_id
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            intent
                .target_id
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            intent.data.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ])
        .filter(|bytes| *bytes <= self.allocation.bytes())
        .ok_or(ExecutionError::Invariant)?;
        // The append/unescape forecast ends here. Only the returned event's
        // actual allocations survive, including retained collection capacity.
        self.allocation.resize(retained)?;
        let allocation = std::mem::replace(&mut self.allocation, self.budget.reserve(0)?);
        Ok((intent, allocation))
    }
}
