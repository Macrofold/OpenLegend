//! Installed body services. Authored data chooses supported outcomes; physical
//! life, custody, conditions and receiving changes keep their semantic owners.

mod policy;
mod reincarnation;
pub(crate) use policy::*;
pub(crate) use reincarnation::*;
mod corpse;
mod reconcile;
mod recovery;
mod scars;
pub(crate) use reconcile::{BodyAnswer, BodyReconcileCursor, BodyStep, reconcile_native_control};
pub(crate) use recovery::recovery_anchor;
mod health;
pub(crate) use health::HealthChangeCursor;
mod rates;
pub(crate) use rates::BodyRateCursor;
mod remains;
pub(crate) use remains::{RemainsCursor, RemainsStep, next_remains_deadline};

fn narration_bound(template: &str, entity: &crate::state::Entity) -> Option<usize> {
    let tokens = template.bytes().filter(|byte| *byte == b'{').count();
    crate::host::retained_size::heap_sum([
        (tokens.checked_mul(2)?.checked_add(1)?)
            .max(4)
            .checked_next_power_of_two()?
            .checked_mul(std::mem::size_of::<crate::narration::NarrationPart>())?,
        tokens.checked_mul(entity.id.len())?,
        template.len().checked_mul(4)?,
        entity.name.storage_bytes(),
        entity.name_form.as_ref().map_or(0, String::len),
        entity.indefinite_article.as_ref().map_or(0, String::len),
        crate::host::retained_size::map_storage::<&str, crate::narration::TemplateBinding<'_>>(1)?,
        512,
    ])
}
fn narration(template: &str, entity: &crate::state::Entity) -> crate::narration::Narration {
    let name = crate::state::Named {
        name: entity.name.clone(),
        name_form: entity.name_form.clone(),
        indefinite_article: entity.indefinite_article.clone(),
    };
    crate::narration::narration_template(
        template,
        &indexmap::IndexMap::from([(
            "subject",
            crate::narration::TemplateBinding::Entity {
                id: &entity.id,
                name: &name,
            },
        )]),
    )
}
pub(crate) use scars::{ScarEffect, scar_factor};
