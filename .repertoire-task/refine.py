from pathlib import Path
import re, json

ROOT = Path.cwd()
D = ROOT / 'docs/repertoires'
SCORES = {1:'1 Core',2:'2 Complete',3:'3 Depth',4:'4 Detail',5:'5 Specialist'}
ID = re.compile(r'^[A-Z]{2,5}-?\d{2,3}$')
def cells(line): return [v.strip() for v in re.split(r'(?<!\\)\|',line.strip())[1:-1]]
def rows(text): return {c[0]:c for l in text.splitlines() if l.startswith('|') and (c:=cells(l)) and ID.fullmatch(c[0])}
def slug(s): return re.sub(r'[^\w\- ]','',s.lower().replace('`','')).replace(' ','-')
def section(text, heading, replacement):
    pat=r'(?ms)^'+re.escape(heading)+r'\n.*?(?=^## |\Z)'
    text,n=re.subn(pat,lambda _:replacement.rstrip()+'\n\n',text)
    assert n==1,(heading,n)
    return text

def replace(text,old,new):
    assert old in text,old[:120]
    return text.replace(old,new)

before = {p.relative_to(ROOT).as_posix():p.read_text() for p in ROOT.rglob('*.md') if '.git' not in p.parts}
cats={p.stem:rows(p.read_text()) for p in D.glob('*.md') if rows(p.read_text())}
assert len(cats)==28 and sum(len(v) for k,v in cats.items() if k!='actions')==7871
assert len(cats['actions'])==384

p=D/'gameplay-priorities.md'; t=p.read_text()
t=t[:t.index('## What changed, and why')].replace('**Priority decision: October 3, 2026.**','**Priority decision: October 4, 2026.**')+t[t.index('## What changed, and why'):]
t=section(t,'## What changed, and why','''## What changed, and why

**Make a complete, enjoyable OpenLegend experience, not a generic survival game followed someday by its defining features.** The earlier camp-first ordering was wrong to put bedding, sharpening, reservations and work reports before worthwhile adventure. Its correction remains: enemies, usable weapons, readable combat, exploration, rewards, progression, useful crafting and a functional home deserve first-class attention. This revision also corrects deferring *all* useful invention, independent character choice and remembered consequences until after a generic baseline.

A small real instance of the premise belongs in the opening playable loop. Invent a practical alternative, use it against an actual obstacle, let a person with their own aims respond to what they observed, and carry the result into another activity. Broader societies, universal physics, procedural continents and an exhaustive personality model are not prerequisites. Neither an architecture demonstration nor a canned solution presented as live invention fulfills that promise.

Engineering adjacency, small implementation cost, realistic detail and novelty do not establish player value. Conversely, difficulty or unfamiliarity does not demote a necessary experience. Correctness, privacy, cancellation, accounting, current-format persistence and honest execution protect whatever is selected; they do not justify selecting additional optional bureaucracy.

Descriptions and current scores now have one owner: each [canonical catalogue](README.md#catalogue-map). Historical rankings remain in Git history, not competing maintained snapshots or registers. Stable IDs, useful examples, applicability, research and provisional build estimates are retained. This is a proposal-selection policy, not a claim of shipped behavior or verified enjoyment.''')
t=section(t,'## The game we need to be able to play','''## The game we need to be able to play

A player can understand a goal, venture somewhere interesting, face opposition, choose a method, earn something worthwhile, improve their capabilities or home, and find a reason to continue. Fighting, avoiding danger, making, discovering and getting to know someone are legitimate attractions. Basic survival supports them instead of becoming an endless chore sequence. Failure has a clear continuation under the selected world's existing rules; success is allowed to remain success.

An early proof can use a contested crossing or occupied ruin. Provide an understandable known approach and a readable opponent. The player may fight, evade, seek cooperation or propose a genuinely new practical solution within supported invention capabilities. The invention must be admitted, constructed or otherwise realized, and useful in the world—not only named in a story. One resident or rival has their own purpose, can accept or refuse, and responds only to events or information they actually perceived. The player gains gear, access, a learned method or a changed relationship and can use that result again.

**Choice must remain real.** Do not force invention to solve a secret-answer puzzle, guarantee persuasion, make every enemy redeemable, or script a resident's decision merely to hit a demonstration beat. A reliable known method and a deliberately authored world are valid choices; they are not evidence of invention or independent decision-making. One meaningful character and one useful invented object can demonstrate the premise without requiring a crowd or a general simulator.

This example is an evaluation target, not a mandatory quest, new world constitution or delivery checklist for every activity. A peaceful creation, beautiful place, enjoyable performance or valued relationship can be worthwhile without a combat bonus. The survival-adventure still needs actual enemies, weapons, rewards and progression; personality descriptions and simulated camp routines cannot substitute for them.''')
t=t.replace('## Criticality','## Priority').replace('Criticality is an ordinal','Priority is an ordinal')
t=t.replace('A missing capability or representative content needed for a playable, rewarding first loop.','A missing capability or representative content needed for a playable, rewarding first OpenLegend loop.')
t=t.replace('Without an adequate representative of this capability, is a player unable to play, understand, confront a challenge, obtain a reward, improve, or recover?','Does the first loop fail without a representative: usable play, challenge, payoff, recovery, or a real instance of useful invention and independent character consequence?')
t=t.replace('Distinctive systems and meaningful additional expression after the basic game works.','Richer combinations and longer consequences beyond a complete smaller version of the experience.')
t=t.replace('Does this materially change decisions or create memorable situations beyond the complete baseline?','Does this deepen worthwhile play, while a smaller version already delivers its essential promise?')
t=t.replace('The coverage register makes these distinctions explicit','The coverage guide makes these distinctions explicit')
t=t.replace('Keep **Small / Moderate / Large** build scope separate from Criticality.','Keep **Small / Moderate / Large** build scope separate from Priority.')
t=section(t,'## Whole-game build order','''## Whole-game build order

These are connected experience strands, not serial gates or a demand to finish every entry in a category. Build a small complete combination around the desired payoff, reuse what already works, and compare the strongest alternative activity. Serious failures in save integrity, access, readability or reliable execution can outrank more content because they prevent the experience.

| Experience strand | Smallest worthwhile scope | Expansion to keep separate |
| --- | --- | --- |
| Understand, act and continue | Responsive movement, inspection, interaction, usable inventory/equipment, readable results, an inviting purpose, cancellation and a working save/quit/restart path. | New command vocabularies, verbose tutorials and conversation administration. |
| Venture, confront and recover | A worthwhile destination, readable opponents, usable melee and ranged choices, defense or escape, real rewards and clear recovery. | Every weapon, hit-location physics, full ecology, regional war or universal enemy redemption. |
| Invent and use a practical alternative | Propose and realize a non-canned tool or technique within supported families; it changes an obstacle or enables a desired activity, and remains usable afterward. Known methods still work. | Universal physics, arbitrary executable rules, a marketplace or requiring every action to invoke an AI. |
| Meet someone with their own purpose | One resident, companion or rival pursues a concrete aim, can disagree or refuse, observes a relevant result and changes subsequent conduct or opportunity. | Population simulation, generated life histories, omniscient reputation or a new global relationship meter. |
| Earn, learn and make | Useful loot, knowledge or a relationship consequence; a short crafting chain and an attainable improvement used on another challenge. | Grind, universal classes, career administration, per-part repairs or endlessly escalating upkeep. |
| Return to a place worth using | A functional home, storage, useful construction and an improvement or expressive choice worth returning for. | Bedding gates, furniture memories, detailed moisture, civic planning or compulsory chores. |
| Grow the activities that earn another session | More encounter objectives, destinations, gear, inventions, companion/rival situations, services, creative activities and coherent chosen magic. | Expanding every category, procedural scale or detailed simulation without an additional payoff. |
| Explore richer or different worlds deliberately | Longer political/social consequences, complex automation and alternate-world experiments for an explicitly selected experience. | Turning those systems into hidden prerequisites for ordinary play or making every player participate. |

World-specific rules stay world-owned. An inspectable bounded implementation can fulfill an experience; a generated name, effect-free animation or plausible narration cannot. A numerical Tier 1 entry often represents one of several alternatives, not an additional mandatory foundational subsystem.''')
t=t.replace('using the coverage register','using the coverage guide').replace('Within a register, sort by Criticality, then the whole-game workstream, then stable ID; use the stable source heading when an entry has no ID.','Within each domain table, sort by Priority and then stable ID; use the stable heading for cards without IDs. This is predictable navigation, not an implied delivery order among equally useful alternatives.')
t=t.replace('A beautiful isolated mechanic with no enemy, reward, objective or usable player surface does not close a gameplay gap.','A beautiful isolated mechanic without a usable player activity and payoff does not close a gameplay gap. Preserve a selected experience’s promise instead of replacing live invention or independent choices with canned outcomes.')
t=t.replace('These are targets for later implementation and playtesting.','The same proof must include a useful non-canned invention and a character’s independent, observation-grounded response with a consequence the player can encounter again. The player may choose the known route; evaluation must establish the invention route as real without making it compulsory.\n\nThese are targets for later implementation and playtesting.')
p.write_text(t)

expanded=(D/'expanded-inventories.md').read_text()
source_table=expanded[expanded.index('| Group | Source branch'):expanded.index('\nThe older [group 2')]
group_rows=[cells(l) for l in expanded.splitlines() if l.startswith('| [') and len(cells(l))==4 and cells(l)[1].isdigit()]
source_groups={re.search(r'\]\(([^)]+)\)',c[0])[1]:c[2] for c in group_rows}
atlas=D/'source-atlas.md'
atlas.write_text(atlas.read_text()+'''\n## Catalogue source revisions

The 27 expanded catalogues were consolidated from these eight source revisions. Current descriptions and priorities are maintained in the [canonical catalogue map](README.md#catalogue-map); these pins identify research provenance, not alternative current editions. Later source-branch changes require comparison by stable ID and meaning, not automatic replacement. Existing source branches are unchanged.

'''+source_table.replace('Imported revision','Source revision').replace('Research references remain in the inventories','Research references remain in the canonical catalogues')+'\nCategory source groups: '+ '; '.join(f'[{Path(k).stem}]({k}) — {v}' for k,v in source_groups.items())+'.\n')
(D/'expanded-inventories.md').unlink()

p=D/'README.md';t=p.read_text(); tail=t[t.index('## Category ownership and cross-references'):]
map_part=t[t.index('| Create or explore |'):t.index('## Category ownership and cross-references')]
newmap=[]
for line in map_part.splitlines():
    c=cells(line) if line.startswith('|') else []
    if len(c)==3:
        if c[0]=='Create or explore':c.insert(2,'Entries')
        elif c[0].startswith('---'):c.insert(2,'---:')
        else:
            name=Path(re.search(r'\]\(([^)]+)\)',c[1])[1]).stem
            c.insert(2,str(385 if name=='actions' else len(cats[name])))
            c[-1]=c[-1].replace('384 preserved examples across 32 domains; current scores in the action register','Concrete attempts across 32 domains, with current priorities beside each example')
        newmap.append('| '+' | '.join(c)+' |')
    else:newmap.append(line)
t='''# Repertoires for inhabited worlds

**28 canonical catalogues: 7,871 non-action entries and 385 action examples.** Each catalogue contains the full descriptions, stable IDs, current priorities, useful worked patterns, applicability, build gaps and research. There is one maintained version of each idea—not separate source inventories and ranking registers. The 270 worked patterns overlap some entries; these are not additive counts of unique features.

**A complete, enjoyable OpenLegend experience comes first.** Readable combat, exploration, rewards, progression, useful crafting and building belong alongside a small real instance of practical invention, independent characters and persistent consequences. Neither chores nor a technical showcase can substitute for enjoyable play. Start with the [priority policy](gameplay-priorities.md), then [whole-game coverage](coverage.md) and [selection and scale](selection-and-scale.md).

These are proposals, not installed capabilities, approved implementation commitments or fixed world canon. [Architecture](../architecture.md), [maintainer work](../maintainers/README.md) and [verification](../verification.md) own delivered behavior, task status and evidence. No playtest or measured improvement in enjoyment is asserted here.

Use [design foundation](design-foundation.md) for motives, resistance and consequences; [25 worked situations](combinations.md) for connected examples; and the [source atlas](source-atlas.md#catalogue-source-revisions) for research and pinned expansion revisions. The earlier 148-game/28-world foundation corpus is not the whole expanded research set: retained ledgers also include D&D studies and a 29th world dossier. Discovery, mastery, creation, beauty, relationships, ambition, conflict and loss all remain available. [World tone and scope](design-foundation.md#world-tone-and-scope) governs presentation, including mature subjects or a PG audience.

## Catalogue map

Counts identify rows, not separate runtime systems or obligations to ship them. Priorities belong to the described scope; a category’s position here does not outrank every idea in a lower row.

'''+ '\n'.join(newmap).strip()+'\n\n'+tail
t=replace(t,"Existing links to a short category introduction identify the category, not proof that all its inventory rows are present in that introductory file.","Category links now lead to the full catalogue, with worked patterns and entries in one place.")
t=section(t,'## Reading the labels','''## Reading the labels

### Priority

**1 Core / 2 Complete / 3 Depth / 4 Detail / 5 Specialist** are ordinal selection judgments. The [priority policy](gameplay-priorities.md#priority) owns their definitions and whole-game context. Scores are not measurements of fun, effort, realism, moral worth or runtime support. A simple sharpening operation can be Detail; a difficult missing enemy or useful invention capability can be Core. A concrete Core example may be one alternative for a shared requirement, not a separate mandatory feature.

Sort each domain table by **Priority, then stable ID**. Headings organize browsing; they do not prescribe a build order. Revise the entry and any affected worked examples or coverage summaries together. Keep each current assignment beside its description rather than creating another ranking register. Low priority never weakens permissions, cancellation, spending, privacy, participation or save integrity when that feature is enabled.

### Level

Level describes how the stated behavior is realized under available prerequisites, not difficulty, priority, current support, permission or generation level.

| Level | Meaning |
| --- | --- |
| **F** | A supplied reusable grounding, control or agency operation; compatible body, senses, topology and policy are still required. |
| **U** | Ordinary use of an existing world capability or known technique, without inventing it on this invocation. |
| **C** | Composition of supported calls, scoped observations, constraints and activities; missing constituents remain explicit gaps. |
| **D** | A deliberate proposal to define, specialize or change a reusable mechanic or policy through its authorized authoring route; proposal is not admission or execution. |

**C does not mean complex; F does not mean important.** Making a bow from supported constituents can be C; firing it is U; proposing a reusable new rule is D. An absent trusted capability is an engineering gap, not permission for a proposal to manufacture code or authority. See [action classification](actions.md#reading-and-extending-the-catalogue) and [scope examples](gameplay-priorities.md#scope-realization-and-priority-are-different-questions).

### Catalogue tables

Brief archetype context precedes specific ideas. Use this schema for non-action entries; Actions retains its intent-specific fields.

| ID | Idea | Seed worlds | Use | Priority | Level | Specific behavior and payoff | Build scope / gap | Inspiration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Preserve IDs and native headings; never recycle an ID. Link a row by its catalogue/domain heading and name its ID rather than adding HTML row anchors. Give an idea one primary owner, link dependencies, and name what the player can do, what can resist them, and what makes the result valuable. Pleasure can be its own payoff. Research inspiration and proposed seed-world suitability are separate fields. A sentence containing several verbs does not demand a new runtime system for each one.

### Existing pattern labels and build scope

**Play** is a player or creator activity; **Blend** combines play with explicit model exploration; **Lab** is an experimental model, not default gameplay. **Small / Moderate / Large** describe provisional build scope under stated prerequisites, not the priority score. **Compose / Extend / New** indicate use of admitted constituents, a likely bounded extension, or a new trusted capability respectively. Their assumptions must be checked against current implementation before scheduling.

For example, **MD FA · Play · 2 Complete · Moderate/Extend** identifies suitability, activity, current selection and provisional scope independently. The Gap sentence names missing behavior. Ten moderate ideas can still create a large integration burden. No label promises availability, a delivery date, or a fresh engineering estimate. A biography needs supported perception, memory and action for its reactions to occur. A Compose example can still lack a necessary constituent; a narrow maintenance action may be Small without being important.
''')
t=t.replace('[ranked coverage]','[whole-game coverage]').replace('[expanded inventories](expanded-inventories.md), rather than assuming the introductory examples are the full selection','[canonical catalogues](README.md#catalogue-map), with their current priorities beside each description')
t=t.replace('Extend the existing expanded category\'s owned entries','Extend the canonical category\'s owned entries')
p.write_text(t)

p=D/'actions.md'; t=p.read_text(); assert 'CBT-13' not in t
pos=t.index('## VEH:')
t=t[:pos].rstrip()+ '\n| CBT-13 | Strike the nearby opponent with my equipped melee weapon. | ALL | 1 Core | U | melee-action, reach, commitment, damage; equipped weapon, target | Requires actual reach, a compatible weapon and supported timing; naming a hit does not guarantee damage or bypass defense. |\n\n'+t[pos:]
t=t.replace('384 seed examples','385 seed examples')
t=t.replace('The source lacks a plain melee-strike example; that omission does **not** remove basic melee, enemy behavior, damage, loot, player feedback or progression from the Core coverage register.','CBT-13 supplies an ordinary melee-strike example. Its catalogue presence does not establish runtime support, a complete encounter or closed acceptance; use the action tracker and actual player-path evidence.')
p.write_text(t)

for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts or '.repertoire-task' in p.parts:continue
    try:t=p.read_text()
    except (UnicodeError,OSError):continue
    old=t
    t=t.replace('expanded-inventories.md#pinned-source-revisions','source-atlas.md#catalogue-source-revisions')
    t=re.sub(r'expanded-inventories\.md(?:#[a-z0-9-]+)?','README.md#catalogue-map',t)
    t=t.replace('gameplay-priorities.md#criticality','gameplay-priorities.md#priority').replace('README.md#criticality','README.md#priority')
    if p.parent==D and p.stem in cats:
        t=t.replace('Priority, then whole-game workstream, then stable ID','Priority, then stable ID')
        t=t.replace('priority, then the selection policy’s workstream and stable ID','priority, then stable ID')
        t=t.replace('[Criticality]','[Priority]')
        t=re.sub(r'(?m)^(\*\*[^\n]*? · )([123])/(Compose|Extend|New)',lambda m:m[1]+{'1':'Small','2':'Moderate','3':'Large'}[m[2]]+'/'+m[3],t)
    if old!=t:p.write_text(t)

p=ROOT/'README.md';t=p.read_text();t=section(t,'## Gameplay priorities and repertoire library','''## Gameplay priorities and repertoire library

The product priority is a **complete, playable, enjoyable OpenLegend game**: actual enemies, usable weapons, readable combat and recovery, worthwhile exploration, rewards, progression, useful crafting and functional building. A small real instance of practical invention, independent character choice and persistent consequence belongs in that first playable experience—not behind a generic survival-game checklist. Optional maintenance and elaborate simulation must earn their place through play. See [Playable game first](docs/repertoires/gameplay-priorities.md).

The [repertoire library](docs/repertoires/README.md) contains **28 canonical catalogues: 7,871 non-action entries and 385 action examples**, with descriptions and current priorities together. It also retains 270 worked patterns, 25 combined situations and four optional world proposals; those overlapping counts are not additive counts of unique features. Start with the [catalogue map](docs/repertoires/README.md#catalogue-map), [whole-game coverage](docs/repertoires/coverage.md) and [actions](docs/repertoires/actions.md). Research provenance belongs in the [source atlas](docs/repertoires/source-atlas.md#catalogue-source-revisions), not parallel outdated editions.

These are proposals, not implemented-feature claims. [Architecture](docs/architecture.md), [maintainer work](docs/maintainers/README.md) and [verification](docs/verification.md) own actual behavior, delivery status and evidence.''');p.write_text(t)

for cat, oldrows in cats.items():
    current=rows((D/(cat+'.md')).read_text())
    assert set(oldrows)<=set(current),cat
    extra=set(current)-set(oldrows)
    assert extra==({'CBT-13'} if cat=='actions' else set()),(cat,extra)
    priority=3 if cat=='actions' else 4
    for k,v in oldrows.items():
        assert v[:priority]+v[priority+1:]==current[k][:priority]+current[k][priority+1:],('entry meaning changed',cat,k)
changed=[n for n,s in before.items() if not (ROOT/n).exists() or (ROOT/n).read_text()!=s]
Path('/tmp/repertoire-refined.json').write_text(json.dumps(changed,indent=2))
print(json.dumps({'catalogues':len(cats),'non_action_entries':7871,'actions':385,'changed_markdown_paths':len(changed)}))
