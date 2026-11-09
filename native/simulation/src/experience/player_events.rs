//! Current player history is selected from that actor's acquired accounts.
//! Objective occurrences supply only the finite metadata consumed by the
//! existing formatter, after the actor's evidence has passed its actual fence.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::host::retained_size::{map_storage, tree_node_bound};
use crate::received::{ReceivedEntry, ReceivedEntryKind, ReceivedOrigin, ReceivedValueFragment, TemporalReceipt, materialize_received_receipt};
use crate::reception::{EventScalar, OwnedObservation, ReceivedValueLookup, SensoryFacet};
use crate::simulation::SimulationState;
use serde::ser::{SerializeSeq, SerializeStruct, Serializer};
use std::mem::size_of;

enum Evidence<'a> {
    Awareness(&'a PersonalSourceRecord),
    Temporal { receipt: TemporalReceipt, members: Vec<usize>, values: &'a Option<crate::received::ReceivedValues>, _guard: ByteReservation },
    Current { original: OwnedObservation, members: Vec<usize>, _guard: ByteReservation },
}
struct Account<'a> {
    original: &'a crate::events::WorldEvent,
    evidence: Evidence<'a>,
}
struct Original<'a>(&'a crate::events::WorldEvent);
impl Serialize for Original<'_> {
    fn serialize<S:Serializer>(&self, s:S)->Result<S::Ok,S::Error>{
        #[derive(Serialize)]struct Response<'a>{#[serde(rename="responseId")] id:&'a crate::text::JsText}
        let event=self.0;
        let mut value=s.serialize_struct("OriginalMetadata",7)?;
        value.serialize_field("id",&event.id)?;
        value.serialize_field("sequence",&event.sequence)?;
        value.serialize_field("at",&event.at)?;
        value.serialize_field("order",&event.order)?;
        value.serialize_field("type",&event.event_type)?;
        value.serialize_field("scope",&event.scope)?;
        if let Some(EventScalar::Text(id))=event.data.as_ref().and_then(|data|data.get("responseId")) {
            value.serialize_field("data",&Response{id})?;
        }
        value.end()
    }
}
struct Values<'a,'b>(&'a Evidence<'b>);
impl Serialize for Values<'_,'_>{
    fn serialize<S:Serializer>(&self,s:S)->Result<S::Ok,S::Error>{
        let mut values=s.serialize_seq(None)?;
        match self.0 {
            Evidence::Temporal{receipt,members,values:pool,..}=>for &index in members {
                let field=&receipt.facets[index];
                let pool_values=pool.as_ref();
                let Some(ReceivedValueFragment::Sensory(value))=pool_values.value_at(&field.value_ref) else{return Err(serde::ser::Error::custom("Selected event value became unavailable."));};
                values.serialize_element(value)?;
            },
            Evidence::Current{original,members,..}=>for &index in members {values.serialize_element(&original.observation().facets[index].value)?;},
            Evidence::Awareness(_)=>return Err(serde::ser::Error::custom("Awareness has its own encoded source.")),
        }
        values.end()
    }
}
impl Serialize for Account<'_>{
    fn serialize<S:Serializer>(&self,s:S)->Result<S::Ok,S::Error>{
        let mut value=s.serialize_struct("PermittedPlayerEvent",2)?;
        value.serialize_field("original",&Original(self.original))?;
        match &self.evidence {
            Evidence::Awareness(source)=>value.serialize_field("awarenessPayload",source.payload())?,
            evidence=>value.serialize_field("values",&Values(evidence))?,
        }
        value.end()
    }
}
fn capacity()->ExperienceError{ExperienceError::Capacity}
fn occurrence_id(entry:&ReceivedEntry)->Option<&str>{
    if entry.kind!=ReceivedEntryKind::Occurrence{return None;}
    match &entry.receipt.origin {Some(ReceivedOrigin::Occurrence{event_id,..})=>Some(event_id),_=>None}
}
fn temporal<'a>(state:&'a SimulationState,actor:&str,batch:&crate::received::ReceivedBatch,entry:&ReceivedEntry,budget:&ByteBudget)->Result<Option<Evidence<'a>>,ExperienceError>{
    let guard=budget.reserve(super::history::receipt_bound(batch,entry).ok_or_else(capacity)?).map_err(|_|capacity())?;
    let receipt=materialize_received_receipt(batch,entry,None).map_err(|_|ExperienceError::Unavailable)?;
    let mut members=Vec::new();
    members.try_reserve_exact(receipt.facets.len()).map_err(|_|capacity())?;
    let pool=&state.reception.received_values;
    let values=pool.as_ref();
    let mut event=false;
    for (index,field) in receipt.facets.iter().enumerate(){
        let Some(fragment)=values.value_at(&field.value_ref) else{return Err(ExperienceError::Unavailable);};
        if !matches!(fragment,ReceivedValueFragment::Sensory(SensoryFacet::Event{..}|SensoryFacet::Sound{..})){continue;}
        if !super::evidence::temporal_facet_eligible(&state.experience,actor,field,fragment,&state.installed.account_law())?{continue;}
        event|=matches!(fragment,ReceivedValueFragment::Sensory(SensoryFacet::Event{..}));
        members.push(index);
    }
    Ok(event.then_some(Evidence::Temporal{receipt,members,values:pool,_guard:guard}))
}

pub(crate) fn write_player_events(state:&SimulationState,actor_id:&str,window:usize,budget:&ByteBudget)->Result<(String,ByteReservation),ExperienceError>{
    let actor=state.physical.entities.get(actor_id).ok_or(ExperienceError::ForeignOwner)?;
    if !state.occurrences.complete_hot(){return Err(ExperienceError::Unavailable);}
    let awareness=state.experience.optional_collection(actor_id,PersonalSourceKind::Awareness)?;
    let privacy=state.experience.actor(actor_id).map(|actor|&actor.privacy);
    let maximum=window.checked_mul(2).ok_or_else(capacity)?;
    let hot_count=state.occurrences.hot().len();
    let mut reservations=Vec::new();
    let skeleton=maximum.checked_mul(tree_node_bound::<&str,Account>().ok_or_else(capacity)?)
        .and_then(|bytes|bytes.checked_add(map_storage::<&str,()>(maximum)?))
        .and_then(|bytes|bytes.checked_add(hot_count.checked_mul(tree_node_bound::<&str,&crate::events::WorldEvent>()?)?))
        .and_then(|bytes|bytes.checked_add(maximum.checked_mul(size_of::<ByteReservation>())?))
        .ok_or_else(capacity)?;
    let _skeleton=budget.reserve(skeleton).map_err(|_|capacity())?;
    let mut hot=BTreeMap::new();
    for value in state.occurrences.hot(){hot.insert(value.event().event().id.as_str(),value.event().event());}
    let mut wanted=IndexSet::new();wanted.try_reserve(maximum).map_err(|_|capacity())?;
    wanted.extend(state.occurrences.hot().skip(hot_count.saturating_sub(window)).map(|value|value.event().event().id.as_str()));
    if let Some(awareness)=awareness {
        let count=awareness.records().len();
        wanted.extend(awareness.records().skip(count.saturating_sub(window)).filter_map(|source|source.header().event_id.as_deref()));
    }
    let mut selected=BTreeMap::new();
    if let Some(awareness)=awareness {for source in awareness.records(){
        let Some(id)=source.header().event_id.as_deref() else{return Err(ExperienceError::InvalidBody("player awareness event"));};
        if wanted.contains(id)&&!privacy.is_some_and(|privacy|privacy.forgotten_index.contains(id)) {
            if let Some(original)=hot.get(id){selected.insert(id,Account{original,evidence:Evidence::Awareness(source)});}
        }
    }}
    if let Some(history)=state.temporal.actor(actor_id){
        // Pending logical pages are later than their durable physical predecessor.
        for page in history.pending_pages().iter().rev(){for id in &wanted {
            if selected.contains_key(id)||privacy.is_some_and(|privacy|privacy.forgotten_index.contains(*id)){continue;}
            let Some(original)=hot.get(id) else{continue;};
            for entry in &page.batch().entries {if occurrence_id(entry)==Some(*id){if let Some(evidence)=temporal(state,actor_id,page.batch(),entry,budget)?{selected.insert(*id,Account{original,evidence});break;}}}
        }}
        for page in history.pages().rev(){for id in &wanted {
            if selected.contains_key(id)||privacy.is_some_and(|privacy|privacy.forgotten_index.contains(*id)){continue;}
            let Some(original)=hot.get(id) else{continue;};
            'found:for batch in page.batches(){for entry in &batch.entries {if occurrence_id(entry)==Some(*id){if let Some(evidence)=temporal(state,actor_id,batch,entry,budget)?{selected.insert(*id,Account{original,evidence});break 'found;}}}}
        }}
    }
    let originals=state.reception.capture_current_received_originals(actor,budget).map_err(|_|ExperienceError::Unavailable)?;
    for (index,source) in originals.originals().enumerate(){
        let crate::reception::ObservationOrigin::Occurrence{event_id,..}=&source.origin else{continue;};
        let id=event_id.as_str();
        if !wanted.contains(id)||selected.contains_key(id)||privacy.is_some_and(|privacy|privacy.forgotten_index.contains(id)){continue;}
        let Some(original)=hot.get(id) else{continue;};
        let observation=originals.materialize(index,budget).map_err(|_|ExperienceError::Unavailable)?;
        let value=observation.observation();
        let bytes=value.facets.len().checked_mul(size_of::<usize>()).and_then(|n|n.checked_add(value.id.len().checked_mul(6)?)).and_then(|n|n.checked_add(128)).ok_or_else(capacity)?;
        let guard=budget.reserve(bytes).map_err(|_|capacity())?;
        let mut members=Vec::new();members.try_reserve_exact(value.facets.len()).map_err(|_|capacity())?;
        let mut event=false;
        for (index,facet) in value.facets.iter().enumerate(){
            if matches!(facet.value,SensoryFacet::Event{..}|SensoryFacet::Sound{..})&&value.observer.actor_id==actor_id&&super::evidence::member_unrevoked(privacy,&value.id,facet.ordinal){
                event|=matches!(facet.value,SensoryFacet::Event{..});members.push(index);
            }
        }
        if event {selected.insert(id,Account{original,evidence:Evidence::Current{original:observation,members,_guard:guard}});}
    }
    #[derive(Serialize)]#[serde(rename_all="camelCase")]
    struct Product<'a,'b>{world_id:&'a str,generation:&'a str,accepted_cut:u64,actor_id:&'a str,physical_life:Option<u64>,at:f64,privacy_revision:u64,accounts:Vec<Account<'b>>}
    reservations.try_reserve_exact(1).map_err(|_|capacity())?;
    reservations.push(budget.reserve(selected.len().checked_mul(size_of::<Account>()).ok_or_else(capacity)?).map_err(|_|capacity())?);
    let product=Product{world_id:&state.physical.header.id,generation:&state.generation,accepted_cut:state.accepted_cut,actor_id,physical_life:actor.actor.as_ref().and_then(|actor|actor.physical_life),at:state.physical.header.sim_time,privacy_revision:privacy.map_or(0,ActorPrivacy::revision),accounts:selected.into_values().collect()};
    let length=crate::encoding::json_record_len(&product).map_err(|_|ExperienceError::Unavailable)?;
    let mut output=budget.reserve(length.checked_mul(2).ok_or_else(capacity)?.max(8)).map_err(|_|capacity())?;
    let json=crate::encoding::json_record(&product).map_err(|_|ExperienceError::Unavailable)?;
    output.resize(json.capacity()).map_err(|_|capacity())?;
    Ok((json,output))
}
