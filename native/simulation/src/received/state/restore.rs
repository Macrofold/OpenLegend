//! Rewind replaces only namespace/actor epochs and exact archive accounting.
//! Existing receipts keep their original epoch, source and eligibility facts.
use super::*;
use crate::host::ByteBudget;
use crate::restore::RestoreArchiveCategory as Category;
impl TemporalState {
    pub(crate) fn actor_ids(&self) -> impl Iterator<Item = &str> {
        self.actors.keys().map(String::as_str)
    }
    pub(crate) fn begin_restore_epoch(
        &mut self,
        namespace: &str,
        identity: &mut crate::identity::IdentityState,
        budget: &ByteBudget,
    ) -> Result<(), ReceivedError> {
        let err = || ReceivedError("Restore receipt epoch requires actual funded temporal owners.");
        if crate::encoding::js_trim(namespace).is_empty() || namespace.encode_utf16().count() > 64 {
            return Err(err());
        }
        let count = self.actors.len();
        let fixed = self
            .header
            .namespace
            .capacity()
            .checked_add(namespace.len())
            .and_then(|n| n.checked_add(count.checked_mul(std::mem::size_of::<String>() + 256)?))
            .ok_or_else(err)?;
        let bytes = self
            .actors
            .iter()
            .try_fold(fixed, |n, (id, actor)| {
                n.checked_add(id.len())?
                    .checked_add(actor.header.heap_bytes()?)?
                    .checked_add(namespace.len())
            })
            .ok_or_else(err)?;
        let mut storage = budget.reserve(bytes).map_err(|_| err())?;
        self.reserve_undo_slots(1, budget)?;
        let before_bytes = self.header.namespace.capacity();
        let after_bytes = namespace.len();
        let total = self
            .root_storage
            .bytes()
            .checked_sub(before_bytes)
            .and_then(|n| n.checked_add(after_bytes))
            .ok_or_else(err)?;
        if total > self.root_storage.bytes() {
            let growth = storage
                .split_off(total - self.root_storage.bytes())
                .map_err(|_| err())?;
            budget
                .fund_backing(&mut self.root_storage, growth)
                .map_err(|_| err())?;
        }
        let before = std::mem::replace(&mut self.header.namespace, namespace.to_owned());
        self.root_storage.resize(total).map_err(|_| err())?;
        self.undo.push(TemporalUndo::Namespace { before, storage });
        let ids = self.actors.keys().cloned().collect::<Vec<_>>();
        for id in ids {
            let actor = self.actors.get(&id).ok_or_else(err)?;
            let _copy = budget
                .reserve(
                    actor
                        .header
                        .heap_bytes()
                        .ok_or_else(err)?
                        .checked_add(namespace.len() + 64)
                        .ok_or_else(err)?,
                )
                .map_err(|_| err())?;
            let mut header = actor.header.clone();
            header.terminal_reserved_bytes = 0;
            header.epoch = format!(
                "{}-{}",
                namespace,
                identity.allocate("receipt-epoch").map_err(|_| err())?.id
            );
            self.replace_header(&id, header)?;
        }
        Ok(())
    }
    pub(crate) fn restore_archive_totals<'a>(
        &mut self,
        rows: impl Iterator<Item = (&'a str, Category, u64)>,
        budget: &ByteBudget,
    ) -> Result<(), ReceivedError> {
        let err =
            || ReceivedError("Restore archive totals do not continue complete current accounts.");
        let bytes = crate::host::retained_size::map_storage::<&str, [AccountCharge; 3]>(
            self.actors
                .len()
                .checked_mul(2)
                .and_then(|n| n.checked_add(3))
                .ok_or_else(err)?,
        )
        .ok_or_else(err)?;
        let _totals = budget.reserve(bytes).map_err(|_| err())?;
        let mut totals = IndexMap::<&str, [AccountCharge; 3]>::with_capacity(self.actors.len());
        for (actor, class, bytes) in rows {
            if !self.actors.contains_key(actor) {
                return Err(err());
            }
            let charge = &mut totals
                .entry(actor)
                .or_insert_with(|| std::array::from_fn(|_| AccountCharge { bytes: 0, count: 0 }))
                [match class {
                    Category::Optional => 0,
                    Category::Required => 1,
                    Category::Speech => 2,
                }];
            charge.bytes = charge
                .bytes
                .checked_add(bytes)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or_else(err)?;
            charge.count = charge
                .count
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or_else(err)?;
        }
        let names = self.actors.keys().try_fold(
            self.actors
                .len()
                .checked_mul(std::mem::size_of::<String>())
                .ok_or_else(err)?,
            |n, id| n.checked_add(id.len()).ok_or_else(err),
        )?;
        let _ids = budget.reserve(names).map_err(|_| err())?;
        let ids = self.actors.keys().cloned().collect::<Vec<_>>();
        for actor in ids {
            let after = totals
                .get(actor.as_str())
                .cloned()
                .unwrap_or_else(|| std::array::from_fn(|_| AccountCharge { bytes: 0, count: 0 }));
            let previous = &self.actors.get(&actor).ok_or_else(err)?.header;
            let classes = [
                AccountClass::Optional,
                AccountClass::Required,
                AccountClass::Speech,
            ];
            let changed = classes.iter().enumerate().any(|(i, class)| {
                previous
                    .accounts
                    .as_ref()
                    .and_then(|a| a.archives.as_ref())
                    .and_then(|a| a.get(class))
                    .map_or(after[i].bytes != 0 || after[i].count != 0, |old| {
                        old != &after[i]
                    })
            });
            if !changed {
                continue;
            }
            let _copy = budget
                .reserve(
                    previous
                        .heap_bytes()
                        .ok_or_else(err)?
                        .checked_add(
                            crate::host::retained_size::map_storage::<AccountClass, AccountCharge>(
                                3,
                            )
                            .ok_or_else(err)?,
                        )
                        .ok_or_else(err)?,
                )
                .map_err(|_| err())?;
            let mut header = previous.clone();
            let accounts = header.accounts.as_mut().ok_or_else(err)?;
            for (i, class) in classes.iter().enumerate() {
                let old = accounts.archives.as_ref().and_then(|a| a.get(class));
                let old_bytes = old.map_or(0, |c| c.bytes);
                let old_count = old.map_or(0, |c| c.count);
                let total = match class {
                    AccountClass::Optional => &mut accounts.optional,
                    AccountClass::Required => &mut accounts.required,
                    AccountClass::Speech => &mut accounts.speech,
                };
                total.bytes = total
                    .bytes
                    .checked_sub(old_bytes)
                    .and_then(|n| n.checked_add(after[i].bytes))
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(err)?;
                total.count = total
                    .count
                    .checked_sub(old_count)
                    .and_then(|n| n.checked_add(after[i].count))
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(err)?;
            }
            accounts.archives = Some(classes.into_iter().zip(after).collect());
            self.replace_header(&actor, header)?;
        }
        Ok(())
    }
}
