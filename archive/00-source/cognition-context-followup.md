# Cognition, context and reflection follow-up

Recorded September 19, 2026 (America/New_York). The pasted proposal below is preserved verbatim. The accompanying instruction was: “Before implementing any of this, update documentation in the right spots and create tasks in the appropriate docs to outline what needs to be built for all this”.

The [canonical design](../../docs/memory-architecture.md) and [delivery tasks](../../docs/maintainers/cognition-redesign.md) interpret this request. Token counts and latency below are user-reported diagnostics, not independently reproduced measurements. The phrase “Any event that no agent is aware of ever needs to be stored” is interpreted in context as “never needs to be stored” in the experiential event log; committed simulation state still persists.

## Pasted proposal

ok the agent context and output requirements are WAYYYY TOO HUGE. it caused 5000 thinking outpout and 2500 response output, and crazy input size too. The agent took 1 min to respond.

#1: xhigh reasoning.
 5,951 of 7,130 output tokens came from this alone.
#2: Every speech event is triggering a full mind-update task.
 Your explicit request asks for situation + relationships + goals + concerns.
#3: Memory retrieval is returning 92/92 memories.
 This is essentially “include whole history,” not retrieval.
#4: Many of those memories are repetitive simulation noise.
#5: You're carrying a giant structured-output schema.

Once those are fixed, hi should realistically be something like a few hundred input tokens and 10–50 output tokens, not 16,548 total tokens.
And importantly, the current output isn't really a 7,000-token NPC reply. It's roughly 6,000 tokens of private deliberation + ~1,200 tokens of state-management JSON + ~100ish tokens of actual NPC conversation. That's why it feels so absurd.



----------------------------------------------------------------------

we should not ask the agent to return these
- policy (what is this even)
- expectedRevision (what is this even)
- thought (we don't need the internal thoughts, it will update it's own )
- documents (what are these why is this complicated with title text evidence what is this for?)
- removeDocuments ???
- records ?????


----------------------------------------------------------------------

context is full of unnecessary stuff too - let's rethink how to construct agent thought context. Key principle is minimize number of tokens and pre-process so the context arrives as close to plain English as possible:
- instructionsVersion ??
- policy ??
- decisionId ??
why do they need to know the world id and profile and simulation time?
it should just be time of day, and calendar day.
and current temperature, stuff like that

it does not need to know self is an npc.
it does not need every single nearby entity - there should be an attention mechanism that we use Jev for. That should take in all of the nearby stuff and ask "what am i paying attention to right now?" noul each one has a yes or no answer and if yes, it gets put into the LLM context
same with its inventory and knownRecipes and recentEvents and recall/memories

for the recent events, i don't know if this needs to be separate from recall. recent events an actor is aware of is the same thing as things in their recall.
also, these should only be events that the actor personally was aware of
- every actor (including the player) should only be aware of certain events. There are all the events in the world, and for each one, only a subset of agents are aware of them. Any event that no agent is aware of ever needs to be stored as an event. It still occurred in the simulation but it does not need to be recorded as an event.
- this could be implemented as a big "awareness" join table between agents and events
for the thought context here, i think recentEvents should just get woven into the recall section.
we also don't need all these technical fields. whatever is passed to the agent reasoning LLM should be 100% minimal. we don't need id, at should be a readable datetime (in-game datetime), and should just be a textual representation like "player moved to X, Y".

whats inventory vs materials?

"request": "Current situation, relationships, goals and concerns" what's this?

coverage - no idea what this is

acceptedMind - this is confusing. Should't it be like "about me" or something. We don't need all these empty keys like revision, evidence, protected, etc.
same throughout the entire context. This is going into an LLM agent brain we want to occams razor all token bloat we are paying for EVERY UNNECESSARY CHARACTER in the input and output we need to minimize minimize minimize minimize. Only include an empty value if the fact that its empty is information.


{
    "id": "identity",
    "revision": 1,
    "documentId": "identity",
    "kind": "identity",
    "subjectId": "ada",
    "source": "authored",
    "confidence": 1,
    "trust": null,
    "status": "active",
    "evidence": []
}
this seems pretty useless

processedWatermark ??

quotaUsage - this is not needed for speech. When providing instructions for reflection update via harness only.

memories yeah but just make it a list of text. some info useful like the entity or whatever but every should be a string we should programmatically construct them as strings from the structured data. Like 
{
    "id": "memory-1031",
    "at": 392206,
    "kind": "episode",
    "source": "heard",
    "summary": "You: hi",
    "entityIds": [
        "player",
        "ada"
    ],
    "speakerId": "player",
    "eventType": "speech"
},
--> "I heard john say hi"

memories should ALWAYS BE STORED with a field that is a plain english textual representation of it. You can use GPT-5 nano to summarize if needed.

also most of these memories are pretty useless routine things and they are being conflated with recent events.
i think probably only memories from the past 6 in-game hours should be passed in raw. every hour, raw memory that are older than 6 hours should get consolidated using summarization models like GPT-5 nano that group together like entries, remove memories that are inconsequential (like player moved to X,Y), or certain memories emphasized if they are important. This is a light brain-memory-attention process it should not too aggressively remove memories but just does easy routine cleanup so we don't have 20 entries of "Ada ate wild berries to stave off hunger." it can just be like "This morning I ate a lot of wild berries to satiate my hunger" and "I watched john gather a bunch of fiber". This should ALSO include world events that the actor is aware of.
for this reason, world events the actor is aware of do NOT need to independently be recorded as memories, because these aware-of world events should also get consolidated into their consolidated memories by summarization of [raw memories + raw aware world events]
then when constructing conversation context we just pass in the consolidated memories + recent raw memories + recent raw world events they were aware of





-------------------


Let's completely rearchitect how interactions work. First update our documentation and add tasks to work towards this:

- Triggering speech or thinking does not require "deep reflection" aka a full harness call
	- Environmental triggers trigger various levels of agent responses including
		- routine programmatic responses
		- Jev-based decision routing (semantic level 1, can lead to high semantic levels based on the routing)
		- fast-thought LLM mini models (semantic level 2)
		- complex thought LLM + low thinking (semantic level 3)
		- complex thought LLM + high thinking (semantic level 4)
		- full harness run (semantic level 5)
		- Jev is always triggered to determine if it should escalate to a higher semantic level based on the specific circumstance
	- what triggers each level can be configurable as malleable in-game mechanics via the inventions and such.
	- If you talk to an agent, it automatically triggers level 2. 

	- Any semantic reasoning receives the Context which is everything we talked about above.

Therefore talking to an agent does NOT trigger a full harness run unless Jev decides it should.


When is harness run triggered? Reflection.
The harness run is where the agent reflects and actives does multi-turn thinking and engages its inner world.
The persistent agent workspace is its inner world.
This happens during dreaming, during downtime, and after significant events.
Certain specific events may be marked as signficant by the game which triggers reflection.
Certain other events trigger a significance check, determined by Jev
This always happens in the background - the game engine does not way for the result of reflection to proceed in any way. Reflection can make a bunch of edits to its inner world files, and should return with one or more short thoughts (no more than 20 words). These are primarily for presentation - they go into an agent's "thought history" visible in god mode.
At the end of reflection, the game should snapshot and pull the files into the postgres database as a single text entry in the inner_world db table one for every agent. This inner world goes into the context of every decision.


When do agents dream? If they have been asleep for at least 2 hours.
Agents must rest for 8 hours a day







