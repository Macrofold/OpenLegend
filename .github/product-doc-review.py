"""Temporary, source-guarded documentation preparation. Never writes a ref or commit."""
from pathlib import Path
from collections import Counter
import difflib, hashlib, html, json, os, re, subprocess, unicodedata, urllib.parse, urllib.request, zipfile
BASE = '8005f7c7245cfecec128652efe3ef07926604e0a'
SOURCE = 'ad7374df33b536453188dc9461d9afeb4b323c3d'
REPO = 'Macrofold/OpenLegend'
assert os.environ['GITHUB_REPOSITORY'] == REPO
assert os.environ['GITHUB_REF'] == 'refs/heads/docs/product-scalability'
subprocess.run(['git', 'diff', '--exit-code', SOURCE, 'HEAD', '--', 'docs', 'archive', 'AGENTS.md', '.agents'], check=True)
def git(*args):
    return subprocess.check_output(['git', *args])
def blob(b):
    return hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()
original = {}
operations = []
def replace(path, old, new):
    p = Path(path)
    original.setdefault(path, p.read_bytes())
    s = p.read_text()
    assert s.count(old) == 1, (path, old[:100], s.count(old))
    p.write_text(s.replace(old, new, 1))
    operations.append({'path': path, 'old': old, 'new': new})
def append(path, text):
    p = Path(path)
    s = p.read_text()
    tail = s[-min(len(s), 200):]
    replace(path, tail, tail.rstrip() + '\n\n' + text.rstrip() + '\n')
for p in sorted(Path('docs/product-scalability').glob('*.md')):
    assert '## Maintained records' not in p.read_text()
    append(str(p), '''## Maintained records

- Implementation: [PS01–PS08 delivery tracker](../maintainers/product-scalability.md).
- Limits and constraints: [Product-scalability inventory](../limits/product-scalability.md).
- Related design: [Feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md).
- Unresolved product choices: [Central decision register](../../archive/05-project/open-decisions.md#product-scalability-integration-choices).
''')
p = 'docs/product-scalability/participation-and-protection.md'
replace(p, '| Monotonic real time | Interface reading time, connection deadlines, computational budgets, reservations, and operational scheduling |', '| Real time | Local elapsed timers use a monotonic clock; saved deadlines, reservations, and human event schedules need durable timestamps and explicit restart handling |')
replace(p, 'Death is not necessarily followed by respawn. Worlds choose revival, recovery, reincarnation, permanent death, or another supported aftermath. Returning after a lethal encounter must respect that rule rather than replaying the fight or restoring the pre-logout state.', 'Death is not necessarily followed by respawn in every authored world. Worlds choose revival, recovery, reincarnation, permanent death, or another supported aftermath. The [bundled world](../worlds/base/lifecycle-and-protection.md#human-conflict-and-recovery) retains its accepted recoverable human death and default possession preservation; this suite does not replace that policy with permanent death. Returning after a lethal encounter must respect the selected world rule rather than replaying the fight or restoring the pre-logout state.')
p = 'docs/projects/product-scalability-feature-spec.md'
replace(p, 'A documentation approval is not implementation evidence or authorization.', 'This documentation task is not implementation evidence or a request to change gameplay. A later explicit instruction to implement follows the [root task-authorization policy](../../AGENTS.md#task-scope-and-authorization).')
p = 'docs/openlegend-limits-decisions.md'
replace(p, '## Original audit entries', 'Product-scalability targets: [PS-L01–PS-L18](limits/product-scalability.md) record proposed operating constraints and unselected values; [PS01–PS08](maintainers/product-scalability.md) track delivery. The [central decision register](../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns unresolved product choices. Existing runtime inventories above remain controlling until the relevant target is implemented.\n\n## Original audit entries')
p = 'archive/05-project/open-decisions.md'
replace(p, '| D22 / open | Sector density and cross-border behavior | Bounded rooms and visible travel gates | Seamless boundaries; larger shared towns | Before P6; R06/R12 |', '| D22 / residual choice | Sector density and cross-border behavior | [Federated persistent communities and protected domains](../../docs/product-scalability/worlds-and-belonging.md) are the accepted product direction; computational boundaries do not define fictional identity | Exact travel, compatible powers, interaction envelopes and congestion handling remain open; seamless geography is secondary rather than required | Before the affected regional/federation release; R06/R12, PS05–PS07; [coordination choices](#product-scalability-integration-choices) |')
append(p, '''## Product scalability integration choices

Accepted direction lives in the [product-scalability suite](../../docs/product-scalability/README.md); [PS01–PS08](../../docs/maintainers/product-scalability.md) own delivery, not this register. These are residual product choices, not a reopening of federation, protected domains, truthful coarse progression, or local forecast campaigns. Numerical and behavioral limit entries remain in [PS-L01–PS-L18](../../docs/limits/product-scalability.md).

- **PS-D01 — Protection and bounded encounter exit.** Before PS05, select supported background-harm categories, eligible encounters, standing human defenses, reconnect treatment, and a finite ending policy that prevents both logout immunity and indefinite retention by attackers. D03/D07/D15 and the [bundled lifecycle](../../docs/worlds/base/lifecycle-and-protection.md) remain controlling for existing behavior; inactive protection and recoverable human death are not repealed.
- **PS-D02 — Aggregate evidence and scene agency.** Before PS04, choose supported sensory/scene families, prospective focus rules, exact-language exceptions, and permitted joint versus independent decisions. D14/D53/D57 and existing memory/hearing guarantees retain their owners; no current evidence is discarded by this proposal.
- **PS-D03 — Separate clock assignments.** Before enabling the PS05 calendar option, assign needs, aging, work, memory maintenance, appointments and campaign commitments to explicit clocks, including durable real-time scheduling and restart behavior. D03 and the current simulation-time contract are not silently reinterpreted.
- **PS-D04 — Federation and property compatibility.** Before PS07, define entry/build/damage/campaign rights, imports, time/economy compatibility, and safe arrival under congestion. D22/D61's existing engineering qualification remains open; belonging does not promise unlimited local concurrency or automatic protection of all buildings.
- **PS-D05 — Campaign participation.** Before PS06/PS07 event release, select forecast notice/revision commitments, community/time-zone coverage, resident/reconnect access and contribution recognition. Player prevention must still change the campaign; a unique body or final death is not duplicated to meet attendance promises.
- **PS-D06 — Quiet-world funding and continued service.** Before offering sustained unattended progression, choose funded activity allowances and explicit behavior when funding or capacity runs out. D04/D17/D35 remain the economic owners; no price, retention deadline, deletion authority or departure from accepted membership directions is selected here.

World-policy owners choose fictional risk and world rules; the product owner resolves shared participation promises; engineering selects measured operating values within those contracts. Review triggers are linked from [RP03, RP05 and RP06](../../docs/maintainers/revisitable-policies.md). No unresolved choice grants permission to weaken human privacy, acknowledged outcomes, real accounting, or the protected development-save policy.
''')
p = 'docs/maintainers/revisitable-policies.md'
replace(p, '## RP04 — Exact recall and reusable derived artifacts', 'The accepted [product-scalability direction](../product-scalability/README.md) adds a review trigger before prospective crowd grouping or activity-dependent admission is enabled (PS04/PS06). Treat that as an explicit new world policy, not permission to discard already-acquired evidence; [PS-D02/PS-D04](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) retain the material choices.\n\n## RP04 — Exact recall and reusable derived artifacts')
replace(p, '## Limits inventory and concrete work', "Before implementing [dangerous-logout continuation](../product-scalability/participation-and-protection.md), revisit the current exit grace and distinguish encounter continuation from protected post-exit absence. [PS-D01](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns the remaining fairness/ending choices; PS05 does not change today's grace or control rules merely by being documented.\n\n## Limits inventory and concrete work")
replace(p, '## Maintaining this register', 'The proposed [independent calendar](../product-scalability/participation-and-protection.md#8-calendar-time-is-not-necessarily-mechanical-time) is another explicit review trigger. Assign affected mechanics, needs, memories and shared deadlines before enabling it; current speed conversion and sensing fidelity remain unchanged. [PS-D03](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns the residual clock choices.\n\n## Maintaining this register')
p = 'docs/worlds/base/lifecycle-and-protection.md'
replace(p, '## Human logout and return', '''## Product-scalability integration target

The accepted [product direction](../../product-scalability/participation-and-protection.md) extends the design of the bounded pre-exit interaction phase: a supported already-engaged conflict can continue coarsely, with permitted-evidence warnings and an honest return to its actual aftermath. It must not become either instant logout immunity or indefinite retention by repeated attackers. This is unimplemented integration work in [PS05](../../maintainers/product-scalability.md), coordinated with BW13 and MP04; [PS-D01](../../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns remaining episode and fairness decisions. The existing exit/protection contract below remains controlling until that work is delivered.

Recoverable human death, default possession preservation, cooperative play and explicit PvP participation remain the bundled-world direction. Other authored worlds may choose different supported aftermaths. Specified background-harm protection must also cover the state inherited on detailed arrival; it does not automatically protect every NPC or building. The target for protected personal/guild domains needs explicit access and damage rules before it changes the current property policy below.

## Human logout and return''')
p = 'docs/hearing-and-speech.md'
replace(p, '## 12. Deliberate extension boundaries', '''## Product-scalability attention target

[Attention and scenes](product-scalability/attention-and-scenes.md) adds proposed acoustic competition, stable focus and aggregate commotion through this hearing owner. [PS04](maintainers/product-scalability.md) and [PS-D02](../archive/05-project/open-decisions.md#product-scalability-integration-choices) own integration and residual choices. Physical overlap needs utterance durations or an explicitly authored alternate rule; caption reading time is not sound duration. Current instantaneous speech, thresholds and listener-specific fragments remain unchanged until the new policy is delivered.

Grouping changes what is distinguishable prospectively, not what a listener already understood. Preserve existing exact speech and permitted fragments; later focus cannot recover unheard words. A coarse background scene may establish gist without an exhaustive ambient transcript, but exact-language mechanics must retain their actual words and source/audience evidence. This does not authorize replacing accepted human messages or foreground NPC utterances with generic chatter.

## 12. Deliberate extension boundaries''')
p = 'docs/events-perception-and-reactions.md'
append(p, '''## Product-scalability attention target

The [attention and scene direction](product-scalability/attention-and-scenes.md) proposes observer-permitted group evidence and stable focus before expensive individual cognition. [PS04](maintainers/product-scalability.md) integrates that future sensory policy through this existing event/intake owner; [PS-D02](../archive/05-project/open-decisions.md#product-scalability-integration-choices) retains the unresolved choices. It does not replace currently required individual evidence or add a second reaction queue.

Keep a perceived group distinct from its physical members, their private goals and their independent minds. Grouped commotion can become new evidence without exposing a hidden roster. Individual contact, damage, understood speech and other required sources remain authoritative under the active policy. Corrections, forgetting and changed permissions must invalidate any dependent aggregate text; changing focus cannot grant retrospective awareness. A future explicitly changed perception rule is not a load-shedding shortcut for today's already-acquired evidence.

## Maintained records

- Implementation: [Events and reactions](maintainers/events-perception-and-reactions.md); cross-feature target integration in [PS04](maintainers/product-scalability.md).
- Limits and constraints: [Native work](limits/native-work.md) and [cognition](limits/cognition.md) own their existing shared mechanisms; proposed product choices are in [PS-L02/PS-L06/PS-L07](limits/product-scalability.md).
- Related design: [Memory](memory-architecture.md) and [hearing](hearing-and-speech.md) retain attention/recall and acoustic ownership.
''')
p = 'docs/limits/product-scalability.md'
replace(p, '## PS-L01 — Local concurrency', '''## Status and restrictiveness

All new execution policies in this inventory are **Proposed**, not current runtime limits; their accepted product direction is distinguished in the linked specifications. Existing shared inventories remain controlling. Unselected numerical values are not claims of unlimited capacity. Ratings below apply to the proposed behavioral restriction, not to an unmeasured numerical allowance or a security certification.

**Medium:** PS-L01, PS-L02, PS-L03, PS-L04, PS-L07, PS-L10, PS-L11, PS-L15 and PS-L16. These permit meaningful activity but deliberately constrain admission, attention, initiative, approximation, exact ambient detail, quality tiers, clock compatibility or campaign participation; actual generosity remains workload-dependent.

**Safe:** PS-L05, PS-L06, PS-L08, PS-L09, PS-L12 and PS-L17. These favor ready arrivals, bounded scene/control scope, supported protective outcomes, explicit grants and conservative overload handling; they may exclude otherwise valid activity until it is supported.

**Not a new tunable limit:** PS-L13 selects no funding/retention amount; PS-L14 adopts no new rollback window; PS-L18 records the evidence boundary rather than a capacity restriction. Their independent existing storage, spending and durability controls still apply. Correct identity, privacy, accounting and truthful evidence are guardrails, not candidates to relax under these ratings.

Material unresolved product choices are owned by [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices); this inventory owns restrictions, reasons and eventual values, not a competing decision register. The canonical topic linked through the suite index defines behavior at each boundary; the **Restriction** and **Select/revisit** fields below retain the initial disposition and evidence needed before enablement.

## Maintained records

- Implementation: [PS01–PS08](../maintainers/product-scalability.md).
- Behavior: [Product-scalability suite](../product-scalability/README.md).
- Tracking rules: [Limits tracking](README.md).

## PS-L01 — Local concurrency''')
p = 'docs/maintainers/product-scalability.md'
replace(p, 'The [limits register](../limits/product-scalability.md) owns all unset values and reasons.', 'The [central decision register](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns material unresolved product choices; the [limits register](../limits/product-scalability.md) owns unset operating values, restrictions and reasons.')
replace(p, '- [ ] Integrate substantive target extensions into existing relevant docs, update navigation and decision history, and complete changed-document/link review.', '- [x] Integrate substantive target extensions into existing relevant docs, update navigation and decision history, and complete changed-document/link review.')
append(p, '''## Documentation completion evidence

PS01 is documentation-only completion. Review covered all newly authored topics and both project files, the branch's complete documentation delta from `8005f7c7245cfecec128652efe3ef07926604e0a`, and the relevant unchanged consumer contracts. The original changelog was restored using its exact stored blob in commit `3254190ebe5cd4c178ac2925ee6fc255160f3c56`; the final update adds only the product-scalability entry while preserving all earlier historical text byte for byte.

Final checks require exact-source patch guards, preservation of all previous requirements except the explicitly superseded D22 topology proposal, valid newly introduced relative links/anchors, pinned Prettier 3.6.2 on changed Markdown, unchanged runtime/configuration/agent instructions, and PS02–PS08 remaining unchecked. Temporary checking helpers are removed from the final tree. Check output belongs in the task's CI evidence and handoff, not committed raw reports. Repository-wide CI results are reported separately; no runtime, live-model or population qualification follows from PS01.
''')
p = 'docs/documentation-changelog.md'
assert blob(Path(p).read_bytes()) == '9e49aa6f228f43796c3ae3e20dbcaf7d7deeecdd'
entry = '''## 2026-10-02 — Product scalability, persistent lives and local shared campaigns

Added the [product-scalability suite](product-scalability/README.md), paired [feature specification](projects/product-scalability-feature-spec.md) and [technical design](projects/product-scalability-tech-design.md), [PS01–PS08 tracker](maintainers/product-scalability.md) and [policy inventory](limits/product-scalability.md). The accepted direction combines federated persistent communities and protected personal/guild spaces, interruptible continuing activities, lower optional background initiative, prospective aggregate attention, truthful scene memories and activity-dependent capacity. Distributed finite sources of villain power and forecast city-by-city conflicts let communities contribute near home without copied victories or forced invasions after player prevention.

Specified background-harm protection covers the state inherited on detailed arrival. Already-engaged conflicts can have bounded logout continuation with perspective-safe warnings; post-exit protection and the bundled world's recoverable human death are not silently replaced. Important characters may eventually use higher evaluated baseline model quality, and calendar pacing may be separated from mechanical progression. Chapters, compulsory migration, exact offscreen counterfactuals and generic rollback are not the default; [secondary alternatives](product-scalability/alternatives.md) retain their rationale and reconsideration triggers.

Integrated target pointers into memory, time, encounter, hearing, perception and lifecycle owners, central navigation, [open decisions](../archive/05-project/open-decisions.md#product-scalability-integration-choices) and relevant [review triggers](maintainers/revisitable-policies.md). Existing current behavior, qualified capacities, semantic owners and development-save policy remain unchanged. PS01 records completed documentation checks; PS02–PS08 remain proposed and unqualified. This branch changes documentation only, with no gameplay implementation, paid-model work or million-player capacity claim.

'''
replace(p, '# Documentation changelog\n\n', '# Documentation changelog\n\n' + entry)
for path, tracker in [('docs/simulation-time.md', 'maintainers/simulation-time.md'), ('docs/encounter-scaling.md', 'maintainers/performance.md')]:
    assert '## Maintained records' not in Path(path).read_text()
    append(path, f'''## Maintained records

- Implementation: [Existing subsystem work]({tracker}); future product integration in [PS01–PS08](maintainers/product-scalability.md).
- Limits and constraints: [Native-work inventory](limits/native-work.md); proposed product choices in [PS-L01–PS-L18](limits/product-scalability.md).
- Related design: [Product-scalability suite](product-scalability/README.md) retains strategic scope without replacing current execution.
''')
# Formatting is an explicitly reviewed mechanical transformation, not a prose rewrite.
changed = sorted(set(x for x in git('diff', '--name-only', BASE).decode().splitlines() if x.endswith('.md')))
assert len(changed) == 23, changed
assert all(p.startswith(('docs/', 'archive/05-project/')) for p in changed)
preformat = {p: Path(p).read_bytes() for p in changed}
subprocess.run(['pnpm', 'exec', 'prettier', '--write', *changed], check=True)
subprocess.run(['pnpm', 'exec', 'prettier', '--check', *changed], check=True)
def meaning(s):
    s = re.sub(r'^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$', '', s, flags=re.M)
    return re.sub(r'\s+', '', s)
for p in changed:
    assert meaning(Path(p).read_text()) == meaning(preformat[p].decode()), ('formatter changed non-whitespace content', p)
# The old changelog is protected byte-for-byte, even from formatting churn.
changelog = Path('docs/documentation-changelog.md').read_bytes()
assert changelog.replace(entry.encode(), b'', 1) == git('show', BASE + ':docs/documentation-changelog.md')
# No production source, policy instructions or permanent workflow is changed by the proposal.
helpers = {'.github/workflows/product-doc-review.yml', '.github/product-doc-review.py'}
all_delta = set(git('diff', '--name-only', BASE).decode().splitlines())
assert all_delta == set(changed) | helpers, all_delta - set(changed) - helpers
for p in Path('docs/product-scalability').glob('*.md'):
    assert p.read_text().count('## Maintained records') == 1
tracker = Path('docs/maintainers/product-scalability.md').read_text()
assert tracker.count('- [x]') == 2
assert '- [x]' not in tracker.split('## PS02', 1)[1]
assert len(re.findall(r'^### PS-UX\d+', Path('docs/projects/product-scalability-feature-spec.md').read_text(), re.M)) == 16
assert len(re.findall(r'^### PS-P\d+', Path('docs/product-scalability/README.md').read_text(), re.M)) == 16
assert len(re.findall(r'^## PS-L\d+', Path('docs/limits/product-scalability.md').read_text(), re.M)) == 18
# Check every local link from new documents and every newly introduced target from existing files.
def unfenced(s):
    return re.sub(r'^(```|~~~).*?^\1[^\n]*$', '', s, flags=re.M | re.S)
def links(s):
    return Counter(re.findall(r'\[[^\]\n]+\]\(([^\s)]+)(?:\s+[^)]*)?\)', unfenced(s)))
def anchors(s):
    s = unfenced(s)
    result = set(re.findall(r'<a\s+(?:id|name)=[\"\']([^\"\']+)', s))
    counts = Counter()
    for h in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', s, flags=re.M):
        h = re.sub(r'<[^>]+>', '', html.unescape(h.lower()))
        h = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', h)
        slug = ''.join(c for c in h if c in ' -_' or unicodedata.category(c)[0] in 'LN').replace(' ', '-')
        n = counts[slug]
        counts[slug] += 1
        result.add(slug + (f'-{n}' if n else ''))
    return result
failures, inherited, checked = [], [], 0
for p in changed:
    previous = subprocess.run(['git', 'show', BASE + ':' + p], capture_output=True)
    old_links = links(previous.stdout.decode()) if previous.returncode == 0 else Counter()
    current_links = links(Path(p).read_text())
    for target, count in current_links.items():
        if re.match(r'^(?:[a-z]+:|//)', target):
            continue
        u = urllib.parse.urlsplit(target.strip('<>'))
        dest = (Path(p).parent / urllib.parse.unquote(u.path)).resolve() if u.path else Path(p).resolve()
        error = None
        if not dest.exists():
            error = 'missing path'
        elif u.fragment and dest.is_file() and dest.suffix == '.md' and urllib.parse.unquote(u.fragment) not in anchors(dest.read_text()):
            error = 'missing anchor'
        new_count = max(0, count - old_links[target])
        checked += new_count
        if error:
            (failures if new_count else inherited).append({'source': p, 'target': target, 'error': error})
report = {'source_commit': git('rev-parse', 'HEAD').decode().strip(), 'base': BASE, 'changed_markdown_files': len(changed), 'new_local_link_occurrences_checked': checked, 'introduced_link_errors': failures, 'inherited_link_errors': inherited, 'changelog_history_exact': True, 'formatting': 'Prettier 3.6.2 passed; non-whitespace content preserved', 'runtime_tasks_unchecked': True, 'helper_paths_to_remove': sorted(helpers)}
# Store review material even when a check fails; do not upload objects after failed validation.
with zipfile.ZipFile('/tmp/product-documentation-final-review.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('report.json', json.dumps(report, indent=2))
    z.writestr('operations.json', json.dumps(operations, ensure_ascii=False, indent=2))
    z.writestr('complete.diff', git('diff', BASE, '--', *changed))
    for p in changed:
        z.write(p, 'candidate/' + p)
        old = subprocess.run(['git', 'show', BASE + ':' + p], capture_output=True)
        if old.returncode == 0:
            z.writestr('base/' + p, old.stdout)
print(json.dumps(report, indent=2))
assert not failures, failures
# Only immutable file objects are uploaded. The connector publishes the final tree/commit/ref after review.
manifest = []
for p in changed:
    data = Path(p).read_bytes()
    expected = blob(data)
    old = subprocess.run(['git', 'rev-parse', 'HEAD:' + p], text=True, capture_output=True)
    if old.returncode == 0 and old.stdout.strip() == expected:
        sha = expected
    else:
        assert len(data) < 1024 * 1024
        request = urllib.request.Request('https://api.github.com/repos/' + REPO + '/git/blobs', data=json.dumps({'content': data.decode(), 'encoding': 'utf-8'}).encode(), headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(request, timeout=30) as response:
            sha = json.load(response)['sha']
        assert sha == expected, p
    manifest.append({'path': p, 'mode': '100644', 'type': 'blob', 'sha': sha})
with zipfile.ZipFile('/tmp/product-documentation-final-review.zip', 'a', zipfile.ZIP_DEFLATED) as z:
    z.writestr('manifest.json', json.dumps(manifest, indent=2))
print('Prepared and verified', len(manifest), 'immutable document objects; no ref or commit was written.')
