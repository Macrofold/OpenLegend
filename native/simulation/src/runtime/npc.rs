//! Detached NPC first-person facts retain their actual native evidence owner.
//! Reading these facts grants neither an executable response nor a current
//! source lease; the context producer must bind those independently.
use super::*;
use crate::appraisals::AppraisalScope;
use crate::simulation::AcceptedActorRead;
use std::mem::size_of;

pub struct RuntimeNpcRead {
    pub(super) read: AcceptedActorRead,
    pub(super) serial: u64,
    history: crate::experience::CapturedHistoryCuts,
    _custody: ByteReservation,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NpcReadRequest {
    actor_id: String,
    required_appraisals: Vec<AppraisalScope>,
}

impl NativeWorldSession {
    pub fn read_npc(&mut self, request: &[u8]) -> Result<RuntimeNpcRead, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: NpcReadRequest = serde_json::from_slice(request).map_err(failure)?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        let read = simulation
            .read_npc(
                &request.actor_id,
                &request.required_appraisals,
                &self.budget,
            )
            .map_err(failure)?;
        let history = crate::experience::capture_history_cuts(
            &simulation.state,
            std::iter::once(request.actor_id.as_str()),
            &self.budget,
        )
        .map_err(failure)?;
        let custody = self
            .budget
            .reserve(size_of::<RuntimeNpcRead>())
            .map_err(failure)?;
        self.next_read_serial = serial;
        Ok(RuntimeNpcRead {
            read,
            serial,
            history,
            _custody: custody,
        })
    }
}

impl RuntimeNpcRead {
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let (perception, _perception_custody) =
            self.read.perception.write_json(budget).map_err(failure)?;
        let appraisals = self
            .read
            .appraisals_json()
            .ok_or_else(|| failure("NPC appraisal capture is unavailable"))?;
        let history = RuntimeJson::encode(&self.history.value(), budget)?;
        RuntimeJson::join(
            &[
                b"{\"self\":",
                self.read.own_json().as_bytes(),
                b",\"perception\":",
                perception.as_bytes(),
                b",\"appraisals\":",
                appraisals.as_bytes(),
                b",\"history\":",
                history.bytes(),
                b"}",
            ],
            budget,
        )
    }
}
