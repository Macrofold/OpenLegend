//! One native-owned maintenance batch survives model work. SQL answers the
//! existing scoped Sources questions; it never supplies interpretation grants.
use super::*;
use crate::capture::{NpcHistoricalScope,NpcSourceSelection,PreparedNpcSources};
use crate::capture::maintenance::{MaintenanceAdmission,MaintenanceCapture,MaintenancePurpose,MaintenanceRequest,MaintenanceInterpretation};
use crate::experience::consolidation::{ConsolidationGroup,ConsolidationLimits};
use crate::host::retained_size::HeapBytes;
use std::mem::size_of;
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Binding {
    job_id:String,
    selection:NpcSourceSelection,
    protected_importance:f64,
    #[serde(deserialize_with="crate::values::deserialize_safe_integer")]
    summary_bytes:u64,
    requires_body:bool,
    #[serde(default,deserialize_with="crate::values::deserialize_present_option")]
    dream_episode:Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Groups { groups:Vec<ConsolidationGroup> }
pub struct RuntimeConsolidationTicket {
    pub(super) job:String,
    pub(super) body:Arc<MaintenanceCapture>,
    pub(super) workspace:Arc<MaintenanceCapture>,
    pub(super) admission:MaintenanceAdmission,
    pub(super) scope:Arc<NpcHistoricalScope>,
    selection:NpcSourceSelection,
    limits:ConsolidationLimits,
    files:String,
    _files:ByteReservation,
    sources:Option<PreparedNpcSources>,
    interpretation:Option<Arc<MaintenanceInterpretation>>,
    candidate:Option<CandidateKey>,
    _storage:ByteReservation,
}
impl NativeWorldSession {
    pub fn bind_consolidation(&mut self,body:&RuntimeMaintenanceRead,input:&[u8])->Result<RuntimeConsolidationTicket,RuntimeError> {
        self.require_active()?;
        let _decode=decode_preparation(input,&self.budget)?;
        let mut input:Binding=serde_json::from_slice(input).map_err(failure)?;
        let state=&self.session.accepted().map_err(failure)?.state;
        if !crate::values::is_safe_record_id(&input.job_id)||!body.read.scope_current(state)||!input.selection.receipts.is_empty()||input.selection.personal.is_empty()||input.selection.personal.iter().any(|s|s.through.is_some())||input.selection.consolidation_job.is_some()||!input.protected_importance.is_finite()||!(0.0..=10.0).contains(&input.protected_importance)||input.summary_bytes==0 {return Err(failure("invalid consolidation source preparation"));}
        let actor=&body.read.request.actor_id;
        let admission=MaintenanceAdmission {purpose:MaintenancePurpose::Maintenance,requires_body:input.requires_body||input.dream_episode.is_some(),dream_episode:input.dream_episode};
        if !body.read.current(state,&admission).map_err(failure)? {return Err(failure("maintenance body admission changed"));}
        let serial=self.next_read_serial.checked_add(1).filter(|n|*n<=crate::identity::MAX_SAFE_INTEGER).ok_or_else(||failure("read identity exhausted"))?;
        let bytes=size_of::<RuntimeConsolidationTicket>().checked_add(input.job_id.capacity()*2).and_then(|n|n.checked_add(input.selection.personal.capacity().checked_mul(size_of::<crate::capture::NpcPersonalSelection>())?)).and_then(|n|n.checked_add(input.selection.personal.iter().try_fold(0usize,|n,s|n.checked_add(s.reference.heap_bytes()?))?)).and_then(|n|n.checked_add(admission.dream_episode.as_ref().map_or(0,String::capacity))).ok_or_else(||failure("capacity"))?;
        let storage=self.budget.reserve(bytes).map_err(failure)?;
        let workspace=MaintenanceCapture::capture(state,MaintenanceRequest {actor_id:actor.clone(),resident_pressure:None},&self.budget).map_err(failure)?;
        let (files,files_storage)=workspace.files(state,&self.budget).map_err(failure)?;
        let scope=NpcHistoricalScope::capture_personal(state,actor,serial,&self.budget).map_err(failure)?;
        input.selection.consolidation_job=Some(input.job_id.clone());
        self.next_read_serial=serial;
        Ok(RuntimeConsolidationTicket {job:input.job_id,body:Arc::clone(&body.read),workspace:Arc::new(workspace),admission,scope:Arc::new(scope),selection:input.selection,limits:ConsolidationLimits {protected_importance:input.protected_importance,summary_bytes:input.summary_bytes},files,_files:files_storage,sources:None,interpretation:None,candidate:None,_storage:storage})
    }
    pub fn consolidation_sources(&mut self,ticket:&mut RuntimeConsolidationTicket)->Result<CandidateKey,RuntimeError> {
        self.require_active()?;
        if ticket.candidate.is_some()||ticket.sources.is_some() {return Err(failure("consolidation sources are already being prepared"));}
        let json=crate::encoding::json_record(&ticket.selection).map_err(failure)?;
        let _decode=decode_preparation(json.as_bytes(),&self.budget)?;
        let selection=serde_json::from_str(&json).map_err(failure)?;
        let key=self.session.begin_npc_sources(Arc::clone(&ticket.scope),selection).map_err(failure)?;
        ticket.candidate=Some(key);Ok(key)
    }
    pub fn step_consolidation_sources(&mut self,ticket:&mut RuntimeConsolidationTicket,key:CandidateKey,answer:Option<(&RuntimeProvider,String)>)->Result<RuntimeNpcPreparationStep,RuntimeError> {
        if ticket.candidate!=Some(key)||!self.session.is_npc_sources(key) {return Err(failure("consolidation source preparation is stale"));}
        let answer=provider_response(answer,&self.budget)?;
        let result=self.session.step(key,answer,crate::experience::HistorySettings {policy_id:&self.history_policy_id,policy_revision:self.history_policy_revision});
        let step=match result {Ok(step)=>step,Err(e)=>{if !self.session.is_npc_sources(key){ticket.candidate=None;}return Err(failure(e));}};
        Ok(match step {SessionStep::Continue=>RuntimeNpcPreparationStep::Continue,SessionStep::Question(question)=>RuntimeNpcPreparationStep::Provider(RuntimeProvider {question}),SessionStep::NpcSources(sources)=>{ticket.candidate=None;ticket.sources=Some(sources);RuntimeNpcPreparationStep::Complete},_=>return Err(failure("consolidation source preparation produced effects"))})
    }
    pub fn cancel_consolidation_sources(&mut self,ticket:&mut RuntimeConsolidationTicket)->Result<(),RuntimeError> {
        if let Some(key)=ticket.candidate.take(){if self.session.is_npc_sources(key){self.session.cancel(key).map_err(failure)?;}}Ok(())
    }
    pub fn consolidation_current(&self,ticket:&RuntimeConsolidationTicket)->Result<bool,RuntimeError> {
        self.require_active()?;
        let state=&self.session.publication_read().map_err(failure)?.state;
        Ok(ticket.scope.still_permitted(state)&&ticket.body.current(state,&ticket.admission).map_err(failure)?)
    }
    pub fn consolidation_publication(&self,ticket:&RuntimeConsolidationTicket)->Result<Option<RuntimeMaintenancePublication>,RuntimeError> {
        self.session.accepted().map_err(failure)?;
        if !self.consolidation_current(ticket)? {return Ok(None);}
        let storage=self.budget.reserve(size_of::<RuntimeMaintenancePublication>()).map_err(failure)?;
        let fence=self.session.fence();let lease=fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeMaintenancePublication {_lease:lease,fence,_storage:storage}))
    }
    pub fn consolidation_interpretation(&self,ticket:&mut RuntimeConsolidationTicket)->Result<RuntimeJson,RuntimeError> {
        self.require_active()?;
        let state=&self.session.accepted().map_err(failure)?.state;
        if !ticket.scope.still_permitted(state)||ticket.sources.is_none(){return Err(failure("consolidation source preparation is unavailable"));}
        if ticket.interpretation.is_none(){ticket.interpretation=Some(Arc::new(MaintenanceInterpretation::capture(state,&ticket.scope.actor_id,&self.budget).map_err(failure)?));}
        RuntimeJson::encode(ticket.interpretation.as_ref().ok_or_else(||failure("interpretation scope unavailable"))?,&self.budget)
    }
    pub fn begin_consolidation(&mut self,owner:&mut Option<RuntimeConsolidationTicket>,input:&[u8])->Result<CandidateKey,RuntimeError> {
        self.require_active()?;
        let _decode=decode_preparation(input,&self.budget)?;
        let input:Groups=serde_json::from_slice(input).map_err(failure)?;
        let ticket=owner.as_ref().ok_or_else(||failure("consolidation was released"))?;
        if ticket.sources.is_none()||ticket.candidate.is_some()||!self.consolidation_current(ticket)? {return Err(failure("consolidation source preparation changed"));}
        let _copy=self.budget.reserve(crate::encoding::json_record_len(&ticket.selection).map_err(failure)?.checked_mul(12).ok_or_else(||failure("capacity"))?).map_err(failure)?;
        let selection=serde_json::from_str(&crate::encoding::json_record(&ticket.selection).map_err(failure)?).map_err(failure)?;
        let storage=self.budget.reserve(input.groups.heap_bytes().and_then(|n|n.checked_add(ticket.job.len())).ok_or_else(||failure("capacity"))?).map_err(failure)?;
        let candidate=self.session.begin_consolidation(crate::cognition::consolidation::ConsolidationInput {job:ticket.job.clone(),body:Arc::clone(&ticket.body),admission:MaintenanceAdmission {purpose:MaintenancePurpose::Maintenance,requires_body:ticket.admission.requires_body,dream_episode:ticket.admission.dream_episode.clone()},scope:Arc::clone(&ticket.scope),selection,groups:input.groups,limits:ticket.limits,storage}).map_err(failure)?;
        *owner=None;Ok(candidate)
    }
}
impl RuntimeConsolidationTicket {
    pub fn candidate_key(&self)->Option<CandidateKey> {self.candidate}
    pub fn packet(&self,budget:&ByteBudget)->Result<RuntimeJson,RuntimeError> {
        let sources=self.sources.as_ref().ok_or_else(||failure("consolidation sources are not prepared"))?;
        let files:&serde_json::value::RawValue=serde_json::from_str(&self.files).map_err(failure)?;
        #[derive(Serialize)]
        #[serde(rename_all="camelCase")]
        struct Packet<'a>{actor_id:&'a str,inner_revision:Option<u64>,files:&'a serde_json::value::RawValue,sources:&'a PreparedNpcSources}
        RuntimeJson::encode(&Packet {actor_id:&self.scope.actor_id,inner_revision:self.workspace.inner_revision,files,sources},budget)
    }
}
