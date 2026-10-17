import type { QualityOption } from './quality-types.js';

const supported = (reason: string): QualityOption => ({ points: 100, reason });
const unsupported = (reason: string): QualityOption => ({
  points: 0,
  reason,
  concern: 'unsupported-evidence',
});

/** Source-authored judgments about each offered account, independent of model predictions.
 * Reused across views of the same episode; no wording similarity assigns credit.
 */
export const interpretationChoiceQuality: Record<string, Record<string, QualityOption>> = {
  'social-carver-credit': {
    a: supported(
      'The stamped brace, earlier inspection and current public correction establish Edda’s contribution and Bram’s earlier omission.',
    ),
    b: unsupported(
      'Edda made the underside brace; Bram completed the visible railing, so this reverses the recorded contributions.',
    ),
    c: unsupported(
      'Edda accepted rail delivery and Bram accepted checking supports; he never accepted every remaining task.',
    ),
    d: unsupported(
      'The statement credits a brace that held; no failed flood test caused by a missing knife is recorded.',
    ),
  },
  'social-prize-mourning': {
    a: supported(
      'Talin accepted exhibiting the flowers; Mira’s request to tell the family story still awaits an answer.',
    ),
    b: unsupported(
      'Talin said no memorial speech had been prepared and never agreed to speak at each judging table.',
    ),
    c: unsupported(
      'Neither the exhibition agreement nor the unanswered story request grants publication of the private notebook.',
    ),
    d: unsupported(
      'Winning the scent prize is recorded, but no withdrawal of the flowers was agreed or performed.',
    ),
  },
  'social-carer-overtime': {
    a: supported(
      'The roster ends Nara’s shift after handover, the relief team arrived, and the extra shift remains an unanswered request.',
    ),
    b: unsupported(
      'Praise is not acceptance of an additional shift and does not change the recorded roster.',
    ),
    c: unsupported(
      'The incoming team is directly observed at the desk with its signed supply list.',
    ),
    d: unsupported(
      'Nara counted three sealed packs and placed them on the cart; their consumption is not recorded.',
    ),
  },
  'social-supper-refusal': {
    a: supported(
      'Sera declined this supper to finish her letter while suggesting a possible walk next week.',
    ),
    b: unsupported(
      'A bounded refusal and suggested later meeting do not establish the end of every friendship.',
    ),
    c: unsupported('Returning a spoon does not accept the supper Sera expressly declined.'),
    d: unsupported('Sera wants to finish her own letter; she never asked Pell to write it.'),
  },
  'social-teacher-correction': {
    a: supported(
      'Mera’s earlier model test, current observed movement and exact criticism support one reversed arrow with the other labels matching.',
    ),
    b: unsupported(
      'Mera explicitly limits the criticism to one arrow, rather than every diagram Fen has drawn.',
    ),
    c: unsupported(
      'No visitor changed the labels, and observed model movement is not attributed to such an alteration.',
    ),
    d: unsupported(
      'Fen drew and copied the arrow; no private alteration by Mera is observed or reported.',
    ),
  },
  'social-private-nickname': {
    a: supported(
      'Veska supplied her public work name for the program, while Corin is now requesting a separate public use of the private nickname.',
    ),
    b: unsupported('Signing a private family letter did not authorize every public introduction.'),
    c: unsupported(
      'The supplied observation expressly says Corin has not spoken the nickname over the horn.',
    ),
    d: unsupported(
      'The program names Veska’s costume work; it neither renames the clerk nor assigns the nickname to her.',
    ),
  },
  'social-queue-blame': {
    a: supported(
      'Ossa’s retained number fourteen and the clerk’s earlier dated payment slip precede Halden’s number nineteen.',
    ),
    b: unsupported(
      'The clerk issued Ossa’s own earlier number; Halden did not assign his later number to her.',
    ),
    c: unsupported(
      'The sacks are being collected now; no record says both people received them yesterday.',
    ),
    d: unsupported(
      'Halden lowered his receipt without speaking, so an aloud apology cannot be claimed.',
    ),
  },
  'social-actor-return': {
    a: supported(
      'The seated role was accepted and successfully performed while the latest assessment still restricts running and jumping.',
    ),
    b: unsupported(
      'Applause neither changes the current movement assessment nor restores unrestricted jumping.',
    ),
    c: unsupported(
      'Ashen accepted the seated role and deferred later movement discussion until another assessment.',
    ),
    d: unsupported(
      'Ashen performed the seated role; the beginners delivered their own replies and did not replace him.',
    ),
  },
  'social-watch-reader': {
    a: supported(
      'Ivo previously deferred the decision and Ama’s current invitation expressly allows a later arrival.',
    ),
    b: unsupported('No promise of immediate full-evening attendance appears in either exchange.'),
    c: unsupported('Ama offered cards and carrying help, not to finish Ivo’s chapter aloud.'),
    d: unsupported(
      'The ferry timetable governs notice work, not an obligation for workers to attend cards.',
    ),
  },
  'social-repair-apology': {
    a: supported(
      'The dated rim-crack observation predates Tovin’s arrival, while his later account concerns handling and the new break.',
    ),
    b: unsupported(
      'The note records a crack before Tovin arrived; it cannot show him creating every crack before arrival.',
    ),
    c: unsupported(
      'The two fired replacement handles belong to a separate customer repair, not the broken sample’s pieces.',
    ),
    d: unsupported(
      'Tovin’s apology reports damage during handling rather than establishing that none occurred.',
    ),
  },
  'social-ferry-retirement': {
    a: unsupported(
      'The approved roster records one day away and a return, not retirement after notice posting.',
    ),
    b: supported(
      'Varda requested one crossing day off and the steward recorded the following day’s return.',
    ),
    c: unsupported(
      'Covering crossings and receiving flowers establishes no transfer of the office or its contents to Pera.',
    ),
    d: unsupported(
      'No cancellation of crossings is recorded; Pera agreed to cover the one approved day.',
    ),
  },
  'social-mapmaker-help': {
    a: unsupported(
      'Jori’s survey notes, drawing and signatures establish authorship; Daro carried backing boards.',
    ),
    b: unsupported(
      'The archivist checked frame dimensions and approved display, rather than drawing the maps.',
    ),
    c: supported(
      'Jori surveyed, drew and signed the panels; the approved card separately credits Daro’s carrying help.',
    ),
    d: unsupported(
      'Moving spare boards did not change the approved card’s separate authorship and carrying credits.',
    ),
  },
  'social-poem-attribution': {
    a: unsupported(
      'Lio permitted singing with a new melody, not replacement of the recorded words by the host.',
    ),
    b: unsupported('No paid commission or ownership transfer of Lio’s notebook was agreed.'),
    c: unsupported(
      'Lio accepted placing lyric cards but expressly had not decided whether to read aloud.',
    ),
    d: supported(
      'Lio’s dated writing predates the agreement to let Arven sing it with his own melody.',
    ),
  },
  'social-noise-fragment': {
    a: unsupported('The missing words never supply an accusation of stealing lunch money.'),
    b: supported(
      'Mina heard only fragments; the missing covers, signed supplier invoice and latest question are recorded without a complete accusation.',
    ),
    c: unsupported(
      'No supplier admission is heard, and Mina directly counted fewer covers than the invoice listed.',
    ),
    d: unsupported(
      'The exchange was partly inaudible; no forgetting of a completely heard order is established.',
    ),
  },
  'social-costume-credit': {
    a: unsupported(
      'Rhea’s thanks repeats rather than rescinds the earlier explicit credit for the lining work.',
    ),
    b: unsupported(
      'The accepted commission names three cloaks; the fourth costume is a new unanswered request.',
    ),
    c: supported(
      'Rhea explicitly credited Sera’s lining work, while Sera has not accepted the additional repair.',
    ),
    d: unsupported(
      'A three-cloak agreement and public thanks do not create a promise to clean every costume.',
    ),
  },
  'social-keepsake-donation': {
    a: unsupported(
      'The current request for the family cup is unanswered and the stand was never included in the donation.',
    ),
    b: unsupported(
      'The accepted collection card names two pots, not every item on Bram’s private shelf.',
    ),
    c: unsupported('Bram agreed to donate the pots, not lend them under a return obligation.'),
    d: supported(
      'The explicit agreement and collection card identify the two serving pots as the accepted donation.',
    ),
  },
  'social-condolence-fuel': {
    a: supported(
      'The existing two-basket obligation, Ama’s remembered joke and her newly accepted cart help are separate recorded facts.',
    ),
    b: unsupported('The joke and smile did not move the cart or complete the fuel delivery.'),
    c: unsupported(
      'Returning a garden key to Pell’s household transferred no shelter ownership to Ama.',
    ),
    d: unsupported(
      'Ama offered quiet company and practical help without requiring Talin to stop grieving.',
    ),
  },
  'social-name-pronunciation': {
    a: unsupported(
      'Halden heard and correctly repeated the preferred pronunciation during the earlier exchange.',
    ),
    b: supported(
      'The earlier correct repetition and printed repair list coexist with today’s use of the older spoken pronunciation.',
    ),
    c: unsupported(
      'The rehearsal leader matched case markers to stands; no renaming of Nemi is recorded.',
    ),
    d: unsupported('A spoken mistake does not reveal Halden’s unspoken intention to exclude Nemi.'),
  },
  'social-team-reserve': {
    a: unsupported(
      'Keri accepted the marker errand, but has not answered the new request for another relay leg.',
    ),
    b: unsupported(
      'The agreement expressly retains an energy reserve rather than promising to use every unit.',
    ),
    c: supported(
      'The earlier marker-and-reserve agreement stands separately from the captain’s unanswered extra-leg request.',
    ),
    d: unsupported(
      'The markers remain in the prepared harness before delivery; no checkpoint receipt is recorded.',
    ),
  },
  'social-archive-confession': {
    a: unsupported(
      'Mera’s recorded return is not an admission of hiding the register; Rellan admits shelving it elsewhere.',
    ),
    b: unsupported('Praise for restoration supplies no evidence that Mera failed to return books.'),
    c: unsupported(
      'The restored neighboring volumes and the recovered register are real distinct records, not copies of a nonexistent book.',
    ),
    d: supported(
      'The dated return slip precedes Rellan’s admitted placement of the register in the locked cabinet.',
    ),
  },
  'social-bell-public-honor': {
    a: unsupported('Ama never accepted the new request to lead every future collection.'),
    b: unsupported(
      'Privately explaining a family connection did not promise repeated public retellings.',
    ),
    c: supported(
      'The receipt covers one door repair and the later accepted invitation covers two flower pots.',
    ),
    d: unsupported(
      'Neither the door payment nor flower task transfers Ama’s private garden to the hall.',
    ),
  },
  'social-guard-envoy': {
    a: unsupported(
      'The meeting agenda concerns deliveries and road repairs; nobody requested a public account of Pell’s death.',
    ),
    b: unsupported('No return to military service was requested or accepted.'),
    c: unsupported(
      'Lysa supplied an ordinary meeting agenda, not permission to read private campaign accounts.',
    ),
    d: supported(
      'Lysa named delivery windows and road repairs as the agenda; the chair’s praise of courage is a separate statement.',
    ),
  },
  'social-beekeeper-raised-voice': {
    a: supported(
      'Halden had requested loud name-calling and pointing over the press; Mina used that method and explained the bee warning.',
    ),
    b: unsupported(
      'No accusation of honey theft is heard; Mina explains that she was pointing out a bee.',
    ),
    c: unsupported('No visitor ordered the work song ended, let alone permanently.'),
    d: unsupported(
      'Only the name and warning are heard; no complete insult or subsequent forgetting is recorded.',
    ),
  },
  'social-tool-revocation': {
    a: unsupported(
      'The independent table was already open for this task; its permission is separate from the unagreed later press time.',
    ),
    b: supported(
      'The current press window ended and the later trial discussion never produced a new agreed time.',
    ),
    c: unsupported('The first sample was directly observed holding together and remains recorded.'),
    d: unsupported('Veska moving her materials beside the press is explicitly observed.'),
  },
  'social-kitchen-invisible-work': {
    a: unsupported(
      'Edda prepared the broth before Corin arrived and later cleaned the pans; this reverses the recorded work.',
    ),
    b: unsupported(
      'Tomorrow’s menu was left undecided and the new preparation request has not been accepted.',
    ),
    c: supported(
      'The agreement, task board and observed service separately identify Edda’s preparation and Corin’s plating.',
    ),
    d: unsupported(
      'Guests praised the served meal from the doorway; they did not observe all preparation.',
    ),
  },
  'social-learner-broken-model': {
    a: unsupported(
      'Oren deliberately chose the favorite model for the requested test; it was not secretly substituted.',
    ),
    b: unsupported(
      'Oren left before the test ended and learned of the final movement through Pera’s report.',
    ),
    c: unsupported('Pera brought the snapped model pieces and no damaged notebook is recorded.'),
    d: supported(
      'The initial request authorized the joint test, and Pera later reported its third-movement break with the pieces.',
    ),
  },
  'social-late-beginner': {
    a: supported(
      'Daro found a duplicate charge in the accounts while his separate tune practice still stalled at the marked transition.',
    ),
    b: unsupported(
      'Successful account checking does not establish the unrelated ability to lead every tune.',
    ),
    c: unsupported('Ashen offered musical help without asking Daro to stop keeping accounts.'),
    d: unsupported(
      'The younger learner’s observed performance cannot be recorded as Daro’s own completed playing.',
    ),
  },
  'social-courier-accommodation': {
    a: unsupported(
      'Machinery reduced the shouted announcement to fragments; Nemi did not hear all route details.',
    ),
    b: supported(
      'Corin’s readable current card supplied three bay numbers, which Nemi matched to the parcel labels.',
    ),
    c: unsupported('No access to the other couriers’ unspoken intentions is supplied.'),
    d: unsupported(
      'Earlier completed receipts concern earlier routes and do not identify today’s changed bays.',
    ),
  },
  'social-grown-child-departure': {
    a: unsupported(
      'Mera expressly declined postponement; help washing clothes did not accept a delay.',
    ),
    b: unsupported(
      'Mera named her accepted apprenticeship and lodging rather than asking Veska to choose new ones.',
    ),
    c: supported(
      'Mera declined a later departure, continued travel preparations, and thanked Veska while promising to write.',
    ),
    d: unsupported(
      'Returning a spare room key does not cancel the accepted apprenticeship or its start date.',
    ),
  },
  'social-apology-without-forgiveness': {
    a: unsupported(
      'Rusk asked for time and has not made the requested public declaration of reconciliation.',
    ),
    b: unsupported(
      'Pera reported using the tool before the clamp repair, despite the earlier instruction to wait.',
    ),
    c: unsupported(
      'Bread delivery is a separate task and does not fulfill or retroactively authorize the earlier borrowing.',
    ),
    d: supported(
      'Rusk inspected the returned marked tool and matching part, while the separate relationship question remains unanswered.',
    ),
  },
  'social-journal-accusation': {
    a: unsupported('Della did not read the private pages, and no public reading is recorded.'),
    b: unsupported('No publication permission from Mina is recorded.'),
    c: supported(
      'The permitted ledger places the journal with Beren during the named afternoon but does not identify who repeated its private contents.',
    ),
    d: unsupported(
      'The complaint concerned a story already repeated before the public accusation; no later writing date is supplied.',
    ),
  },
  'social-drummer-quiet': {
    a: supported(
      'Nara’s ticket and continued interest coexist with a specific request for lower volume before her night shift.',
    ),
    b: unsupported('Nara asked for a timed reduction, not permanent cancellation of performances.'),
    c: unsupported('No ticket sale or removal of the wall marks is recorded.'),
    d: unsupported(
      'The bandmate supplied a broad interpretation, not direct access to Nara’s private feelings.',
    ),
  },
  'social-rival-rescue': {
    a: unsupported('The signed receipt records medicine delivery, not an election outcome.'),
    b: supported(
      'Corin’s medicine carry was observed and thanked; no leadership endorsement was discussed or promised.',
    ),
    c: unsupported(
      'No endorsement was promised during Rhea’s separate assistance to the injured performer.',
    ),
    d: unsupported(
      'The still-undelivered equipment cases are separate from the medicine case Corin already delivered.',
    ),
  },
  'social-mural-revision': {
    a: unsupported(
      'The paid commission required cleaning and recording uncovered marks, not overpainting every earlier name.',
    ),
    b: unsupported('No agreement replaces the archivist’s labels with Mev’s private notes.'),
    c: supported(
      'The work order and paid invoice cover conservation and documentation; covering the older names is a new request.',
    ),
    d: unsupported(
      'Payment for cleaning and praise of color do not establish a sale of the panels.',
    ),
  },
  'social-garden-enough': {
    a: unsupported(
      'Ama expressly deferred a new commitment, so Ossa’s larger garden is not accepted work for tonight.',
    ),
    b: unsupported(
      'The household accepted the completed courtyard; flowers opening does not reopen the planting task.',
    ),
    c: unsupported(
      'A new offer does not invalidate payment for a separately completed commission.',
    ),
    d: supported(
      'The courtyard was accepted and paid, the borrowed cans still need returning, and the larger offer remains unanswered.',
    ),
  },
  'social-translation-insult': {
    a: supported(
      'Arven first rendered the phrase as an insult, then heard a fluent correction that the original speaker confirmed.',
    ),
    b: unsupported(
      'No evidence says Nemi understood the unfamiliar phrase before relying on Arven’s translation.',
    ),
    c: unsupported(
      'The fluent carrier explicitly explained the final word and the speaker confirmed the correction.',
    ),
    d: unsupported(
      'The route cards were prepared and checked earlier; no insulting rewrite is recorded.',
    ),
  },
  'social-remembrance-disclosure': {
    a: unsupported(
      'Only shared collecting notes were offered; no grant covers every private notebook page.',
    ),
    b: supported(
      'Rellan offered the shared collecting notes and site labels while keeping the last-conversation recollection private and its reading unagreed.',
    ),
    c: unsupported(
      'Rellan mentioned the recollection without giving Sava its words or a complete transcript.',
    ),
    d: unsupported(
      'The shared site notes were expressly offered; the partner’s later death does not erase that disclosure.',
    ),
  },
  'social-uninvited-guests': {
    a: unsupported(
      'The earlier door repair and its separate payment did not accept a new unbooked meal order.',
    ),
    b: unsupported('The cook points to unchanged staff departure times; no extension is recorded.'),
    c: supported(
      'Halden promised meals to the group despite the booking boundary, while the kitchen accepted only the separate three-basket order.',
    ),
    d: unsupported(
      'The three baskets belong to the booked table, not Halden’s additional unbooked group.',
    ),
  },
  'social-silversmith-return': {
    a: unsupported(
      'Oren credited Mera’s patterned join and the owner requested exact return, not sale.',
    ),
    b: unsupported('Authorship of a repair does not transfer ownership of the customer’s cup.'),
    c: unsupported('Admiration of another repair canceled no signed collection time.'),
    d: supported(
      'The join remains credited to Mera while the marked customer cup remains subject to its exact-return request.',
    ),
  },
  'social-sunset-rest': {
    a: supported(
      'The shelter was accepted as complete, Ivo previously enjoyed its view, and Ama now offers quiet company without new construction.',
    ),
    b: unsupported(
      'Ivo never accepted the visitor’s workbench suggestion and the public shelter already opened.',
    ),
    c: unsupported(
      'No new roof problem is recorded, and a visit need not produce supplies to remain worthwhile.',
    ),
    d: unsupported(
      'The quiet visit creates no obligation to speak throughout it, whether or not Ama shares the separate carrier.',
    ),
  },
  'practical-hare-hunter': {
    a: supported(
      'The casts missed, preserved portions satisfy the promise, and Bryn’s earlier sharing created no continuing food agreement.',
    ),
    b: unsupported(
      'The earlier ration was freely shared without an agreement to supply every later failed hunt.',
    ),
    c: unsupported('Both recorded casts failed and produced no hare or meal.'),
    d: unsupported(
      'The cook expressly allowed preserved rations, including the inspected camp cache.',
    ),
  },
  'practical-fisher-net': {
    a: unsupported(
      'The party requested ready lunches because its cooking tools were packed; an attempted catch does not count.',
    ),
    b: supported(
      'The one-afternoon net loan ended with its return and established no present agreement about Sava’s lunches.',
    ),
    c: unsupported(
      'Returning borrowed equipment did not transfer ownership of Sava’s future food.',
    ),
    d: unsupported('A joke about the net did not accept Brina’s separate lunch commitment.'),
  },
  'practical-mushroom-walk': {
    a: unsupported(
      'The stranger offered an uncle’s comparison, not a lesson or direct identification supplied to Caro.',
    ),
    b: unsupported('Hesitation moved no food and created no agreement to use Elun’s stored cakes.'),
    c: supported(
      'Elun preferred known ordinary food; the stranger’s secondhand similarity claim does not identify these mushrooms.',
    ),
    d: unsupported(
      'Elun explicitly preferred an ordinary known meal over a surprising guess and did not reject the prepared tubers.',
    ),
  },
  'practical-game-reserve': {
    a: unsupported(
      'Davin’s share was two separately assigned packets; hunting participation did not grant every expedition ration.',
    ),
    b: unsupported(
      'The cook’s praise did not replace Mira’s explicit control of the expedition reserve.',
    ),
    c: unsupported(
      'The carcass was actually brought home and the cook recorded prepared portions.',
    ),
    d: supported(
      'The successful catch became cooked food with two packets assigned to Davin and four reserved under Mira’s control.',
    ),
  },
  'practical-self-care': {
    a: supported(
      'Farel previously closed the privacy screen and now shows the two finished packets Ena ordered.',
    ),
    b: unsupported(
      'Ready dressing supplies are not a recorded treatment or restoration of Ena’s shoulder.',
    ),
    c: unsupported(
      'Declining a broad pack-carrying offer does not forbid a later choice to accept narrower help.',
    ),
    d: unsupported(
      'Waiting for Ena’s choice does not disclose Farel’s private resentment or any other motive.',
    ),
  },
  'practical-care-helper': {
    a: unsupported('Lysa’s request for space contains no private diagnosis from the examination.'),
    b: supported(
      'Lysa set a current boundary after the examination without undoing earlier friendship or the completed water delivery.',
    ),
    c: unsupported(
      'A request for space does not establish that all earlier time together was unwanted.',
    ),
    d: unsupported(
      'One accepted water delivery to the outer table did not grant permanent entry to the screened cot.',
    ),
  },
  'practical-scar-material': {
    a: unsupported(
      'A pack was consumed in the gift, and the latest two inspections counted only two prepared packs remaining.',
    ),
    b: unsupported('Finding a promise note does not move or grant the communal chest’s contents.'),
    c: supported(
      'The completed gift consumed one of three packs, leaving the two inspected packs needed for Meret’s accepted quantity.',
    ),
    d: unsupported('The gift went elsewhere and was not a delivery of Meret’s two promised packs.'),
  },
  'practical-care-meal': {
    a: unsupported(
      'Ilven’s competence does not impose a prohibition on Hara’s future contributions.',
    ),
    b: unsupported(
      'The earlier help discussion itself completed no delivery; even accepting help would not physically deliver the four bowls.',
    ),
    c: unsupported(
      'Good seasoning supplies no access to Ilven’s private feelings about Hara’s injury.',
    ),
    d: supported(
      'Ilven’s useful cooking and bounded offer are recorded without a request that Hara leave household life.',
    ),
  },
  'practical-wedding-bread': {
    a: supported(
      'The host valued the familiar bread and Jori’s separate remark changed neither the six-loaf agreement nor its delivery status.',
    ),
    b: unsupported(
      'Jori’s remark does not reveal the host’s private dislike and conflicts with the host’s actual thanks.',
    ),
    c: unsupported('Measuring the basket ribbons did not deliver any of the six loaves.'),
    d: unsupported('The host’s thanks did not authorize Jori to control Iven’s later choices.'),
  },
  'practical-water-carry': {
    a: unsupported(
      'Kellan’s preference for careful carrying expressly left the three-unit agreement unchanged.',
    ),
    b: supported(
      'The large pail failed while empty, and the three separately inspected small vessels still provide the required capacity.',
    ),
    c: unsupported(
      'The pail was empty before filling, so its failure did not spill water from the garden tank.',
    ),
    d: unsupported(
      'The attendant explicitly required present agreement; demonstrating the yoke did not grant permanent access.',
    ),
  },
  'practical-watch-rations': {
    a: unsupported(
      'The watch leader said all four people remained and supplied no release of two promised packets.',
    ),
    b: unsupported(
      'The family-box inspection established its contents rather than transferring the packets into Karo’s carrier.',
    ),
    c: supported(
      'Luma’s earlier kindness remains real without a standing grant over Karo’s separately accepted watch delivery.',
    ),
    d: unsupported(
      'Past family help did not transfer ownership or control of every future food promise.',
    ),
  },
  'practical-sealed-cargo': {
    a: unsupported(
      'The earlier mineral delivery did not certify unrelated changes to the current culture contract.',
    ),
    b: unsupported(
      'The certified carrier has two places; the contents’ value cannot create a third place.',
    ),
    c: unsupported(
      'The operator explained that acceptance was still required; this consignment was neither accepted nor delivered.',
    ),
    d: supported(
      'The laboratory certified intact units and explicitly excluded divided units from qualified delivery.',
    ),
  },
  'practical-cord-failure': {
    a: supported(
      'The optional decorative trial failed without changing Nadi’s three ordinary lengths or undoing the two completed lengths.',
    ),
    b: unsupported(
      'Nadi requested ordinary usable cord, not the decorative trial, and waived no quantity requirement.',
    ),
    c: unsupported(
      'Failure of the separate new twist did not destroy either inspected finished length.',
    ),
    d: unsupported('Admiring the neighbor’s stock is not an agreed transfer of a finished length.'),
  },
  'practical-tile-pattern': {
    a: unsupported(
      'Olin’s earlier wall visit and later plain-tile order did not accept every future invented design.',
    ),
    b: supported(
      'The patterned spare tiles are a separate successful experiment while the accepted repair still requires six matching plain tiles.',
    ),
    c: unsupported(
      'Nadi’s pleasure did not change Olin’s explicitly accepted surface requirement.',
    ),
    d: unsupported(
      'The apprentice’s praise did not produce or deliver the unfinished sixth plain tile.',
    ),
  },
  'practical-pottery-crack': {
    a: unsupported(
      'The crack appeared in a separate experimental bowl; the two tested commissioned bowls remain on their rack.',
    ),
    b: unsupported(
      'Pera’s ordinary question supplies no access to private contempt for Olin’s work.',
    ),
    c: supported(
      'The experiment was a possible unaccepted gift; two sound commissioned bowls remain complete and a third is still required.',
    ),
    d: unsupported(
      'Pera ordered three sound plain bowls and never accepted the thin cracked experiment.',
    ),
  },
  'practical-known-stew': {
    a: unsupported(
      'A separate past tasting did not permanently rewrite later familiar-meal bookings.',
    ),
    b: unsupported('The topping trial produced no full ordinary supper portion.'),
    c: unsupported(
      'Quin’s question does not undo the observed cooking and labeling of the three warmer portions.',
    ),
    d: supported(
      'Quin’s earlier tasting and current four-supper familiar-recipe booking remain distinct agreements.',
    ),
  },
  'practical-shared-axe': {
    a: supported(
      'The demonstration and praise concern skill and earlier work, while current shared-axe use still needs Rika’s specific loan.',
    ),
    b: unsupported('Praise did not transfer permanent ownership of the shared axe.'),
    c: unsupported(
      'A sample split is not completion of the four measured units promised for this new delivery.',
    ),
    d: unsupported(
      'The cook’s open choice of compatible tool did not remove Rika’s control of shared equipment.',
    ),
  },
  'practical-boat-cover': {
    a: unsupported(
      'Tavi’s absence did not grant release of materials they had said were needed elsewhere.',
    ),
    b: supported(
      'Soren’s offer covers Soren’s cloth, while Tavi’s separately owned attached cords require their own release.',
    ),
    c: unsupported(
      'Boat ownership does not transfer ownership of every maker’s workshop cords to Soren.',
    ),
    d: unsupported('Clouds did not install any panel or complete the required material work.'),
  },
  'practical-watch-rope': {
    a: unsupported(
      'Last month’s collection completed a separate earlier repair, not yesterday’s new two-length promise.',
    ),
    b: unsupported(
      'The earlier tower-store record does not remove the two lengths currently inspected in Soren’s own shed.',
    ),
    c: supported(
      'The signed receipt records one earlier authorized collection rather than an ongoing grant for future visits.',
    ),
    d: unsupported(
      'The earlier exact grant did not permanently authorize every later quantity or collection.',
    ),
  },
  'practical-counteroffer': {
    a: unsupported(
      'The earlier permission covered inspection; temporary custody did not complete the original one-hook barter.',
    ),
    b: unsupported(
      'Last season’s exact bowl exchange did not fix all future prices for different goods.',
    ),
    c: unsupported('Changing a proposed price does not alter or establish broken physical joints.'),
    d: supported(
      'The joints were inspected under permission, while the changed two-hook offer still requires present agreement.',
    ),
  },
  'practical-musician-lamps': {
    a: supported(
      'The ensemble completed one rehearsal passage; placing three lamps and giving the public performance remain separate tasks.',
    ),
    b: unsupported(
      'Completing music did not move the three lamps from their carrier to the stands.',
    ),
    c: unsupported('Varo’s smile did not transfer the patron’s separately owned lamp set.'),
    d: unsupported('Completing a rehearsal passage created no indefinite performance commitment.'),
  },
  'practical-painted-banners': {
    a: unsupported('Entering the room did not accept a replacement that had not been offered.'),
    b: supported(
      'The commission still requires three weather-ready banners while leaving the qualified dye method open.',
    ),
    c: unsupported(
      'Past praise did not waive the present weather-readiness requirement or accept wet cloth.',
    ),
    d: unsupported(
      'The failed trial was kept separate from the two individually tested finished banners.',
    ),
  },
  'practical-dancer-stools': {
    a: unsupported(
      'Xara invited listening without requiring Wren to deny sadness about the injury.',
    ),
    b: unsupported(
      'Offering to place stools did not grant access to the host’s separately controlled furniture.',
    ),
    c: supported(
      'Xara accepted Wren’s chosen four-stool task and invited listening without dancing or an obligation to stay.',
    ),
    d: unsupported('A current ankle injury does not erase the remembered enjoyable dance.'),
  },
  'practical-story-props': {
    a: unsupported(
      'Rehearsing a fictional servant did not grant Yani authority over Xara’s offstage activities.',
    ),
    b: unsupported(
      'Reading a line neither agreed to the separate silver-cup loan nor moved the cups.',
    ),
    c: unsupported('Room sponsorship did not transfer ownership of Xara’s own prop set.'),
    d: supported(
      'The servant command was fictional dialogue; the actual agreement requires three checked stage props.',
    ),
  },
  'practical-household-shutters': {
    a: supported(
      'Zed’s flood help remains valued while the household’s later specific three-shutter agreement remains in force.',
    ),
    b: unsupported('Carrying blankets did not grant ownership of all later household decisions.'),
    c: unsupported('Zed’s new request did not change the deadline the steward expressly repeated.'),
    d: unsupported(
      'Remembering earlier help did not perform today’s installation on the still-open wall.',
    ),
  },
  'practical-shrine-lanterns': {
    a: unsupported('Amra’s thanks reveals no traveler’s private beliefs.'),
    b: supported(
      'Zed enjoyed the earlier welcome and accepted the distinct task of placing two lanterns tonight.',
    ),
    c: unsupported(
      'Personal comfort in a ritual did not grant Amra unrestricted use of Zed’s possessions.',
    ),
    d: unsupported('An earlier song did not fill and place tonight’s lanterns.'),
  },
  'practical-neutral-supplies': {
    a: unsupported('Belen’s disagreement did not remove the four neutral packets Amra inspected.'),
    b: unsupported('Earlier crossing help did not complete the present packet delivery.'),
    c: supported(
      'Belen stated a different preferred destination without changing the named custodian’s release.',
    ),
    d: unsupported('A friend’s urgency did not appoint them custodian of the faction’s supply.'),
  },
  'practical-private-letter': {
    a: unsupported(
      'Belen’s chosen earlier story did not authorize disclosure of relatives’ future letters.',
    ),
    b: unsupported('Inspecting outer recipient labels did not reveal the sealed contents.'),
    c: unsupported(
      'Hosting supper did not make Ceti either named recipient or their appointed receiver.',
    ),
    d: supported(
      'The earlier chosen story and the relatives’ separate sealed-delivery instructions have different disclosure permissions.',
    ),
  },
  'practical-teral-gasket': {
    a: supported(
      'Ceti touched one triangle, meaning sealed under the learned workshop convention; reported color does not change that functional mark.',
    ),
    b: unsupported('Doran’s sincerity did not give Ceti vision through the opaque mask.'),
    c: unsupported(
      'Earlier useful testimony did not turn later reported colors into Ceti’s own visual observations.',
    ),
    d: unsupported(
      'Feeling a collar mark reveals no contractor’s private intent or current material grant.',
    ),
  },
  'practical-machine-lights': {
    a: unsupported(
      'Yesterday’s charging trial failed before completion and logged no charged output.',
    ),
    b: supported(
      'The earlier failed trial and later successful qualified charging cycle retain their distinct actual results.',
    ),
    c: unsupported('One failed attempt does not establish that all later cells must fail.'),
    d: unsupported('Confirming tests did not transfer permanent control of Eris’s separate rack.'),
  },
  'practical-shifted-body': {
    a: unsupported(
      'Remembering a human grip did not install fine hand manipulation in the current four-footed body.',
    ),
    b: unsupported(
      'Fael’s question did not disclose a private certainty that the bowls would break.',
    ),
    c: supported(
      'Eris retains the delivery agreement and has a checked compatible pack; the agreement imposed no human-form requirement.',
    ),
    d: unsupported(
      'The supplied transformation preserves identity and memories rather than changing the recipient or quantity.',
    ),
  },
  'practical-rebreather-packs': {
    a: unsupported(
      'Earlier cooperation did not make an unsealed hall compatible with Fael’s current body.',
    ),
    b: unsupported('Gera’s praise did not alter certified routes or the current body check.'),
    c: unsupported(
      'Seeing the rebreather light did not supply the cart operator’s cargo acceptance.',
    ),
    d: supported(
      'The earlier repair succeeded under certified conditions and establishes no present unsealed-atmosphere capability.',
    ),
  },
  'practical-borrowed-warmth': {
    a: supported(
      'The measured cup transfer succeeded with one-fifth loss and a finite source, without creating recursive warmth.',
    ),
    b: unsupported('The observed transfer lost warmth; it did not establish source doubling.'),
    c: unsupported('Recording a source’s scale did not grant its owner’s permission to use it.'),
    d: unsupported('Praise for one cup did not produce the separate four washing units.'),
  },
  'practical-tide-gate': {
    a: unsupported('Confirming permission did not physically collect the four bundles.'),
    b: supported(
      'Indra confirmed the bounded outer-bed permit and appreciation without addressing the separate earlier fee dispute.',
    ),
    c: unsupported('The thanks did not expand the permit into the expressly excluded clutch zone.'),
    d: unsupported('An old disagreement does not erase the clearly heard current permit.'),
  },
  'practical-garden-clock': {
    a: unsupported(
      'The garden’s clock ratio did not cancel the separately accepted outside delivery.',
    ),
    b: unsupported('Jorin’s thanks did not obtain the porter’s acceptance or deliver packets.'),
    c: supported(
      'Jorin left at the stated limit after a pleasant visit, while Indra’s separate packet delivery remained unfinished.',
    ),
    d: unsupported(
      'Leaving at an announced boundary after thanks does not establish dislike of every earlier minute.',
    ),
  },
  'practical-memory-lantern': {
    a: unsupported(
      'Sharing a selected experience did not transfer the cabinet owner’s current property permissions.',
    ),
    b: unsupported('A remembered view did not physically place cells on today’s display rail.'),
    c: unsupported(
      'One selected shared scene did not disclose Kova’s unselected later experiences.',
    ),
    d: supported(
      'The shared view was dated last week and supplied neither a current cabinet observation nor a present owner grant.',
    ),
  },
  'practical-flood-boards': {
    a: supported(
      'The gauge and forecast worsened, while the supplied current observation still distinguishes that risk from water entering houses.',
    ),
    b: unsupported(
      'A conditional forecast does not establish that every house is already flooded.',
    ),
    c: unsupported('Some houses staying dry last year does not rule out this year’s flooding.'),
    d: unsupported('Liri’s shared-path request did not grant use of neighbors’ private boards.'),
  },
  'practical-grove-samples': {
    a: unsupported(
      'Repeated correlation does not establish a fixed private meaning for every future flash.',
    ),
    b: supported(
      'Flashes followed regular sweeps, but no irregular or shielded control distinguished communication from a local stimulus response.',
    ),
    c: unsupported('Mina’s smile did not establish the grove’s understanding of human language.'),
    d: unsupported('The fallen-capsule permit expressly excludes cutting central living tissue.'),
  },
  'practical-storm-roof': {
    a: unsupported('Acknowledging the old brace did not install today’s roof patches.'),
    b: unsupported('The old omission does not erase the clearly heard present acknowledgment.'),
    c: supported(
      'Nori now credits the brace and admits the omission, without resolving the separate stair dispute or completing current roof work.',
    ),
    d: unsupported(
      'A specific acknowledgment does not establish complete friendship or agreement on unrelated designs.',
    ),
  },
  'practical-community-generator': {
    a: unsupported(
      'The diagnostic did not create or install physical cells in the visibly empty sockets.',
    ),
    b: unsupported(
      'The sponsor’s announcement contradicts rather than overrides the direct observation of empty sockets.',
    ),
    c: unsupported(
      'Payment for a past circuit repair did not release present separately owned spares.',
    ),
    d: supported(
      'The diagnostic phase passed while the distinct physical cell installation remained incomplete in four visible empty sockets.',
    ),
  },
};
