//! Applied Lab controls live outside the fictional save. The host installs one
//! immutable selection on the native writer before opening a scenario.
use super::*;
use crate::{state::Entity, values::DefinitionPin};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeValueHold {
    pub actor_id: String,
    pub definition: DefinitionPin,
    pub life: u64,
    pub value: f64,
}
impl NativeValueHold {
    fn key(&self) -> (&str, &str) {
        (&self.actor_id, &self.definition.id)
    }
}
pub struct NativeValueHolds {
    rows: Vec<NativeValueHold>,
    _storage: ByteReservation,
}
impl NativeValueHolds {
    /// Adopt the caller's funded SQL decode buffer for the lifetime of the
    /// sorted selection. Empty selections have zero cost in ordinary mechanics.
    pub fn new(
        mut rows: Vec<NativeValueHold>,
        storage: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        rows.sort_unstable_by(|a, b| a.key().cmp(&b.key()));
        if rows.iter().any(|h| {
            !h.value.is_finite()
                || !h.definition.is_valid()
                || !crate::values::is_safe_record_id(&h.actor_id)
        }) || rows.windows(2).any(|p| p[0].key() == p[1].key())
        {
            return Err(failure("invalid native value holds"));
        }
        Ok(Self {
            rows,
            _storage: storage,
        })
    }
    pub fn rows(&self) -> &[NativeValueHold] {
        &self.rows
    }
    pub(crate) fn value(&self, body: &Entity, id: &str, version: u64) -> Option<f64> {
        let actor = body.actor.as_ref()?;
        if !actor.alive {
            return None;
        }
        let hold = &self.rows[self
            .rows
            .binary_search_by(|h| h.key().cmp(&(&*body.id, id)))
            .ok()?];
        (actor.physical_life.unwrap_or(0) == hold.life && hold.definition.version == version)
            .then_some(hold.value)
    }
}
impl NativeWorldSession {
    /// Prepare the currently permitted actor's exact live value and installed
    /// definition. Only an applied numeric anchor is eligible for a hold.
    pub fn author_value_hold(
        &self,
        actor: &str,
        expected: &PersonAttributeEdit,
        life: u64,
    ) -> Result<Option<NativeValueHold>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        let Some(body) = state.physical.entities.get(actor) else {
            return Ok(None);
        };
        let Some(person) = body.actor.as_ref() else {
            return Ok(None);
        };
        let attrs = PersonAttributes {
            state,
            person: body,
        };
        if !person.alive
            || person.physical_life.unwrap_or(0) != life
            || expected.value != expected.expected_value
            || !attrs.matches(expected)
        {
            return Ok(None);
        }
        let Some(definition) = state.installed.attributes.get(&expected.id) else {
            return Ok(None);
        };
        Ok(Some(NativeValueHold {
            actor_id: actor.to_owned(),
            definition: definition.pin().clone(),
            life,
            value: expected.value,
        }))
    }
    pub fn set_value_holds(
        &mut self,
        selected: Option<Arc<NativeValueHolds>>,
    ) -> Result<(), RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if let Some(holds) = &selected {
            for row in holds.rows() {
                let Some(entity) = state.physical.entities.get(&row.actor_id) else {
                    continue;
                };
                let Some(person) = entity.actor.as_ref() else {
                    continue;
                };
                if !person.alive || person.physical_life.unwrap_or(0) != row.life {
                    continue;
                }
                let definition = state.installed.attributes.get(&row.definition.id);
                if !definition.is_some_and(|d| d.pin() == &row.definition) {
                    return Err(failure("The native attribute selected for a hold changed."));
                }
                let Some(anchor) = entity
                    .stored_attributes()
                    .and_then(|m| m.get(&row.definition.id))
                else {
                    return Err(failure("The held attribute is unavailable."));
                };
                let projected = state
                    .physical
                    .pending_values
                    .as_ref()
                    .map(|w| w.current_attribute(&entity.id, &row.definition.id, anchor))
                    .transpose()
                    .map_err(failure)?;
                if projected.as_deref().unwrap_or(anchor).value
                    != crate::values::AttributeValue::Number(row.value)
                {
                    return Err(failure(
                        "The applied character value differs from its saved hold.",
                    ));
                }
            }
        }
        self.session.install_value_holds(selected).map_err(failure)
    }
}
