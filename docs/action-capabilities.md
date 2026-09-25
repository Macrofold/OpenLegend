### Reconciliation notes from the implemented review

The current adapter carries response-local operation identity, original request and manifest revision into native admission. Saved pending identity additionally includes explicit target and queue/replace mode; the exact alternative is never silently overwritten. These fields should map to the common invocation/authority contracts rather than become a competing definition registry. Current persistence follows the active in-place upgrade policy. Missing non-authoritative target/mode metadata is defaulted conservatively; existing alternative modes, commands, IDs and text remain unchanged.

