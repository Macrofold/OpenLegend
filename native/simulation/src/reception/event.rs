//! Event-time disclosure selection. An audience grants the occurrence; every
//! other body/data reference still needs its own original visibility grant.
//! Names are supplied by the selected personal-name owner in this same phase.

use super::sensors::{SensorError, SightResults};
use super::{EventScalar, ObserverLife, ReceivedReference, ReferenceRole};
use crate::events::{EmissionText, EventScope, WorldEvent};
use crate::narration::{
    GrammaticalPerson, NameArticle, Narration, NarrationPart, NativeText, PersonRole, name_phrase,
    render_narration_parts,
};
use crate::state::{EntityStore, Named, Placement};
use crate::worlds::InstalledEventDisclosure;
use indexmap::IndexMap;

fn owned(event: &WorldEvent, observer_id: &str) -> bool {
    event.scope == Some(EventScope::Private) || event.actor_id.as_deref() == Some(observer_id)
}

fn narration_references(narration: Option<&Narration>) -> impl Iterator<Item = &str> {
    narration
        .into_iter()
        .flat_map(|narration| &narration.parts)
        .filter_map(|part| match part {
            NarrationPart::Literal(_) => None,
            NarrationPart::Participant { entity_id, .. } => Some(entity_id.as_str()),
            NarrationPart::Verb { subject_id, .. } => Some(subject_id.as_str()),
        })
}

/// Only a fully external attachment chain exposes its world root. Seeing a
/// carrier never proves the contents of a bag attached to that carrier.
fn external_root<'a>(entities: &'a EntityStore, id: &str) -> Result<Option<&'a str>, SensorError> {
    let Some(mut subject) = entities.get(id) else {
        return Ok(None);
    };
    let mut remaining = entities.len().saturating_add(1);
    loop {
        if remaining == 0 {
            return Err(SensorError::PhysicalPosition);
        }
        remaining -= 1;
        match &subject.placement {
            Some(Placement::World { .. }) => return Ok(Some(&subject.id)),
            Some(Placement::Attached {
                parent_entity_id, ..
            }) => {
                let Some(parent) = entities.get(parent_entity_id) else {
                    return Ok(None);
                };
                subject = parent;
            }
            _ => return Ok(None),
        }
    }
}

/// Exact finite target IDs for the real SightBatch. Missing answers later are
/// refused, rather than interpreted as invisibility or an inferred grant.
pub(crate) fn event_visibility_targets<'a>(
    entities: &'a EntityStore,
    event: &'a WorldEvent,
    observer_id: &str,
    policy: &InstalledEventDisclosure,
    felt_impact: bool,
) -> Result<Vec<&'a str>, SensorError> {
    if owned(event, observer_id) {
        return Ok(Vec::new());
    }
    let felt = felt_impact || policy.felt_target(event) == Some(observer_id);
    let mut targets = Vec::new();
    if felt
        && let Some(source_id) = event.actor_id.as_deref()
        && source_id != observer_id
        && entities.get(source_id).is_some()
    {
        targets.push(source_id);
    }
    for id in event
        .actor_id
        .iter()
        .chain(event.target_id.iter())
        .map(String::as_str)
        .chain(policy.references(event))
        .chain(narration_references(event.narration.as_ref()))
    {
        // Audience preparation already proved the source. Felt impacts are the
        // exception and use the source's own body test above, not its carrier.
        if id == observer_id || event.actor_id.as_deref() == Some(id) {
            continue;
        }
        if let Some(root) = external_root(entities, id)?
            && !targets.contains(&root)
        {
            targets.push(root);
        }
    }
    Ok(targets)
}

pub(crate) struct EventObservationSelection<'a> {
    observer: ObserverLife,
    event: &'a WorldEvent,
    policy: &'a InstalledEventDisclosure,
    source_id: Option<&'a str>,
    target_id: Option<&'a str>,
    event_type: &'a str,
    references: Vec<(&'a str, ReferenceRole)>,
    detailed: bool,
}

#[derive(Debug)]
pub(crate) struct PermittedEventObservation {
    pub source_id: Option<String>,
    pub target_id: Option<String>,
    pub event_type: String,
    pub text: NativeText,
    pub event_data: IndexMap<String, EventScalar>,
    pub references: Vec<ReceivedReference>,
}

pub(crate) fn prepare_event_observation<'a>(
    entities: &EntityStore,
    event: &'a WorldEvent,
    observer_id: &str,
    policy: &'a InstalledEventDisclosure,
    felt_impact: bool,
    sight: Option<&SightResults>,
) -> Result<EventObservationSelection<'a>, SensorError> {
    let observer_entity = entities
        .get(observer_id)
        .ok_or(SensorError::MissingObserver)?;
    let observer = ObserverLife {
        actor_id: observer_id.to_owned(),
        physical_life: observer_entity.physical_life().unwrap_or(0),
    };
    if sight.is_some_and(|sight| sight.observer() != &observer) {
        return Err(SensorError::Geometry);
    }
    let complete_references = || {
        let mut references = Vec::new();
        if let Some(id) = event.actor_id.as_deref() {
            references.push((id, ReferenceRole::Actor));
        }
        if let Some(id) = event.target_id.as_deref() {
            references.push((id, ReferenceRole::Target));
        }
        for id in narration_references(event.narration.as_ref()) {
            if event.actor_id.as_deref() != Some(id)
                && event.target_id.as_deref() != Some(id)
                && !references.iter().any(|(prior, _)| *prior == id)
            {
                references.push((id, ReferenceRole::Participant));
            }
        }
        references
    };
    if owned(event, observer_id) {
        return Ok(EventObservationSelection {
            observer,
            event,
            policy,
            source_id: event.actor_id.as_deref(),
            target_id: event.target_id.as_deref(),
            event_type: &event.event_type,
            references: complete_references(),
            detailed: true,
        });
    }
    let felt = felt_impact || policy.felt_target(event) == Some(observer_id);
    let mut visible = IndexMap::<&str, bool>::new();
    if let Some(id) = event.actor_id.as_deref() {
        let seen = !felt
            || id == observer_id
            || if entities.get(id).is_some() {
                sight
                    .and_then(|sight| sight.seen(id))
                    .ok_or(SensorError::Geometry)?
            } else {
                false
            };
        visible.insert(id, seen);
    }
    let mut permits = |id: &'a str| -> Result<bool, SensorError> {
        if let Some(seen) = visible.get(id) {
            return Ok(*seen);
        }
        let seen = if id == observer_id {
            true
        } else if let Some(root) = external_root(entities, id)? {
            sight
                .and_then(|sight| sight.seen(root))
                .ok_or(SensorError::Geometry)?
        } else {
            false
        };
        visible.insert(id, seen);
        Ok(seen)
    };
    let source_id = event
        .actor_id
        .as_deref()
        .map(|id| permits(id).map(|seen| seen.then_some(id)))
        .transpose()?
        .flatten();
    let target_id = event
        .target_id
        .as_deref()
        .map(|id| permits(id).map(|seen| seen.then_some(id)))
        .transpose()?
        .flatten();
    let mut detailed = policy.permits_details(event, observer_id);
    if detailed {
        for id in event
            .actor_id
            .iter()
            .chain(event.target_id.iter())
            .map(String::as_str)
            .chain(policy.references(event))
            .chain(narration_references(event.narration.as_ref()))
        {
            if !permits(id)? {
                detailed = false;
                break;
            }
        }
    }
    let (event_type, references) = if detailed {
        (event.event_type.as_str(), complete_references())
    } else {
        (
            if felt {
                event.event_type.as_str()
            } else {
                policy.partial_type()
            },
            source_id
                .map(|id| (id, ReferenceRole::Actor))
                .into_iter()
                .chain(target_id.map(|id| (id, ReferenceRole::Target)))
                .collect(),
        )
    };
    Ok(EventObservationSelection {
        observer,
        event,
        policy,
        source_id,
        target_id,
        event_type,
        references,
        detailed,
    })
}

impl EventObservationSelection<'_> {
    pub(crate) fn source_id(&self) -> Option<&str> {
        self.source_id
    }
    pub(crate) fn target_id(&self) -> Option<&str> {
        self.target_id
    }
    pub(crate) fn event_type(&self) -> &str {
        self.event_type
    }
    pub(crate) fn references(&self) -> &[(&str, ReferenceRole)] {
        &self.references
    }

    /// `names` must be the selected personal-name owner's actual event-time
    /// capture. Missing values refuse this admitted materialization; this helper
    /// cannot repair the cut using an authored canonical name or later lookup.
    pub(crate) fn materialize(
        self,
        names: &IndexMap<String, Named>,
    ) -> Result<PermittedEventObservation, SensorError> {
        let render = |narration: &Narration| -> Result<String, SensorError> {
            if narration_references(Some(narration)).any(|id| !names.contains_key(id)) {
                return Err(SensorError::PhysicalPosition);
            }
            Ok(render_narration_parts(
                narration,
                names,
                Some(&self.observer.actor_id),
                GrammaticalPerson::First,
            ))
        };
        let label = |id: &str, captured: bool| -> Result<String, SensorError> {
            if captured
                && let NativeText::Captured(text) = &self.event.text
                && let Some(named) = text.names.get(id)
            {
                return Ok(name_phrase(named, NameArticle::None, true));
            }
            render(&Narration {
                parts: vec![NarrationPart::Participant {
                    entity_id: id.to_owned(),
                    role: PersonRole::Name,
                    article: Some(NameArticle::None),
                }],
            })
        };
        let event_data = self
            .policy
            .data(self.event, &self.observer.actor_id, self.detailed);
        let text = if self.detailed {
            let text = if let Some(narration) = &self.event.narration {
                NativeText::Literal(render(narration)?)
            } else {
                match &self.event.text {
                    NativeText::Literal(value) => NativeText::Literal(value.clone()),
                    NativeText::Captured(value) => {
                        let mut value = value.clone();
                        value.self_id = Some(self.observer.actor_id.clone());
                        value.person = GrammaticalPerson::First;
                        NativeText::Captured(value)
                    }
                }
            };
            self.policy.complete_text(self.event, &event_data, text)
        } else {
            match self
                .policy
                .partial(self.event, self.source_id, self.target_id)
            {
                EmissionText::Literal(text) => NativeText::Literal(text),
                EmissionText::Narration(narration) => NativeText::Literal(render(&narration)?),
            }
        };
        let references = self
            .references
            .iter()
            .map(|(id, role)| {
                Ok(ReceivedReference {
                    id: (*id).to_owned(),
                    label: label(id, *role != ReferenceRole::Participant)?,
                    role: *role,
                })
            })
            .collect::<Result<Vec<_>, SensorError>>()?;
        Ok(PermittedEventObservation {
            source_id: self.source_id.map(str::to_owned),
            target_id: self.target_id.map(str::to_owned),
            event_type: self.event_type.to_owned(),
            text,
            event_data,
            references,
        })
    }
}
