## BW04

**Historical; superseded by current-format rejection · Restrictiveness: Medium.**

Earlier feeling conversion supported only the known fear/discomfort format and decay rate. Earlier equipment conversion rebound understood weapon references, rejected unsupported references and did not grant unknown item definitions packing compatibility. These were restrictions on the former conversion paths, not current save support. Current equipment ownership is in [objects](../../packages/domain/src/objects.ts); the [development save policy](../../AGENTS.md#development-save-policy) forbids retaining an older-format reader.

**Former reason / tradeoff:** Only understood legacy semantics could be converted without guessing or losing references. Current incompatible saves are rejected without conversion or deletion.

## SV17
