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
p=D/'coverage.md';t=p.read_text();combo=D/'combinations.md';ct=combo.read_text()
scenario_rows=[]
for l in t[t.index('## All 25'):t.index('## Optional world families')].splitlines():
 if l.startswith('| ') and len(c:=cells(l))==3 and c[0][:1].isdigit():scenario_rows.append(c)
assert len(scenario_rows)==25
scenario_improvements={
 'The wedding bridge':(2,'A bounded crossing with several practical solutions and one independent collaborator can combine invention, building and a celebration worth reaching; do not require a civic simulator.'),
 'The wolf at the school gate':(2,'A particular threat, observable clues and several remedies join danger to investigation and local consequences; do not require population ecology.'),
 'The champion and the oath':(2,'A readable duel can put a small set of personal loyalties at stake without simulating an entire patronage system.'),
 'The companion who changes sides':(2,'A useful companion’s discoverable conflicting aim makes trust matter in the next activity; no unexplained betrayal or global approval meter.'),
 'The borrowed doorway':(2,'When fantasy is selected, a bounded traversal power plus independent local claims offers a practical alternative with consequences; no universal space rewriting.')}
for score,link,reason in scenario_rows:
 title=re.search(r'\[([^]]+)\]',link)[1]
 if title in scenario_improvements:s,reason=scenario_improvements[title];score=S[s]
 pat=r'(?ms)^## '+re.escape(title)+r'\n(.*?)(?=^## |\Z)';m=re.search(pat,ct);assert m,title;b=m[1]
 b,n=re.subn(r'(?m)^(\*\*[^\n]*? · (?:Play|Blend|Lab) · )(?:High|Try|Niche)',lambda m:m[1]+score,b,count=1);assert n==1,title
 b=b.rstrip()+'\n\nSelection: '+reason+'\n\n'
 ct=ct[:m.start(1)]+b+ct[m.end(1):]
ct=re.sub(r'([123])/(Compose|Extend|New)',lambda m:{'1':'Small','2':'Moderate','3':'Large'}[m[1]]+'/'+m[2],ct);combo.write_text(ct)
t=section(t,'## All 25 worked situations, reranked','''## All 25 worked situations

[Combinations](combinations.md) contains all 25 complete scenes with their current priority and selection boundary beside each description. They combine owned entries; they are not another inventory of required systems. A simpler adaptation can deliver an opening experience without adopting a scene’s entire politics, psychology or physics.

The [toll tower](combinations.md#the-toll-tower-at-dawn), [recognizable quarry](combinations.md#the-quarry-that-learns), [wedding crossing](combinations.md#the-wedding-bridge), [local predator mystery](combinations.md#the-wolf-at-the-school-gate) and [companion allegiance](combinations.md#the-companion-who-changes-sides) offer different combinations of challenge, invention, knowledge and personal consequence. Pick a coherent small experience rather than implementing this list as a quest queue.''')
world_section=t[t.index('## Optional world families'):t.index('## What does not')]
world_rows=[cells(l) for l in world_section.splitlines() if l.startswith('| ') and len(cells(l))==3 and cells(l)[0][:1].isdigit()];assert len(world_rows)==4
for score,link,reason in world_rows:
 target=re.search(r'\]\(([^)]+)\)',link)[1];p=D/target;wt=p.read_text()
 if target.endswith('living-fantasy.md'):score='2 Complete, as a source of bounded magical content'
 pos=wt.index('\n\n');wt=wt[:pos+2]+'**Current-game selection: '+score+'.** '+reason+'\n\n'+wt[pos+2:]
 wt=re.sub(r'(\*\*Estimate:\*\* [^\n]*?), High, ',r'\1, ',wt)
 wt=re.sub(r'([123])/(Compose|Extend|New)',lambda m:{'1':'Small','2':'Moderate','3':'Large'}[m[1]]+'/'+m[2],wt)
 p.write_text(wt)
t=section(t,'## Optional world families','''## Optional world families

The [four world proposals](README.md#four-possible-world-families) each own their current selection note. They are sources of connected examples, not simultaneous release commitments. Draw bounded content from medieval survival or living fantasy when it makes this game better; modern life and planetary science fiction remain separate primary experiences. Selecting a magical tool does not adopt a whole magical constitution.

A future explicit product choice can rerank an alternate family for its own intended experience. Family scores are not universal genre judgments, and a name or biography is not a new runtime-system requirement. The planetary proposal’s no-piloting, no-space-navigation and no-dogfighting boundary remains unchanged.''')
t=t.replace('# Ranked coverage: the game before its embellishments','# Whole-game coverage').replace('[384 actions]','[385 actions]').replace('October 3, 2026','October 4, 2026')
t=t.replace('This register decomposes','This guide decomposes').replace('No scores in this register','No scores in this guide')
t=t.replace('These are interconnected requirements, ordered by the policy\'s workstreams.','These are interconnected capabilities, not a serial delivery queue.')
start=t.index('The action examples include aiming');end=t.index('## 2 Complete',start)
t=t[:start]+'''The [ordinary melee attempt CBT-13](actions.md#cbt-conflict-defense-and-tactical-action) names an existing category of action, not a newly delivered capability. The [action tracker](../maintainers/action-capabilities.md#ac096--equipped-contact-strikes-implemented-acceptance-partial) retains the narrow implemented contact-strike slice and incomplete acceptance. An implemented attack alone does not establish a satisfying encounter, rewards or progression.

**The distinctive part is not postponed:** a small useful non-canned invention, one person’s independent purpose, and a witnessed consequence that matters again belong in this first playable experience. These can use a single obstacle and character; they do not require a general physics or society simulator. The [priority policy’s first proof](gameplay-priorities.md#the-game-we-need-to-be-able-to-play) owns the connected evaluation target.

'''+t[end:]
marker='| 10 | Use and improve a home'
lines=t.splitlines();idx=next(i for i,l in enumerate(lines) if l.startswith(marker))+1
lines[idx:idx]=[
 '| 11 | Invent a practical alternative | Realize a non-canned proposed object or method through supported admission and use it toward a worthwhile goal. Known reliable methods remain available; general rule invention is separate. | [Actions](actions.md#def-deliberate-invention-and-owner-authoring), [Mechanics](mechanics.md), [Creators](automation-creators.md) |',
 '| 12 | Affect someone with their own purpose | One character can choose, disagree or refuse and respond to a witnessed outcome; the player can encounter that consequence again. No population simulation or universal affinity score is required. | [Characters](characters-backstories.md), [Psychology](psychology-behavior.md), [Relationships](relationships.md) |']
t='\n'.join(lines)+'\n'
t=t.replace('This matrix covers every one of the **27 pattern catalogues**. Each cell scores the explicitly scoped element, not an entire catalogue. An em dash means no first-loop requirement is assigned to that category\'s special content. The Actions catalogue is fully scored in [its register](actions.md). Specific ten-card patterns use [their register](README.md#catalogue-map); a broad Core family does not promote its elaborate examples.','This matrix covers all **27 non-action catalogues**. Each cell describes a scope level, not a second assignment for individual entries. An em dash means no first-loop requirement for that category’s special content. Exact entries and worked patterns own their priorities beside their descriptions; [Actions](actions.md) does the same for attempts. The distinction is scope, not "ordinary first, distinctive later."')
t=t.replace('Reliable interaction, costs, outcomes and continuation | Meaningful alternatives, useful failure and retiring solved repetition','Reliable interaction, useful invention, costs, outcomes and continuation | Practical affordance reuse, transferable learning, useful failure and retiring solved repetition')
t=t.replace('Flexible affordance combinations and changing topology','Broader combinations and changing topology')
t=t.replace('Readable bounded opponent responses, without a new general psychology model | Distinct behavior that changes an encounter or makes a companion useful','Independent, grounded choices and one remembered outcome | Particular gratitude, curiosity and distinct behavior that changes a shared activity')
t=t.replace('Enough role clarity to understand friend, opponent and interaction | Useful companionship, recruitment and shared activities','Enough independent purpose and history to make an interaction matter | Useful companionship, reliable disagreement, consequential rivalry, recruitment and shared activities')
t=t.replace('Useful authored roles and immediate motives for the chosen encounter | Distinct companions, rivals, service providers and opponents','An active person with an immediate motive, not a scripted prop | Inventor partnerships, distinct companions, rivals, service providers and opponents')
t=t.replace('More destinations, treasure, mysteries, return trips and encounter objectives | Multi-agenda expeditions, evolving rivals and consequential story branches','More destinations, treasure, mysteries, rival consequences, teaching routes and encounter objectives | Wider multi-agenda expeditions and long campaign branches')
t=t.replace('More enemy/weapon roles, stronger challenges, tactics and rescue objectives | Environmental combinations, nonlethal custody, surrender and adaptive rivals','More enemy/weapon roles, stronger challenges, rescue and a witnessed recurring rival | Broader environmental combinations, nonlethal custody and surrender')
t=t.replace('A playable authored first session; safe native continuation for enabled actions | Useful bounded helpers, fewer repeated chores and clear guidance','A playable authored first session with real invention; safe native continuation | Useful bounded helpers, witnessed rival adaptation, fewer repeated chores and clear guidance')
t=t.replace('Real recipes producing useful tools, gear and consumables | More satisfying crafts, commissions and efficient learned methods | Expressive processes, diagnosis, invention and evolving professions','Real production for known and admitted invented tools, gear and consumables | More satisfying crafts, commissions and efficient learned methods | Richer processes, diagnosis and evolving professions')
p=D/'coverage.md';p.write_text(t)

p=D/'selection-and-scale.md';t=p.read_text()
t=t.replace('**Selection revision — October 3, 2026.** Build a complete, playable, enjoyable survival-adventure before elaborating its simulation.','**Selection revision — October 4, 2026.** Build a complete, playable, enjoyable OpenLegend experience, with a small real instance of useful invention and independent character consequence rather than postpononing all distinctiveness.')
t=t.replace('The [priority policy](gameplay-priorities.md) and its registers replace the former High/Try recommendations and within-domain ordering. Scores below are current product judgments, not a player survey, measured fun ranking, validated forecast, runtime audit or implementation approval. Engineering simplicity and novelty are separate from gameplay value.','The [priority policy](gameplay-priorities.md) owns selection and each canonical catalogue owns its exact entry priorities. The comparisons here explain alternatives and tradeoffs; they are not another ranking register, a player survey, measured enjoyment, a runtime audit or implementation approval. Engineering simplicity and novelty are separate from player value.')
t=t.replace('**Find the highest-priority missing capability first.** These are the same twenty retained candidate experiences, now explicitly scored and ordered for the current game. A proof\'s advanced layers must not become prerequisites for its basic playable portion. Detailed source patterns retain their own scores in [ranked patterns](README.md#catalogue-map); all 25 combined scenarios are scored in [ranked coverage](coverage.md).','**Find the missing worthwhile experience first.** These twenty candidate experiences help compare payoffs and burdens. Read their exact scopes, not their position in this table, as a delivery order. Preserve the selected promise in a small complete proof rather than omitting invention or independent choice. [Catalogue patterns](README.md#catalogue-map) and [combined situations](combinations.md) carry their own current priorities.')
ls=t.splitlines();out=[]
for l in ls:
 c=cells(l) if l.startswith('|') else []
 if len(c)==4 and (c[0]=='Priority' or re.fullmatch(r'\*\*[1-5] \w+\*\*',c[0]) or (c[0].startswith('---') and 'Candidate' in '\n'.join(out[-1:]))):
  out.append('| '+' | '.join(c[1:])+' |')
 else:out.append(l)
t='\n'.join(out)+'\n'
t=t.replace('Repurpose one supported tool in two worthwhile activities. A rack/sieve/load demo alone does not close an absent combat or exploration loop.','Repurpose a supported tool in a worthwhile obstacle or creative activity, or propose and realize a new compatible use; apply what was learned elsewhere. Preserve real admission and effects rather than accepting any narrated solution.')
t=t.replace('A companion declines one consequential activity and offers an alternative they can perform. First supply worthwhile activities and useful companionship.','A companion declines a consequential activity for a discoverable reason and may offer an alternative they can actually perform. This can make the first shared adventure distinctive without a full social simulator.')
p.write_text(t)
Path('/tmp/repertoire-scene-priorities.json').write_text(json.dumps({'scenario_priorities':len(scenario_rows),'world_priorities':len(world_rows)}))
print('Reconciled',len(scenario_rows),'situations and',len(world_rows),'world proposals')
