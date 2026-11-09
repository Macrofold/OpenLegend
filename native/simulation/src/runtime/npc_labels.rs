//! Finite label preparation joins the native capture before model admission.
//! The response ticket has its separate semantic validity after asynchronous
//! model work; this same-cut preparation check is not a publication veto.
use super::*;
use crate::reception::ObserverSubject;
use crate::worlds::InstalledPersonalNameReader;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    subjects: Vec<ObserverSubject>,
}
#[derive(Serialize)]
struct Label<'a> {
    subject: &'a ObserverSubject,
    label: crate::text::TextRef<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    generation: &'a str,
    actor_id: &'a str,
    base_cut: u64,
    labels: &'a [Label<'a>],
}
impl NativeWorldSession {
    pub fn npc_presentation_labels(
        &self,
        read: &RuntimeNpcRead,
        request: &[u8],
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: Request = serde_json::from_slice(request).map_err(failure)?;
        let simulation = self.session.accepted().map_err(failure)?;
        let state = &simulation.state;
        if state.accepted_cut != read.read.accepted_cut
            || state.generation != read.read.perception.evidence.generation()
            || state.physical.header.id != read.read.perception.world_id
        {
            return Err(failure(
                "NPC label preparation belongs to another accepted cut",
            ));
        }
        let actor = &read.read.perception.actor_id;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )
        .map_err(failure)?;
        let _backing = self
            .budget
            .reserve(
                request
                    .subjects
                    .len()
                    .checked_mul(size_of::<Label<'_>>())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let mut labels = Vec::new();
        labels
            .try_reserve_exact(request.subjects.len())
            .map_err(failure)?;
        for subject in &request.subjects {
            labels.push(Label {
                subject,
                label: names.subject_label(subject).map_err(failure)?,
            });
        }
        RuntimeJson::encode(
            &Product {
                world_id: &read.read.perception.world_id,
                generation: read.read.perception.evidence.generation(),
                actor_id: actor,
                base_cut: read.read.accepted_cut,
                labels: &labels,
            },
            &self.budget,
        )
    }
}
