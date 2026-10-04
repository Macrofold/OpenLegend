from pathlib import Path
import os,re,subprocess,json
R=Path.cwd();D=R/'docs/repertoires';BASE='c4e18d91848b5b6d367dda1d7214a9f8222cf070'
def source(name):
 p='docs/repertoires/'+name
 return (Path(os.environ['REPERTOIRE_SOURCE'])/p).read_text() if os.getenv('REPERTOIRE_SOURCE') else subprocess.check_output(['git','show',BASE+':'+p],text=True)
def slug(s):return re.sub(r'[^\w\- ]','',s.lower().replace('`','')).replace(' ','-')
def parts(t):
 a=re.split(r'(?m)^(## .+)$',t);return a[0],[(a[i],a[i+1]) for i in range(1,len(a)-1,2)]
def norm(s):return re.sub(r'\s+',' ',s).strip().replace('’',"'")
def defs(t):return dict(re.findall(r'(?m)^\[([^\]]+)\]:\s*(\S+)',t))
def links(t,ds):
 out=[]
 for m in re.finditer(r'\[([^\]\n]+)\](?:\(([^)\n]+)\)|\[([^\]\n]*)\])?',t):
  title,target,ref=m.groups();target=target or ds.get(ref or title)
  if target:out.append((title,target))
 return out
extra={
 ('mechanics','leave-a-way-back'):'Foresight creates another option, not an automatic rescue.',
 ('mechanics','change-the-problems-topology'):'Previews must not reveal unexplored destinations.',
 ('mechanics','a-useful-refusal'):'There need not be a guaranteed winning persuasion answer.',
 ('mechanics','pressure-becomes-opportunity'):'Adding capacity is not always the answer; a useful by-product need not become a compulsory punishment.',
 ('objects','map-of-unfinished-things'):'Intention is not completed work; the author can revise or abandon the plan.',
 ('objects','surveyors-folding-frame'):'An evocative name alone cannot authorize another use.',
 ('objects','witness-lamp'):'Keep trace provenance, missing coverage, saturation and alteration distinguishable.',
 ('objects','the-honest-empty-box'):'Labels and wish lists are not inventory contents.',
 ('objects','celebration-kit'):'A good evening may simply remain a good evening, without a compulsory emergency afterward.',
 ('objects','festival-cloth'):'It can also serve as an awning, banner, table covering or costume when its properties allow; changing the decoration does not settle ownership or shared meaning.',
 ('objects','companion-vessel'):'A caretaker does not eliminate fuel requirements, cargo capacity or ownership questions.',
 ('materials-resources','materials-with-honest-substitutes'):'Rigid panels are another candidate substitute only when the required properties and supported construction permit them.',
 ('materials-resources','second-season-seed'):'The useful growing window matters alongside soil and expected yield.',
 ('materials-resources','common-water-uncommon-claims'):'Distribution agreements belong in [Economy](economy-logistics.md); institutional authority belongs in [Institutions](institutions-politics.md).',
 ('materials-resources','goodwill-is-not-currency'):'This is not transferable stock or ownership of affection; the particular bond belongs in [Relationships](relationships.md).',
 ('materials-resources','living-sealant'):'Compatible surfaces and cultivation constrain where it can grow.',
 ('needs','somewhere-to-return'):'Actual access, stored possessions and remembered use make this a home rather than a label.',
 ('needs','sensory-refuge'):'Sensory needs also do not determine willingness to participate.',
 ('psychology-behavior','a-belief-with-a-receipt'):'Keep the source, confidence and later corrections with the claim.',
 ('psychology-behavior','the-same-event-two-appraisals'):'Each interpretation must use only evidence that person could possess.',
 ('psychology-behavior','anticipation-can-be-pleasant'):'Preparation remains optional, not a new chore, and never guarantees a friend’s response.',
 ('psychology-behavior','social-feedback-that-compounds'):'Confrontation or departure can also change this fictional model; reconciliation is not guaranteed.',
 ('characters-backstories','an-ordinary-happy-childhood'):'There is no obligatory trauma reveal or deficiency to uncover.',
 ('characters-backstories','the-child-of-a-successful-compromise'):'A new conflict does not prove the earlier success was false.',
 ('characters-backstories','the-former-beneficiary'):'The affected community owes neither instant absolution nor insulation from consequences.',
 ('automation-creators','the-scenario-dial-with-a-promise'):'This includes offscreen changes: adjusting the dial is an explicit transition, not a retroactive reinterpretation of past commitments.',
 ('automation-creators','the-explainable-household-routine'):'Show which ingredients were counted and why the routine stops.',
 ('economy-logistics','money-with-a-local-story'):'Currency does not confer ownership of a person or guarantee acceptance by strangers.',
 ('economy-logistics','the-expensive-cheap-choice'):'Immediate means and intended use can make either choice understandable.',
 ('unusual-realities','a-civilization-in-the-cracks'):'Use discrete scale layers and conserve transfers between them.',
 ('unusual-realities','a-house-that-negotiates-rooms'):'A predatory version must not arrive as a surprise reinterpretation of the cooperative household’s agreement.',
 ('unusual-realities','a-language-that-builds-temporary-paths'):'This wider magical constitution is not automatically part of The Borrowed Dawn’s selected heat law.',
 ('unusual-realities','the-borrowed-afternoon'):'The extra time is not a productivity mandate.',
 ('unusual-realities','the-city-that-walks-one-street-a-year'):'Residents may also plan an ambush around the shift. This is a wider-library premise, not an assumed living-fantasy or planetary capability.',
 ('unusual-realities','the-traveling-festival-economy'):'Settle or explicitly carry obligations when ordinary exchange resumes. This non-supernatural variation can fit all four world families.',
 ('simulation-experiments','a-household-time-study'):'Observe interruptions and whose labor supplies someone else’s convenience.',
 ('simulation-experiments','a-market-with-known-assumptions'):'Conserve balances and disclose the model’s price formation.',
 ('mechanics','rules-as-playable-objects'):'A proposal is not installation or execution.'
}
all_heads={}
for name in sorted(D.glob('*.md')):
 if name.stem in ('README','actions') or '**Canonical catalogue.**' not in name.read_text():continue
 old=source(name.name)
 for h,b in parts(old)[1]:all_heads[(name.stem,slug(h[3:]))]=h
assert set(extra)<=set(all_heads),set(extra)-set(all_heads)
processed=0;applied=set();removed=0
for p in sorted(D.glob('*.md')):
 if p.stem in ('README','actions') or '**Canonical catalogue.**' not in p.read_text():continue
 old=source(p.name);expanded=source('inventory-'+p.name)
 current=p.read_text();orig=dict(parts(old)[1]);new=dict(parts(expanded)[1]);first,sections=parts(current)
 ds=defs(expanded);olddefs=defs(old);domain={};heading=''
 for line in current.splitlines():
  if line.startswith('## '):heading=slug(line[3:])
  if line.startswith('|'):
   c=[v.strip() for v in re.split(r'(?<!\\)\|',line.strip())[1:-1]]
   if c and re.fullmatch(r'[A-Z]{2,5}-?\d{2,3}',c[0]):domain[c[0]]=heading
 result=[]
 for h,b in sections:
  if h not in orig or not re.search(r'^Selection: ',b,re.M):result.append((h,b));continue
  processed+=1;o=orig[h];n=new.get(h,o);key=(p.stem,slug(h[3:]))
  score=re.search(r'\b[1-5] (?:Core|Complete|Depth|Detail|Specialist)\b',b)[0]
  meta=re.search(r'(?m)^\*\*[^\n]+',b)
  if meta and meta[0].startswith('**Priority:'):meta=re.search(r'(?m)^\*\*[^\n]+',o)
  assert meta,(p,h);metadata=meta[0]
  metadata=re.sub(r'\b(?:High|Try|Niche|[1-5] (?:Core|Complete|Depth|Detail|Specialist))\b',score,metadata,count=1)
  metadata=re.sub(r'([123])/(Compose|Extend|New)',lambda m:{'1':'Small','2':'Moderate','3':'Large'}[m[1]]+'/'+m[2],metadata)
  oldparas=[x.strip() for x in re.split(r'\n\s*\n',o.strip()) if x.strip() and not x.startswith(('**','Seeds:','|'))]
  body='\n\n'.join(oldparas)
  if key==('mechanics','leave-a-way-back'):body=body.replace('later rescues someone','may later help someone')
  if key in extra:body+='\n\n'+extra[key];applied.add(key)
  seenlinks={url for title,url in links(metadata+'\n'+body,olddefs)};refs=[]
  for title,url in links(o,olddefs)+links(n,ds):
   if url not in seenlinks:refs.append(f'[{title}]({url})');seenlinks.add(url)
  ids=[]
  for m in re.finditer(r'\b([A-Z]{2,5}-?\d{2,3})(?:[–-](\d{2,3}))?\b',n):
   ident,end=m.groups()
   if ident not in domain:continue
   label=m[0]
   if end:
    prefix=re.match(r'(.+?)(\d+)$',ident);assert prefix[1]+end in domain,(p,label)
   ids.append(f'[{label}](#{domain[ident]})')
  ids=list(dict.fromkeys(ids));gaps=[]
  for g in re.findall(r'(?m)^Gap: ([^\n]+)',n):
   g=re.split(r'(?:Retained inspiration|Inherited anchors|Seeds):',g)[0].strip()
   if norm(g) not in norm(metadata+' '+body):gaps.append(g)
  selection=re.search(r'(?m)^Selection: [^\n]+',b)[0]
  out='\n\n'+metadata+'\n\n'+body
  if gaps:out+='\n\nAdditional build gap: '+' '.join(gaps)
  if ids:out+='\n\nRelated entries: '+', '.join(ids)+'.'
  if refs:out+='\n\nSeeds and references: '+', '.join(refs)+'.'
  out+='\n\n'+selection+'\n\n';removed+=len(b)-len(out);result.append((h,out))
 p.write_text(first+''.join(h+b for h,b in result))
assert processed==270,processed
assert applied==set(extra),set(extra)-applied
Path('/tmp/repertoire-pattern-cleanup.json').write_text(json.dumps({'patterns':processed,'net_characters_removed':removed}))
print('Merged',processed,'worked patterns; retained build scope, references and reviewed newer constraints')
