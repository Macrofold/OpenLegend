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
    ids: Ids<'a>,
}
impl NativeWorldSession {
    pub fn retained_values(&self) -> Result<RuntimeJson, RuntimeError> {
        // Installation needs this protection before exchanging SQL authority;
        // accepted() still excludes a private candidate and a stopped writer.
        let state = &self.session.accepted().map_err(failure)?.state;
        RuntimeJson::encode(
            &Product {
                world_id: &state.physical.header.id,
                generation: &state.generation,
                accepted_cut: state.accepted_cut,
                ids: Ids(state.reception.received_values.as_ref()),
            },
            &self.budget,
        )
    }
}
