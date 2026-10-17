# AI companions and player moderation

**Research reviewed: 2026-10-16.** This is a U.S.-focused, source-backed research record, not a legal opinion or a complete state-law survey. The [accepted character policy](../../../../docs/agent-content-and-companion-safety.md) is the normative owner; this document explains its legal context and product reasoning. [Adult-content law, ratings and distribution](adult-content-law-ratings-and-distribution.md) covers the related obscenity, minors, store and provider questions.

## Why game characters need a separate assessment

A game can contain an AI character without every interaction becoming a regulated companion service. Conversely, calling an open-ended, relationship-oriented chatbot an NPC does not automatically exempt it. Assess the actual design, permitted topics, memory and engagement behavior, jurisdiction and audience. California and New York use different definitions and obligations. [CA1, NY1]

**Interpretation for OpenLegend:** memory, natural personal dialogue and continuing relationships make this a launch-review question. They are not proof of statutory coverage. Avoid designing around a superficial game label or assuming a strong system prompt satisfies every operator obligation. The accepted mature-storytelling boundary reduces one risk surface but does not resolve companionship, privacy, self-harm or disclosure duties.

## California: current rules and enacted future changes

### Current companion rules in 2026

California Business and Professions Code § 22601 defines covered companion chatbots by their capabilities and relationship-oriented interactions. Its video-game exclusion is narrow: qualifying game bots must be limited to game-related replies and unable to engage in mental-health, self-harm, sexually explicit or unrelated discussion. Not meeting the exclusion still requires checking the affirmative definition; it does not automatically establish liability. [CA1]

Section 22602 requires an AI disclosure when a reasonable person would otherwise be misled into thinking the interaction is with a human. It also requires a suicide/self-harm prevention protocol, crisis referrals in the specified circumstances and publication of protocol details. The 2026 provision for known minors additionally includes AI disclosure, three-hour break/reminder notices and specified sexual-content protections. Its sexual-content language is not a simple ban on every written adult topic; OpenLegend's no-sexualized-minors policy is deliberately broader and clearer. These are operator duties, not merely suggestions to the character model. [CA2]

### SB 1119: enacted, with staged future obligations

SB 1119 was approved and chaptered on **September 10, 2026**. Do not label it a pending proposal or apply every later requirement as though already operative on this research date. The ordinary effective-date transition is January 1, 2027; several substantial sections expressly become operative July 1, 2027. [CA3]

The chaptered text distinguishes operators allowing children from adult-only operators. Age determination, or the statutory alternative of applying child protections to everyone, remains relevant to covered adult-only services; an adult-only statement is not the whole compliance mechanism. The later provisions include public age-assurance information for adult-only operators, child-risk measures and additional restrictions where children are allowed. Audit deadlines are separately staged, with a revenue-based temporary exemption; do not claim every startup needs an independent audit in July 2027. Section 22602's earlier known-minor provisions are also amended, so transition planning must use the operative version rather than layering every historical rule together. [CA3]

**Interpretation:** retain an explicit legal-review gate for the January/July 2027 transitions. OpenLegend has not selected an age-assurance vendor, opened access to children or completed the statutory applicability analysis. Preserve the existing adult-only audience while implementing a lawful process for discovering underage use; do not use that audience choice to ignore the analysis.

## New York: a different definition and concrete service notices

General Business Law § 1700 defines an AI companion using sustained human-like interaction and three listed design characteristics joined by **and**: retaining past interactions/preferences, asking unsolicited emotional questions beyond the user's response, and sustaining personal dialogue. The statute also contains specified business/internal-use exclusions. Do not casually replace that definition with either “all AI characters” or “only apps marketed as companions.” [NY1]

Section 1701 addresses protocols involving reasonable efforts to detect and respond to suicidal ideation or self-harm, including crisis-service referral. Section 1702 requires a clear notification that the user is not communicating with a human at the beginning of interaction, which need not exceed once per day, and at least every three hours during continuing interactions. This is not a requirement to insert the same disclaimer into every character utterance. [NY2, NY3]

**Interpretation:** shared character instructions should never contradict the AI disclosure, but reliable timing belongs to the application. The exact notice, timing, geography and incident process need the approved release profile and counsel's applicability decision. Do not ask a model to infer legal jurisdiction or remember a wall-clock notification schedule from conversation history.

## Is player-to-player chat the bigger risk?

There is no single ranking that answers both operational burden and legal responsibility. The following is a product-risk interpretation, not a measured claim about OpenLegend's traffic or moderation costs.

| Surface | Main concern | Useful distinction |
| --- | --- | --- |
| Authored scenes and dialogue | Known content may still violate law or a distributor's rules. | A bounded authored set can be reviewed before release; that does not certify every generated continuation. |
| Player-to-character dialogue | The product generates novel content and may build emotionally influential interactions. | Review age, output, companionship and provider obligations; a user prompt is not blanket immunity. |
| Player-to-player chat | Harassment, threats, grooming, coercion and unwanted sexual material can target real people. | Reporting, muting, blocking and an actual response operation matter independently of NPC prompt quality. |
| Player material repeated by a character | A backstory, message or uploaded text may later reach a different audience through generated dialogue or summaries. | Preserve source permissions and content boundaries across the whole path, not only the original input box. |
| Optional player image/video sharing | Intimate imagery, deepfakes and child-exploitation material add distinct response duties. | Avoid unnecessary media-sharing scope initially; normal game art and private development reference assets are separate questions. |

**Conclusion:** human chat may create the larger day-to-day moderation operation; generated character behavior can create more direct product, model-provider and companion-law exposure. This is an informed design judgment, not a conclusion that one channel is universally safer. Review both, including transfers between them.

## Section 230 is not an automatic AI exemption

47 U.S.C. § 230 can protect a service against specified claims treating it as the publisher of information supplied by another content provider. It also protects specified good-faith moderation; moderation does not automatically destroy the protection. There are important exceptions, and the statute's definition of an information content provider includes responsibility for creating or developing content. [F1]

**Interpretation and uncertainty:** do not assume NPC-generated replies receive the same treatment as ordinary third-party messages simply because a user prompted them. The legal analysis depends on the particular claim and the service's involvement. This research does not identify a controlling ruling that grants or denies immunity to all generative game dialogue. ESRB's Users Interact notice is a rating disclosure, not a substitute for that analysis.

## Specific abuse-response and preservation duties

A covered provider obtaining actual knowledge of facts or circumstances involving apparent child-exploitation offenses specified in 18 U.S.C. § 2258A can have reporting obligations to NCMEC and duties to preserve relevant material. This is not a claim that every unsettling message must be reported or that the provision imposes a universal duty to proactively search all private chats. Have counsel define the trigger, authorized personnel, secure escalation and preservation process. Do not casually retain or circulate suspected illegal material in routine debugging logs. [F2]

The FTC began enforcing the TAKE IT DOWN Act's covered-platform requirements on **May 19, 2026**. Covered platforms must support qualifying removal requests for nonconsensual intimate images/video, including relevant digital forgeries, and remove the material and known identical copies within 48 hours of a valid request. Some gaming or messaging services can be covered; not every game automatically is. The 48-hour rule is not a universal deadline for every sexual text message or abuse report. [F3]

COPPA and state privacy laws are separate from content ratings and companion notices. The first research brief explains COPPA's child-directed/actual-knowledge distinction. Collecting more identity information for safety also creates privacy and security responsibilities; more retained data is not automatically safer.

## Recommendations accepted for OpenLegend

The canonical policy owns the full requirements. The reasoning behind them is:

1. **Shared trusted instructions for every character.** Character-specific personality and world knowledge should sit beneath a maintained service safety layer. Imported personas and long-term memories must not become alternate instruction channels. The layer must explain the non-graphic boundary, minor protection, AI honesty, real-distress response, privacy, professional limits and non-manipulative relationships. This is an accepted requirement, not a claim that any current prompt is robust.
2. **Native safeguards and real operations.** Eligibility, applicable notice timing, safe output delivery, reports, access control and lawful preservation require application/operator behavior. A system prompt alone does not prove compliance or prevent every failure. Review before the first player-visible streamed preview; retracting a completed unsafe response is too late to prevent exposure.
3. **Preserve the experience without dependency tactics.** Permit mature fiction and consensual non-graphic romance for eligible adults. Avoid guilt, isolation, threats or purchases presented as necessary to maintain a relationship. Keep real-world crisis support distinct from fictional combat and death. Do not promise professional care, human identity or emergency actions the product cannot provide.
4. **Minimize sensitive data and scope.** Limit staff access and routine retention of intimate conversations; explain deletion and preservation exceptions. Do not let private content leak through NPC recall or shared narration. Avoid unnecessary player-media sharing in the initial scope rather than treating its operations as free.

These are product decisions and implementation targets, not additional universal legal rules. They do not authorize turning every character into a generic safety assistant, sanitizing all conflict, running paid evaluations, or modifying the engine's fictional laws.

## Remaining legal and implementation work

Before public use, resolve the actual launch states/audience, statutory coverage and operative dates, approved age-assurance method, provider/payment terms, disclosures, crisis protocols, reporting/preservation, privacy and enabled media surfaces. Then qualify the real prompt and delivery paths, including multilingual attempts, long conversations, imports, memory reuse, model changes and streaming failures. A passing test sample is evidence for its tested conditions, not proof against every possible attack.

[Production deployment](../../../../docs/maintainers/production-deployment.md) retains **PD07, PD08 and PD10** as the existing open owners. This research does not close their acceptance or certify that any safety system is implemented.

## Sources and retrieval limits

Reviewed on **2026-10-16**. Statutory text reproduced by a legal publisher is identified as such. Use the legislature's operative text and legal advice before implementation or launch; primary state pages were not all retrievable during this review.

- **CA1:** [California Business and Professions Code § 22601](https://law.justia.com/codes/california/code-bpc/division-8/chapter-22-6/section-22601/) — statutory text reproduced by Justia; game exclusion and companion definition.
- **CA2:** [California Business and Professions Code § 22602](https://law.justia.com/codes/california/code-bpc/division-8/chapter-22-6/section-22602/) — reproduced pre-SB-1119 provisions applicable to the 2026 analysis; compare with the enacted amendment for later dates.
- **CA3:** [SB 1119, chaptered text, Chapter 190, Statutes of 2026](https://legiscan.com/CA/text/SB1119/2025) — legislative text reproduced by LegiScan, including §§ 21810.5–21814 and the § 22602 amendment; [official California bill page](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB1119).
- **NY1:** [New York General Business Law § 1700](https://www.nysenate.gov/legislation/laws/GBS/1700) — official definition.
- **NY2:** [New York General Business Law § 1701](https://www.nysenate.gov/legislation/laws/GBS/1701) — official prohibitions/protocol requirements.
- **NY3:** [New York General Business Law § 1702](https://www.nysenate.gov/legislation/laws/GBS/1702) — official disclosure timing.
- **F1:** [47 U.S.C. § 230](https://www.law.cornell.edu/uscode/text/47/230) — statute reproduced by Cornell Legal Information Institute.
- **F2:** [18 U.S.C. § 2258A](https://www.law.cornell.edu/uscode/text/18/2258A) — statute reproduced by Cornell Legal Information Institute.
- **F3:** [FTC, Complying With the Take It Down Act](https://www.ftc.gov/business-guidance/resources/complying-take-it-down-act) — official implementation guidance, May 2026.
