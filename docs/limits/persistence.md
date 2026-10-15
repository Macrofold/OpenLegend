## BW04

**Historical; superseded by current-format rejection · Restrictiveness: Medium.**

Earlier feeling conversion supported only the known fear/discomfort format and decay rate. Earlier equipment conversion rebound understood weapon references, rejected unsupported references and did not grant unknown item definitions packing compatibility. These were restrictions on the former conversion paths, not current save support. Current equipment ownership is in [objects](../../packages/domain/src/objects.ts); the [development save policy](../../AGENTS.md#development-save-policy) forbids retaining an older-format reader.

**Former reason / tradeoff:** Only understood legacy semantics could be converted without guessing or losing references. Ordinary loading rejects incompatible data rather than converting or truncating it; current-format initialization, validation and same-version restoration remain required. Mike-authorized replacement and reconciliation of incompatible development data follow the current root policy, including preservation and coherent placement of the combined meaningful content. That separate developer operation is not an older-format runtime reader. [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths) tracks the remaining obsolete feeling-conversion helper without reopening removed importers or claiming that ordinary loading calls it.

## SV17
