import { useEffect, useRef, useState } from 'react';
import type { GameView, PlayerActionAttempt } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

/** Explicit player intentions; dialogue remains a separate, non-executing surface. */
export function ActionAttempts({view,connected}:{view:GameView;connected:boolean}) {
  const [text,setText]=useState('');
  const [targetId,setTargetId]=useState('');
  const [mode,setMode]=useState<'enqueue'|'replace'>('enqueue');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [attempts,setAttempts]=useState<PlayerActionAttempt[]>([]);
  const [requestId,setRequestId]=useState<string|null>(null);
  const alive=useRef(true);
  const generation=useRef(view.saveTimeline);
  const submission=useRef<{id:string;body:string}|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    generation.current=view.saveTimeline;
    setRequestId(null);setAttempts([]);submission.current=null;
    const key=`open-legend:action-draft:${view.worldId}:${view.saveTimeline}`;
    try {setText(sessionStorage.getItem(key)??'');} catch {setText('');}
  },[view.worldId,view.saveTimeline]);
  useEffect(()=>{
    try {sessionStorage.setItem(`open-legend:action-draft:${view.worldId}:${view.saveTimeline}`,text);} catch { /* Optional browser storage. */ }
  },[text,view.worldId,view.saveTimeline]);
  useEffect(()=>{
    if(!connected)return;
    let stopped=false;
    const refresh=async()=>{
      try {
        const result=await post<{ok:boolean;attempts:PlayerActionAttempt[];job?:{status:string;message:string;result?:{fulfillment?:unknown}}}>('/api/action-attempts',{requestId});
        if(stopped||!result.ok)return;
        setAttempts(result.attempts);
        if(result.job)setMessage(result.job.message);
      } catch { /* Keep current display during transient disconnection. */ }
    };
    void refresh();const timer=setInterval(()=>void refresh(),2000);
    return()=>{stopped=true;clearInterval(timer);};
  },[connected,requestId,view.saveTimeline]);
  const send=async()=>{
    const timeline=view.saveTimeline;
    const body=JSON.stringify({text:text.trim(),targetId:targetId||undefined,mode});
    if(!submission.current||submission.current.body!==body)submission.current={id:crypto.randomUUID(),body};
    setBusy(true);
    try {
      const result=await post('/api/action-attempt',{requestId:submission.current.id,...JSON.parse(body)});
      if(!alive.current||generation.current!==timeline)return;
      setMessage(result.message??'Action submitted.');
      if(result.ok){setRequestId(submission.current.id);submission.current=null;}
    } catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Action request failed.');}
    finally {if(alive.current)setBusy(false);}
  };
  const decide=async(attemptId:string,accept:boolean)=>{
    setBusy(true);const timeline=view.saveTimeline;
    try {
      const result=await post('/api/command',{commandId:crypto.randomUUID(),commandEpoch:view.commandEpoch,command:{type:accept?'confirm-attempt':'withdraw-attempt',attemptId}});
      if(!alive.current||generation.current!==timeline)return;
      setMessage(result.message??'Decision submitted.');
      if(result.ok)setAttempts(current=>current.filter(a=>a.id!==attemptId));
    } catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Decision failed.');}
    finally{if(alive.current)setBusy(false);}
  };
  return <Section title="Take an action">
    <p className="ol-caption">Describe your character's action, not dialogue. Coordinates use X,Z; inference may use your configured allowance.</p>
    <textarea aria-label="Action intention" maxLength={500} value={text} placeholder="Follow Ada, or go to x=12, z=14" onChange={e=>setText(e.target.value)} />
    <label>Target reference <select value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Resolve from text</option>{view.entities.filter(e=>e.id!==view.player.id).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
    <label>Current work <select value={mode} onChange={e=>setMode(e.target.value as 'enqueue'|'replace')}><option value="enqueue">Queue after current work</option><option value="replace">Replace current work</option></select></label>
    <Button disabled={busy||!connected||view.clock.paused||!text.trim()} onPress={()=>void send()}>Attempt action</Button>
    {message&&<p role="status">{message}</p>}
    {attempts.map(attempt=><div className="ol-proposal" key={attempt.id}>
      <p>{attempt.description}</p>
      {attempt.fulfillment?<><strong>Accept this revised action?</strong><p>{attempt.fulfillment.executableDescription}</p><p>Not fulfilled: {attempt.fulfillment.omitted.map(o=>`${o.requirement} (${o.reason})`).join('; ')||'No omitted clause; interpretation requires your decision.'}</p><p className="ol-caption">{attempt.fulfillment.reason}</p><Button disabled={busy||!connected||view.clock.paused} onPress={()=>void decide(attempt.id,true)}>Accept revised action</Button></>:<p className="ol-caption">No executable binding yet. Revise the request or withdraw it.</p>}
      <Button variant="quiet" disabled={busy||!connected||view.clock.paused} onPress={()=>void decide(attempt.id,false)}>Decline / withdraw</Button>
    </div>)}
  </Section>;
}
