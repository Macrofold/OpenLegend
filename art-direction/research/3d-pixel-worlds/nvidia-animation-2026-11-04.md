# NVIDIA motion models for OpenLegend

**Research checked November 4, 2026 (UTC).** This records the investigation requested by Mike and the reasons for the selected art-workflow design. Sources were inspected; neither model, a hosted generation job, nor a Blender integration was executed in this research. No model quality, setup time, accepted-clip cost or game performance was measured. Provider spending: $0. The [feature specification](../../../docs/projects/art-workflow-feature-spec.md#37-nvidia-motion-authoring) owns the decisions; the [technical design](../../../docs/projects/art-workflow-tech-design.md#11-nvidia-motion-authoring) owns implementation; [AF14–AF17](../../../docs/maintainers/art-direction.md#art-flow-follow-through) own delivery and qualification. Current operation belongs in the [animation procedure](../../../docs/production-workflows/art-flows/animation.md).

## 1. Which release, and what can we use?

There are two relevant NVIDIA releases. **MotionBricks is the recent pose-to-motion release; Kimodo is the useful companion for text-to-motion authoring.** Confusing them would produce an unusable integration: a natural-language action is not a MotionBricks input.

| Model | Public availability checked | Actual inputs and output | OpenLegend decision |
| --- | --- | --- | --- |
| MotionBricks | Standalone release v0.2.0, October 23; NVIDIA's October 27 RTX Spark announcement discusses it. Research and demonstrations appeared earlier. | A short history of human or robot poses plus target poses produces a short continuation on a supported fixed skeleton. No text, image or scene-geometry input. | Optional offline generation of a transition between authored poses, once needed. Do not add inference to the running game. |
| Kimodo | Official SOMA RP v1.2 weights dated October 15; the initial release was March 16. Public code, model cards, command-line tools and a demo are available. | Text and duration, optionally spatial/pose constraints, produce editable human skeletal motion. | Reuse compatible existing clips first; prefer Kimodo for missing human motions after the chosen route and target rig pass qualification. |

Sources: [MotionBricks release history](https://github.com/NVlabs/motionbricks/blob/main/CHANGELOG.md), [NVIDIA announcement](https://developer.nvidia.com/blog/nvidia-rtx-spark-powers-neural-rendering-and-ai-characters-in-games/), [Kimodo model card](https://huggingface.co/nvidia/Kimodo-SOMA-RP-v1.2).

Both are accessible to an individual developer. Neither is a complete character-production tool: they do not make our character mesh, skin it, solve cloth or automatically make every contact correct. The integration work is source import, retargeting, correction, bake/export, review and preservation. OpenLegend already has the last several stages and a shared motion library, so the appropriate addition is small offline tooling, not a new runtime animation architecture.

## 2. MotionBricks: capabilities and practical limits

The public [repository](https://github.com/NVlabs/motionbricks) includes pretrained ONNX models through Git LFS and tools/demos; [Hugging Face](https://huggingface.co/nvidia/MotionBricks) supplies model artifacts including SafeTensors. Human SOMA and Unitree G1 robot models are distinct. The Unreal Engine demonstration integration is **not** included in the standalone release. A demo video does not establish a ready PlayCanvas plugin.

For the human route, [SOMA model documentation](https://github.com/NVlabs/motionbricks/blob/main/docs/soma_model.md) describes a fixed-proportion body model with 30 predicted body joints; fingers are not generated. Four preceding poses and one to four target poses guide a chunk. Raw chunks contain 24–64 frames at 30 Hz; trimming three frames at each end leaves 18–58 usable frames, about 0.6–1.9 seconds. The caller can generate successive chunks for longer behavior. Target poses, timing and the world-space frame must be prepared correctly; increasing the chunk count is not an automatic gameplay controller.

The model does not read our chair, terrain, obstacle mesh or physics. The caller supplies appropriate poses and constraints, then checks the result against the intended environment. The project's reusable pose sets, called Smart Primitives, illustrate this approach for actions such as sitting or stepping/vaulting. They do not grant OpenLegend a sitting, traversal or interaction capability. A transition can be baked offline only after the target action and its contacts are defined.

The interactive NVIDIA demos use a Windows/Linux x86 environment with NVIDIA GPU support; the published RTX 4090 setup is a tested configuration, not a demonstrated minimum. A [plain ONNX Runtime example](https://github.com/NVlabs/motionbricks/blob/main/docs/onnx_inference.md) includes a CPU route, so it would be inaccurate to say the model categorically cannot run without CUDA or on a Mac. Packaging, conversion, speed and editing on Mike's particular machine remain unverified.

The [runtime API](https://github.com/NVlabs/motionbricks/blob/main/docs/runtime_api.md) reports SOMA single-sample TensorRT plan timings of roughly 2.5 ms in FP32 and 1.28 ms in mixed precision on its Windows RTX 4090 setup. Those are model-plan measurements, selected from builds; they exclude the complete input preparation, contact correction, retargeting, rendering and game workload. They are not an OpenLegend frame-time claim or a reason to ship a GPU model to every player.

### Rights that change the design

- The source code is Apache-2.0; pretrained weights have the [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/). Keep both notices with the applicable acquired material. The model agreement permits commercial use subject to its terms and does not make NVIDIA the owner of generated outputs; it does not clear unrelated input rights.
- **Bundled BONES sample motions are separately restricted.** Their [license](https://github.com/NVlabs/motionbricks/blob/main/assets/motions/LICENSE.txt) and [notice](https://github.com/NVlabs/motionbricks/blob/main/assets/motions/README.md) limit them and their derivatives to evaluation/testing and prohibit production use or redistribution. Do not ship those samples, retargeted versions, or transitions derived from them. Start production transitions from our own or appropriately licensed poses.
- A generated transition needs a source record for its input poses as well as its model. Model availability does not make sample input data production-safe.

## 3. Kimodo: why it is the default new-motion candidate

The official [repository](https://github.com/nv-tlabs/kimodo) and [limitations](https://research.nvidia.com/labs/sil/projects/kimodo/docs/key_concepts/limitations.html) describe a text-conditioned human motion model with optional pose, path and end-effector constraints. Ordinary locomotion, work-like actions, gestures, emotional acting and some combat are plausible authoring targets. The supported upstream duration is at most **10 seconds per prompt**, at 30 Hz. The roughly 282-million-parameter motion model also depends on a large text encoder; quoting only the motion network's size understates local setup.

The model can provide strong first drafts; it does not promise a closed loop, accurate interaction with arbitrary geometry, hand/finger performance, a faithful multi-actor exchange or exact game timing. Feet/constraint postprocessing helps but does not replace review. Generate one action or useful phase, then correct it on our rig. A recognizable everyday action at play distance is more useful than many unreviewed clips.

### Version and license selection

Use the SOMA **RP** model for our initial human authoring route. Official v1.2 corrects evaluation-data leakage in v1.1 and improves some foot behavior; its reported text results are not uniformly higher after leakage removal. This is a reason to pin versions and compare actual outputs, not to assert every v1.2 result is better. [Model-card evidence](https://huggingface.co/nvidia/Kimodo-SOMA-RP-v1.2).

SOMA and G1 RP/SEED releases are under the NVIDIA model agreement. **The SMPL-X variant is restricted to noncommercial research** by its separate model/body terms; exclude it from the production route even if a host lists it beside SOMA. G1 is a robot skeleton, not a shortcut for our people. Record the actual selected model, not just “Kimodo.” [SMPL-X card](https://huggingface.co/nvidia/Kimodo-SMPLX-RP-v1).

### Native CLI and local setup

The [installation guide](https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/installation.html) describes the Python environment and model access. The full GPU setup is approximately 17 GB VRAM; placing the text encoder on CPU with `TEXT_ENCODER_DEVICE=cpu` reduces GPU memory below roughly 3 GB with a latency tradeoff. These are upstream configurations, not a benchmark on Mike's hardware. Access to gated `Meta-Llama-3-8B-Instruct` and a Hugging Face token is part of the native setup. Tokens stay out of study records and Git.

The official [CLI](https://research.nvidia.com/labs/sil/projects/kimodo/docs/user_guide/cli.html) exposes `kimodo_gen`, explicit model selection, prompt/duration/seed and SOMA BVH export. `--bvh_standard_tpose` avoids relying on the special BONES rest convention. Native outputs include NPZ motion data and BVH; the documented CLI does not supply a native GLB/FBX character exporter. Its internal positional units are metres and BVH export uses centimetres. Full SOMA export has more joints than the 30 predicted body joints. Our importer must convert once and map the source skeleton to the **existing target**; the source skeleton is never automatically our runtime family.

## 4. Routes an individual can actually access

| Route | What is available | What it still requires | Role in the design |
| --- | --- | --- | --- |
| Official [Kimodo Hugging Face Space](https://huggingface.co/spaces/nvidia/Kimodo) | Public interactive demo; listed as running on L40S when checked | Actual queue/access/export/version checked when used; no production availability guarantee | Try a prompt and inspect the concept. It is not a required unattended production API. |
| Community [Replicate `sprited/kimodo`](https://replicate.com/sprited/kimodo) | Hosted API; published source model v1.1; BVH/NPZ/GLB, optional FBX for a supplied Mixamo rig | Replicate account/API access, exact deployment pin, output inspection, bounded spend and our own retargeting | First hosted route to qualify for agent-operated new-motion authoring. It is not an NVIDIA-operated service or official v1.2. |
| Official local/self-hosted v1.2 | Current upstream model and CLI, explicit parameters and artifacts | Python/dependencies, model/text-encoder access and suitable hardware | Optional route when already provisioned or when version control/privacy makes setup worthwhile; same downstream asset contract. |
| [Animatica Choreographer](https://animatica.ai/kimodo), [Blender integration](https://animatica.ai/blender/docs/overview) | Provider advertises Blender 5+, cloud Kimodo, retargeting onto an existing rig and editable keys; its published route used v1.1 | Account, plugin installation, current plan and actual end-to-end proof | Optional artist-facing route. Claims of ten free monthly generations/no card are a dated offer, not our guaranteed budget. |
| Community Mac tooling | [Kimodo Blender/MPS project](https://github.com/atticus-lv/kimodo_motion) advertises Apple-silicon operation and recommends 32 GB+ RAM with roughly 25–50 GB disk | Third-party install, matching model version, hardware qualification and export checks | Optional experiment; not a prerequisite for Mike and not qualified here. |

The [Replicate API](https://replicate.com/sprited/kimodo/api) and [readme](https://replicate.com/sprited/kimodo/readme) distinguish direct files from a bundle and expose a skeleton-mesh preview switch. A skeleton GLB is motion data, not a finished character. Its FBX path's Mixamo-rig restriction is a poor default for OpenLegend's other rigs. The service UI permits durations beyond the upstream 10-second envelope; our route stays within the upstream limit. A displayed typical single-sample cost was around $0.007 at lookup and changed between reads; queue, model warmup and billing vary. Do not use that estimate as a fixed quote or upper bound for a batch.

For MotionBricks, a [community browser robot playground](https://townbox-motionbricks-playground.static.hf.space/index.html) demonstrates a possible ONNX-in-browser route. Its published roughly 369 MB model download, worker execution, 8 GB RAM recommendation and 50–250 ms claims were not measured here, and it is a robot demonstration. The community MLX reimplementation examined during research does not use NVIDIA's released pretrained weights; it is not evidence of a ready equivalent human Mac route. Neither justifies a browser-runtime dependency for this game.

## 5. Fit to OpenLegend and rejected complexity

The inspected baseline was `claude/art-workflow-redesign` at `c4549bf34e4d2fb6b8d3c6891f7eda01801d7493`. It already has a Blender `art-tool.py clips` command, world-space retargeting with target-to-source bone maps, explicit rest alignment, stride extraction and ground-speed reporting, external asset storage, and the game's local study preview. Meshy clips already serve the mercenary, automatic rigs and MPFB study people. This is source inspection and prior recorded evidence, not a new execution of those assets.

**Selected design:** reuse suitable clips; generate missing human motion with Kimodo; adapt to the chosen rig once, correct and bake; assemble ordinary GLB clips; review at normal game scale; preserve editable files and exact external references. MotionBricks joins the same downstream route only for a justified pose-driven transition. Static models, concept images, UI, rigid props, creatures and rigs needing no motion do not trigger either model. Rigging remains a separate step.

The value is readable intentional action: dangerous preparation and recovery; ordinary work with real tools and materials; carrying, offering, reluctance, recovery and expressive social behavior. Those can make invention, independent people and consequences visible. A stock emote or extra attack pack is not automatically progress toward a playable world. Prioritize one useful performance in an existing scenario, then reuse it when anatomy, contact and meaning match.

Rejected for this delivery: a live neural character controller; downloading weights to players; inference per NPC/frame; procedural animation deciding hits or physical movement; a new provider platform/job database; replacing the shared skeleton with SOMA; generating every old clip again; mandatory paid Blender plugins; widening NPC, traversal or psychology mechanics merely because a model can make an illustrative clip. A hidden belief must not leak through an automatically selected gesture. World definitions/action results still decide what is observable and when effects occur.

## 6. Facts still needing execution

The design decision is made; these are bounded qualification tasks, not unanswered product questions:

1. Authenticate the selected host, record an immutable deployment and actual model identifier, and establish a live rate/termination-based maximum before the first paid prediction. If access or billing cannot be bounded, prepare the free/offline work and report the specific dependency.
2. Inspect actual output skeleton names, axes, rest pose, root translation and duration. Implement the smallest correct source import and two verified maps: current mercenary/automatic human route and MPFB. A file extension or matching label does not establish compatibility.
3. Run a small paired study on one existing humanoid and a second family target. Include a meaningful everyday motion, an expressive one-shot and a contact/locomotion stress case; compare correction effort and review the whole accepted output rather than model inference alone.
4. Establish whether hosted v1.1 is good enough for the chosen clips or whether native v1.2 materially reduces correction. Do not change pins invisibly or call one version by another's name.
5. If a real target-pose transition remains awkward by ordinary keying, qualify MotionBricks using production-safe input poses and the same target/export checks. No transition need means no MotionBricks installation task on the critical path.

Current status: research and design only; provider access, target maps, clip acceptance, end-to-end costs and model execution remain unverified. Existing art-review questions, rig-family qualification and gameplay action gaps keep their existing owners.
