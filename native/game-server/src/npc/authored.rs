//! A Lab operator can author an NPC occurrence. Only the recipient's actual
//! personal perception can start a response; the speaker has no player grant.
use super::{
    Director,
    slots::{Admission, SlotPriority},
};
use crate::{
    authority::{AccessError, now_ms},
    lab::{
        LabOperator, LabRuntime,
        decisions::stimuli::{self, Kind, Stimulus},
    },
    live_save::AcceptedSaveInput,
    player_events::SpeechReplyStatus,
    store::{AdmittedJob, AuthoredStimulus, ConversationJob, JobRequest, TerminalOutcome},
    world::{ApplicationStart, WorldError},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    experience::PersonalSourceRef,
    host::ByteReservation,
    reception::EventScalar,
    runtime::{AuthoredNpcIntention, NativeWorldSession, RuntimeDirectOutput, RuntimeError},
    worlds::base_observed::SpeechVolume,
};
use std::sync::Arc;
use tokio::{sync::oneshot, time::Instant};

#[derive(PartialEq, Eq)]
struct People {
    speaker: String,
    target: Option<String>,
    focal: Option<String>,
}

fn people(
    session: &NativeWorldSession,
    lab: &LabRuntime,
    op: &LabOperator,
    intent: &Stimulus,
) -> Result<Option<People>, RuntimeError> {
    let resolve = |reference: &str| {
        stimuli::resolve_subject(
            session,
            &lab.references,
            &op.scope.scope,
            reference,
            lab.game.host.budget(),
        )
    };
    let Some(speaker) = resolve(&intent.actor_id)? else {
        return Ok(None);
    };
    let target = match &intent.target_id {
        Some(id) => match resolve(id)? {
            Some(id) => Some(id),
            None => return Ok(None),
        },
        None => None,
    };
    let focal = if let Some(reference) = &intent.focal_actor_id
        && Some(reference) != intent.target_id.as_ref()
    {
        let Some(actor) = resolve(reference)? else {
            return Ok(None);
        };
        Some(actor)
    } else {
        target.clone()
    };
    Ok(Some(People {
        speaker,
        target,
        focal,
    }))
}

struct Publication {
    job: Arc<AdmittedJob>,
    source: Option<(PersonalSourceRef, ByteReservation)>,
    cut: u64,
    save: Arc<AcceptedSaveInput>,
}

impl Director {
    pub(crate) async fn submit_authored(
        self: &Arc<Self>,
        lab: Arc<LabRuntime>,
        op: LabOperator,
        input: Stimulus,
    ) -> Result<Arc<AdmittedJob>, WorldError> {
        let (tx, rx) = oneshot::channel();
        self.start_job(async move {
            let _ = tx.send(stimuli::admit(lab, op, input).await);
        })?;
        rx.await.map_err(|_| AccessError::Availability)?
    }

    pub(crate) async fn accept_authored(
        self: &Arc<Self>,
        lab: Arc<LabRuntime>,
        op: LabOperator,
        input: Stimulus,
    ) -> Result<Arc<AdmittedJob>, WorldError> {
        let scope = &op.scope.scope;
        let identity = json_record(&(
            &scope.world_id,
            &scope.timeline_id,
            &scope.account_id,
            input.request_id,
        ))
        .map_err(RuntimeError::application_refused)?;
        let id = format!("lab-{}", sha256_hex(identity.as_bytes()));
        let fingerprint = sha256_hex(
            json_record(&input)
                .map_err(RuntimeError::application_refused)?
                .as_bytes(),
        );
        if let Some(prior) = self.receipt(&op.scope, &id).await? {
            return if prior.job.fingerprint == fingerprint {
                Ok(prior)
            } else {
                Err(AccessError::Changed.into())
            };
        }
        let input = Arc::new(input);
        let bindings = {
            let (lab, op, input) = (lab.clone(), op.clone(), input.clone());
            self.game
                .world
                .capture(move |session| {
                    Ok(lab.authority.current_recall_operator(&op.scope, true, |_| {
                        people(session, &lab, &op, &input)
                    }))
                })
                .await???
        }
        .ok_or(AccessError::Changed)?;
        let bindings = Arc::new(bindings);
        let slot = if let Some(focal) = &bindings.focal
            && self.interactive_funding(focal).await? == Some(true)
        {
            match self.slots.select(
                focal,
                &id,
                Some(&scope.account_id),
                &scope.timeline_id,
                SlotPriority::Foreground,
            )? {
                Admission::Accepted(slot) => Some(slot),
                _ => return Err(AccessError::Busy.into()),
            }
        } else {
            None
        };
        let has_slot = slot.is_some();
        let _ordinary = lab.saves.enter_ordinary().await;
        lab.saves.check_admission(Instant::now())?;
        let command = format!("{id}:intent");
        let (begin, check, first, intent, begin_id) = (
            lab.clone(),
            op.clone(),
            bindings.clone(),
            input.clone(),
            command.clone(),
        );
        let (staged, owner, accepted, commit_authority, commit_operator) = (
            lab.saves.clone(),
            op.scope.clone(),
            lab.saves.clone(),
            lab.authority.clone(),
            op.clone(),
        );
        let answer = lab.game.clone();
        let result=lab.game.world.execute_and_publish(
            #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_NPC,
            move|session|{
                if !check.present()? {return Err(AccessError::Changed.into())}
                begin.authority.current_recall_operator(&check.scope,true,|_|{
                    if people(session,&begin,&check,&intent)?.as_ref()!=Some(&first){return Err(AccessError::Changed.into())}
                    let kind=match intent.kind{Kind::Say=>AuthoredNpcIntention::Say(intent.volume.unwrap_or(SpeechVolume::Normal)),Kind::Act=>AuthoredNpcIntention::Act};
                    let candidate=session.begin_authored_npc_intention(&first.speaker,&begin_id,&intent.text,first.target.as_deref(),kind)?
                        .map_err(RuntimeError::application_refused)?;
                    Ok(ApplicationStart::Candidate(candidate))
                })?
            },
            move|query|{let answer=answer.clone();async move{answer.answer_operation(query).await}},
            move|output,budget|{
                let RuntimeDirectOutput::Prepared(product)=output else{return Err(RuntimeError::application_refused("Stimulus cannot preview"))};
                let event=product.events().find(|event|event.actor_id.as_ref()==Some(&bindings.speaker) &&
                    ["utteranceId","responseId"].iter().any(|field|matches!(event.data.as_ref().and_then(|data|data.get(*field)),Some(EventScalar::Text(value)) if value==command.as_str())));
                let addressed=event.zip(bindings.focal.as_ref()).and_then(|(e,f)|product.addressed_speech_source(&e.id,f,&bindings.speaker)).is_some();
                let perceived=event.zip(bindings.focal.as_ref()).and_then(|(e,f)|product.perceived_source(&e.id,f,&bindings.speaker));
                let source=perceived.filter(|_|has_slot).map(|s|Ok::<_,RuntimeError>((s.clone(),budget.reserve(128+s.id.len()+s.revision.len())?))).transpose()?;
                let status=if !product.outcome().ok{SpeechReplyStatus::Failed}else if source.is_some(){SpeechReplyStatus::Queued}else{SpeechReplyStatus::Completed};
                let condition=if !product.outcome().ok{"refused"}else if bindings.focal.is_none(){"occurred"}else if perceived.is_none(){"not-perceived"}else if !has_slot{"model-unavailable"}else{"perceived"};
                let now=now_ms();
                let job=AdmittedJob::new(ConversationJob{
                    id:id.clone(),fingerprint:fingerprint.clone(),kind:"lab-stimulus".into(),status,message:condition.into(),authority:Some(owner.scope.clone()),player_speech_event_id:None,retry_of:None,
                    request:JobRequest{composer:Some(AuthoredStimulus{actor_id:bindings.speaker.clone(),target_id:bindings.target.clone(),event_id:event.map(|e|e.id.clone()),addressed,scheduled_response:source.is_some()}),
                        text:input.text.clone(),npc_id:bindings.focal.as_ref().unwrap_or(&bindings.speaker).clone(),volume:(input.kind==Kind::Say).then_some(input.volume.unwrap_or(SpeechVolume::Normal))},
                    created_at:now,completed_at:status.terminal().then_some(now),outcome:status.terminal().then(||TerminalOutcome{stage:"stimulus".into(),condition:condition.into(),dispatched:false,received:false,applied:product.outcome().ok}),
                },budget).map_err(RuntimeError::application_refused)?;
                let save=staged.stage_with_job(&product,None,Some(job.clone()))?;
                Ok(Publication{job,source,cut:product.progress().through_cut,save})
            },
            move|fence,key,_|{
                if !commit_operator.present()? {return Ok(fence.settle(key,false)?);}
                Ok(commit_authority.current_recall_operator(&commit_operator.scope,true,|_|fence.settle(key,true))??)
            },
            move|publication|accepted.accept(&publication.save),
        ).await?.ok_or(AccessError::Changed)?;
        drop(_ordinary);
        if let Some((slot, (reference, custody))) = slot.zip(result.source) {
            let (director, job, cut) = (self.clone(), result.job.clone(), result.cut);
            let permit = Some((self.authority.clone(), op.scope.clone()));
            if self
                .start_job(async move {
                    let _custody = custody;
                    director
                        .run(slot, job, vec![reference], cut, permit, None)
                        .await;
                })
                .is_err()
            {
                self.finish_failed(
                    &result.job,
                    result.cut,
                    crate::decision_dispatch::CallFailure::Cancelled,
                )
                .await?;
                return self
                    .receipt(&op.scope, &result.job.job.id)
                    .await?
                    .ok_or(AccessError::Changed.into());
            }
        }
        Ok(result.job)
    }
}
