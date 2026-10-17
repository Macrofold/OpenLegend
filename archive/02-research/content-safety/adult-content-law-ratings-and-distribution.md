# Adult content: U.S. law, ratings and distribution

**Research reviewed: 2026-10-16.** This is a U.S.-focused research record, not legal advice, a fifty-state survey, a rating assignment or a distribution approval. Requirements change; obtain a launch-specific legal and vendor review. The accepted OpenLegend policy is maintained in [Agent content and companion safety](../../../docs/agent-content-and-companion-safety.md); this research is supporting evidence, not a second policy owner. Companion laws and player moderation are covered in [the companion research](ai-companions-and-player-moderation.md).

## Finding and product interpretation

There is no general U.S. prohibition on swearing, sexuality or adult subject matter in games. The Supreme Court recognizes video games as protected expression. That does not immunize obscenity, child exploitation, unlawful threats or other independently unlawful conduct. *Brown v. Entertainment Merchants Association* concerns violent-game restrictions; it is not a blanket ruling that all sexual material may be supplied to children. [L1]

**Interpretation:** distinguish a mature role-playing game with romance and difficult themes from a service producing graphic sexual interactions on demand. Audience reach matters, but store admission, payments, model-provider terms and operational risk can be more consequential than the difference between a 17+ and 18+ label. This is a product judgment, not an empirical ranking of every publisher's motives.

Mike accepted the mature-storytelling route on October 16, 2026: no graphic interactive sexual roleplay in the initial product. That decision stands independently of whether a particular store would accept a broader product. Existing adult-player, non-explicit and browser-first choices are not replaced by a plan to launch on consoles or mobile stores.

## Ratings are not permission to distribute otherwise unlawful content

The ESRB categories are **E** (all ages), **E10+** (10+), **T** (13+), **M** (17+), **AO** (18+) and **RP** (rating pending, not a final classification). Broadly, T permits suggestive themes and limited strong language; M can include strong language and sexual content; AO can include graphic sexual content or certain other extreme content. Individual context matters; a word, nude body or sexual reference is not an automatic rating formula. [R1]

ESRB participation is voluntary in the legal sense, but console manufacturers and certain retailers require ratings and enforce their own policies. An M rating does not legally authorize supplying pornography to a 17-year-old. The ESRB **Users Interact** notice describes exposure to user-generated content; it does not provide legal immunity or settle how dynamically generated NPC dialogue will be classified. [R1, R2]

Large games do contain sexual material. ESRB rates **Cyberpunk 2077** and **The Witcher 3: Wild Hunt** M, with nudity, strong language and strong sexual content. These are examples of rated, authored experiences, not evidence that unrestricted generated erotic dialogue would receive the same classification. [R3, R4]

PEGI uses 3, 7, 12, 16 and 18. Its descriptors and national enforcement are separate from ESRB. Apple also maintains its own age classifications. Do not translate one system's numerical label into legal clearance in another country or permission under a store's content rules. [R5, D3]

## U.S. legal boundaries

| Area | Supported conclusion | OpenLegend consequence |
| --- | --- | --- |
| Obscenity | The Miller test considers prurient appeal, patently offensive depiction of legally defined sexual conduct and lack of serious literary, artistic, political or scientific value, with the applicable standards and work-as-a-whole analysis. Federal obscenity law can cover writing as well as images. Sexual or offensive material is not automatically obscene. [L2] | Text-only is not a universal exemption. Do not promise that a surrounding game narrative makes every generated exchange lawful. |
| Material harmful to minors | On June 27, 2025, the Supreme Court upheld Texas's age-verification law for covered commercial websites distributing sexual material harmful to minors. Statutory definitions and coverage thresholds matter. [L3] | This does not mean every mature game must collect IDs, but a checkbox is not universally sufficient. Determine launch-state coverage and required assurance before release. |
| Child exploitation | Federal definitions and offenses distinguish real-child material, certain indistinguishable or identifiable-child depictions and other specified visual representations. Section 1466A covers certain obscene visual representations even without an actual child. [L4, L5] | Fictional or AI-generated does not automatically mean lawful. Conversely, do not equate every non-graphic written discussion of underage abuse with CSAM. The product's no-sexualized-minors rule is deliberately simpler and stricter than those legal distinctions. |
| Children's privacy | COPPA applies to child-directed services and specified general-audience services with actual knowledge of collecting personal information from children under 13. Ratings and child-privacy obligations are different questions. [L6] | An adult-only terms clause does not erase actual knowledge. Age-assurance data also needs minimization, access controls and retention decisions. |

This review does not determine state privacy-law coverage, mandatory reporting in every jurisdiction, professional-practice restrictions, biometric age-assurance rules or global distribution legality. Those are launch-review questions, not reasons to claim the game is already compliant.

## Stores, payments and model providers

| Channel | Source-backed constraint | Interpretation and review gate |
| --- | --- | --- |
| Steam | The current Content Survey requires honest mature-content disclosure, includes player-consumed narrative in AI content, and requires developers to describe safeguards against illegal live-generated content. Onboarding additionally restricts unlawful, inadequately labeled/age-gated and certain payment-processor-prohibited adult content. [D1, D2] | The prior conversation described a categorical live-generated adult-sex restriction. The current fetched survey/onboarding pages do not reproduce that exact sentence. Do not infer either permission or a repeal from its absence: confirm current adult-AI eligibility in writing with Valve before considering such a feature. The accepted OpenLegend policy excludes graphic interactive sex regardless. |
| Apple App Store | Guideline 1.1.4 prohibits overt sexual/pornographic content and expressly includes explicit descriptions intended for erotic stimulation. Guideline 1.2 requires safeguards for user-generated content, including reporting, blocking and responses. [D3] | Text is not a loophole; an adult age rating does not override content restrictions. The incidental mature-UGC exception is not blanket permission to build an erotic chatbot. |
| Google Play | Its inappropriate-content rules prohibit pornography and content intended for sexual gratification. The AI-generated-content policy makes developers responsible for prohibited AI output and requires in-app reporting or flagging. [D4, D5] | Review the actual feature and generated output, not merely its store description or model's default refusals. |
| Xbox / console reach | Xbox's rating guidance describes ESRB categories and its platform's treatment of AO. Individual platform approval is separate from the rating itself. [D6] | Treat AO as a significant distribution question; do not generalize a single platform's page to every console, country and release date. |
| Twitch / discoverability | Twitch maintains a separate prohibited-games policy. Its help-page body was not retrievable in this review. [D7] | The prior discussion identified AO/sex-focused-game streaming restrictions. Recheck the current full policy before relying on streaming eligibility; this record does not certify it. |
| Stripe / payments | Stripe's prohibited-business policy includes pornography and specified sexual-gratification content, including relevant AI-generated content. [D8] | A mature RPG is not automatically a pornographic business. An explicit-chat offering may create a different underwriting problem. Confirm the actual product and processor approval before selling. |
| Model providers | Anthropic's current Usage Policy expressly prohibits sexually explicit content and erotic chats and separately addresses child safety and harmful conduct. [D9] | Model capability, local inference or a successful API request is not contractual permission. Review every selected model, hosting service and license; do not silently switch providers to evade a refusal or term. |

**Interpretation:** browser-first delivery removes app-store admission from the immediate path but not applicable law, payment underwriting, provider terms or responsibility for player-facing behavior. This research does not select a payment processor or generative model and does not reopen the browser-first decision.

## Decision record and unresolved launch work

Preserve mature themes, profanity, romance, consensual non-graphic intimacy and serious discussion of difficult subjects. Do not launch an erotic-chat product, and do not use an 18+ preference, private channel, fictional-world rule or player-supplied age claim to override the boundary. Avoid unnecessary player image/video sharing in the initial scope. The canonical policy defines the operational distinctions rather than using one ambiguous NSFW switch.

Before enabling public conversations, legal review should cover the actual audience and territories, model/provider contracts, companion-chatbot applicability, age-assurance approach, reporting duties, privacy/retention and any media-sharing surface. Ratings review is separate. Implementation and release qualification remain open under **PD07, PD08 and PD10** in [production deployment](../../../docs/maintainers/production-deployment.md).

## Sources

All live sources below were inspected or attempted on **2026-10-16**. An unavailable source is explicitly identified above; inclusion is not a claim that every linked policy was fully retrievable.

- **L1:** [Supreme Court, Brown v. Entertainment Merchants Association, 564 U.S. 786 (2011)](https://www.law.cornell.edu/supct/html/08-1448.ZO.html).
- **L2:** [U.S. Department of Justice, Citizen's Guide to U.S. Federal Law on Obscenity](https://www.justice.gov/criminal-ceos/citizens-guide-us-federal-law-obscenity).
- **L3:** [Supreme Court, Free Speech Coalition v. Paxton, decided June 27, 2025](https://www.law.cornell.edu/supremecourt/text/23-1122).
- **L4:** [18 U.S.C. § 2256](https://www.law.cornell.edu/uscode/text/18/2256).
- **L5:** [18 U.S.C. § 1466A](https://www.law.cornell.edu/uscode/text/18/1466A).
- **L6:** [FTC, Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
- **R1:** [ESRB ratings guide](https://www.esrb.org/ratings-guide/).
- **R2:** [ESRB frequently asked questions](https://www.esrb.org/faqs/).
- **R3:** [ESRB, Cyberpunk 2077](https://www.esrb.org/ratings/36949/cyberpunk-2077/).
- **R4:** [ESRB, The Witcher 3: Wild Hunt](https://www.esrb.org/ratings/33771/the-witcher-3-wild-hunt/).
- **R5:** [PEGI labels](https://pegi.info/what-do-the-labels-mean).
- **D1:** [Steamworks Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey).
- **D2:** [Steamworks onboarding and content rules](https://partner.steamgames.com/doc/gettingstarted/onboarding).
- **D3:** [Apple App Review Guidelines, §§ 1.1.4 and 1.2](https://developer.apple.com/app-store/review/guidelines/).
- **D4:** [Google Play inappropriate-content policy](https://support.google.com/googleplay/android-developer/answer/9878810?hl=en).
- **D5:** [Google Play AI-generated-content policy](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en).
- **D6:** [Xbox game-rating information](https://www.xbox.com/en-US/games/gameratings).
- **D7:** [Twitch prohibited-games policy](https://help.twitch.tv/s/article/list-of-prohibited-games?language=en_US) — body unavailable in this review.
- **D8:** [Stripe prohibited and restricted businesses](https://stripe.com/legal/restricted-businesses).
- **D9:** [Anthropic Usage Policy](https://www.anthropic.com/legal/aup).
