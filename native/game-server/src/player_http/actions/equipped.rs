//! The explicit held-item gesture serves at most one exact currently
//! available target choice. It uses the same scoped action preparations.
use super::*;
use crate::player_references::ReferenceIssuer;
use openlegend_simulation::worlds::base_context_actions::equipped_action_rank;
use std::cell::RefCell;

pub(super) fn render(
    session: &NativeWorldSession,
    scope: &RequestScope,
    issuer: &ReferenceIssuer,
    selected: &str,
    item: &str,
    game: &crate::boot::CurrentServer,
    controlling: bool,
) -> Result<Option<Bytes>, RuntimeError> {
    let budget = game.host.budget();
    if !session.player_equipped_target_id(&scope.account_id, &scope.actor_id, item)? {
        return Ok(None);
    }
    let references = issuer
        .scoped(scope)
        .map_err(RuntimeError::application_refused)?;
    let _matching = budget.reserve(256)?;
    let alias_error = RefCell::new(None);
    let mut matches =
        |body: &openlegend_simulation::capture::PlayerObservedBody<'_>| match references.contact(
            body.source_id,
            body.physical_life.unwrap_or(0),
            body.lease_id,
        ) {
            Ok(alias) => alias == selected,
            Err(error) => {
                alias_error.replace(Some(error));
                false
            }
        };
    let offered = session.with_player_equipped_resource_offer(
        &scope.account_id,
        &scope.actor_id,
        item,
        &mut matches,
        |offer| match offer {
            RuntimeResourceOffer::Gather(offer) => {
                let mut action = gather_choice(selected, &offer, controlling, budget)?;
                action._workspace.resize(
                    action
                        ._workspace
                        .bytes()
                        .checked_add(item.len())
                        .ok_or(CapacityError)?,
                )?;
                let ResourceIntent::Command { command } = &mut action.row.intent;
                command.item_id = Some(Cow::Owned(item.to_owned()));
                resource_menu(offer.sequence, &[action], &GATHER.name, budget)
            }
            RuntimeResourceOffer::Practice(offer) if offer.weapon == Some(item) => {
                practice::render(selected, offer, controlling, budget)
            }
            _ => blank(session.accepted_progress()?.sequence, budget),
        },
    )?;
    if let Some(error) = alias_error.take() {
        return Err(RuntimeError::application_refused(error));
    }
    if offered.is_some() {
        return Ok(offered);
    }
    let clock = session.clock()?;
    let spatial=game.spatial.current(session.structure_scene()?.as_ref(),budget).map_err(RuntimeError::application_refused)?;
    let contact = session.with_player_equipped_contact_menu(
        &scope.account_id,
        &scope.actor_id,
        item,
        |body| matches(&body),
        |menu| {
            let choices = contact_choices(
                menu.sequence(),
                selected,
                None,
                Some(menu),
                &spatial,
                controlling,
                clock.manually_paused,
                &references,
                budget,
            )?;
            encode_contact(choices, item, budget)
        },
    )?;
    if let Some(error) = alias_error.take() {
        return Err(RuntimeError::application_refused(error));
    }
    if contact.is_some() {
        return Ok(contact);
    }
    // A currently seen object may have no use for this tool. An old or forged
    // target gets no matching catalogue or additional information.
    let current =
        session.with_player_contacts(&scope.account_id, &scope.actor_id, |body| matches(&body))?;
    if let Some(error) = alias_error.take() {
        return Err(RuntimeError::application_refused(error));
    }
    current
        .then(|| blank(session.accepted_progress()?.sequence, budget))
        .transpose()
}

fn blank(revision: u64, budget: &ByteBudget) -> Result<Bytes, RuntimeError> {
    resource_menu_categories::<()>(revision, &[], &[], budget)
}

fn encode_contact(
    menu: ContactMenu<'_>,
    item: &str,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let choice = menu
        .actions
        .iter()
        .filter_map(|row| {
            let ContactIntent::Command { command } = &row.intent else {
                return None;
            };
            let kind = match command {
                ContactCommand::Strike {
                    kind,
                    item_id: Some(weapon),
                    auto_equip: false,
                    ..
                } if *weapon == item => *kind,
                ContactCommand::Ranged {
                    mode,
                    item_id,
                    auto_equip: false,
                    ..
                } if *item_id == item => mode.kind(),
                _ => return None,
            };
            equipped_action_rank(kind).map(|rank| (rank, row))
        })
        .min_by_key(|(rank, _)| *rank)
        .map(|(_, row)| row);
    if let Some(choice) = choice {
        resource_menu(
            menu.revision,
            std::slice::from_ref(choice),
            choice.category,
            budget,
        )
    } else {
        blank(menu.revision, budget)
    }
}
