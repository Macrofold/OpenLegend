//! Project actions for a boundary in the player's current observations.
use super::*;
use openlegend_simulation::{
    assembly::gate::GateIntent,
    reception::SensoryFacet,
    worlds::base_observed::{BoundaryRole, ObservedAssembly},
};

#[derive(Serialize, Deserialize)]
pub(crate) struct Selection {
    pub scope: String,
    pub contact: String,
    pub intent: GateIntent,
}

pub(super) fn render(
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    issuer: &crate::player_references::ReferenceIssuer,
    selected: &str,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Option<Bytes>, RuntimeError> {
    let references = issuer
        .scoped(scope)
        .map_err(RuntimeError::application_refused)?;
    let mut response = None;
    session.with_player_contacts(&scope.account_id, &scope.actor_id, |body| {
        let Some(SensoryFacet::Body { body: detail }) = body.body_facet().map(|facet| &facet.value)
        else {
            return false;
        };
        let Some(ObservedAssembly::GroundedBoundary {
            revision, parts, ..
        }) = &detail.assembly
        else {
            return false;
        };
        let contact = references.contact(
            body.source_id,
            body.physical_life.unwrap_or(0),
            body.lease_id,
        );
        match contact {
            Ok(contact) if contact != selected => false,
            Ok(_) => {
                response = Some(choices(
                    session,
                    scope,
                    issuer,
                    selected,
                    body.source_id,
                    *revision,
                    parts
                        .iter()
                        .filter(|part| part.role == BoundaryRole::Gate)
                        .count(),
                    controlling,
                    budget,
                ));
                true
            }
            Err(error) => {
                response = Some(Err(RuntimeError::application_refused(error)));
                true
            }
        }
    })?;
    response.transpose()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Command {
    #[serde(rename = "type")]
    kind: &'static str,
    gate_choice: String,
}

fn choices(
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    issuer: &crate::player_references::ReferenceIssuer,
    selected: &str,
    root: &str,
    revision: u64,
    gates: usize,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    const CATEGORY: &str = "Construction";
    let key = scope.key().map_err(RuntimeError::application_refused)?;
    let reason = preparation::action_blocker(controlling, session.clock()?.paused);
    let count = gates.checked_mul(3).ok_or(CapacityError)?;
    let bytes = count
        .checked_mul(3 * crate::player_references::PRIVATE_CURSOR_BYTES)
        .ok_or(CapacityError)?;
    let mut batch = resources::Batch::prepare(CATEGORY, count, bytes, budget)?;
    session.with_gate_offers(
        &scope.account_id,
        &scope.actor_id,
        root,
        revision,
        |offer| {
            let selection = Selection {
                scope: key.clone(),
                contact: selected.to_owned(),
                intent: offer.intent,
            };
            let token = issuer
                .seal_gate_choice(&selection)
                .ok_or_else(|| RuntimeError::application_refused("gate reference unavailable"))?;
            let id = format!("gate-{revision}-{}", batch.choices.len());
            let label = JsText::from(offer.label);
            batch.choices.push(resources::Choice {
                id,
                label: label.clone(),
                description: label.clone(),
                category: CATEGORY.into(),
                keywords: [label, CATEGORY.into()],
                target_id: selected.into(),
                item_id: None,
                pickup_limit: None,
                enabled: reason.is_none(),
                reason: reason.map(JsText::from),
                facts: None,
                intent: resources::Intent::Gate {
                    command: Command {
                        kind: "operate-gate",
                        gate_choice: token,
                    },
                },
            });
            Ok(())
        },
    )?;
    batch.render(session.accepted_progress()?.sequence, budget)
}
