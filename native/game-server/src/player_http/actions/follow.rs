//! Present the same exact living contact in either action menu. The command
//! uses the received public reference so execution must recheck sight and life.
use super::*;
use openlegend_simulation::runtime::RuntimeFollowOffer;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Words {
    label_prefix: JsText,
    description: JsText,
    category: String,
    keywords: [JsText; 2],
}

static WORDS: LazyLock<Words> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/worlds/base/config/follow-menu.json"
    ))
    .expect("the Base world supplies its Follow menu wording")
});

pub(super) fn category() -> &'static str {
    &WORDS.category
}

pub(super) fn choice(
    selected: &str,
    offer: &RuntimeFollowOffer<'_>,
    controls: bool,
    budget: &ByteBudget,
) -> Result<resources::Batch, RuntimeError> {
    let reason = if !controls {
        Some(TAKE_CONTROL)
    } else if offer.paused {
        Some(RESUME_WORLD)
    } else {
        offer.reason
    };
    let label_bound = offer
        .name
        .storage_bytes()
        .checked_add(WORDS.label_prefix.storage_bytes())
        .ok_or(CapacityError)?;
    // Exact non-Unicode names use the text owner's UTF-16 and escaped JSON
    // work during concatenation. Normal Unicode concatenation needs one buffer.
    let label_bound =
        if offer.name.as_unicode().is_some() && WORDS.label_prefix.as_unicode().is_some() {
            label_bound
        } else {
            label_bound
                .checked_mul(20)
                .and_then(|bytes| bytes.checked_add(64))
                .ok_or(CapacityError)?
        };
    let text_bytes = selected
        .len()
        .checked_mul(3)
        .and_then(|bytes| bytes.checked_add(label_bound))
        .and_then(|bytes| bytes.checked_add(WORDS.description.storage_bytes()))
        .and_then(|bytes| bytes.checked_add(WORDS.keywords[0].storage_bytes()))
        .and_then(|bytes| bytes.checked_add(WORDS.keywords[1].storage_bytes()))
        .and_then(|bytes| bytes.checked_add(WORDS.category.len() + "follow:".len()))
        .and_then(|bytes| bytes.checked_add(reason.map_or(0, str::len)))
        .ok_or(CapacityError)?;
    let mut batch = resources::Batch::prepare(&WORDS.category, 1, text_bytes, budget)?;
    batch.choices.push(resources::Choice {
        id: format!("follow:{selected}"),
        label: JsText::concat(&[&WORDS.label_prefix, offer.name]),
        category: WORDS.category.clone(),
        description: WORDS.description.clone(),
        keywords: WORDS.keywords.clone(),
        target_id: selected.to_owned(),
        item_id: None,
        pickup_limit: None,
        enabled: reason.is_none(),
        reason: reason.map(JsText::from),
        facts: None,
        intent: resources::Intent::Command {
            command: resources::Command {
                kind: "follow",
                target_id: selected.to_owned(),
                item_id: None,
                ammunition_id: None,
            },
        },
    });
    Ok(batch)
}
