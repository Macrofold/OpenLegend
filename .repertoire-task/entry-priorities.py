from pathlib import Path
import re,json
R=Path.cwd();D=R/'docs/repertoires'
S={1:'1 Core',2:'2 Complete',3:'3 Depth',4:'4 Detail',5:'5 Specialist'}
ID=re.compile(r'^[A-Z]{2,5}-?\d{2,3}$')
def cells(l):return [v.strip() for v in re.split(r'(?<!\\)\|',l.strip())[1:-1]]
def rows(t):return {c[0]:c for l in t.splitlines() if l.startswith('|') and (c:=cells(l)) and ID.fullmatch(c[0])}
def slug(t):return re.sub(r'[^\w\- ]','',t.lower().replace('`','')).replace(' ','-')
def section(t,h,new):
 t,n=re.subn(r'(?ms)^'+re.escape(h)+r'\n.*?(?=^## |\Z)',lambda _:new.rstrip()+'\n\n',t);assert n==1,h;return t
before={p:p.read_text() for p in R.rglob('*.md') if '.git' not in p.parts}
changes={
 'DEF-01':(3,1),'DEF-02':(3,2),'KNO-01':(2,1),'KNO-10':(3,2),
 'ACR-191':(2,1),'MEC-010':(3,2),'MEC-144':(3,2),'MEC-167':(3,2),'ACR-267':(3,2),
 'CR-134':(3,2),'CR-206':(3,2),'CB-025':(3,2),'RSH-003':(3,2),'RSH-133':(3,2),
 'AD-125':(3,2),'AD-233':(3,2),'AD-335':(3,2),'AP-062':(3,2),'AP-100':(3,2),
 'LKN101':(3,2),'ECW-094':(3,2),'PB-101':(4,2),'PB-089':(3,2),'PB-285':(3,2),
 'ECON-098':(3,2),'ND-136':(3,2),
 'ACR-042':(1,4),'ACR-217':(1,2),'ACR-247':(1,2),'ACR-258':(1,4),'ACR-121':(1,2),
 'DIP-145':(1,2),'DIP-147':(1,3),'DIP-148':(1,2),
 'LKN001':(1,2),'LKN002':(1,2),'LKN018':(1,2),'LKN023':(1,2),'LKN033':(1,2),'LKN074':(1,2),'LKN129':(1,2)
}
notes={
 'actions':'DEF-01 is Core: a useful actor-proposed mechanism is part of the first OpenLegend experience, not a general physics project. KNO-01 is a Core representative of passing useful knowledge to another person; it does not guarantee learning or loyalty. DEF-02 and KNO-10 are Complete: make a successful technique reusable and test another practical use for a supported object. Known actions remain dependable alternatives, and proposal, admission and use remain distinct.',
 'abilities-progression':'Learning a witnessed rival’s habits (AP-062) and teaching through an inspectable masterpiece (AP-100) are Complete. They turn experience into a new usable method and allow knowledge to travel between people, without a general curriculum, repeated training grind or guaranteed obedience.',
 'adventure-discovery':'The rival with spare rope (AD-125), a rival actually using a won prize (AD-233), and teaching a route to a willing successor (AD-335) are Complete. These join exploration and rewards to independent people and knowledge that remains useful. Keep the practical choice and next encounter small; a regional society is not required.',
 'automation-creators':'The three-object invention challenge (ACR-191) is a Core representative only when the arrangements genuinely admit more than a canned answer and the result is useful. The bounded witnessed rival adaptation (ACR-267) is Complete. Purpose-specific provisioning (ACR-042) and authoring one-shot proxy conditions (ACR-258) are Detail as additional workflow features; accurate resource counts and stopping completed actions remain mandatory whenever used. Selecting multiple loss presets (ACR-121), an input-role board (ACR-217), and a scenery/route inspector (ACR-247) are Complete tools, not requirements to build an editor before a readable game.',
 'characters-backstories':'Nel’s inventor-and-finisher partnership (CB-025) is Complete: collaborating on a useful object can produce both a tangible result and an independently motivated relationship. A starting cast can contain one such person without adopting every biography or a labor-negotiation system.',
 'combat-rescue':'One rival remembering an actually survived mistake (CR-134) and a rescued opponent retaining both gratitude and rivalry (CR-206) are Complete. They make the next encounter personal without an exhaustive personality model. No adaptation may invent observations of the player’s hidden build or erase the losses already suffered.',
 'diplomacy-conflict':'The grain-pass campaign (DIP-145) and a bounded defensive war (DIP-148) are Complete; the fuller raiding season for wealth and captives (DIP-147) is Depth. Their opponents and contested routes can inspire an opening encounter, but a whole campaign is not Core merely because combat is. Custody or war systems are not implicit requirements of an ordinary bandit encounter.',
 'ecology-weather':'An individually recognizable territorial animal remembering an encounter (ECW-094) is Complete. It gives the player a particular creature to understand rather than a global ecosystem to manage; its history must not automatically become every animal’s knowledge.',
 'economy-logistics':'Bounded invention sponsorship (ECON-098) is Complete: a finite trial can yield a useful prototype or information even when it fails. That is a playable risk/reward opportunity, not a prerequisite for dynamic markets, debt administration or a guaranteed miraculous invention.',
 'languages-knowledge':'The surprising experimental control (LKN101) is Complete because evidence can change the player’s next attempt. The particular market speech, courier repetition, naming, signage, gestures and note-provenance examples (LKN001/002/018/023/033/074/129) are Complete alternatives, not mandatory opening language subsystems. Clear names, usable instructions, honest evidence and the ability to stop remain basic requirements.',
 'mechanics':'A new accepted object use (MEC-010), transferable principles (MEC-144) and a useful practice that outlives its inventor (MEC-167) are Complete. They connect invention, learning and independently chosen reuse. A small real instance of useful invention is Core coverage; the full generality of these reusable patterns is not required to prove it.',
 'needs':'A demanding rival who judges work honestly (ND-136) is Complete. Mastery and recognition can motivate an enjoyable contest without becoming another draining meter, compulsory praise routine or survival prerequisite.',
 'psychology-behavior':'Remembering a particular favor (PB-101), valuing an expedition’s shared story (PB-089) and pursuing an unprofitable curiosity (PB-285) are Complete. Small observable choices can make someone worth knowing before a general emotion simulator exists. Do not turn gratitude into an affection-farming formula or force a new errand after every good outcome.',
 'relationships':'Reliable disagreement (RSH-003) and a rival winning with advice you gave them (RSH-133) are Complete. Shared history should change an activity while preserving separate preferences and aims; it need not wait for household administration, global reputation or lifelong social simulation.'
}
seen=set();oldrows={}
for p,t in list(before.items()):
 if p.parent!=D or not rows(t):continue
 oldrows[p]=rows(t);out=[];ls=t.splitlines();i=0
 while i<len(ls):
  if ls[i].startswith('|') and (h:=cells(ls[i])) and h[0]=='ID' and 'Priority' in h:
   pi=h.index('Priority');out+=ls[i:i+2];i+=2;table=[]
   while i<len(ls) and ls[i].startswith('|'):
    c=cells(ls[i]);assert ID.fullmatch(c[0]) and len(c)==len(h),(p,ls[i])
    if c[0] in changes:
     a,b=changes[c[0]];assert c[pi]==S[a],(c[0],c[pi],a);c[pi]=S[b];seen.add(c[0])
    table.append(c);i+=1
   out+=['| '+' | '.join(c)+' |' for c in sorted(table,key=lambda c:(int(c[pi][0]),c[0]))]
  else:out.append(ls[i]);i+=1
 t='\n'.join(out)+'\n'
 t=re.sub(r'Criticality,? Level(?:,? then| and)? (?:stable )?ID','Priority, then stable ID',t)
 t=t.replace('Criticality, then Level F → U → C → D, then stable ID','Priority, then stable ID')
 t=t.replace('Criticality/Level/ID ordering','priority ordering').replace('Criticality and Level','Priority and Level')
 if p.stem in notes:t=t.replace('## Selection guidance\n','## Selection guidance\n\n'+notes[p.stem]+'\n',1)
 t=t.replace('Personal obligations, nuanced memories, detailed institutional consequences, evolving ecology and wider campaign settlements follow the playable baseline.','Richer personal obligations, extensive memory models, detailed institutional consequences, evolving ecology and wider campaign settlements deepen a smaller already-playable version. A specific remembered encounter or independent preference can matter early.')
 t=t.replace('Later social fluency, adaptive practice, specialized teaching and detailed careers remain Depth.','Broader social fluency, generalized adaptive practice, specialized curricula and detailed careers remain Depth; selected practical teaching and witnessed rival study can be Complete.')
 p.write_text(t)
assert seen==set(changes),(set(changes)-seen)

patterns={
 'mechanics.md':{
  'Borrowed purpose':(2,'A useful alternative for a real obstacle makes discovery and invention worth using; keep known methods valid and avoid a universal improvisation roll.'),
  'A useful refusal':(2,'One independent companion can disagree and offer a usable alternative during worthwhile play; broader social simulation is not a prerequisite.')},
 'relationships.md':{
  'The reliable disagreement':(2,'A concrete disagreement and continued useful friendship can make a small cast feel independent without household bureaucracy.'),
  'Rivals who need the same bridge':(2,'A bounded common obstacle makes cooperation or refusal consequential while each side keeps its own goal.')},
 'combat-rescue.md':{'A rival remembers the encounter':(2,'One observed encounter changes a recurring rival’s conduct and preserves its actual outcome; no omniscient build counter or exhaustive biography is needed.')},
 'languages-knowledge.md':{'A library of methods not answers':(2,'Useful learned methods can be shared and adapted to another activity, with explicit prerequisites and no guarantee of another person’s participation.')}
}
for filename,items in patterns.items():
 p=D/filename;t=p.read_text()
 for h,(score,reason) in items.items():
  pat=r'(?ms)^## '+re.escape(h)+r'\n(.*?)(?=^## |\Z)';m=re.search(pat,t);assert m,h;b=m[1]
  b,n=re.subn(r'(?m)^(\*\*(?:Priority: |[^\n]*? · (?:Play|Blend|Lab) · ))[1-5] (?:Core|Complete|Depth|Detail|Specialist)',lambda m:m[1]+S[score],b,count=1);assert n==1,h
  b,n=re.subn(r'(?m)^Selection: .*',lambda _:'Selection: '+reason,b);assert n==1,h
  t=t[:m.start(1)]+b+t[m.end(1):]
 p.write_text(t)

for p,old in oldrows.items():
 now=rows(p.read_text());assert set(old)==set(now)
 pi=3 if p.stem=='actions' else 4
 for k,v in old.items():assert v[:pi]+v[pi+1:]==now[k][:pi]+now[k][pi+1:],(p,k)

Path('/tmp/repertoire-entry-priorities.json').write_text(json.dumps({'changed_entry_priorities':len(seen),'changed_pattern_priorities':sum(map(len,patterns.values()))}))
print('Updated',len(seen),'entry priorities and',sum(map(len,patterns.values())),'pattern priorities')
