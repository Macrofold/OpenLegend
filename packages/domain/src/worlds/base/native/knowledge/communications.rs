//! The remembered addressee chooser groups identity evidence once, in the
//! Source's object enumeration order. Current visibility grants no names here.
use super::*;
use crate::host::retained_size::map_storage;

#[derive(Serialize)]
pub(crate) struct CommunicationSubject<'a> {
    id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    label: Option<&'a crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<Named>,
}
pub(crate) struct RememberedCommunications<'a> {
    pub(crate) subjects: Vec<CommunicationSubject<'a>>,
    _reservation: ByteReservation,
}
pub(crate) struct RememberedCommunicationIds<'a> {
    pub(crate) ids: Vec<&'a str>,
    _reservation: ByteReservation,
}
struct Choice<'a> {
    identity: &'a ObserverIdentity,
    preferred: bool,
    permitted: bool,
}

fn communication_id(identity: &ObserverIdentity) -> Option<&str> {
    identity
        .canonical_id
        .as_deref()
        .filter(|id| !id.is_empty() && identity.seed_only != Some(true))
}

fn has_individual_association(identity: &ObserverIdentity) -> bool {
    identity
        .individual_id
        .as_ref()
        .is_some_and(|id| !id.is_empty())
}

impl<'a> PersonalNameReader<'a> {
    fn remembered_communication_choices(
        &self,
        budget: &ByteBudget,
    ) -> Result<(IndexMap<&'a str, Choice<'a>>, ByteReservation), ReceivedError> {
        let count = self.identities().map_or(0, IndexMap::len);
        let scratch = count
            .checked_mul(size_of::<(usize, &str, &ObserverIdentity)>())
            .and_then(|bytes| bytes.checked_add(map_storage::<&str, Choice>(count)?))
            .ok_or_else(capacity)?;
        let _scratch = budget.reserve(scratch).map_err(|_| capacity())?;
        let mut ordered = Vec::new();
        ordered.try_reserve_exact(count).map_err(|_| capacity())?;
        for (index, (key, identity)) in self
            .identities()
            .into_iter()
            .flat_map(IndexMap::iter)
            .enumerate()
        {
            ordered.push((index, key.as_str(), identity));
        }
        ordered.sort_unstable_by_key(|(index, key, _)| {
            crate::encoding::array_index(key)
                .map_or((1, *index as u64), |index| (0, u64::from(index)))
        });
        let mut selected: IndexMap<&str, Choice<'a>> = IndexMap::new();
        selected.try_reserve(count).map_err(|_| capacity())?;
        for (_, _, identity) in ordered {
            let Some(id) = communication_id(identity) else {
                continue;
            };
            let preferred = identity.authored
                || identity.encounter_id.as_ref().is_some_and(|encounter| {
                    !encounter.is_empty() && Some(encounter) == self.episode(id)
                });
            let choice = selected.entry(id).or_insert(Choice {
                identity,
                preferred,
                permitted: false,
            });
            if !choice.preferred && preferred {
                choice.identity = identity;
            }
            choice.preferred |= preferred;
            choice.permitted |= has_individual_association(identity);
        }
        Ok((selected, _scratch))
    }

    pub(super) fn is_communication_actor(&self, id: &str) -> bool {
        self.entities
            .get(id)
            .is_some_and(|entity| entity.actor.is_some())
    }

    /// The same remembered chooser membership used when issuing person tokens.
    /// A later recheck needs only this ID and does not regroup or format names.
    pub(crate) fn is_remembered_communication_subject(&self, id: &str) -> bool {
        self.is_communication_actor(id)
            && self.identities().is_some_and(|identities| {
                identities.values().any(|identity| {
                    communication_id(identity) == Some(id) && has_individual_association(identity)
                })
            })
    }

    /// Ordered IDs for the availability token check. Full chooser names keep
    /// their original preferred evidence and are prepared only by their caller.
    pub(crate) fn remembered_communication_ids(
        &self,
        budget: &ByteBudget,
    ) -> Result<RememberedCommunicationIds<'a>, ReceivedError> {
        let (selected, _choice_storage) = self.remembered_communication_choices(budget)?;
        let bytes = selected
            .len()
            .checked_mul(size_of::<&str>())
            .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut ids = Vec::new();
        ids.try_reserve_exact(selected.len())
            .map_err(|_| capacity())?;
        ids.extend(selected.into_iter().filter_map(|(id, choice)| {
            (choice.permitted && self.is_communication_actor(id)).then_some(id)
        }));
        reservation
            .resize(ids.capacity() * size_of::<&str>())
            .map_err(|_| capacity())?;
        Ok(RememberedCommunicationIds {
            ids,
            _reservation: reservation,
        })
    }

    pub(crate) fn remembered_communications(
        &self,
        budget: &ByteBudget,
    ) -> Result<RememberedCommunications<'a>, ReceivedError> {
        let (selected, _choice_storage) = self.remembered_communication_choices(budget)?;
        let bytes = selected
            .len()
            .checked_mul(size_of::<CommunicationSubject>())
            .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut retained = bytes;
        let mut subjects = Vec::new();
        subjects
            .try_reserve_exact(selected.len())
            .map_err(|_| capacity())?;
        for (id, choice) in selected {
            if !choice.permitted || !self.is_communication_actor(id) {
                continue;
            }
            let label = choice
                .identity
                .nickname
                .as_ref()
                .filter(|label| !label.is_empty())
                .or_else(|| {
                    (!choice.identity.given_name.is_empty()).then_some(&choice.identity.given_name)
                });
            let description = if label.is_none() {
                let name = self.observer_name(id)?;
                retained = retained
                    .checked_add(name.heap_bound()?)
                    .ok_or_else(capacity)?;
                reservation.resize(retained).map_err(|_| capacity())?;
                Some(name.owned())
            } else {
                None
            };
            subjects.push(CommunicationSubject {
                id,
                label,
                description,
            });
        }
        Ok(RememberedCommunications {
            subjects,
            _reservation: reservation,
        })
    }
}
