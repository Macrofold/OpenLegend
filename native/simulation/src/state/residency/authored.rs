//! The selected physical writers never replace these authored identity/body
//! descriptions. Newly created bodies enter this same typed allocation owner;
//! mutable actions, semantics and later dynamic parts keep separate custody.
use super::*;
use crate::host::retained_size::heap_sum;
heap_record!(BodyProfile { id });
heap_record!(EquipmentPort { id, label, icon });
heap_record!(LivingBody {
    equipment_ports,
    plan,
    harvest_yield
});
heap_record!(CharacterTrait {
    id,
    name,
    description
});
heap_record!(IndividualRecognition { attribute_id });
pub(super) fn bytes(entity: &Entity) -> Option<usize> {
    let actor = entity.actor.as_ref().map_or(Some(0), |actor| {
        heap_sum([
            actor.natural_strike_ids.heap_bytes()?,
            actor.senses.heap_bytes()?,
            actor.traits.heap_bytes()?,
            actor.individual_recognition.heap_bytes()?,
            actor.description.heap_bytes()?,
            actor.personality.heap_bytes()?,
            actor.backstory.heap_bytes()?,
            actor.initial_goals.heap_bytes()?,
            actor.species.heap_bytes()?,
            actor.body.heap_bytes()?,
        ])
    })?;
    heap_sum([
        actor,
        entity.id.capacity(),
        entity.name.heap_bytes()?,
        entity.name_form.heap_bytes()?,
        entity.indefinite_article.heap_bytes()?,
        entity.kind.capacity(),
        entity.icon.heap_bytes()?,
        entity.description.heap_bytes()?,
        entity.appearance.heap_bytes()?,
        entity.spatial.body.heap_bytes()?,
        entity.spatial.inactive_body.heap_bytes()?,
        entity
            .replenisher
            .as_ref()
            .map_or(0, |value| value.attribute_id.capacity()),
        entity
            .resource
            .as_ref()
            .map_or(0, |value| value.definition_id.capacity()),
    ])
}
