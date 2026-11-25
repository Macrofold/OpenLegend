//! Narrow loans from a detached, funded NPC read. The original native grants
//! and executable choices remain with the response ticket.

use super::{RuntimeError, RuntimeNpcRead, failure};
use crate::{
    experience::AwarenessSourceBody,
    reception::{ObservedBody, SensoryFacet},
    state::Named,
};

pub struct RuntimeNpcPresentedBody<'a> {
    pub source_id: &'a str,
    pub name: &'a Named,
    pub observed: Option<RuntimeNpcObservedBody<'a>>,
}

pub struct RuntimeNpcObservedBody<'a> {
    pub body: &'a ObservedBody,
    pub value_measured_from: f64,
    pub value_measured_through: f64,
    pub value_acquired_at: f64,
    pub confirmed_through: f64,
}

pub struct RuntimeNpcThoughtObject<'a> {
    pub name: &'a Named,
    pub category: Option<&'a Named>,
}

impl RuntimeNpcRead {
    /// Read the body facet once for an already-selected object. Only its
    /// acquired visible subtype can supply an installed category.
    pub fn thought_object(&self, ordinal: usize) -> Option<RuntimeNpcThoughtObject<'_>> {
        if !self
            .preparation
            .as_ref()?
            .selection()
            .contains_body(ordinal)
        {
            return None;
        }
        let body = self.read.perception.bodies.get(ordinal)?;
        let observed = crate::capture::npc_thoughts::observed_body(&self.read.perception, body)?;
        Some(RuntimeNpcThoughtObject {
            name: body.name.name(),
            category: crate::capture::npc_thoughts::observed_category(&self.installed, observed)
                .map(|definition| &definition.named),
        })
    }

    pub fn thought_next_day(&self, at: f64) -> Option<(f64, f64)> {
        crate::time::local_clock::next_local_day(
            at,
            self.installed.status_policy.clock_offset_hours,
        )
    }

    /// The already selected body may supply an acquired interpretation
    /// subject independently of its current physical reference.
    pub fn has_interpretation_subject(&self, ordinal: usize) -> bool {
        self.reference_facts
            .bodies
            .get(ordinal)
            .and_then(|body| body.subject.as_ref())
            .is_some_and(|identity| identity.interpretation_identity())
    }

    pub fn selected_body_ordinals(&self) -> Result<&[usize], RuntimeError> {
        self.preparation
            .as_ref()
            .map(|prepared| prepared.selection().body_ordinals())
            .ok_or_else(|| failure("NPC body selection is unavailable"))
    }

    /// Read the same native body range and first body facet used by the
    /// bridge formatter. No field or backing survives the captured read.
    pub fn presented_body(&self, ordinal: usize) -> Option<RuntimeNpcPresentedBody<'_>> {
        let perception = &self.read.perception;
        let body = perception.bodies.get(ordinal)?;
        let end = body.first.checked_add(body.count)?;
        let fields = perception.evidence.cut().current.get(body.first..end)?;
        let observed = fields.iter().find_map(|facet| {
            let SensoryFacet::Body { body } = &facet.value else {
                return None;
            };
            Some(RuntimeNpcObservedBody {
                body,
                value_measured_from: facet.value_measured_from,
                value_measured_through: facet.value_measured_through,
                value_acquired_at: facet.value_acquired_at,
                confirmed_through: facet.confirmed_through,
            })
        });
        Some(RuntimeNpcPresentedBody {
            source_id: &body.source_id,
            name: body.name.name(),
            observed,
        })
    }

    /// Compare a historical speaker to the actual current body and lease at
    /// this cut. A matching label or recurrence of an ID supplies no proof.
    pub fn source_body_is_current(&self, source: &AwarenessSourceBody) -> bool {
        self.read.perception.bodies.iter().any(|body| {
            body.source_id == source.entity_id
                && Some(body.lease_id.as_str()) == source.lease_id.as_deref()
                && body.physical_life == Some(source.physical_life)
        })
    }
}
