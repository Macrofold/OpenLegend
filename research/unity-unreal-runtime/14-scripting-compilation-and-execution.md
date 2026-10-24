# Scripting, compilation, and gameplay execution

Evidence cutoff: **2026-10-23**. This chapter uses current Unreal 5.8 documentation and Unity 6.6 documentation against the collection's [verified released-engine baseline](01-evidence-and-version-baseline.md): UE **5.8.4** and Unity **6000.6.7f1**. It examines how authored instructions become executable behavior, supplementing [data and concurrency](05-data-concurrency-memory.md), [content tooling](09-content-tools-ui-and-platforms.md), and [gameplay frameworks](11-gameplay-frameworks-and-semantic-systems.md).

For OpenLegend, the relevant existing distinction is between an authored rule, its execution mechanism, and permission to affect a world. The [engine/world owner](../../docs/engine-and-world-boundaries.md) explicitly does not require an immediate scripting runtime. This chapter makes no such proposal.

## 1. Unreal: native code, reflected interfaces, and Blueprint bytecode

Unreal's native build has two distinct stages. Unreal Build Tool invokes Unreal Header Tool to parse engine-specific header metadata and generate support for the UObject system; it then invokes the configured C++ compiler. UHT's generated registration/reflection support is therefore different from the machine code implementing gameplay. The current tool is implemented in C#; its language does not make the game's C++ classes managed C# objects. [S14-01]

Blueprint compilation turns graph assets and their properties into generated classes and functions. The compiler overview describes node expansion, dependency analysis, removal of unused nodes, intermediate statements, class layout/linking, bytecode emission, default-object transfer, and reinstancing. Compilation can therefore change both instructions and the shape of existing objects. The overview retains older internal terminology; its conceptual stages are cross-checked against the current compiler API, rather than treating every historical identifier as a current interface. [S14-02]

The 5.8 `FKismetCompilerContext` API still separates class-layout compilation from subsequent function compilation and exposes post-default-object callbacks. Its location is **Editor/KismetCompiler**. That is evidence for an authoring/compiler boundary: the ability to execute a generated class does not establish that a packaged player contains this graph compiler or can accept a newly edited graph. [S14-03]

Epic's current comparison states that native C++ executes as machine code while Blueprints execute compiled bytecode through a virtual machine. Exposed properties/functions, function libraries, and Blueprint-implemented or overridable events join the two environments. A Blueprint instruction can consequently enter a substantial native operation. Epic also distinguishes Blueprint Header View's generated declarations from function implementations that still require conversion; a generated header is not automatic native compilation of the graph's behavior. [S14-04]

**Interpretation.** Graph size, VM dispatch cost, native work invoked by nodes, and the frequency of invocation are separate quantities. Replacing instruction dispatch would not remove the collision query, asset load, or observation processing that an instruction requests. Likewise, specialized animation execution described in [chapter 08](08-rendering-animation-and-audio.md) must retain its own thread-safety contract; a broad statement about ordinary gameplay scripts does not define every graph runtime.

## 2. Unity: assemblies, JIT, and ahead-of-time compilation

Unity compiles scripts into assemblies. By default, most gameplay scripts enter `Assembly-CSharp.dll`; Assembly Definition and Assembly Reference assets change grouping and dependencies. Compilation order follows those dependencies. Smaller dependency groups can reduce recompilation after an edit, but an assembly boundary is not a separate process or a runtime scheduling policy. The current documentation also qualifies the special `Editor` folder rule: an enclosing custom assembly definition changes how those files are grouped. [S14-05]

The current backend overview identifies **Mono** and **IL2CPP**. Both use substantially the same base class-library/API surface, with backend and platform restrictions. Its platform table is explicit that availability varies by target; a working Editor session is not proof that the selected player target supports the same backend. Legacy glossary tooltips still mentioning an additional “.NET” backend are not used to override this current backend-specific account. [S14-06], [S14-09]

Unity's Mono fork powers the Editor and compatible players. It uses just-in-time compilation, translating managed instructions into machine code during execution, and participates in code reload and managed-object lifetime. This describes the current runtime; the separate discussion of prospective CoreCLR changes and garbage collection is in [chapter 05](05-data-concurrency-memory.md). [S14-07]

IL2CPP converts intermediate language into C++, then uses a platform toolchain to produce the shipped executable code. Its compilation occurs ahead of execution. The current guide distinguishes optimizing for runtime speed from optimizing for code size/build time: producing less specialized machine code can reduce build work and binary size while changing runtime performance. Burst can additionally compile compatible sections; it does not replace every ordinary managed gameplay path. No build-time or execution-speed comparison was measured here. [S14-08]

**Interpretation.** These pipelines move work between editing, building, startup, and execution. “Compiled” does not identify one cost model: Blueprint bytecode, a managed assembly, an IL2CPP native binary, and a Burst-compiled job are different products. Their callbacks, data access, and lifetimes remain part of the surrounding engine contract.

## 3. Reflection, stripping, and native callbacks

Unity's linker analyzes managed assemblies during the build and removes code it considers unreachable. Its evidence is the code present at build time. A later lookup by name or reflective serializer can therefore depend on code the static analysis did not retain. This is a dependency-discovery problem, distinct from whether the programming language supports reflection. [S14-09]

The preservation documentation separates roots that must survive stripping from annotations describing dependencies. `[Preserve]` and `link.xml` supply explicit retention information, with different granularity. Preserving a type can retain its default constructor as well; broad roots can retain more code than a narrowly described dependency. Thus smaller builds and successful reflective access are related tradeoffs, not independent guarantees. [S14-10]

Unity 6.6 explicitly supports reflection on AOT platforms, but not `System.Reflection.Emit`; IL2CPP also excludes C# `dynamic`. Its current generic support includes shared fallback code for cases not specialized at compilation, potentially with a runtime cost. Therefore, “AOT supports no reflection” and “every unforeseen generic invocation necessarily fails” are both overstatements. Native-to-managed callbacks marshaled as C function pointers have separate AOT requirements: static methods and the relevant `MonoPInvokeCallback` annotation, including specialization information where needed. [S14-11]

**Interpretation.** Reflection, serialization, code generation, and native interoperation ask different questions. Keeping metadata does not create a runtime compiler. Producing executable instructions does not define how references survive an unload, or which actions a caller is authorized to perform. Persistence and identity reconstruction remain the contracts examined in [chapter 07](07-networking-persistence-and-replay.md).

## 4. Reloading code is also a state transition

Unreal Live Coding rebuilds C++ and patches binaries in a running development environment. Its documented scope includes the Editor, Play In Editor, and a packaged desktop application attached to the Editor for debugging; consoles and mobile launches are excluded. Object reinstancing replaces instances after structural changes. The guide explicitly requires updating retained pointers or invalidating caches through reload callbacks. Constructor defaults changed in a `.cpp` file do not automatically update existing instances. These are concrete limits on interpreting “hot reload” as transparent state-preserving replacement. [S14-12]

Unity's current code lifecycle describes recompilation, serialization of managed state, removal/reloading of assemblies, deserialization, and initialization. The 6.6 documentation describes symmetrical lifecycle callbacks, including `OnCodeDeinitializing`, `OnCodeUnloading`, and `OnCodeLoaded`, rather than only the older collection of reload events. Callback availability in a Player does not imply identical reload behavior: the manual's table distinguishes initial code loading in Editor/Player from subsequent code reload in the Editor. [S14-13]

A material currency change is explicit in the **Unity 6.6 manual: domain reload on entering Play mode is off by default**. Static fields and static-event subscribers can consequently persist between sessions. This does not disable recompilation-triggered reloads, and an existing project's chosen settings may differ. An apparently fresh play session can therefore inherit state unless its lifecycle resets it. Editor iteration behavior is not evidence that a fresh packaged process starts with the same retained state. [S14-13], [S14-14]

## 5. Generated content, executable rules, and trust

The inspected mechanisms support several distinct meanings of “dynamic.” An application can change data consumed by existing code, instantiate a compiled class, load compatible prepared content, or obtain different code through a development/rebuild workflow. None of those operations alone establishes that a deployed player can compile arbitrary new source, that a new binary is compatible with existing state, or that an authored rule has permission to invoke every exposed operation. The compiler/module and AOT boundaries above explain why these claims require separate evidence. [S14-03], [S14-11], [S14-12]

**Analytical boundary.** Memory safety, API visibility, assembly dependencies, and a security sandbox are different properties. A safe managed or graph representation can still request expensive operations or manipulate any world state its exposed APIs permit. Conversely, restricting instructions does not establish domain correctness, private-knowledge isolation, causal continuity, or bounded total work. The inspected engine documentation establishes compilation and execution mechanisms; it does not establish a complete admission-and-isolation contract for arbitrary untrusted world-author code.

This distinction applies equally when a person or a model generates the source. Generation, compilation, loading, execution, and validation remain separate events. The [profiling/testing chapter](10-profiling-and-verification.md) discusses evidence that code performs the intended behavior; compiler success alone is a narrower result. No source generation, engine build, runtime patch, or execution experiment was performed for this chapter.

## Source provenance and inspection register

All sources below are first-party documentation inspected on **2026-10-23**. Unreal pages identify the 5.8 documentation family; Unity URLs pin the 6.6 manual. These are living manuals/API references, not assertions that every mechanism first appeared in this release. No videos, private engine source, or additional research papers were needed for this bounded chapter.

| ID     | Primary source                                  | Inspection and limits                                                                                                   |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| S14-01 | [Unreal Header Tool][S14-01]                    | UE 5.8; build phases, current C# tool, metadata/code-generation responsibility.                                         |
| S14-02 | [Blueprint Compiler Overview][S14-02]           | UE 5.8 live guide; compilation stages and reinstancing. Older internal names are not treated as current API guarantees. |
| S14-03 | [FKismetCompilerContext][S14-03]                | UE 5.8 API; Editor module location, layout-before-function ordering, default-object callbacks. No implementation audit. |
| S14-04 | [Coding in UE: Blueprint vs. C++][S14-04]       | UE 5.8; bytecode/native distinction, exposed interfaces, Header View conversion limit. No speedup inferred.             |
| S14-05 | [Introduction to assemblies in Unity][S14-05]   | Unity 6.6; default/grouped assemblies, dependency order, Editor-folder qualification.                                   |
| S14-06 | [Introduction to scripting back ends][S14-06]   | Unity 6.6; supported backend families and target-dependent availability. Older glossary text excluded.                  |
| S14-07 | [Mono scripting back end][S14-07]               | Unity 6.6; current Editor/player runtime and JIT/reload responsibility. GC details remain in chapter 05.                |
| S14-08 | [Introduction to IL2CPP][S14-08]                | Unity 6.6; IL-to-C++/native pipeline, build/code-generation tradeoff, coexistence with Burst.                           |
| S14-09 | [Managed code stripping][S14-09]                | Unity 6.6; static reachability analysis and build-time evidence; stale backend glossary tooltip checked separately.     |
| S14-10 | [Preserving code using annotations][S14-10]     | Unity 6.6; roots/dependencies, preservation granularity, reflection limits.                                             |
| S14-11 | [IL2CPP limitations][S14-11]                    | Unity 6.6; reflection/emission, generic fallback, native callbacks, unsupported dynamic language feature.               |
| S14-12 | [Live Coding][S14-12]                           | UE 5.8; supported development contexts, reinstancing, pointer/cache cleanup, default-value caveat.                      |
| S14-13 | [Code reload and the code lifecycle][S14-13]    | Unity 6.6; reload phases, lifecycle attributes, explicit Editor/Player timing distinctions.                             |
| S14-14 | [Enter Play mode without domain reload][S14-14] | Unity 6.6; documented default, static-state/event retention, distinction from code-change reloads.                      |

[S14-01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-header-tool-for-unreal-engine
[S14-02]: https://dev.epicgames.com/documentation/unreal-engine/compiler-overview-for-blueprints-visual-scripting-in-unreal-engine
[S14-03]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/KismetCompiler/FKismetCompilerContext
[S14-04]: https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus
[S14-05]: https://docs.unity3d.com/6000.6/Documentation/Manual/assembly-definitions-intro.html
[S14-06]: https://docs.unity3d.com/6000.6/Documentation/Manual/scripting-backends-intro.html
[S14-07]: https://docs.unity3d.com/6000.6/Documentation/Manual/scripting-backends-mono.html
[S14-08]: https://docs.unity3d.com/6000.6/Documentation/Manual/il2cpp-introduction.html
[S14-09]: https://docs.unity3d.com/6000.6/Documentation/Manual/managed-code-stripping.html
[S14-10]: https://docs.unity3d.com/6000.6/Documentation/Manual/managed-code-stripping-preserving.html
[S14-11]: https://docs.unity3d.com/6000.6/Documentation/Manual/scripting-restrictions.html
[S14-12]: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime
[S14-13]: https://docs.unity3d.com/6000.6/Documentation/Manual/programming-code-lifecycle.html
[S14-14]: https://docs.unity3d.com/6000.6/Documentation/Manual/domain-reloading.html
