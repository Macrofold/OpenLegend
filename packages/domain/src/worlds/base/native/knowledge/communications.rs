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
struct Choice<'a> {
    identity: &'a ObserverIdentity,
    preferred: bool,
    permitted: bool,
}

impl<'a> PersonalNameReader<'a> {
    pub(crate) fn remembered_communications(
        &self,
        budget: &ByteBudget,
    ) -> Result<RememberedCommunications<'a>, ReceivedError> {
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
            let Some(id) = identity.canonical_id.as_deref().filter(|id| !id.is_empty()) else {
                continue;
            };
            if identity.seed_only == Some(true) {
                continue;
            }
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
            choice.permitted |= identity
                .individual_id
                .as_ref()
                .is_some_and(|id| !id.is_empty());
        }
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
            if !choice.permitted
                || !self
                    .entities
                    .get(id)
                    .is_some_and(|entity| entity.actor.is_some())
            {
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
