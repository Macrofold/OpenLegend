# BitCraft Online — recent Steam review evidence

[Reception chapter](02-reception.md) · [Dossier overview](../bitcraft-online.md)

**Capture:** November 14, 2026, completed at 06:23:30 UTC. **Fixed review-creation window:** October 15, 2026 06:23:06 UTC through November 14, 2026 06:23:06 UTC. This is a new, explicitly bounded snapshot; it does not replace the dossier's earlier displayed **52% positive of 101 recent reviews**.

## Finding

Among the **103 reviews returned for this query, 53 recommended the game and 50 did not** (51.46% recommended). Common praise concerns community, relaxed participation, and productive roles. Common criticism concerns development/release trust, unfinished systems, and the cost or quality of the work. These categories overlap. They are counts of explicit mentions in review texts, not mutually exclusive reasons, causal shares, or percentages of all players.

**Two disagreements deserve preservation.** Some people dislike passive repetitive crafting; others specifically value semi-idle play and dislike updates that replace it with more clicking. Several negative reviewers praise the community and want the game to succeed. A negative recommendation can express distrust about investment or launch handling rather than dislike of every activity.

## Method and scope

- Obtained all returned pages using Valve's documented anonymous **IUserReviewsService/GetAppReviews/v1** endpoint. The deprecated store `/appreviews` endpoint redirected to the homepage, so it was not used as evidence. [API documentation](https://partner.steamgames.com/doc/webapi/IUserReviewsService).
- Parameters: app 3454650; Recent order (`filter=1`); `languages=["all"]`; Steam purchases only (`purchase_type=0`); all recommendation types (`review_type=0`); `filter_offtopic_activity=true`; `num_per_page=100`; both exact date-range bounds supplied. The date filter applies to review creation, not the date of the latest edit. The Helpful-only `day_range` filter was not used.
- Two pages contained 100 and 3 records, matching the API total of 103; all IDs are unique and timestamps are in range. All were marked Steam purchases, none self-marked received-for-free, and four were marked refunded. This does not cover external-key reviews or records excluded by Steam's off-topic filter.
- API language tags: English 85, Russian 5, Brazilian Portuguese 3, German 3, Spanish 2, and Japanese/Turkish/Polish/Dutch/Norwegian 1 each. Some non-English-tagged texts are in English. Every body was read; non-English passages received model-assisted interpretation, not independent professional translation. The English-only companion query yielded 43 recommended and 42 not recommended.
- Manual multi-label coding required an explicit point. General endorsements, punctuation, memes, bare disappointment and merely hypothetical potential were not converted into specific gameplay praise/criticism. One review may contain multiple codes of either valence. The platform recommendation remains separate from the text's themes. Explicitly struck-through or resolved complaints were not counted as current criticism; the older negative text retained beneath one positive edit is marked as historical and excluded from current criticism counts.
- The capture has **92 reviews created on or after November 10 UTC**, when launch was announced, and only 24 created at/after the November 13 15:00 UTC opening (8 recommended/16 not). This is dominated by launch-period reaction and prior Early Access experience, not mature 1.0 retention evidence. Creation date alone cannot tell which version the author actually played. No review-bomb coordination is inferred.
- Complete returned query, not a representative sample of players. Interpretation, self-selection, filtered coverage, edits, launch timing and language remain limitations. The data cannot establish a causal explanation for the earlier 101-review score.

**Reproducible first-page request:** [public API query](https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=%7B%22appid%22%3A3454650%2C%22filter%22%3A1%2C%22languages%22%3A%5B%22all%22%5D%2C%22purchase_type%22%3A0%2C%22review_type%22%3A0%2C%22num_per_page%22%3A100%2C%22filter_offtopic_activity%22%3Atrue%2C%22date_range_start%22%3A1792045386%2C%22date_range_end%22%3A1794637386%7D). A later rerun may reflect edits, removal or altered filtering even with the same date bounds.

## Positive points

Counts below refer to specific praise. Of 53 recommending reviews, 18 offered no codable specific positive theme under these definitions (mostly short/general endorsements, jokes, future hope or defenses of the release). Four of 50 negative recommendations still explicitly praised the community.

| Code | Praised theme | In 53 recommending reviews | In 50 non-recommending reviews |
| --- | --- | ---: | ---: |
| PC | Community, cooperation or friendships | 18 | 4 |
| PR | Relaxing, low-attention or self-paced play | 16 | 2 |
| PW | Crafting, building, gathering, trade or a chosen productive role | 13 | 0 |
| PV | Value for money or enough engaging content | 10 | 1 |
| PD | Developer response, active improvement or positive interactions | 9 | 1 |
| PN | Gradual advancement, rewarding grind or increasing numbers | 8 | 0 |
| PA | World, exploration or visual appeal | 6 | 2 |
| PP | Preference for low-pressure/non-PvP play | 3 | 0 |

## Negative points

These counts include only criticism expressed by the author. Describing a controversy, agreeing with paid access, accepting grind as an audience preference, or insulting other reviewers does not by itself count as opposing that feature. Four negative reviews gave too little detail for a theme.

| Code | Criticized theme | In 50 non-recommending reviews | In 53 recommending reviews |
| --- | --- | ---: | ---: |
| ND | Development direction, communication, trust or release handling | 28 | 5 |
| NR | Unfinished systems or premature release readiness | 22 | 0 |
| NG | Grind, time cost, repetition or insufficient active engagement | 17 | 1 |
| NC | Population, group access, permissions, griefing or community fragility | 11 | 0 |
| NB | Bugs, performance, disconnections or inconsistent functional data | 10 | 3 |
| NM | Free-to-play reversal, paid access or cash-shop priorities | 10 | 0 |
| NS | Funding, abandonment or service-lifespan worries | 9 | 0 |
| NI | Loss of idle options, forced input or changed attention demands | 6 | 0 |
| NE | Shallow systems, insufficient content, endgame or purpose | 6 | 0 |
| NU | Usability, localization, accessibility or third-party-tool dependence | 6 | 1 |
| NW | Invalidated progress, reset or achievement deadline | 5 | 0 |
| NV | Privacy/data-exposure concern | 1 | 0 |

## Interpretation and concrete examples

- **31 of 50 negative reviews mention development/release handling or unfinished release readiness** (the union of ND and NR). This is broader than opposition to the access price. Some reviewers explicitly accept paid entry while objecting to surprise or broken expectations.
- **17 of 50 negative reviews criticize grind, repetition, time cost or lack of active engagement.** A separate 6 criticize losing idle options or being forced into more input. These should not be converted into one instruction to make every activity more active.
- **Community is the clearest recurring specific praise:** 18 of 53 positive reviews and 4 of 50 negative reviews mention it positively. One negative account says enjoyment disappeared when its community faded; a positive account describes coordinated specialties as precisely what makes the MMO worthwhile.
- **Useful freedom can be concrete:** review 41 describes choosing not to gather, instead trading and refining for profit, and identifies hauling/roads/terraforming as viable interests. That is stronger evidence for alternative ways to participate than a list of skill names.
- **Affordability and reassurance matter to some recommending reviewers:** 10 of 53 praise value/content. This does not prove commercial sustainability or erase other people's concern about investing time.
- Claims about developer finances, motives, ignored reports, exact population, other games' release dates and third-party privacy are attributed concerns. This coding does not independently establish them. The separate dossier's primary evidence remains the owner of verified mechanics and business facts.

### Selected mixed or informative cases

| Ledger row | Recommendation | What the actual account adds |
| --- | --- | --- |
| [19](https://steamcommunity.com/profiles/76561198065195479/recommended/3454650/) | Not recommended | Reports painful input after the farming change and loss of a usable established specialty. The physical harm and developer response are this player's account, not independently reproduced findings. |
| [24](https://steamcommunity.com/profiles/76561198264559321/recommended/3454650/) | Not recommended | Values flexible semi-idle play and friends while objecting to replacement of those options, poor communication, permissions and performance. More active gameplay would not automatically satisfy this player. |
| [29](https://steamcommunity.com/profiles/76561198009190537/recommended/3454650/) | Recommended | Earlier title-deadline concern explicitly resolved by an extension; counted as positive responsiveness, not ongoing deadline criticism. |
| [41](https://steamcommunity.com/profiles/76561199871689563/recommended/3454650/) | Recommended | Describes a successful trading/refining playstyle without gathering, plus infrastructure and hauling niches. |
| [49](https://steamcommunity.com/profiles/76561198011821219/recommended/3454650/) | Recommended | Likes interdependent specialties and grind; also reports difficult solo progress and confusing opening. Those costs are partly what this reviewer accepts in exchange for cooperation. |
| [59](https://steamcommunity.com/profiles/76561198000415033/recommended/3454650/) | Recommended | Enjoys a quiet homestead with a partner and regional chat; still criticizes how settlement changes and the launch were communicated. |
| [62](https://steamcommunity.com/profiles/76561198115818307/recommended/3454650/) | Not recommended | Likes the appearance and available content. Accepts retaining paid access but objects to communication, feedback handling, performance and changed playstyle; not coded as opposition to paid entry. |
| [77](https://steamcommunity.com/profiles/76561198031821770/recommended/3454650/) | Recommended | Currently recommended after an edit, while retaining the prior negative launch-readiness argument. The current vote is positive; historical ND/NR/NS themes are preserved but excluded from current criticism counts. |
| [88](https://steamcommunity.com/profiles/76561198415244912/recommended/3454650/) | Recommended | Explicitly strikes through the title-deadline complaint after an extension. It is not evidence that the deadline complaint remained unresolved at capture. |
| [99](https://steamcommunity.com/profiles/76561198105188638/recommended/3454650/) | Not recommended | Liked exploration, dungeons and community, but says crafting duration caused departure. |

## Auditable coding ledger

Codes refer to the definitions above. Dates below are UTC creation dates; an arrow records an update on a later date. Language is the API tag, not an independent language classification. Review text is paraphrased, not reproduced. A dash means no supported code in that valence.

| # / review ID | Created / updated | Language | Vote | Praise | Criticism | Short account |
| --- | --- | --- | --- | --- | --- | --- |
| 1 / [240160446](https://steamcommunity.com/profiles/76561198023416493/recommended/3454650/) | 2026-11-14 | english | − | — | ND | Attracted by concept; dislikes development direction. |
| 2 / [240159584](https://steamcommunity.com/profiles/76561198002411402/recommended/3454650/) | 2026-11-14 | japanese | − | — | — | Refunded because experience differed from expectations; no specific mechanism given. |
| 3 / [240157343](https://steamcommunity.com/profiles/76561198004670516/recommended/3454650/) | 2026-11-14 | english | − | — | ND, NR, NB, NM | Surprise release, unresolved bugs, changed promises and continued paid access/cash shop. |
| 4 / [240153770](https://steamcommunity.com/profiles/76561198102552569/recommended/3454650/) | 2026-11-14 | english | − | — | NS | Disappointment and speculation about developer finances. |
| 5 / [240152329](https://steamcommunity.com/profiles/76561198042054306/recommended/3454650/) | 2026-11-14 | english | + | PR, PC, PV | — | Relaxing own-pace play, community and value/content for price. |
| 6 / [240151439](https://steamcommunity.com/profiles/76561198119623991/recommended/3454650/) | 2026-11-14 | english | + | PC, PW | — | Crafting with many other people. |
| 7 / [240151435](https://steamcommunity.com/profiles/76561198060147094/recommended/3454650/) | 2026-11-14 | english | + | — | — | Unelaborated endorsement. |
| 8 / [240150845](https://steamcommunity.com/profiles/76561197984266054/recommended/3454650/) | 2026-11-14 | english | + | PW, PA, PV | — | Depth of crafting, combat and exploration. |
| 9 / [240146215](https://steamcommunity.com/profiles/76561198005452344/recommended/3454650/) | 2026-11-14 | spanish | − | — | NB, NU | Expected better performance and Spanish localization in 1.0. |
| 10 / [240142782](https://steamcommunity.com/profiles/76561198129665595/recommended/3454650/) | 2026-11-14 | english | − | — | — | Cozy-MMO promise disappointed; no specific mechanic supplied. |
| 11 / [240141652](https://steamcommunity.com/profiles/76561197986239157/recommended/3454650/) | 2026-11-13 | english | − | — | ND, NR, NC, NU | Unready release; group-goal tracking, town permissions and third-party-tool dependence. |
| 12 / [240141621](https://steamcommunity.com/profiles/76561198098382676/recommended/3454650/) | 2026-11-13 | english | − | — | NM | Expected free-to-play launch. |
| 13 / [240141005](https://steamcommunity.com/profiles/76561198149638835/recommended/3454650/) | 2026-11-13 | brazilian | − | — | NG | Watching crafting rather than actively playing. |
| 14 / [240138585](https://steamcommunity.com/profiles/76561198035636911/recommended/3454650/) | 2026-11-13 | english | − | — | NG | Grind with little reward. |
| 15 / [240137998](https://steamcommunity.com/profiles/76561197989442376/recommended/3454650/) | 2026-11-13 | english | − | — | NG | Describes experience as a second job. |
| 16 / [240137178](https://steamcommunity.com/profiles/76561199444018233/recommended/3454650/) | 2026-11-13 | english | + | PR, PN | — | Enjoys cozy side activity and slow steady advancement. |
| 17 / [240134058](https://steamcommunity.com/profiles/76561198353012661/recommended/3454650/) | 2026-11-13 | turkish | + | — | — | Symbol-only endorsement. |
| 18 / [240130501](https://steamcommunity.com/profiles/76561198069844613/recommended/3454650/) | 2026-11-13 | english | − | — | ND, NM | Three-day notice and reversed free-to-play expectation. |
| 19 / [240123883](https://steamcommunity.com/profiles/76561198065195479/recommended/3454650/) | 2026-11-13 | english | − | — | ND, NI, NU, NW | Farming input change reportedly painful and undermines an established specialty; dismissed feedback. |
| 20 / [240121964](https://steamcommunity.com/profiles/76561198011798487/recommended/3454650/) | 2026-11-13 | english | − | — | NG | Too grindy and unfun. |
| 21 / [240121830](https://steamcommunity.com/profiles/76561198003511011/recommended/3454650/) | 2026-11-13 | english | − | — | NR, NC | Unfinished territorial conflict; bullying and terrain/road griefing. |
| 22 / [240118521](https://steamcommunity.com/profiles/76561198025436939/recommended/3454650/) | 2026-11-13 | english | + | PN | — | Enjoys increasing numbers. |
| 23 / [240107158](https://steamcommunity.com/profiles/76561198076099067/recommended/3454650/) | 2026-11-13 | english | + | PV | ND | Good value and potential, while acknowledging undelivered promises. |
| 24 / [240107043](https://steamcommunity.com/profiles/76561198264559321/recommended/3454650/) | 2026-11-13 | english | − | PR, PC | ND, NR, NB, NI, NC, NW, NS, NU | Values former flexible idle play and friends; objects to communication, replacement mechanics, permissions and performance. |
| 25 / [240105571](https://steamcommunity.com/profiles/76561198142931861/recommended/3454650/) | 2026-11-13 | english | + | — | — | Defends announced reset using an insult; no substantive gameplay praise coded. |
| 26 / [240105164](https://steamcommunity.com/profiles/76561197964519176/recommended/3454650/) | 2026-11-13 | english | + | PN | — | Enjoys increasing numbers. |
| 27 / [240104774](https://steamcommunity.com/profiles/76561199883650522/recommended/3454650/) | 2026-11-13 | english | + | PN | — | Enjoys increasing numbers. |
| 28 / [240104764](https://steamcommunity.com/profiles/76561198630000881/recommended/3454650/) | 2026-11-13 | english | + | — | — | General fun endorsement with unspecific caveat. |
| 29 / [240104198](https://steamcommunity.com/profiles/76561198009190537/recommended/3454650/) | 2026-11-13 | english | + | PD | — | Praises response extending title deadline; earlier complaint explicitly resolved. |
| 30 / [240103112](https://steamcommunity.com/profiles/76561198337639391/recommended/3454650/) | 2026-11-13 | german | + | — | — | Unelaborated endorsement in German. |
| 31 / [240103089](https://steamcommunity.com/profiles/76561198264291384/recommended/3454650/) | 2026-11-13 | english | + | PC, PA, PV, PD, PP | — | Content, large world, developers, community and competition without griefing. |
| 32 / [240102859](https://steamcommunity.com/profiles/76561198060835507/recommended/3454650/) | 2026-11-13 | english | + | PC, PW, PN | NB | Friends, shared work and goals, rising numbers; occasional relog-fixed bugs. |
| 33 / [240102175](https://steamcommunity.com/profiles/76561198150824653/recommended/3454650/) | 2026-11-13 | polish | + | — | — | Generic potential and defense of developers; no concrete benefit stated. |
| 34 / [240100777](https://steamcommunity.com/profiles/76561198146661843/recommended/3454650/) | 2026-11-13 | english | + | PR, PC | — | Flexible casual/AFK social play after an active opening. |
| 35 / [240100738](https://steamcommunity.com/profiles/76561199099386556/recommended/3454650/) | 2026-11-13 | english | + | — | — | Positive Early Access experience and anticipation; no specific feature. |
| 36 / [240100612](https://steamcommunity.com/profiles/76561198006262202/recommended/3454650/) | 2026-11-13 | english | − | — | ND, NR, NS | Short-notice release and feared financial desperation. |
| 37 / [240100374](https://steamcommunity.com/profiles/76561198160129297/recommended/3454650/) | 2026-11-13 | english | + | — | — | Character-balance joke; no interpretable benefit or specific criticism coded. |
| 38 / [240100053](https://steamcommunity.com/profiles/76561198747215566/recommended/3454650/) | 2026-11-13 | english | + | — | — | General praise and potential. |
| 39 / [240099867](https://steamcommunity.com/profiles/76561198084290785/recommended/3454650/) | 2026-11-13 | english | + | — | ND | Anticipates launch while noting little notice. |
| 40 / [240099259](https://steamcommunity.com/profiles/76561198041819445/recommended/3454650/) | 2026-11-13 | english | + | PR, PW, PA | — | Relaxed slice-of-life play, markets and exploration. |
| 41 / [240099178](https://steamcommunity.com/profiles/76561199871689563/recommended/3454650/) | 2026-11-13 | dutch | + | PW | — | Self-chosen trading/refining career; roads, hauling and terraforming niches. |
| 42 / [240098791](https://steamcommunity.com/profiles/76561198328571926/recommended/3454650/) | 2026-11-13 | english | + | — | — | Community in-joke; no concrete reason coded. |
| 43 / [240098702](https://steamcommunity.com/profiles/76561197992741062/recommended/3454650/) | 2026-11-13 | english | + | PR, PC, PW | — | Cozy crafting and positive community. |
| 44 / [240097324](https://steamcommunity.com/profiles/76561197991369178/recommended/3454650/) | 2026-11-13 | english | + | PR, PC, PN | — | Side activity, character progression and chosen community. |
| 45 / [240096693](https://steamcommunity.com/profiles/76561198001336553/recommended/3454650/) | 2026-11-13 | english | + | PC, PW, PV | — | Many activities, ability to switch skills, friendly people and empires. |
| 46 / [240094192](https://steamcommunity.com/profiles/76561198005268054/recommended/3454650/) | 2026-11-13 | english | − | — | ND, NR, NG, NS, NC, NE | Excessive grind, weak purpose, reduced travel meaning, divided population and launch doubts. |
| 47 / [240086464](https://steamcommunity.com/profiles/76561198246210518/recommended/3454650/) | 2026-11-13 | german | + | — | — | Punctuation-only endorsement. |
| 48 / [240084181](https://steamcommunity.com/profiles/76561198133105359/recommended/3454650/) | 2026-11-13 | english | + | PC, PD | ND | Helpful community and improving game; communication weakness acknowledged. |
| 49 / [240077275](https://steamcommunity.com/profiles/76561198011821219/recommended/3454650/) | 2026-11-13 | german | + | PC, PW, PN | NU | Enjoys coordinated specialization and grind; values the need to cooperate, while onboarding is confusing. |
| 50 / [240077005](https://steamcommunity.com/profiles/76561198105542219/recommended/3454650/) | 2026-11-13 | english | + | PV | — | Engaging content still provides goals after long play. |
| 51 / [240073568](https://steamcommunity.com/profiles/76561199212261328/recommended/3454650/) | 2026-11-13 | english | + | PR, PV | — | Own-pace play worth many hours. |
| 52 / [240073401](https://steamcommunity.com/profiles/76561199206811265/recommended/3454650/) | 2026-11-13 | brazilian | − | — | NM, NU | Cannot delete character; last-minute reversal of free access. |
| 53 / [240053921](https://steamcommunity.com/profiles/76561198164775974/recommended/3454650/) | 2026-11-12 | english | + | PR, PC, PW, PA, PV, PD | — | Peaceful town creation, roles, settings, events, community and responsive developers. |
| 54 / [240051644](https://steamcommunity.com/profiles/76561198037326713/recommended/3454650/) | 2026-11-12 | english | + | PR, PC, PA | — | Aesthetics, slow pace and friendly community. |
| 55 / [240034530](https://steamcommunity.com/profiles/76561199095147456/recommended/3454650/) | 2026-11-12 | english | − | PR, PD | ND, NR, NB, NI, NM | Likes background play and developer interactions; communication, performance, AFK timeout and F2P reversal concern. |
| 56 / [240015407](https://steamcommunity.com/profiles/76561197999192208/recommended/3454650/) | 2026-11-12 | english | − | — | ND, NR, NG, NS, NC | Unfinished overhauls, grind/burnout, population loss and sustainability worries. |
| 57 / [240013347](https://steamcommunity.com/profiles/76561198721226242/recommended/3454650/) | 2026-11-12 | english | − | PC | NG, NC | Community was main pleasure; repetition and attrition removed enjoyment. |
| 58 / [240011163](https://steamcommunity.com/profiles/76561198117982279/recommended/3454650/) | 2026-11-12 | english | + | — | — | Generic endorsement. |
| 59 / [240009276](https://steamcommunity.com/profiles/76561198000415033/recommended/3454650/) | 2026-11-12 | english | + | PR, PC, PW, PP | ND | Couple's quiet homestead, cooperative chat and production; launch communication criticized. |
| 60 / [240003169](https://steamcommunity.com/profiles/76561198839221853/recommended/3454650/) | 2026-11-12 | english | − | — | ND, NM | Broken free-to-play promise. |
| 61 / [239999527](https://steamcommunity.com/profiles/76561198000238285/recommended/3454650/) | 2026-11-12 | english | + | — | — | Defends game against launch backlash without a specific gameplay reason. |
| 62 / [239998564](https://steamcommunity.com/profiles/76561198115818307/recommended/3454650/) | 2026-11-12 | english | − | PA, PV | ND, NR, NB, NI, NS | Pretty and enough content for a while; feedback, unfinished changes, performance, changed playstyle and viability worries. Accepts paid access itself. |
| 63 / [239990234](https://steamcommunity.com/profiles/76561198007181315/recommended/3454650/) | 2026-11-12 | english | + | PR, PW, PV, PP | — | Good value for a slow gathering/crafting/building game over PvP. |
| 64 / [239982151](https://steamcommunity.com/profiles/76561198452595223/recommended/3454650/) | 2026-11-12 | english | + | — | — | Generic endorsement. |
| 65 / [239981187](https://steamcommunity.com/profiles/76561197994706603/recommended/3454650/) | 2026-11-12 | english | + | PV | — | Low price; argues audience fit and reaction explain mixed reviews. |
| 66 / [239971827](https://steamcommunity.com/profiles/76561197988439953/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NB | Disappointed with launch handling and trust; high resource use noted. |
| 67 / [239970255](https://steamcommunity.com/profiles/76561198088032105/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NC | Likes game generally; release timing and splitting community discourage participation. |
| 68 / [239970058](https://steamcommunity.com/profiles/76561199007836703/recommended/3454650/) | 2026-11-11 | english | + | PW | — | Enjoys fishing. |
| 69 / [239959575](https://steamcommunity.com/profiles/76561198016277431/recommended/3454650/) | 2026-11-11 | russian | + | PR, PC | — | Likes social idle/AFK game; unspecific release caveat. |
| 70 / [239949226](https://steamcommunity.com/profiles/76561198029046628/recommended/3454650/) | 2026-11-11 | english | − | — | — | Vague disappointment/trap allegation; no supported specific theme. |
| 71 / [239944772](https://steamcommunity.com/profiles/76561198142026760/recommended/3454650/) | 2026-11-11 | english | − | — | NG, NI, NC | Too much grind plus removal of idle options; fears losing the community. |
| 72 / [239937323](https://steamcommunity.com/profiles/76561198265695697/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NG, NC | Ignored feedback/promises, excessive work and poor solo/small-group fit. |
| 73 / [239914051](https://steamcommunity.com/profiles/76561198141774256/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NR, NG, NE | Broken promises, grind and shallow/unbalanced professions/endgame. |
| 74 / [239909803](https://steamcommunity.com/profiles/76561199149975565/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NR, NG, NE, NS | Unready and purposeless game; distrust and speculation about cutting losses. |
| 75 / [239900453](https://steamcommunity.com/profiles/76561197984909420/recommended/3454650/) | 2026-11-11 | english | − | — | ND, NR, NM, NG, NS | Surprise release, paid-access reversal, weak progression and abandonment/financial fears. |
| 76 / [239893716](https://steamcommunity.com/profiles/76561198052227252/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NR | Release felt rushed. |
| 77 / [239893439](https://steamcommunity.com/profiles/76561198031821770/recommended/3454650/) | 2026-11-10 → 2026-11-13 | english | + | PR, PC, PW, PD | — | Current positive edit praises cozy economy and community; historical ND/NR/NS launch objections are preserved but excluded from current criticism counts. |
| 78 / [239892313](https://steamcommunity.com/profiles/76561198105467891/recommended/3454650/) | 2026-11-10 | russian | − | — | NB | Bug-focused negative shorthand. |
| 79 / [239891159](https://steamcommunity.com/profiles/76561198011527153/recommended/3454650/) | 2026-11-10 | english | + | PR, PC, PD | — | Peaceful pace, good community and active development; vague hiccups not assigned as bugs. |
| 80 / [239890539](https://steamcommunity.com/profiles/76561198617710035/recommended/3454650/) | 2026-11-10 | russian | + | PA | — | Praises sandbox; future economy/politics aspiration is conditional. |
| 81 / [239889712](https://steamcommunity.com/profiles/76561198070227158/recommended/3454650/) | 2026-11-10 | english | + | PC, PD | ND, NB | Enjoys playing with spouse/community and improvements; short notice and inconsistent item data. |
| 82 / [239876577](https://steamcommunity.com/profiles/76561198000741661/recommended/3454650/) | 2026-11-10 | english | − | PC | ND, NR, NB, NM, NW | Friends valued; distrust, recurring bugs, cash-shop focus and invalidated effort. |
| 83 / [239875935](https://steamcommunity.com/profiles/76561198154480588/recommended/3454650/) | 2026-11-10 → 2026-11-13 | english | − | — | ND | Displeased with development direction, including a later edit. |
| 84 / [239872029](https://steamcommunity.com/profiles/76561198251750914/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NR, NW | Short notice, threatened title goal and promised unfinished systems. |
| 85 / [239871965](https://steamcommunity.com/profiles/76561198060479690/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NR, NE | Abrupt release without enough substantive new content. |
| 86 / [239871704](https://steamcommunity.com/profiles/76561198121024447/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NR, NG | Some enjoyable loops but burnout; short notice damages long projects and trust. |
| 87 / [239871256](https://steamcommunity.com/profiles/76561198048599126/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NR, NB, NM | Broken promises, unfinished reworks, persistent bugs and cash-shop priorities. |
| 88 / [239871211](https://steamcommunity.com/profiles/76561198415244912/recommended/3454650/) | 2026-11-10 → 2026-11-12 | english | + | PD | — | Struck-through title-deadline criticism explicitly replaced by praise for extension. |
| 89 / [239870780](https://steamcommunity.com/profiles/76561198117058460/recommended/3454650/) | 2026-11-10 | english | − | — | NR, NG, NE, NS | Unfinished gathering/crafting loop lacks purpose; financing worry. |
| 90 / [239869628](https://steamcommunity.com/profiles/76561197978644671/recommended/3454650/) | 2026-11-10 | english | − | — | NR | Warns of an unfinished release. |
| 91 / [239869043](https://steamcommunity.com/profiles/76561197986315294/recommended/3454650/) | 2026-11-10 | english | − | — | ND, NW | Three-day notice and surprise materials change invalidating town progress. |
| 92 / [239866624](https://steamcommunity.com/profiles/76561198037368026/recommended/3454650/) | 2026-11-10 | norwegian | − | — | ND, NR, NE | Promised work and unfinished professions conflict with rushed release. |
| 93 / [238986940](https://steamcommunity.com/profiles/76561198039094987/recommended/3454650/) | 2026-10-31 | russian | − | — | NC | Early activity enjoyable; now perceived as dead. |
| 94 / [238852702](https://steamcommunity.com/profiles/76561198142101337/recommended/3454650/) | 2026-10-29 | russian | + | — | — | Familiar short-adventure joke; no clear factual play claim coded. |
| 95 / [238638523](https://steamcommunity.com/profiles/76561198075629492/recommended/3454650/) | 2026-10-26 | brazilian | + | PR, PD | NB, NG | Appreciates updates and relaxing character; performance and dynamism need work. |
| 96 / [238615336](https://steamcommunity.com/profiles/76561198974451364/recommended/3454650/) | 2026-10-26 → 2026-11-10 | english | − | — | ND, NR, NG, NC, NU, NM, NI, NV | Thin community, intrusive data access, opaque handling/markets, AFK restarts and launch/policy surprise. |
| 97 / [238588504](https://steamcommunity.com/profiles/76561198056070933/recommended/3454650/) | 2026-10-26 | english | − | — | NG | Objects to an idle game presented as an MMO. |
| 98 / [238479436](https://steamcommunity.com/profiles/76561198691324322/recommended/3454650/) | 2026-10-24 | english | − | — | — | Unclear short negative wording; no theme inferred. |
| 99 / [238280879](https://steamcommunity.com/profiles/76561198105188638/recommended/3454650/) | 2026-10-22 | english | − | PC, PA | NG | Liked exploration/dungeons and community; crafting duration drove departure. |
| 100 / [238032832](https://steamcommunity.com/profiles/76561198087317803/recommended/3454650/) | 2026-10-18 | english | + | PR, PC, PN | — | Relaxation, rewarding grind and friendships; also says no pay-to-win. |
| 101 / [238021375](https://steamcommunity.com/profiles/76561198211339453/recommended/3454650/) | 2026-10-18 | english | + | — | — | Positive OSRS comparison without a specific mechanism. |
| 102 / [237915278](https://steamcommunity.com/profiles/76561197994752920/recommended/3454650/) | 2026-10-17 | english | + | — | — | Emoji-only endorsement. |
| 103 / [237820422](https://steamcommunity.com/profiles/76561198766282720/recommended/3454650/) | 2026-10-16 | spanish | − | — | NB | Gathering bugs block progress; would reconsider after fixes. |
