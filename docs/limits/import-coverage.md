# Inventory import coverage

Sources: original `openlegend-limits-decisions.md` temporary audit (2026-09-24); supplied save/recovery handoff for `a90d411`; supplied foundation handoff for `c133000`. Source files were read from the user’s attachments; no private machine paths are needed to use this register. This is a migration record, not a second runtime inventory. Tracked entries are retained for now unless the [change backlog](../maintainers/limits-audit.md) recommends revisiting them; inclusion alone does not recommend expanding a limit.

The existing repository copy matched the temporary audit’s 238 numbered entries except its newer LA176 save note. Each old ID now has one inventory owner or an explicit exclusion; the [index](../openlegend-limits-decisions.md#original-audit-entries) maps them. Original per-entry recommendations/reasons and completion records were retained; old priority lists were consolidated into the current backlog rather than copied as competing priorities.

## Excluded original entries

- **LA133:** Clock-of-day values 0–23.999999 hours describe the field’s meaning, not an arbitrary capacity limit. [World module implementation](../../packages/domain/src/world-modules.ts).
- **LA178:** Nonempty identifiers and JavaScript-safe integer arithmetic protect identity and arithmetic correctness. Tunable identifier lengths remain in LA067 and payload entries. [Identity contract](../identity-and-references.md).

## Report assessment

Source labels identify bullets in their original order: OB objects, ST state/resources, NW work, FL feelings, MP accounts/lifecycle, AU authentication numbers, QU queries/UI, BW bundled defaults. Work-budget tables and payload fields are accounted for separately. A merged duplicate points to its existing owner. “Not a tuning entry” preserves the obligation in its feature contract.

- **Save report numeric 1: Autosave cadence:** [SV01](persistence.md#sv01) — Tracked.
- **Save report numeric 2: Autosave retention:** [SV02](persistence.md#sv02) — Tracked.
- **Save report numeric 3: Before-load recovery:** [SV03](persistence.md#sv03) — Tracked.
- **Save report numeric 4: Package size:** [SV04](persistence.md#sv04) — Tracked.
- **Save report numeric 5: Individual record size:** [SV05](persistence.md#sv05) — Tracked.
- **Save report numeric 6: Package record count:** [SV06](persistence.md#sv06) — Tracked.
- **Save report numeric 7: Capture duration:** [SV07](persistence.md#sv07) — Tracked.
- **Save report numeric 8: Worker memory:** [SV08](persistence.md#sv08) — Tracked.
- **Save report numeric 9: Maintenance preparation:** [SV09](memory.md#sv09) — Tracked.
- **Save report numeric 10: Maintenance publication:** [SV10](memory.md#sv10) — Tracked.
- **Save report numeric 11: Save-list pagination:** [SV11](persistence.md#sv11) — Tracked.
- **Save report numeric 12: Metadata size:** [SV12](persistence.md#sv12) — Tracked.
- **Save report numeric 13: Operational backup catalog:** [SV13](persistence.md#sv13) — Tracked.
- **Save report numeric 14: Older JSON backups:** [SV14](persistence.md#sv14) — Tracked.
- **Save report numeric 15: Internal database batches:** [SV15](persistence.md#sv15) — Tracked.
- **Save report numeric 16: File buffers:** [SV16](persistence.md#sv16) — Tracked.
- **Save report behavior 1:** [SB01](persistence.md#sb01) — Tracked.
- **Save report behavior 2:** [SB02](persistence.md#sb02) — Tracked.
- **Save report behavior 3:** [SB03](persistence.md#sb03) — Tracked.
- **Save report behavior 4:** [LA167](persistence.md#la167) — Merged duplicate.
- **Save report behavior 5:** [SB05](persistence.md#sb05) — Tracked.
- **Save report behavior 6:** [SB06](persistence.md#sb06) — Tracked.
- **Save report behavior 7:** [SB07](memory.md#sb07) — Tracked.
- **Save report behavior 8:** [SB08](persistence.md#sb08) — Tracked.
- **Save report behavior 9:** [SB09](persistence.md#sb09) — Tracked.
- **Save report behavior 10:** [SB10](persistence.md#sb10) — Tracked.
- **Save report behavior 11:** [SB11](persistence.md#sb11) — Tracked.
- **Save report behavior 12:** [SB12](persistence.md#sb12) — Tracked.
- **Foundation OB01:** [OB01](objects.md#ob01) — Tracked.
- **Foundation OB02:** [OB02](objects.md#ob02) — Tracked.
- **Foundation OB03:** [OB02](objects.md#ob02) — Covered by packing policy; refusal is correctness within it.
- **Foundation OB04:** [OB04](objects.md#ob04) — Tracked.
- **Foundation OB05:** [OB05](objects.md#ob05) — Tracked.
- **Foundation OB06:** [OB06](objects.md#ob06) — Tracked.
- **Foundation OB07:** [OB07](objects.md#ob07) — Tracked.
- **Foundation OB08:** [OB08](objects.md#ob08) — Tracked.
- **Foundation OB09:** [OB09](objects.md#ob09) — Tracked.
- **Foundation OB10:** [OB10](objects.md#ob10) — Tracked.
- **Foundation OB11:** [OB11](objects.md#ob11) — Tracked.
- **Foundation OB12:** [OB12](objects.md#ob12) — Tracked.
- **Foundation OB13:** [OB13](objects.md#ob13) — Tracked.
- **Foundation OB14:** [OB14](objects.md#ob14) — Tracked.
- **Foundation OB15:** [OB15](objects.md#ob15) — Tracked.
- **Foundation OB16:** [OB16](objects.md#ob16) — Tracked.
- **Foundation ST01:** [ST01](state-effects.md#st01) — Tracked.
- **Foundation ST02:** [ST02](state-effects.md#st02) — Tracked.
- **Foundation ST03:** [ST03](state-effects.md#st03) — Tracked.
- **Foundation ST04:** [ST04](state-effects.md#st04) — Tracked.
- **Foundation ST05:** [ST05](state-effects.md#st05) — Tracked.
- **Foundation ST06:** [ST06](state-effects.md#st06) — Tracked.
- **Foundation ST07:** [ST07](state-effects.md#st07) — Tracked.
- **Foundation ST08:** [ST08](state-effects.md#st08) — Tracked.
- **Foundation ST09:** [ST09](state-effects.md#st09) — Tracked.
- **Foundation ST10:** [ST10](state-effects.md#st10) — Tracked.
- **Foundation ST11:** [ST11](state-effects.md#st11) — Tracked.
- **Foundation ST12:** [ST12](state-effects.md#st12) — Tracked.
- **Foundation ST13:** [ST13](state-effects.md#st13) — Tracked.
- **Foundation ST14:** [ST14](state-effects.md#st14) — Tracked.
- **Foundation ST15:** [ST15](state-effects.md#st15) — Tracked.
- **Foundation NW01:** [NW01](native-work.md#nw01) — Tracked.
- **Foundation NW02:** [NW02](native-work.md#nw02) — Tracked.
- **Foundation NW03:** [NW03](native-work.md#nw03) — Tracked.
- **Foundation NW04:** [NW04](native-work.md#nw04) — Tracked.
- **Foundation NW05:** [NW05](native-work.md#nw05) — Tracked.
- **Foundation NW06:** [NW06](native-work.md#nw06) — Tracked.
- **Foundation NW07:** [NW07](native-work.md#nw07) — Tracked.
- **Foundation NW08:** [NW08](native-work.md#nw08) — Tracked.
- **Foundation NW09:** [NW09](native-work.md#nw09) — Tracked.
- **Foundation FL01:** [FL01](feelings.md#fl01) — Tracked.
- **Foundation FL02:** [FL02](feelings.md#fl02) — Tracked.
- **Foundation FL03:** [FL03](feelings.md#fl03) — Tracked.
- **Foundation FL04:** [FL04](feelings.md#fl04) — Tracked.
- **Foundation FL05:** [FL05](feelings.md#fl05) — Tracked.
- **Foundation FL06:** [FL06](feelings.md#fl06) — Tracked.
- **Foundation FL07:** [FL07](feelings.md#fl07) — Tracked.
- **Foundation FL08:** [FL08](feelings.md#fl08) — Tracked.
- **Foundation FL09:** [FL09](feelings.md#fl09) — Tracked.
- **Foundation FL10:** [FL10](feelings.md#fl10) — Tracked.
- **Foundation FL11:** [FL11](feelings.md#fl11) — Tracked.
- **Foundation FL12:** [FL12](feelings.md#fl12) — Tracked.
- **Foundation FL13:** [FL13](feelings.md#fl13) — Tracked.
- **Foundation FL14:** [FL14](feelings.md#fl14) — Tracked.
- **Foundation FL15:** [FL15](feelings.md#fl15) — Tracked.
- **Foundation FL16:** [FL16](feelings.md#fl16) — Tracked.
- **Foundation FL17:** [FL17](feelings.md#fl17) — Tracked.
- **Foundation FL18:** [FL18](feelings.md#fl18) — Tracked.
- **Foundation MP01:** [MP01](multiplayer.md#mp01) — Tracked.
- **Foundation MP02:** [MP02](multiplayer.md#mp02) — Tracked.
- **Foundation MP03:** [MP03](multiplayer.md#mp03) — Tracked.
- **Foundation MP04:** [Existing correctness/policy contracts](README.md#what-belongs-here) — Not a tuning entry: Prevent insecure remote local-auth use and credential transport; these are security protections, not tuning work..
- **Foundation MP05:** [MP05](multiplayer.md#mp05) — Tracked.
- **Foundation MP06:** [MP06](multiplayer.md#mp06) — Tracked.
- **Foundation MP07:** [Existing correctness/policy contracts](README.md#what-belongs-here) — Not a tuning entry: Preserve current human authority across gameplay rewind; do not restore a world without its bound character..
- **Foundation MP08:** [Existing correctness/policy contracts](README.md#what-belongs-here) — Not a tuning entry: Enforce the accepted human-private boundary; creator powers are not permission to read another human’s mind..
- **Foundation MP09:** [MP09](multiplayer.md#mp09) — Tracked.
- **Foundation MP10:** [MP10](multiplayer.md#mp10) — Tracked.
- **Foundation MP11:** [MP11](multiplayer.md#mp11) — Tracked.
- **Foundation MP12:** [MP12](multiplayer.md#mp12) — Tracked.
- **Foundation MP13:** [MP13](multiplayer.md#mp13) — Tracked.
- **Foundation MP14:** [MP14](multiplayer.md#mp14) — Tracked.
- **Foundation AU01:** [AU01](multiplayer.md#au01) — Tracked.
- **Foundation AU02:** [AU02](multiplayer.md#au02) — Tracked.
- **Foundation AU03:** [AU03](multiplayer.md#au03) — Tracked.
- **Foundation AU04:** [AU04](multiplayer.md#au04) — Tracked.
- **Foundation AU05:** [AU05](multiplayer.md#au05) — Tracked.
- **Foundation AU06:** [AU06](multiplayer.md#au06) — Tracked.
- **Foundation AU07:** [AU07](multiplayer.md#au07) — Tracked.
- **Foundation AU08:** [AU08](multiplayer.md#au08) — Tracked.
- **Foundation QU01:** [QU01](spatial.md#qu01) — Tracked.
- **Foundation QU02:** [QU02](objects.md#qu02) — Tracked.
- **Foundation QU03:** [QU03](objects.md#qu03) — Tracked.
- **Foundation QU04:** [QU04](objects.md#qu04) — Tracked.
- **Foundation QU05:** [QU05](objects.md#qu05) — Tracked.
- **Foundation QU06:** [QU06](objects.md#qu06) — Tracked.
- **Foundation QU07:** [QU07](objects.md#qu07) — Tracked.
- **Foundation QU08:** [QU08](objects.md#qu08) — Tracked.
- **Foundation QU09:** [QU09](feelings.md#qu09) — Tracked.
- **Foundation QU10:** [QU10](memory.md#qu10) — Tracked.
- **Foundation QU11:** [QU11](interface.md#qu11) — Tracked.
- **Foundation QU12:** [QU12](interface.md#qu12) — Tracked.
- **Foundation QU13:** [QU13](native-work.md#qu13) — Tracked.
- **Foundation QU14:** [QU14](native-work.md#qu14) — Tracked.
- **Foundation QU15:** [QU15](interface.md#qu15) — Tracked.
- **Foundation BW01:** [BW01](base-world.md#bw01) — Tracked.
- **Foundation BW02:** [BW02](base-world.md#bw02) — Tracked.
- **Foundation BW03:** [BW03](base-world.md#bw03) — Tracked.
- **Foundation BW04:** [BW04](persistence.md#bw04) — Tracked.
- **Foundation Per-call/group native work:** [WB01](native-work.md#wb01) — Tracked; every table cell preserved.
- **Foundation Aggregate retained allocations:** [WB02](native-work.md#wb02) — Tracked; every table cell preserved.
- **Foundation inherited HTTP streams:** [LA164](multiplayer.md#la164) — Existing entry; current mismatch noted.
- **Foundation inherited patch replay:** [LA165](multiplayer.md#la165) — Existing entry.
- **Foundation inherited blocked-stream timeout:** [LA166](multiplayer.md#la166) — Existing entry.
- **Foundation removed feeling count:** [LA080](feelings.md#la080) — Updated to removed.
- **Foundation removed status-definition count:** [LA127](state-effects.md#la127) — Updated to removed.
- **Save report inherited policies:** [Existing correctness/policy contracts](README.md#what-belongs-here) — No new entries for unchanged reassignment, permissions, six-hour retention, protected evidence or paid retry rules; existing feature contracts and LA013 own them..

- **Foundation payload: Direct speech:** [LA213](interface.md#la213) — Existing entry; no duplicate.
- **Foundation payload: Inventory search:** [PB02](objects.md#pb02) — Tracked.
- **Foundation payload: Inventory/history cursor:** [PB03](objects.md#pb03) — Tracked.
- **Foundation payload: Character-view cursor:** [PB04](interface.md#pb04) — Tracked.
- **Foundation payload: Feeling label:** [PB05](feelings.md#pb05) — Tracked.
- **Foundation payload: AI feeling/source/policy/subject handles:** [PB06](feelings.md#pb06) — Tracked.
- **Foundation payload: Definition hash; supplied feeling source version:** [PB07](feelings.md#pb07) — Tracked.
- **Foundation payload: Feeling evidence coverage description:** [PB08](feelings.md#pb08) — Tracked.
- **Foundation payload: Subjects per evidence source:** [PB09](feelings.md#pb09) — Tracked.
- **Foundation payload: Evidence references per authored feeling:** [PB10](feelings.md#pb10) — Tracked.
- **Foundation payload: Saved internal feeling source version:** [PB11](feelings.md#pb11) — Tracked.
- **Foundation payload: Dependency authority-scope string:** [PB12](native-work.md#pb12) — Tracked.
- **Foundation payload: Login provider subject:** [PB13](multiplayer.md#pb13) — Tracked.
- **Foundation payload: Configured account/character IDs:** [PB14](multiplayer.md#pb14) — Tracked.

## Cross-cutting assessment

Single physical parent, exact reference/definition preservation, current bindings at restore, authorized inspection and no silent loss of required effects remain obligations. Their surrounding choices (one equipment slot, no conversion API, no characterless admin session, global pause and broad erasure invalidation) are inventoried separately. No proposal here relaxes privacy or atomicity.

Inherited item counts, body/manual-work prerequisites and the equipment slot were not silently counted as newly introduced. The exact inherited slot restriction is recorded in OB05; undefined references to “several” old body/manual rules do not invent new entries. Existing inventory count/field and action limits remain under their original IDs.

No new item is excluded merely because it is small, nonnumeric or probably reasonable. Ordinary buffers, timeouts, caches, pagination, animation and display values remain recorded without automatically creating tasks. New reasons explain the engineering tradeoff; neither AI handoff proved these exact values optimal.
