//! Received writes feed the next real attention opportunity. This preparation
//! lasts only for its working operation, never becomes saved evidence, and has
//! the same inverse ownership as the writes that produced it.
use super::*;

pub(super) struct AttentionWork {
    pub(super) life: u64,
    pub(super) sources: AttentionSources,
    pub(super) selection: Option<AttentionCut>,
    pub(super) familiarity: AttentionSources,
    pub(super) familiarity_all: bool,
}
pub(super) struct AttentionCut {
    at: f64,
    policy: String,
    explicit: Vec<String>,
    target: Option<String>,
    subjects: Vec<(String, ObserverSubject)>,
    _reservation: ByteReservation,
}
pub(super) struct AttentionSources {
    pub(super) ids: IndexSet<String>,
    reservation: ByteReservation,
}
impl AttentionSources {
    fn empty(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            ids: IndexSet::new(),
            reservation: budget.reserve(0).map_err(|_| capacity())?,
        })
    }
    pub(super) fn remove(&mut self, source: &str) -> Result<(), ReceivedError> {
        if let Some(source) = self.ids.shift_take(source) {
            // IndexSet retains its backing allocation; only the removed owned
            // text is freed here. No cohort-wide accounting scan is necessary.
            let bytes = source.capacity();
            drop(source);
            self.reservation
                .resize(
                    self.reservation
                        .bytes()
                        .checked_sub(bytes)
                        .ok_or_else(invalid)?,
                )
                .map_err(|_| capacity())?;
        }
        Ok(())
    }
    fn insert(&mut self, source: &str) -> Result<(), ReceivedError> {
        let old_storage = map_storage::<String, ()>(self.ids.capacity()).ok_or_else(capacity)?;
        let text_bytes = self
            .reservation
            .bytes()
            .checked_sub(old_storage)
            .ok_or_else(invalid)?;
        let next_capacity = self
            .ids
            .capacity()
            .max(self.ids.len().checked_add(1).ok_or_else(capacity)?)
            .max(3);
        let storage = map_storage::<String, ()>(next_capacity).ok_or_else(capacity)?;
        let replaced = if self.ids.len() == self.ids.capacity() {
            old_storage
        } else {
            0
        };
        self.reservation
            .resize(heap_sum([text_bytes, replaced, storage, source.len()]).ok_or_else(capacity)?)
            .map_err(|_| capacity())?;
        self.ids.try_reserve(1).map_err(|_| capacity())?;
        self.ids.insert(source.into());
        self.reservation
            .resize(
                heap_sum([
                    text_bytes,
                    map_storage::<String, ()>(self.ids.capacity()).ok_or_else(capacity)?,
                    source.len(),
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        Ok(())
    }
}
impl CurrentJournal {
    /// Only the outer working-world owner enables this preparation. Ordinary
    /// commands have no Source working-attention cache to inherit or invent.
    pub(crate) fn begin_attention_preparation(&mut self) -> Result<(), ReceivedError> {
        self.set_attention_preparation(true)
    }
    pub(crate) fn end_attention_preparation(&mut self) -> Result<(), ReceivedError> {
        self.set_attention_preparation(false)
    }
    fn set_attention_preparation(&mut self, enabled: bool) -> Result<(), ReceivedError> {
        self.reserve_growth(0)?;
        let prior = std::mem::take(&mut self.attention_work);
        let before = std::mem::replace(&mut self.attention_preparation, enabled);
        self.undo.push(CurrentUndo::AttentionPreparation {
            enabled: before,
            prior,
        });
        Ok(())
    }
    pub(in super::super) fn begin_attention_work(
        &mut self,
        observer: &str,
        life: u64,
    ) -> Result<(), ReceivedError> {
        if !self.attention_preparation {
            return Ok(());
        }
        if self
            .attention_work
            .get(observer)
            .is_some_and(|work| work.life == life)
        {
            return Ok(());
        }
        let grows = !self.attention_work.contains_key(observer)
            && self.attention_work.len() == self.attention_work.capacity();
        let old_storage = map_storage::<String, AttentionWork>(self.attention_work.capacity())
            .ok_or_else(capacity)?;
        let replacement_storage = if grows {
            self.attention_work
                .len()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .map(|n| n.max(3))
                .and_then(map_storage::<String, AttentionWork>)
                .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(
            heap_sum([2 * observer.len(), replacement_storage]).ok_or_else(capacity)?,
        )?;
        self.attention_work
            .try_reserve(usize::from(grows))
            .map_err(|_| capacity())?;
        let prior = self
            .attention_work
            .shift_remove_full(observer)
            .map(|(at, _, prior)| (at, prior));
        self.attention_work.insert(
            observer.into(),
            AttentionWork {
                life,
                sources: AttentionSources::empty(&self.budget)?,
                selection: None,
                familiarity: AttentionSources::empty(&self.budget)?,
                familiarity_all: false,
            },
        );
        if grows {
            self.reservation
                .resize(
                    self.reservation
                        .bytes()
                        .checked_sub(old_storage)
                        .and_then(|bytes| bytes.checked_sub(replacement_storage))
                        .and_then(|bytes| {
                            bytes.checked_add(map_storage::<String, AttentionWork>(
                                self.attention_work.capacity(),
                            )?)
                        })
                        .ok_or_else(capacity)?,
                )
                .map_err(|_| capacity())?;
        }
        self.undo.push(CurrentUndo::AttentionWorkStarted {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(crate) fn invalidate_attention_work(
        &mut self,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        if !self.attention_work.contains_key(observer) {
            return Ok(());
        }
        self.reserve_growth(observer.len())?;
        let prior = self
            .attention_work
            .shift_remove_full(observer)
            .map(|(at, _, prior)| (at, prior));
        self.undo.push(CurrentUndo::AttentionWorkStarted {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(crate) fn invalidate_all_attention_work(&mut self) -> Result<(), ReceivedError> {
        if self.attention_work.is_empty() {
            return Ok(());
        }
        // Move the old preparation into its existing inverse. Clearing derived
        // candidates keeps the working lifetime enabled and clones no cohort.
        self.set_attention_preparation(self.attention_preparation)
    }
    pub(in super::super) fn selection_current(
        &self,
        observer: &str,
        policy: &str,
        target: Option<&str>,
        state: &AttentionState,
        now: f64,
    ) -> bool {
        self.attention_work
            .get(observer)
            .and_then(|work| work.selection.as_ref())
            .is_some_and(|cut| {
                cut.policy == policy
                    && cut.target.as_deref() == target
                    && cut.explicit == state.explicit
                    && !state
                        .entries
                        .iter()
                        .any(|entry| entry.stable_until > cut.at && entry.stable_until <= now)
            })
    }
    pub(in super::super) fn complete_attention_selection<'a>(
        &mut self,
        observer: &str,
        state: &AttentionState,
        target: Option<&str>,
        at: f64,
        subjects: impl Iterator<Item = (&'a str, &'a ObserverSubject)> + Clone,
    ) -> Result<(), ReceivedError> {
        if !self.attention_preparation {
            return Ok(());
        }
        self.reserve_growth(observer.len())?;
        let count = subjects.clone().count();
        let subject_bytes = subjects.clone().try_fold(
            count
                .checked_mul(size_of::<(String, ObserverSubject)>())
                .ok_or_else(capacity)?,
            |bytes, (source, subject)| {
                heap_sum([
                    bytes,
                    source.len(),
                    subject.heap_bytes().ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)
            },
        )?;
        let reservation = self
            .budget
            .reserve(
                heap_sum([
                    state.policy.len(),
                    state.explicit.heap_bytes().ok_or_else(capacity)?,
                    target.map_or(0, str::len),
                    size_of::<AttentionCut>(),
                    subject_bytes,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let mut prepared = Vec::new();
        prepared.try_reserve_exact(count).map_err(|_| capacity())?;
        prepared.extend(subjects.map(|(source, subject)| (source.to_owned(), subject.clone())));
        let selection = AttentionCut {
            at,
            policy: state.policy.clone(),
            explicit: state.explicit.clone(),
            target: target.map(str::to_owned),
            subjects: prepared,
            _reservation: reservation,
        };
        let prior = self
            .attention_work
            .get_mut(observer)
            .ok_or_else(invalid)?
            .selection
            .replace(selection);
        self.undo.push(CurrentUndo::AttentionSelection {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(in super::super) fn attention_changes(
        &self,
        observer: &str,
    ) -> impl Iterator<Item = &String> {
        self.attention_work
            .get(observer)
            .into_iter()
            .flat_map(|work| work.sources.ids.iter())
    }
    /// Numeric recognition credit dirties only subjects in the previous real
    /// preparation. An unseen identity cannot manufacture a new opportunity.
    pub(crate) fn note_attention_familiarity(
        &mut self,
        observer: &str,
        individual: Option<&str>,
    ) -> Result<(), ReceivedError> {
        let Some(work) = self.attention_work.get(observer) else {
            return Ok(());
        };
        if work.familiarity_all || individual.is_some_and(|id| work.familiarity.ids.contains(id)) {
            return Ok(());
        }
        self.reserve_growth(
            heap_sum([observer.len(), individual.map_or(0, str::len)]).ok_or_else(capacity)?,
        )?;
        let work = self.attention_work.get_mut(observer).ok_or_else(invalid)?;
        if let Some(individual) = individual {
            work.familiarity.insert(individual)?;
        } else {
            work.familiarity_all = true;
        }
        self.undo.push(CurrentUndo::AttentionFamiliarityChanged {
            observer: observer.into(),
            individual: individual.map(str::to_owned),
        });
        Ok(())
    }
    pub(in super::super) fn attention_familiarity_sources(
        &self,
        observer: &str,
    ) -> impl Iterator<Item = &String> {
        self.attention_work
            .get(observer)
            .into_iter()
            .flat_map(|work| {
                work.selection.iter().flat_map(move |cut| {
                    cut.subjects.iter().filter_map(move |(source, subject)| {
                        let changed = work.familiarity_all
                            || match subject {
                                ObserverSubject::Entity { .. } => !work.familiarity.ids.is_empty(),
                                ObserverSubject::Individual { individual_id } => {
                                    work.familiarity.ids.contains(individual_id)
                                }
                            };
                        changed.then_some(source)
                    })
                })
            })
    }
    pub(in super::super) fn consume_attention_familiarity(
        &mut self,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        if self
            .attention_work
            .get(observer)
            .is_none_or(|work| !work.familiarity_all && work.familiarity.ids.is_empty())
        {
            return Ok(());
        }
        self.reserve_growth(observer.len())?;
        let empty = AttentionSources::empty(&self.budget)?;
        let work = self.attention_work.get_mut(observer).ok_or_else(invalid)?;
        let prior = std::mem::replace(&mut work.familiarity, empty);
        let all = std::mem::replace(&mut work.familiarity_all, false);
        self.undo.push(CurrentUndo::AttentionFamiliarityConsumed {
            observer: observer.into(),
            prior,
            all,
        });
        Ok(())
    }
    pub(in super::super) fn note_attention_source(
        &mut self,
        observer: &str,
        source: &str,
    ) -> Result<(), ReceivedError> {
        // Source creates preparation at the first actual selection, so earlier
        // intake cannot manufacture a pending preparation lifetime.
        let Some(work) = self.attention_work.get(observer) else {
            return Ok(());
        };
        if work.sources.ids.contains(source) {
            return Ok(());
        }
        self.reserve_growth(heap_sum([observer.len(), source.len()]).ok_or_else(capacity)?)?;
        self.attention_work
            .get_mut(observer)
            .ok_or_else(invalid)?
            .sources
            .insert(source)?;
        self.undo.push(CurrentUndo::AttentionSourceChanged {
            observer: observer.into(),
            source: source.into(),
        });
        Ok(())
    }
    pub(in super::super) fn consume_attention_changes(
        &mut self,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        if self
            .attention_work
            .get(observer)
            .is_none_or(|work| work.sources.ids.is_empty())
        {
            return Ok(());
        }
        self.reserve_growth(observer.len())?;
        let empty = AttentionSources::empty(&self.budget)?;
        let prior = std::mem::replace(
            &mut self
                .attention_work
                .get_mut(observer)
                .ok_or_else(invalid)?
                .sources,
            empty,
        );
        self.undo.push(CurrentUndo::AttentionWorkConsumed {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(super) fn attention_work_key_heap(&self) -> Option<usize> {
        self.attention_work
            .keys()
            .try_fold(0usize, |sum, id| sum.checked_add(id.capacity()))
    }
}
