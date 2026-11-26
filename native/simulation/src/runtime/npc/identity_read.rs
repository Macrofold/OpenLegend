//! The decision formatter borrows name revisions from the already captured
//! observation and selected personal sources. It cannot obtain a body lease.
use super::RuntimeNpcRead;
use crate::{capture::NpcSubjectOrdinal, reception::ObserverSubject, text::JsText};

pub struct RuntimeNpcIdentity<'a> {
    pub source: NpcSubjectOrdinal,
    pub subject: &'a ObserverSubject,
    pub label: &'a JsText,
    pub revision: u64,
}

impl RuntimeNpcRead {
    /// A currently presented body supplies its existing supported subject.
    /// The associated name revision cannot authorize a new body reference.
    pub fn visible_identity(&self, ordinal: usize) -> Option<RuntimeNpcIdentity<'_>> {
        let fact = self.reference_facts.bodies.get(ordinal)?.subject.as_ref()?;
        fact.interpretation_identity().then(|| RuntimeNpcIdentity {
            source: NpcSubjectOrdinal::Body { ordinal },
            subject: &fact.subject,
            label: fact.label(),
            revision: fact.name_revision(),
        })
    }

    /// Only associations and already-recognized entities from the selected
    /// personal record are considered. No historical page is acquired here.
    pub fn remembered_identities(
        &self,
        inventory: usize,
        ordinal: usize,
    ) -> Option<impl Iterator<Item = RuntimeNpcIdentity<'_>>> {
        let attribution = &self
            .sources
            .get(inventory)?
            .personal
            .get(ordinal)?
            .attribution;
        let subjects =
            attribution
                .subject_facts()
                .iter()
                .enumerate()
                .filter_map(move |(subject, fact)| {
                    (matches!(fact.subject, ObserverSubject::Individual { .. })
                        && fact.interpretation_identity())
                    .then(|| RuntimeNpcIdentity {
                        source: NpcSubjectOrdinal::Personal {
                            inventory,
                            ordinal,
                            subject,
                        },
                        subject: &fact.subject,
                        label: fact.label(),
                        revision: fact.name_revision(),
                    })
                });
        let entities =
            attribution
                .name_entity_facts()
                .enumerate()
                .filter_map(move |(entity, fact)| {
                    (fact.remembered_entity()
                        && fact.canonical_id.as_deref()
                            != Some(self.read.perception.actor_id.as_str()))
                    .then(|| RuntimeNpcIdentity {
                        source: NpcSubjectOrdinal::PersonalEntity {
                            inventory,
                            ordinal,
                            entity,
                        },
                        subject: &fact.subject,
                        label: fact.label(),
                        revision: fact.name_revision(),
                    })
                });
        Some(subjects.chain(entities))
    }
}
