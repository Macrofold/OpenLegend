//! Remove only explicitly revoked original references and remap their existing
//! receipt keys. Current fields/history are independent owners closed elsewhere.
use super::*;
impl OriginalJournal {
    pub(crate) fn revoke_originals(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        affected: &indexmap::IndexSet<String>,
    ) -> Result<(), ReceivedError> {
        let Some(owner) = state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
        else {
            return Ok(());
        };
        let keep = owner
            .received
            .iter()
            .filter(|source| !affected.contains(&source.id))
            .count();
        if keep == owner.received.len() {
            return Ok(());
        }
        self.slot(observer.len())?;
        let _remap = self
            .budget
            .reserve(
                owner
                    .received
                    .len()
                    .checked_mul(size_of::<Option<u64>>())
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let keys = owner
            .receipts
            .keys()
            .try_fold(0usize, |n, key| n.checked_add(key.len()))
            .ok_or_else(capacity)?;
        let mut storage = OriginalMetadata::projection(
            &self.budget,
            keep,
            owner
                .receipts
                .len()
                .checked_mul(2)
                .and_then(|n| n.checked_add(1))
                .ok_or_else(capacity)?,
            keys,
        )?;
        let mut remap = Vec::new();
        remap
            .try_reserve_exact(owner.received.len())
            .map_err(|_| capacity())?;
        let mut received = Vec::new();
        received.try_reserve_exact(keep).map_err(|_| capacity())?;
        for source in &owner.received {
            self.budget
                .retain_record(source.storage.as_ref().ok_or_else(invalid)?)
                .map_err(|_| capacity())?;
            if affected.contains(&source.id) {
                remap.push(None);
            } else {
                remap.push(Some(received.len() as u64));
                received.push(Arc::clone(source));
            }
        }
        let mut receipts = IndexMap::new();
        receipts
            .try_reserve(owner.receipts.len())
            .map_err(|_| capacity())?;
        for (key, index) in &owner.receipts {
            if let Some(index) = remap.get(*index as usize).ok_or_else(invalid)? {
                receipts.insert(key.clone(), *index);
            }
        }
        storage.settle(received.capacity(), &receipts)?;
        let owner = state
            .perception_evidence
            .as_mut()
            .and_then(|owners| owners.get_mut(observer))
            .ok_or_else(invalid)?;
        self.undo.push(OriginalUndo::PhaseReset {
            observer: observer.to_owned(),
            sequence: owner.received_at_sequence,
            received: std::mem::replace(&mut owner.received, received),
            receipts: std::mem::replace(&mut owner.receipts, receipts),
            storage: owner.original_storage.replace(storage),
        });
        Ok(())
    }
}
