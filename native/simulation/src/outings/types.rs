use super::*;

/// As with activity/learning/models.rs, the canonical ordered cell is the only
/// body, while validated accessors/index facts avoid another writable map.
/// In particular JsText values and optional-present empty children are never
/// round-tripped through serde_json::Value. Live admission is still closed.
pub(crate) struct OutingRecord {
    body: SqlCell,
    pub(super) facts: crate::worlds::InstalledOutingFacts,
    pub(super) keys: index::OutingKeys,
    pub(super) storage: ResidentReservation,
}
impl OutingRecord {
    pub(super) fn prepare(
        body: SqlCell,
        mut allocation: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let body_bytes = body.heap_bytes().ok_or(ExecutionError::Capacity)?;
        // Admit the finite derived keys before cloning identifiers/encoding
        // relation tuples. The body was already decoded under its caller hold.
        allocation.resize(
            body_bytes
                .checked_mul(16)
                .and_then(|n| n.checked_add(8192))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let facts =
            crate::worlds::inspect_selected_outing(&body).map_err(|_| ExecutionError::Invariant)?;
        let keys = index::OutingKeys::new(&facts)?;
        let bytes = heap_sum([
            body_bytes,
            facts.heap_bytes().ok_or(ExecutionError::Capacity)?,
            keys.heap_bytes().ok_or(ExecutionError::Capacity)?,
            keys.index_bytes()?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        allocation.resize(bytes)?;
        let storage = budget.adopt_record(allocation)?;
        Ok(Self {
            body,
            facts,
            keys,
            storage,
        })
    }
    pub(crate) fn body(&self) -> &SqlCell {
        &self.body
    }
    pub(crate) fn id(&self) -> &str {
        &self.facts.id
    }
    pub(crate) fn kind(&self) -> OutingKind {
        self.facts.kind
    }
    pub(crate) fn status(&self) -> OutingStatus {
        self.facts.status
    }
    pub(crate) fn participants(&self) -> [&str; 2] {
        [&self.facts.proposer, &self.facts.recipient]
    }
    pub(crate) fn revision(&self) -> u64 {
        self.body
            .get("revision")
            .and_then(SqlCell::as_u64)
            .expect("validated outing revision")
    }
}
impl Serialize for OutingRecord {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.body.serialize(serializer)
    }
}
