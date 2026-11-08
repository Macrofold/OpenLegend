//! A continuous received sight body keeps its observer-local individual. A new
//! encounter allocates an unnamed individual; its routing ID supplies no name.
use super::{ObserverIdentity, PersonalNameReader};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{
    CurrentFacetGrant, CurrentFacetSelector, Modality, ObserverSubject, current_native_facet_at,
};

pub(crate) struct EnsuredBodyIndividual {
    subject: ObserverSubject,
    _reservation: ByteReservation,
}
impl EnsuredBodyIndividual {
    pub(crate) fn subject(&self) -> &ObserverSubject {
        &self.subject
    }
}
pub(crate) fn ensure_body_individual(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    received: &CurrentFacetGrant,
    budget: &ByteBudget,
) -> Result<Option<EnsuredBodyIndividual>, ExecutionError> {
    if observer == subject
        || received.modality != Modality::Sight
        || received.subject_id != subject
        || !core
            .state
            .physical
            .entities
            .get(observer)
            .is_some_and(|entity| entity.has_memory())
        || !core
            .state
            .physical
            .entities
            .get(subject)
            .is_some_and(|entity| entity.actor.is_some())
    {
        return Ok(None);
    }
    // current_body_subject can form one note/association key from an admitted
    // record ID. Its engine ID allowance bounds that temporary quoted key,
    // while the sparse identity journal separately funds canonical insertion.
    let reservation = budget.reserve(
        std::mem::size_of::<EnsuredBodyIndividual>()
            + crate::values::MAX_RECORD_ID_UNITS * 4 * 12
            + observer.len()
            + subject.len()
            + received.exposure.len()
            + 4 * 64,
    )?;
    let previous = current_native_facet_at(
        core.state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer)),
        subject,
        "body",
        CurrentFacetSelector {
            channel: Some(&received.channel),
            ..Default::default()
        },
    )?;
    if let Some(previous) = previous.filter(|previous| {
        previous.metadata.availability.is_none()
            && previous.grant.exposure == received.exposure
            && previous.grant.subject_physical_life == received.subject_physical_life
            && previous.grant.channel == received.channel
    }) {
        let existing = if let Some(local) = &previous.field.local_subject {
            Some(local.clone())
        } else {
            PersonalNameReader::prepare(
                &core.state.physical,
                &core.state.reception,
                &core.state.installed,
                &core.state.experience,
                observer,
            )?
            .current_body_subject(subject)?
        };
        if let Some(subject) = existing {
            return Ok(Some(EnsuredBodyIndividual {
                subject,
                _reservation: reservation,
            }));
        }
    }
    if received.exposure.is_empty() {
        return Ok(None);
    }
    let individual = loop {
        let issued = core.state.physical.identity.allocate("individual")?;
        if !core
            .state
            .reception
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .is_some_and(|identities| identities.contains_key(&issued.id))
        {
            break issued.id;
        }
    };
    let identity = ObserverIdentity {
        retained: None,
        familiarity: None,
        individual_id: Some(individual.clone()),
        canonical_id: None,
        seed_only: None,
        voice: None,
        sight: None,
        name_evidence_ids: None,
        given_name: crate::text::JsText::default(),
        nickname: None,
        revision: 0,
        encounter_id: Some(received.exposure.clone()),
        authored: false,
    };
    core.journal.recognition.insert_ephemeral(
        &mut core.state.reception,
        observer,
        &individual,
        identity,
    )?;
    Ok(Some(EnsuredBodyIndividual {
        subject: ObserverSubject::Individual {
            individual_id: individual,
        },
        _reservation: reservation,
    }))
}
