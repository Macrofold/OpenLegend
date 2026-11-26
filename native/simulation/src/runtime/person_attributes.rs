//! Creator editing reads the same projected numeric anchor the next simulation
//! step would consume, including unapplied arithmetic in a retained interval.
use super::*;
use crate::{
    state::Entity,
    status::{AttributeDefinition, AttributeSchema},
    values::AttributeValue,
};
use serde::ser::SerializeSeq;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonAttributeEdit {
    pub id: String,
    pub expected_revision: u64,
    pub expected_value: f64,
    pub value: f64,
}
#[derive(Serialize)]
pub struct PersonAttribute<'a> {
    id: &'a str,
    name: &'a str,
    unit: &'a str,
    min: f64,
    max: f64,
    value: f64,
    revision: u64,
    held: bool,
}
pub struct PersonAttributes<'a> {
    pub(super) state: &'a crate::simulation::SimulationState,
    pub(super) person: &'a Entity,
}
pub(crate) fn editable(definition: &AttributeDefinition) -> bool {
    definition.implementation == "number-v1"
        && definition.reservoir.is_none()
        && definition.native_health.is_none()
        && definition.practice.is_none()
        && !definition
            .concern
            .as_ref()
            .is_some_and(|c| c.mode == "latched" && c.notify)
}
impl<'a> PersonAttributes<'a> {
    pub fn traits(&self) -> &'a [crate::state::CharacterTrait] {
        self.person
            .actor
            .as_ref()
            .and_then(|a| a.traits.as_deref())
            .unwrap_or_default()
    }
    pub fn can_create_person(&self) -> bool {
        self.state.installed.person_creation.is_some()
    }
    pub fn trait_options(&self) -> Option<&'static [crate::state::CharacterTrait]> {
        Some(&crate::worlds::base_traits::catalogue(&self.state.installed.content.profile)?.choices)
    }
    pub fn history_ordinal(&self) -> u64 {
        self.state.occurrences.next_hot_ordinal()
    }
    pub fn sim_time(&self) -> f64 {
        self.state.physical.header.sim_time
    }
    fn get(&self, id: &str) -> Option<PersonAttribute<'a>> {
        let representation = self.state.installed.attributes.get(id)?.value();
        if !editable(representation) {
            return None;
        }
        let AttributeSchema::Number { min, max, unit, .. } = &representation.schema else {
            return None;
        };
        let anchor = self.person.stored_attributes()?.get(id)?;
        let projected = match self.state.physical.pending_values.as_ref() {
            Some(window) => window.current_attribute(&self.person.id, id, anchor).ok()?,
            None => std::borrow::Cow::Borrowed(anchor),
        };
        let AttributeValue::Number(value) = projected.value else {
            return None;
        };
        Some(PersonAttribute {
            id: &representation.id,
            name: &representation.name,
            unit,
            min: *min,
            max: *max,
            value,
            revision: projected.revision,
            held: self
                .state
                .physical
                .value_holds
                .as_deref()
                .and_then(|holds| holds.value(self.person, id, representation.version))
                .is_some(),
        })
    }
    pub(super) fn matches(&self, requested: &PersonAttributeEdit) -> bool {
        self.get(&requested.id).is_some_and(|current| {
            (!current.held || requested.value == current.value)
                && current.revision == requested.expected_revision
                && current.value == requested.expected_value
                && (current.min..=current.max).contains(&requested.value)
        })
    }
}
impl Serialize for PersonAttributes<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(None)?;
        for id in self
            .person
            .stored_attributes()
            .into_iter()
            .flat_map(|stored| stored.keys())
        {
            if let Some(value) = self.get(id) {
                out.serialize_element(&value)?;
            }
        }
        out.end()
    }
}
