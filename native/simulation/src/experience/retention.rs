//! One actor's account-aging preparation is immutable and detached from the
//! writer. Exact source watches belong to the existing application repository;
//! this owner selects bounded records and applies the selected world's effects.
use super::*;
use crate::attention::AttentionRetentionPolicy;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{AccountCharge, TemporalAccounts};
use crate::simulation::{InstalledWorld, SimulationState};
use std::{mem::size_of, sync::Arc};
mod apply;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RetentionPreparation {
    pub rows: usize,
    pub bytes: usize,
    pub metadata_rows: usize,
}
#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AccountCandidate {
    kind: PersonalSourceKind,
    id: String,
    record_id: String,
    position: u64,
    revision: String,
    at: f64,
    bytes: u64,
    class: AccountClass,
    due: Option<f64>,
    rank: u64,
    protected: bool,
}
heap_record!(AccountCandidate { kind, id, record_id, position, revision, at, bytes, class, due, rank, protected });
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AccountMetadataReply {
    pub metadata: Vec<AccountCandidate>,
    pub next_due: Option<f64>,
    pub more: bool,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AccountBodyRow {
    pub kind: PersonalSourceKind,
    pub row: InstalledRow,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AccountBodiesReply {
    pub rows: Vec<AccountBodyRow>,
}
struct Selection {
    candidates: Vec<AccountCandidate>,
    next_due: Option<f64>,
    records: Option<Vec<Arc<PersonalSourceRecord>>>,
    pins: Vec<Arc<crate::host::SharedMemoryPin>>,
    _storage: ByteReservation,
}
pub(crate) struct AccountRetentionRead {
    pub(crate) actor: String,
    world: String,
    generation: String,
    at: f64,
    life: u64,
    epoch: String,
    privacy: u64,
    accounts: TemporalAccounts,
    resident: Vec<AccountCandidate>,
    installed: Arc<InstalledWorld>,
    preparation: RetentionPreparation,
    selection: Option<Selection>,
    _storage: ByteReservation,
}
fn account(accounts: &TemporalAccounts, class: AccountClass) -> Result<&AccountCharge, ExecutionError> {
    Ok(match class {
        AccountClass::Optional => &accounts.optional,
        AccountClass::Required => &accounts.required,
        AccountClass::Speech => &accounts.speech,
        AccountClass::Sensory => return Err(ExecutionError::Invariant),
    })
}
fn account_mut(accounts: &mut TemporalAccounts, class: AccountClass) -> Result<&mut AccountCharge, ExecutionError> {
    Ok(match class {
        AccountClass::Optional => &mut accounts.optional,
        AccountClass::Required => &mut accounts.required,
        AccountClass::Speech => &mut accounts.speech,
        AccountClass::Sensory => return Err(ExecutionError::Invariant),
    })
}
fn limits(policy: &AttentionRetentionPolicy, class: AccountClass, start: bool) -> Result<(f64, f64), ExecutionError> {
    let hard = match class {
        AccountClass::Optional => &policy.optional,
        AccountClass::Required => &policy.required,
        AccountClass::Speech => &policy.speech,
        AccountClass::Sensory => return Err(ExecutionError::Invariant),
    };
    let factor = if class == AccountClass::Required {
        if start { policy.required_pressure_start } else { 1.0-policy.maintenance_headroom }
    } else { 1.0 };
    Ok(((hard.max_bytes as f64 * factor).floor(), (hard.max_records as f64 * factor).floor()))
}
fn pressure(accounts: &TemporalAccounts, policy: &AttentionRetentionPolicy, class: AccountClass, start: bool) -> Result<bool, ExecutionError> {
    let charge = account(accounts, class)?;
    let (bytes, count) = limits(policy, class, start)?;
    Ok(if class == AccountClass::Required && start {
        charge.bytes as f64 >= bytes || charge.count as f64 >= count
    } else {
        charge.bytes as f64 > bytes || charge.count as f64 > count
    })
}
fn hard_pressure(accounts: &TemporalAccounts, policy: &AttentionRetentionPolicy) -> bool {
    [(&accounts.optional,&policy.optional), (&accounts.required,&policy.required), (&accounts.speech,&policy.speech)]
        .iter().any(|(used,hard)| used.bytes>hard.max_bytes || used.count>hard.max_records)
}
fn candidate(record: &PersonalSourceRecord, installed: &InstalledWorld) -> AccountCandidate {
    let header = record.header();
    AccountCandidate {
        kind: header.reference.kind, id: header.reference.id.clone(), record_id: record.row_id().to_owned(),
        position: record.position(), revision: header.reference.revision.clone(), at: header.at,
        bytes: record.payload().len() as u64, class: header.class,
        due: experience_retention_due(header, &installed.attention.value().retention),
        rank: installed.account_law().account_priority(header), protected: header.protected,
    }
}
impl AccountRetentionRead {
    pub(crate) fn capture(state: &SimulationState, actor: &str, preparation: RetentionPreparation, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        if preparation.rows==0 || preparation.bytes==0 || preparation.metadata_rows<preparation.rows { return Err(ExecutionError::Invariant); }
        let history = state.temporal.actor(actor).ok_or(ExperienceError::Unavailable)?;
        let accounts = history.header().accounts.as_ref().ok_or(ExperienceError::Unavailable)?;
        let privacy = state.experience.actor(actor).ok_or(ExperienceError::Unavailable)?.privacy.revision();
        let mut count=0usize;
        let mut bytes=heap_sum([size_of::<Self>(),actor.len(),state.physical.header.id.len(),state.generation.len(),history.header().epoch.len(),accounts.heap_bytes().ok_or(ExecutionError::Capacity)?]).ok_or(ExecutionError::Capacity)?;
        for kind in [PersonalSourceKind::Awareness,PersonalSourceKind::Memory,PersonalSourceKind::Summary] {
            if let Some(records)=state.experience.optional_collection(actor,kind)? {
                for record in records.records().filter(|record| !record.header.sensory) {
                    count=count.checked_add(1).ok_or(ExecutionError::Capacity)?;
                    bytes=heap_sum([bytes,size_of::<AccountCandidate>(),record.header.reference.id.len(),record.row_id().len(),record.header.reference.revision.len()]).ok_or(ExecutionError::Capacity)?;
                }
            }
        }
        if count>preparation.metadata_rows { return Err(ExecutionError::Capacity); }
        let storage=budget.reserve(bytes)?;
        let mut resident=Vec::with_capacity(count);
        for kind in [PersonalSourceKind::Awareness,PersonalSourceKind::Memory,PersonalSourceKind::Summary] {
            if let Some(records)=state.experience.optional_collection(actor,kind)? { resident.extend(records.records().filter(|record| !record.header.sensory).map(|record|candidate(record,&state.installed))); }
        }
        Ok(Self {actor:actor.to_owned(), world:state.physical.header.id.clone(),generation:state.generation.clone(),at:state.physical.header.sim_time,life:history.header().physical_life,epoch:history.header().epoch.clone(),privacy,accounts:accounts.clone(),resident,installed:Arc::clone(&state.installed),preparation,selection:None,_storage:storage})
    }
    pub(crate) fn packet(&self) -> Result<impl Serialize + '_, ExecutionError> {
        #[derive(Serialize)]
        #[serde(rename_all="camelCase")]
        struct Packet<'a> { world_id:&'a str,generation:&'a str,actor_id:&'a str,at:f64,due:bool,pressured:Vec<AccountClass> }
        let due=self.accounts.next_due.is_some_and(|at|at<=self.at);
        let mut pressured=Vec::with_capacity(3);
        for class in [AccountClass::Optional,AccountClass::Required,AccountClass::Speech] {
            if pressure(&self.accounts,&self.installed.attention.value().retention,class,!due)? { pressured.push(class); }
        }
        Ok(Packet {world_id:&self.world,generation:&self.generation,actor_id:&self.actor,at:self.at,due,pressured})
    }
    pub(crate) fn select(&mut self, reply:AccountMetadataReply,budget:&ByteBudget) -> Result<impl Serialize + '_,ExecutionError> {
        if self.selection.is_some() || reply.metadata.len()>self.preparation.metadata_rows || reply.next_due.is_some_and(|at|!at.is_finite()) { return Err(ExecutionError::Invariant); }
        let count=reply.metadata.len().checked_add(self.resident.len()).ok_or(ExecutionError::Capacity)?;
        let mut bytes=heap_sum([size_of::<Selection>(),map_storage::<(PersonalSourceKind,&str),usize>(count).ok_or(ExecutionError::Capacity)?,count.checked_mul(size_of::<AccountCandidate>()).ok_or(ExecutionError::Capacity)?]).ok_or(ExecutionError::Capacity)?;
        for value in reply.metadata.iter().chain(&self.resident) {bytes=heap_sum([bytes,value.heap_bytes().ok_or(ExecutionError::Capacity)?]).ok_or(ExecutionError::Capacity)?;}
        let storage=budget.reserve(bytes)?;
        let mut candidates=IndexMap::with_capacity(count);
        for value in reply.metadata.iter().chain(&self.resident) {
            if value.class==AccountClass::Sensory || !value.at.is_finite() || value.due.is_some_and(|at|!at.is_finite()) {return Err(ExecutionError::Invariant);}
            candidates.insert((value.kind,value.id.as_str()),value.clone());
        }
        let mut ordered:Vec<_>=candidates.into_values().collect();
        ordered.sort_by(|a,b|a.rank.cmp(&b.rank).then_with(||a.at.total_cmp(&b.at)).then_with(||a.kind.cmp(&b.kind)).then_with(||a.id.cmp(&b.id)));
        let policy=&self.installed.attention.value().retention;
        let mut projected=self.accounts.clone();
        let mut selected=Vec::with_capacity(ordered.len().min(self.preparation.rows));
        let mut used=0u64;
        let mut next_due=reply.next_due;
        let mut more=false;
        for value in ordered {
            if value.protected {continue;}
            if pressure(&projected,policy,value.class,false)? || value.due.is_some_and(|at|at<=self.at) {
                if value.bytes>self.preparation.bytes as u64 {return Err(ExecutionError::Capacity);}
                if selected.len()==self.preparation.rows || used.checked_add(value.bytes).ok_or(ExecutionError::Capacity)?>self.preparation.bytes as u64 {more=true;break;}
                used+=value.bytes;
                let charge=account_mut(&mut projected,value.class)?;
                charge.bytes=charge.bytes.checked_sub(value.bytes).ok_or(ExecutionError::Invariant)?;
                charge.count=charge.count.checked_sub(1).ok_or(ExecutionError::Invariant)?;
                selected.push(value);
            } else if let Some(at)=value.due {next_due=Some(next_due.map_or(at,|prior|prior.min(at)));}
        }
        more|=hard_pressure(&projected,policy);
        if reply.more && (self.accounts.next_due.is_some_and(|at|at<=self.at) || [AccountClass::Optional,AccountClass::Required,AccountClass::Speech].into_iter().any(|class| pressure(&projected,policy,class,false).unwrap_or(true))) {more=true;}
        if more {next_due=Some(self.at);}
        self.selection=Some(Selection {candidates:selected,next_due,records:None,pins:Vec::new(),_storage:storage});
        #[derive(Serialize)]
        struct Selected<'a>{ selected:&'a [AccountCandidate] }
        Ok(Selected {selected:&self.selection.as_ref().ok_or(ExecutionError::Invariant)?.candidates})
    }
    pub(crate) fn load(&mut self,reply:AccountBodiesReply,budget:&ByteBudget)->Result<(),ExecutionError> {
        let selection=self.selection.as_mut().ok_or(ExecutionError::Invariant)?;
        if selection.records.is_some() || reply.rows.len()!=selection.candidates.len() {return Err(ExecutionError::Invariant);}
        let _index=budget.reserve(map_storage::<(PersonalSourceKind,&str),AccountBodyRow>(reply.rows.len()).ok_or(ExecutionError::Capacity)?)?;
        let mut rows=IndexMap::with_capacity(reply.rows.len());
        for value in reply.rows {let key=(value.kind,value.row.id.clone());if rows.insert(key,value).is_some(){return Err(ExecutionError::Invariant);}}
        let mut records=Vec::with_capacity(selection.candidates.len());
        let mut pins=Vec::with_capacity(selection.candidates.len());
        for expected in &selection.candidates {
            let body=rows.shift_remove(&(expected.kind,expected.record_id.clone())).ok_or(ExecutionError::Invariant)?;
            let _decode=budget.reserve(encoded_body_bound(&body.row.payload)?)?;
            let record=Arc::new(PersonalSourceRecord::install(expected.kind,&self.actor,body.row,&self.installed.account_law(),budget)?);
            if candidate(&record,&self.installed)!=*expected {return Err(ExecutionError::StaleHydration.into());}
            pins.push(record.capture_pin(budget)?);
            records.push(record);
        }
        selection.records=Some(records);selection.pins=pins;
        Ok(())
    }
}
