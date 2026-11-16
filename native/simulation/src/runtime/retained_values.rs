//! Finite protection metadata for PostgreSQL's existing value reclamation.
//! No private body is exported and no member is recreated from history.
use super::*;

struct Ids<'a>(Option<&'a crate::received::ReceivedValues>);
impl Serialize for Ids<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let count = self.0.map_or(0, |values| values.shared_ids().len());
        let mut out = serializer.serialize_map(Some(count))?;
        if let Some(values) = self.0 {
            for id in values.shared_ids() {
                out.serialize_entry(id, &true)?;
            }
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    membership_revision: u64,
    ids: Ids<'a>,
}
impl NativeWorldSession {
    /// Compare the previous installation-local membership under the exact
    /// accepted cut. The caller already owns the immutable lookup on a hit.
    pub fn retained_values(
        &self,
        known: Option<(u64, u64)>,
    ) -> Result<Option<RuntimeJson>, RuntimeError> {
        // Installation needs this protection before exchanging SQL authority;
        // accepted() still excludes a private candidate and a stopped writer.
        let state = &self.session.accepted().map_err(failure)?.state;
        let values = state.reception.received_values.as_ref();
        let membership_revision = values.map_or(0, |values| values.membership_revision());
        if let Some((cut, revision)) = known {
            if cut != state.accepted_cut {
                return Err(failure(
                    "Native value protection request belongs to a different accepted cut",
                ));
            }
            if revision == membership_revision {
                return Ok(None);
            }
        }
        RuntimeJson::encode(
            &Product {
                world_id: &state.physical.header.id,
                generation: &state.generation,
                accepted_cut: state.accepted_cut,
                membership_revision,
                ids: Ids(values),
            },
            &self.budget,
        )
        .map(Some)
    }
}
