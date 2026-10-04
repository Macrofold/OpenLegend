from pathlib import Path
import re,json
R=Path.cwd();D=R/'docs/repertoires'
def paragraph(path,needle,new):
 p=R/path;t=p.read_text();hits=[l for l in t.splitlines() if needle in l];assert len(hits)==1,(path,needle,len(hits));p.write_text(t.replace(hits[0],new))
paragraph('docs/repertoires/gameplay-priorities.md','**Priority decision:', '**Priority decision: October 4, 2026.** This document owns selection policy for the current OpenLegend survival-adventure. The [28 canonical catalogues](README.md#catalogue-map) contain descriptions and current entry priorities; [whole-game coverage](coverage.md) connects them into playable activities. These proposals do not establish runtime support or adopt an optional world’s lore. Existing specifications own correctness and maintainer trackers own delivery.')
paragraph('docs/repertoires/design-foundation.md','**Proposal foundation,', '**Proposal foundation, September 27, 2026; selection reconciled October 4, 2026.** This document owns the repertoire’s coverage of human motives, playable systems and world dynamics. It guides the complete canonical catalogues and four world proposals; engine implementation remains separate. The [priority policy](gameplay-priorities.md) owns current selection, the [README](README.md#reading-the-labels) owns classification and table conventions, and the [research atlas](source-atlas.md#research-basis-for-the-foundation-revision) records evidence and its limits.')
paragraph('docs/repertoires/diplomacy-conflict.md','A controlled pass (DIP-034)', 'A controlled pass (DIP-034) and raiders with a defined demand (DIP-113) are Core representatives: a playable opponent, place and result, not a complete political economy or detailed treaty machinery. The broader campaigns in DIP-145/147/148 retain their Complete or Depth assignments above. The same faction can choose another method when its actual interests support it; that does not require a hidden sympathetic explanation for every enemy.')
paragraph('docs/repertoires/mechanics.md','**Integration handoff:**','**Integration status:** all 282 mechanics entries and the related Group 1 catalogues are incorporated in the [canonical library](README.md#catalogue-map), with source revisions in the [atlas](source-atlas.md#catalogue-source-revisions). Domain owners still supply behavior named in Build scope / gap; no missing dependency is claimed implemented. For research interpretation, Spore’s detailed Q&A qualifies its broader dialogue claim, later Factorio/Terraria/Lethal Company corrections qualify earlier studies, and the [current development policy](../../AGENTS.md#development-save-policy) takes precedence over historical Worlds Adrift save commentary.')
paragraph('docs/repertoires/objects.md','Integration owner:', 'Integration of the catalogue, retained patterns, shared counts and D&D/29th-world provenance is complete in the [library](README.md#catalogue-map) and [source atlas](source-atlas.md#catalogue-source-revisions). Earlier dated reading notes remain provenance, not outstanding integration work. The missing behaviors named in Build scope still belong to their domain owners; this consolidation closes no implementation acceptance.')
paragraph('docs/repertoires/bodies-species.md','**Integration-owner handoff:**', '**Integration status:** 259 bodies, 244 ecologies and 252 places, plus their 30 worked patterns, are included in the [canonical library](README.md#catalogue-map). Coordinate the named cross-category dependencies when selecting implementation work; catalogue inclusion is not an approved engine contract.')
paragraph('docs/repertoires/combat-rescue.md','**Integration owner:**', '**Integration status:** the combat catalogue and [Adventure](adventure-discovery.md) are incorporated with stable IDs and current priorities. Items and ammunition, body-specific care, spells, device principles, learned techniques and institutional agreements keep their existing owners; missing dependencies remain explicit in Build scope rather than assigned invented IDs. CR-240 requires an authorized current-world rule transition; fictional victory never grants platform authority. Historical Worlds Adrift save commentary does not override the [current development policy](../../AGENTS.md#development-save-policy).')
paragraph('docs/repertoires/adventure-discovery.md','**Integration owner:**', '**Integration status:** all 336 adventure premises and 288 combat/rescue entries are incorporated with their IDs, native headings and current priorities; see the [catalogue map](README.md#catalogue-map) and [source revisions](source-atlas.md#catalogue-source-revisions). Item, body, spell, device, institution, learning and creation dependencies remain with their linked owners. No implementation acceptance is closed. Historical research does not override the [current development save policy](../../AGENTS.md#development-save-policy).')
paragraph('docs/repertoires/group-6-reading-progress.md','The integration owner should update', 'The four catalogue totals above, 29-world/D&D source provenance and full-SRD references are incorporated in the [catalogue map](README.md#catalogue-map) and [source atlas](source-atlas.md#catalogue-source-revisions). The dated reading record remains evidence of that research scope, not a new runtime check. Existing global acceptance gates remain open where not otherwise satisfied.')
paragraph('docs/repertoires/group-7-research-progress.md','**Integration owner:**', '**Integration status:** all 300 entries in each Group 7 catalogue are incorporated with source provenance in the [atlas](source-atlas.md#catalogue-source-revisions). Objects still owns enchanted possessions; Materials and Work own substances and production; Bodies and Combat own bodily and tactical consequences. These and other named dependencies require their own implementation owners; the research integration does not close their delivery work.')
paragraph('docs/repertoires/ecology-weather.md','Shared catalogue counts and the documentation changelog', 'Integration dependencies remain in Bodies, Materials, Work, Architecture, Technology, Magic, Combat and Adventure as identified above. The [canonical library](README.md#catalogue-map) now includes these entries and shared counts. No proposed environmental rule becomes an accepted engine contract by catalogue inclusion.')
for name in ['design-foundation.md','unusual-realities.md']:
 p=D/name;t=p.read_text().replace('Criticality orders candidates','Priority orders candidates').replace('Criticality is relative to the selected experience.','Priority follows the current-game selection policy; a different chosen experience can warrant an explicit rerank.');p.write_text(t)
p=D/'actions.md';t=p.read_text().replace('criticality: 3 # Enriching','priority: 4 # Detail; this specific pot-as-bell example, not all communication');p.write_text(t)
p=D/'coverage.md';t=p.read_text();start=t.index('| Order |');end=t.index('\n\n',start)
ls=t[start:end].splitlines();cs=[[v.strip() for v in l.strip().split('|')[1:-1]] for l in ls]
head=cs[:2];rs=cs[2:];assert len(rs)==12
order=[0,1,2,10,11,3,4,5,6,7,8,9]
t=t[:start]+'\n'.join('| '+' | '.join(c[1:])+' |' for c in head+[rs[i] for i in order])+t[end:];p.write_text(t)
p=D/'selection-and-scale.md';t=p.read_text().replace('Read their exact scopes, not their position in this table, as a delivery order.','Compare their exact scopes; table position is not a delivery order.').replace('postpononing','postponing');p.write_text(t)
pin='https://github.com/Macrofold/OpenLegend/blob/7e8c27ab3d933642302cf08076dae2a9ced05437/'
paths=['archive/02-research/game-inspiration/dossiers/dungeons-and-dragons-2024.md','archive/02-research/game-inspiration/dossiers/dungeons-and-dragons-3-5.md','archive/02-research/game-inspiration/games/dungeons-and-dragons.md','archive/02-research/game-inspiration/mechanics/dungeons-and-dragons-adjudication.md','archive/02-research/game-inspiration/mechanics/dungeons-and-dragons-srd-systems.md','archive/02-research/worldbuilding/dungeons-and-dragons-planes-and-lived-magic.md','archive/02-research/worldbuilding/worlds/29-dungeons-and-dragons.md']
for p in D.rglob('*.md'):
 t=p.read_text()
 for path in paths:t=t.replace('../../'+path,pin+path)
 t=t.replace('coverage register','coverage guide')
 domain={};heading=''
 for line in t.splitlines():
  if re.match(r'^#{2,6} ',line):heading=re.sub(r'[^\w\- ]','',re.sub(r'^#+ ','',line).lower().replace('`','')).replace(' ','-')
  m=re.match(r'^\| ([A-Z]{2,5}-?\d{2,3}) \|',line)
  if m:domain[m[1]]=heading
 ls=t.splitlines()
 for i,l in enumerate(ls):
  if l.startswith('Related entries:'):
   ls[i]=re.sub(r'\[([A-Z]{2,5}-?\d{2,3})([–-]\d{2,3})?\]\(#[^)]+\)',lambda m:'['+m[1]+(m[2] or '')+'](#'+domain[m[1]]+')',l)
 p.write_text('\n'.join(ls)+'\n')
p=R/'docs/maintainers/needs-design.md';t=p.read_text();needle='Prioritize useful, complete player activities and the smallest scope faithful to the game.';assert needle in t
t=t.replace(needle,needle+' The [canonical repertoire policy](../repertoires/gameplay-priorities.md) keeps practical invention and independent, observation-grounded character consequences inside the first playable experience, alongside readable opposition, exploration and worthwhile rewards. The [28 catalogues](../repertoires/README.md#catalogue-map) are ranked options, not additional mandatory projects; this review does not reorder the accepted design groups or close their acceptance.');p.write_text(t)
p=R/'docs/documentation-changelog.md';t=p.read_text();entry='''## 2026-10-04 — One canonical repertoire library and a playable OpenLegend loop

Consolidated all 27 non-action catalogues and Actions so descriptions, stable IDs and current priorities have one owner. Preserved all 7,871 non-action entries and the 384 existing action IDs; added the missing ordinary melee-strike example CBT-13, for 385 actions. The 270 worked patterns retain useful prose, build-scope notes, current scores and source connections; all 25 combined situations and four world proposals now own their selection notes inline. Removed duplicate catalogue editions and their separate score registers, reconciled incoming references, and retained expansion provenance in the [source atlas](repertoires/source-atlas.md#catalogue-source-revisions).

The [selection policy](repertoires/gameplay-priorities.md) retains the October 3 rejection of chore-first development, but supersedes any reading that all practical invention, independent characters and remembered consequences must wait behind a generic survival-game baseline. A small real instance belongs in the first enjoyable adventure: a useful non-canned alternative, someone with their own purpose, and an observed result that matters again. Combat, exploration, rewards, progression, crafting and functional building remain essential. Universal physics, crowds and elaborate administration remain separate from those small complete experiences.

Reviewed all catalogue assignments, making 41 targeted entry-priority corrections and aligning affected patterns, situations and coverage. Examples include practical invention, transferable methods, recurring rivals and particular gratitude; broader campaigns and optional provisioning/authoring workflows no longer masquerade as opening-game prerequisites. The [catalogue map](repertoires/README.md#catalogue-map) is the navigation owner. [DG01–DG03](maintainers/needs-design.md#ordered-design-groups), [character-experience work](maintainers/character-experience.md) and [action delivery](maintainers/action-capabilities.md) retain their existing plans and acceptance.

This is proposal and documentation work, not new game behavior, proven enjoyment, a changed world constitution or closed runtime qualification. Historical research observations retain their dates and evidence limits; their retired integration instructions no longer compete with current library ownership.

'''
assert '## 2026-10-04 — One canonical repertoire library' not in t
p.write_text(t.replace('# Documentation changelog\n\n','# Documentation changelog\n\n'+entry,1))
patterns=0
for p in D.glob('*.md'):
 t=p.read_text()
 if '**Canonical catalogue.**' not in t or p.name=='actions.md':continue
 t,n=re.subn(r'(?m)^Selection: [^\n]+\n\n?','',t);patterns+=n
 t=re.sub(r'(?m)^(\*\*[^\n]*? · (?:Play|Blend|Lab)) · [1-5] (?:Core|Complete|Depth|Detail|Specialist)(?= · )',r'\1',t)
 t=t.replace('These are proposals, not delivered features.','Entry rows own individual priorities; worked examples provide context without a second ranking. These are proposals, not delivered features.',1)
 p.write_text(t)
assert patterns==270,patterns
p=D/'unusual-realities.md';t=p.read_text()
for h in ['The city that walks one street a year','A language that builds temporary paths']:
 pattern=r'(?ms)(^## '+re.escape(h)+r'\n\n\*\*)[^\n]+?( · Play · )'
 t,n=re.subn(pattern,r'\1—\2',t);assert n==1,h
p.write_text(t)
for name in ['README.md','coverage.md','selection-and-scale.md']:
 p=D/name;t=p.read_text()
 t=t.replace('Exact entries and worked patterns own their priorities beside their descriptions','Exact entry rows own their priorities beside their descriptions; worked patterns provide context, not duplicate assignments')
 t=t.replace('[Catalogue patterns](README.md#catalogue-map) and [combined situations](combinations.md) carry their own current priorities.','[Catalogue entries](README.md#catalogue-map) and [combined situations](combinations.md) carry current priorities; the worked examples add context without a second ranking.')
 t=t.replace('**MD FA · Play · 2 Complete · Moderate/Extend** identifies suitability, activity, current selection and provisional scope independently.','**MD FA · Play · Moderate/Extend** identifies a worked example’s suitability, activity and provisional scope. Current individual-entry priorities appear only in the entry rows.')
 p.write_text(t)
p=R/'docs/documentation-changelog.md';t=p.read_text().replace('The 270 worked patterns retain useful prose, build-scope notes, current scores and source connections;','The 270 worked patterns retain useful prose, build-scope notes and source connections without a duplicate, sometimes contradictory scoring layer;');p.write_text(t)
print('Finished ownership and reference cleanup; removed',patterns,'duplicate worked-example priority assignments')
