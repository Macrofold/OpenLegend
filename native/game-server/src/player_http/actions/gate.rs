//! Project actions for a boundary in the player's current observations.
use super::*;
use openlegend_simulation::{
    assembly::gate::GateIntent, reception::SensoryFacet, worlds::base_observed::ObservedAssembly,
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
                    parts.len(),
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

fn choices(
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    issuer: &crate::player_references::ReferenceIssuer,
    selected: &str,
    root: &str,
    revision: u64,
    parts: usize,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Command {
        #[serde(rename = "type")]
        kind: &'static str,
        gate_choice: String,
    }
    #[derive(Serialize)]
    struct Intent {
        kind: &'static str,
        command: Command,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Choice {
        id: String,
        label: String,
        description: String,
        category: &'static str,
        target_id: String,
        enabled: bool,
        reason: Option<&'static str>,
        intent: Intent,
    }
    const CATEGORY: &str = "Construction";
    let key = scope.key().map_err(RuntimeError::application_refused)?;
    let reason = preparation::action_blocker(controlling, session.clock()?.paused);
    let per_choice = size_of::<Choice>() + 3 * crate::player_references::PRIVATE_CURSOR_BYTES;
    let _workspace = budget.reserve(parts.checked_mul(3 * per_choice).ok_or(CapacityError)?)?;
    let mut options = Vec::new();
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
            let id = format!("gate-{revision}-{}", options.len());
            options.push(Choice {
                id,
                label: offer.label.into(),
                description: offer.label.into(),
                category: CATEGORY,
                target_id: selected.into(),
                enabled: reason.is_none(),
                reason,
                intent: Intent {
                    kind: "command",
                    command: Command {
                        kind: "operate-gate",
                        gate_choice: token,
                    },
                },
            });
            Ok(())
        },
    )?;
    resource_menu(
        session.accepted_progress()?.sequence,
        &options,
        CATEGORY,
        budget,
    )
}
