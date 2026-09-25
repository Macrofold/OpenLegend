# Voice, generated assets and content delivery

[Research index](../README.md) · Proposed scaling considerations; the [spatial specification](../../../../docs/spatial-world.md), sensory policy and existing art lifecycle retain ownership.

## Keep large content out of simulation replication

An entity's authoritative body and capability do not depend on whether its final sprite or model has downloaded. Publish an admitted entity with a native fallback, then load approved versioned assets asynchronously. A late asset cannot change hitboxes, revive a deleted actor or attach to a restored timeline incorrectly.

Use immutable content references and a manifest that pins approved versions. CDN caching is valuable for public shared art; private generated content needs scoped access. Avoid sending raw asset blobs in every game snapshot or placing large meshes in a world journal.

Separate asset generation, validation, transcoding, storage and publication. These can be a small worker pipeline initially. Bound image dimensions, compressed and decoded size, mesh complexity, animation count, texture memory and processing time. Reuse definitions and approved variants rather than generating an independent asset for every identical item.

## Browser delivery budgets

Optimize first playable scene, nearby asset working set and frame-time stability. Stream by relevance and priority. Use supported texture/mesh formats and level-of-detail policies appropriate to target devices, with explicit fallbacks. The exact graphics format is a benchmark decision rather than a permanent domain contract.

PlayCanvas' optimization documentation supports measuring draw calls, batching and device constraints. The game's own workloads must establish how many visible sprites, animated meshes, transparent layers and lights remain smooth on representative hardware. [S43](../sources.md#s43)

A CDN reduces repeated asset delivery work; it does not reduce the authoritative cost of the entity. Conversely, a cheap simulation can still overwhelm a mobile GPU with thousands of transparent billboards. Keep those budgets separate.

## Voice is a separate fanout system

Transport voice/media separately from reliable gameplay effects. Compute who may hear under the game's policy, enforce delivery permissions, then apply client-side spatialization and volume. Turning volume to zero or disabling automatic subscriptions is not confidentiality against a modified client.

LiveKit documents track subscription permissions and notes that published tracks are broadly subscribable by default unless restricted. Validate that the selected deployment and trusted publishing/control path can enforce OpenLegend's precise audience, including changes and reconnects. Do not rely on a hostile client voluntarily preserving those settings. [S46](../sources.md#s46)

Begin with explicit supported conversation channels when that is the only enforceable privacy model. Generalized proximity speech requires hearing-policy integration, rapidly changing permissions, efficient recipient updates, and tests for unauthorized resubscription.

## Generate once, deliver to permitted recipients

A shared NPC utterance should normally have one synthesis operation, not a separate TTS call for every listener. Different authorized detail classes may need different presentation: a distant listener may receive a muffled sound rather than intelligible words. The media payload must not disclose exact speech merely because the client is expected to muffle it.

Transcribe a human utterance once where appropriate, then project only eligible evidence to listeners. Preserve attribution, event-time origin and the distinction between speaker identity and an unidentified voice. Captions and text transcripts must respect the same permissions as audio.

Associate each streamed fragment with utterance, speaker, conversation, source revision and world timeline. Interruption, cancellation and delayed synthesis need explicit behavior. Already-heard audio cannot be retracted by rolling back a world state.

## Cost and operational requirements

Measure concurrent speakers, listeners per speaker, encoded bitrate, retransmission/TURN usage, synthesis/transcription cost, first-audio latency, browser decode CPU and permission-update rate. A room with 1,000 listeners is a different workload from 1,000 separate two-person conversations.

Use private access tokens and bounded asset lifetimes where needed. Retained recordings, voice consent, moderation access, deletion and regional processing require explicit product/legal policy before launch; this chapter does not select a retention period or make a compliance claim.

Test movement across hearing boundaries, loss of permission mid-utterance, background tabs, reconnects, late captions, inaccessible historical audio and restored saves. Verify received bytes, not just what the ordinary UI plays.
