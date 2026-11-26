//! A creator replaces four authored fields together. The previous values move
//! into undo and the ordinary save encoder updates the indexed entity name.
use super::*;
use crate::{
    narration::{NameArticle, name_phrase},
    runtime::PersonProfile,
    state::{Entity, Named},
    text::JsText,
};

pub(crate) struct AuthoredProfile {
    name: JsText,
    name_form: Option<String>,
    description: Option<JsText>,
    personality: Option<JsText>,
    backstory: Option<JsText>,
}
impl AuthoredProfile {
    pub(crate) fn from_draft(profile: &PersonProfile<JsText>, person: &Entity) -> Self {
        let name = profile.name.trimmed();
        let name_form = if name == person.name {
            person.name_form.clone()
        } else {
            Some("proper".to_owned())
        };
        Self {
            name,
            name_form,
            description: profile.description.as_ref().map(JsText::trimmed),
            personality: profile.personality.as_ref().map(JsText::trimmed),
            backstory: profile.backstory.as_ref().map(JsText::trimmed),
        }
    }
    pub(crate) fn bytes(&self) -> usize {
        self.name.storage_bytes()
            + self.name_form.as_ref().map_or(0, String::capacity)
            + [&self.description, &self.personality, &self.backstory]
                .into_iter()
                .flatten()
                .map(JsText::storage_bytes)
                .sum::<usize>()
    }
    pub(crate) fn matches(&self, entity: &Entity) -> bool {
        entity.name == self.name
            && entity.actor.as_ref().is_some_and(|actor| {
                self.description == actor.description
                    && self.personality == actor.personality
                    && self.backstory == actor.backstory
            })
    }
    pub(crate) fn identity_text(&self, goals: Option<&[String]>) -> JsText {
        let mut text = JsText::from("I am ");
        let named = Named {
            name: self.name.clone(),
            name_form: self.name_form.clone(),
            indefinite_article: None,
        };
        text.push_text(&name_phrase(&named, NameArticle::Definite, true));
        text.push_str(".");
        for line in [&self.description, &self.personality, &self.backstory]
            .into_iter()
            .flatten()
            .filter(|line| !line.is_empty())
        {
            text.push_str(" ");
            text.push_text(line);
        }
        if let Some(goals) = goals.filter(|goals| !goals.is_empty()) {
            text.push_str(" My starting goals were: ");
            text.push_str(&goals.join("; "));
            text.push_str(".");
        }
        text
    }
    pub(super) fn swap(mut self, entity: &mut Entity) -> Result<Self, ExecutionError> {
        let actor = entity.actor.as_mut().ok_or(ExecutionError::MissingActor)?;
        std::mem::swap(&mut entity.name, &mut self.name);
        std::mem::swap(&mut entity.name_form, &mut self.name_form);
        std::mem::swap(&mut actor.description, &mut self.description);
        std::mem::swap(&mut actor.personality, &mut self.personality);
        std::mem::swap(&mut actor.backstory, &mut self.backstory);
        Ok(self)
    }
}
impl PhysicalMutation<'_> {
    pub(crate) fn replace_person_traits(
        &mut self,
        id: &str,
        selected: Vec<crate::state::CharacterTrait>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = self
            .state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?;
        let bytes = |row: &crate::state::CharacterTrait| {
            size_of::<crate::state::CharacterTrait>()
                + row.id.capacity()
                + row.name.storage_bytes()
                + row.description.storage_bytes()
        };
        self.journal.reserve(
            2 * size_of::<Undo>()
                + actor.traits.iter().flatten().map(bytes).sum::<usize>()
                + selected.iter().map(bytes).sum::<usize>(),
        )?;
        let before = actor.traits.replace(selected);
        self.journal.retain(
            UndoKey::PersonTraits(entity.slot, entity.generation),
            Undo::PersonTraits { entity, before },
        )?;
        self.state
            .entities
            .settle_authored_memory(entity, &mut self.journal.reservation, false)
    }
    pub(crate) fn replace_person_profile(
        &mut self,
        actor: &str,
        profile: AuthoredProfile,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let actual = self
            .state
            .entities
            .resolve(entity)
            .ok_or(ExecutionError::MissingActor)?;
        let body = actual.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let old = actual.name.storage_bytes()
            + actual.name_form.as_ref().map_or(0, String::capacity)
            + [&body.description, &body.personality, &body.backstory]
                .into_iter()
                .flatten()
                .map(JsText::storage_bytes)
                .sum::<usize>();
        self.journal
            .reserve(2 * size_of::<Undo>() + old + profile.bytes())?;
        let key = UndoKey::PersonProfile(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        let before = profile.swap(
            self.state
                .entities
                .resolve_mut(entity)
                .ok_or(ExecutionError::MissingActor)?,
        )?;
        if first {
            self.journal.retain(
                key,
                Undo::PersonProfile {
                    entity,
                    before: Box::new(before),
                },
            )?;
        }
        self.state
            .entities
            .settle_authored_memory(entity, &mut self.journal.reservation, false)
    }
}
