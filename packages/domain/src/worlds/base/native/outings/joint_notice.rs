//! Each participant gets a private occurrence containing only the terms they
//! actually received. In particular a hunt never publishes another observer's labels.
use super::*;
impl TravelNoticePreparation {
    pub(crate) fn joint(
        core: &CoreMutation<'_>,
        trip: &SqlCell,
        actor_id: &str,
        words: &JsText,
        cause: Option<&str>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(actor) = core
            .state
            .physical
            .entities
            .get(actor_id)
            .filter(|e| e.has_memory())
        else {
            return Ok(None);
        };
        let id = text(trip, "id")?;
        let proposer = text(trip, "proposerId")?;
        let recipient = text(trip, "recipientId")?;
        let other = if actor_id == proposer {
            recipient
        } else {
            proposer
        };
        let size = trip
            .heap_bytes()
            .and_then(|v| v.checked_mul(12))
            .and_then(|v| v.checked_add(words.storage_bytes() + 8192))
            .ok_or(ExecutionError::Capacity)?;
        let allocation = budget.reserve(size)?;
        let mut snapshot = IndexMap::<String, SqlCell>::new();
        for key in [
            "id",
            "revision",
            "proposerId",
            "recipientId",
            "terms",
            "status",
            "expiresAt",
            "endAt",
            "acceptedRevision",
        ] {
            if let Some(value) = trip.get(key) {
                snapshot.insert(key.into(), value.clone_within_heap_bound());
            }
        }
        if let Some(value) = trip.get("pendingAmendment") {
            snapshot.insert("amendment".into(), value.clone_within_heap_bound());
        }
        let limit_quarry = |terms: &mut SqlCell| {
            if let SqlCell::Object(fields) = terms
                && let Some(SqlCell::Object(quarry)) = fields.get_mut("quarry")
            {
                for key in ["labels", "encounters"] {
                    if let Some(SqlCell::Object(entries)) = quarry.get_mut(key) {
                        entries.retain(|id, _| id == actor_id);
                    }
                }
            }
        };
        if let Some(terms) = snapshot.get_mut("terms") {
            limit_quarry(terms);
        }
        if let Some(SqlCell::Object(row)) = snapshot.get_mut("amendment")
            && let Some(terms) = row.get_mut("terms")
        {
            limit_quarry(terms);
        }
        if let Some(cause) = cause {
            snapshot.insert("status".into(), SqlCell::Text("ended".into()));
            snapshot.insert("cause".into(), SqlCell::Text(cause.into()));
        }
        let combat = trip.get("kind").and_then(SqlCell::as_str) == Some("combat-help");
        if combat {
            for key in ["kind", "createdAt", "purpose"] {
                if let Some(value) = trip.get(key) {
                    snapshot.insert(key.into(), value.clone_within_heap_bound());
                }
            }
            let row = member(trip, "combat")?;
            snapshot.insert(
                "opponentId".into(),
                member(row, "opponentId")?.clone_within_heap_bound(),
            );
            snapshot.insert(
                "family".into(),
                SqlCell::Text(
                    core.state
                        .installed
                        .ordinary_actions
                        .value()
                        .travel
                        .agreement_family
                        .as_str()
                        .into(),
                ),
            );
            snapshot.insert("ownArrived".into(), SqlCell::Bool(false));
            snapshot.insert(
                "destination".into(),
                SqlCell::Object(IndexMap::from([(
                    "label".into(),
                    member(member(row, "labels")?, actor_id)?.clone_within_heap_bound(),
                )])),
            );
        }
        let canonical = CanonicalJsonRequest::prepare(binding, &snapshot, budget)?;
        let mut middle = JsText::from(" ");
        middle.push_text(words);
        middle.push_str(" ");
        Ok(Some(Self {
            canonical: Some(canonical),
            event_type: if combat {
                core.state
                    .installed
                    .ordinary_actions
                    .value()
                    .travel
                    .event_type
                    .clone()
            } else {
                "cooperation".into()
            },
            actor_id: actor.id.clone(),
            other_id: other.into(),
            outing_id: id.into(),
            middle,
            destination: None,
            ending: None,
            ending_actor: None,
            memory: true,
            importance: core
                .state
                .installed
                .experience_settings
                .protected_importance,
            budget: budget.clone(),
            allocation,
        }))
    }
}
