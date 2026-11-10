use super::*;
use crate::world::npc::NativeWorldNpcTurn;
use openlegend_simulation::runtime::{RuntimeConsolidationTicket, RuntimeNpcPreparationStep};
mod dream;
use dream::NativeWorldConsolidationDream;
pub(super) struct ConsolidationOwner {
    ticket: Mutex<Option<RuntimeConsolidationTicket>>,
    pub(super) released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldConsolidationTicket {
    inner: Arc<ConsolidationOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
fn preparation_turn(
    session: &mut NativeWorldSession,
    ticket: &mut RuntimeConsolidationTicket,
    key: CandidateKey,
    answer: Option<(&RuntimeProvider, String)>,
    cancel: &Cancellation,
    budget: &ByteBudget,
) -> Result<NativeWorldNpcTurn> {
    let mut answer = answer;
    loop {
        if cancel.requested() {
            session.fence().request_stop();
        }
        match session
            .step_consolidation_sources(ticket, key, answer.take())
            .map_err(operation_error)?
        {
            RuntimeNpcPreparationStep::Continue => continue,
            RuntimeNpcPreparationStep::Provider(inner) => {
                return Ok(NativeWorldNpcTurn {
                    key: key.into(),
                    kind: "provider".into(),
                    provider: Some(NativeWorldProvider {
                        inner: Arc::new(inner),
                        budget: budget.clone(),
                    }),
                });
            }
            RuntimeNpcPreparationStep::Complete => {
                return Ok(NativeWorldNpcTurn {
                    key: key.into(),
                    kind: "complete".into(),
                    provider: None,
                });
            }
        }
    }
}
#[napi]
impl NativeWorldConsolidationTicket {
    #[napi]
    pub fn is_current(&self) -> bool {
        if self.inner.released.load(Ordering::Acquire) {
            return false;
        }
        let Some(world) = self.world.upgrade() else {
            return false;
        };
        if world.stopped() || !world.active.load(Ordering::Acquire) {
            return false;
        }
        let Ok(session) = world.session.try_lock() else {
            return false;
        };
        let Some(session) = session.as_ref() else {
            return false;
        };
        let Ok(owner) = self.inner.ticket.try_lock() else {
            return false;
        };
        owner
            .as_ref()
            .is_some_and(|ticket| session.consolidation_current(ticket).unwrap_or(false))
            && !self.inner.released.load(Ordering::Acquire)
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let owner = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let output = ticket
                .as_ref()
                .ok_or_else(|| failure("consolidation ticket was released"))?
                .packet(&budget)
                .map_err(operation_error)?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            Ok(NativeWorldJson::new(output, budget))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn interpretation<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let owner = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        let world = self
            .world
            .upgrade()
            .ok_or_else(|| failure("consolidation world stopped"))?;
        dispatch(env, &self.host, Some(Arc::clone(&world)), move |_cancel| {
            let session = world
                .session
                .try_lock()
                .map_err(|_| failure("native writer is busy"))?;
            let session = session
                .as_ref()
                .ok_or_else(|| failure("native writer stopped"))?;
            let mut ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let output = session
                .consolidation_interpretation(
                    ticket
                        .as_mut()
                        .ok_or_else(|| failure("consolidation ticket was released"))?,
                )
                .map_err(operation_error)?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            Ok(NativeWorldJson::new(output, budget))
        })
    }
    #[napi]
    pub fn release(&self) {
        if self.inner.released.swap(true, Ordering::AcqRel) {
            return;
        }
        let Some(world) = self.world.upgrade() else {
            if let Ok(mut owner) = self.inner.ticket.try_lock() {
                *owner = None;
            }
            return;
        };
        if let Ok(mut session) = world.session.try_lock() {
            if let Ok(mut owner) = self.inner.ticket.try_lock() {
                if let (Some(session), Some(ticket)) = (session.as_mut(), owner.as_mut()) {
                    if session.cancel_consolidation_sources(ticket).is_err() {
                        world.fence.poison();
                    }
                }
                *owner = None;
                return;
            }
        }
        let read = Arc::clone(&self.inner);
        let Ok(custody) = self
            .host
            .bytes
            .reserve(size_of::<Arc<ConsolidationOwner>>() + size_of::<Arc<WorldRuntime>>())
        else {
            world.fence.poison();
            return;
        };
        let failed = Arc::clone(&world);
        let submitted = self.host.pool.submit(
            move |_cancel| {
                let _custody = custody;
                let mut session = world.session.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                let mut owner = read.ticket.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                if let (Some(session), Some(ticket)) = (session.as_mut(), owner.as_mut()) {
                    if session.cancel_consolidation_sources(ticket).is_err() {
                        world.fence.poison();
                        return Err(crate::pool::HostError::Poisoned);
                    }
                }
                *owner = None;
                Ok(())
            },
            move |_result| {},
            move || failed.fence.poison(),
        );
        if submitted.is_err() {
            if let Some(world) = self.world.upgrade() {
                world.fence.poison();
            }
        }
    }
}
impl Drop for NativeWorldConsolidationTicket {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<void>")]
    pub fn cancel_consolidation_sources<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "consolidation ticket belongs to another native writer",
            ));
        }
        let owner = Arc::clone(&ticket.inner);
        self.compute(env, move |session, _cancel, _budget| {
            // A concurrent packet encoder owns no writer/session borrow and
            // finishes bounded admitted work before this actual cancellation.
            let mut ticket = owner
                .ticket
                .lock()
                .map_err(|_| failure("consolidation ticket lock failed"))?;
            if let Some(ticket) = ticket.as_mut() {
                session
                    .cancel_consolidation_sources(ticket)
                    .map_err(operation_error)?;
            }
            Ok(())
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldConsolidationTicket>")]
    pub fn bind_consolidation<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldMaintenanceRead,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("maintenance read belongs to another native writer"));
        }
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let read = Arc::clone(&read.inner);
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("maintenance read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            let storage = budget
                .reserve(
                    size_of::<ConsolidationOwner>()
                        .checked_sub(size_of::<RuntimeConsolidationTicket>())
                        .and_then(|n| {
                            n.checked_add(
                                size_of::<NativeWorldConsolidationTicket>()
                                    + 2 * size_of::<usize>(),
                            )
                        })
                        .ok_or_else(|| failure("capacity"))?,
                )
                .map_err(operation_error)?;
            let ticket = session
                .bind_consolidation(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("maintenance read was released"))?,
                    &bytes,
                )
                .map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            Ok(NativeWorldConsolidationTicket {
                inner: Arc::new(ConsolidationOwner {
                    ticket: Mutex::new(Some(ticket)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn consolidation_sources<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "consolidation ticket belongs to another native writer",
            ));
        }
        let owner = Arc::clone(&ticket.inner);
        self.compute(env, move |session, cancel, budget| {
            let mut ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let read = ticket
                .as_mut()
                .ok_or_else(|| failure("consolidation ticket was released"))?;
            let key = session
                .consolidation_sources(read)
                .map_err(operation_error)?;
            let output = preparation_turn(session, read, key, None, cancel, budget);
            if owner.released.load(Ordering::Acquire) {
                session
                    .cancel_consolidation_sources(read)
                    .map_err(operation_error)?;
                *ticket = None;
                return Err(failure("consolidation ticket was released"));
            }
            output
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn answer_consolidation_sources<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
        provider: &NativeWorldProvider,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "consolidation ticket belongs to another native writer",
            ));
        }
        let owner = Arc::clone(&ticket.inner);
        let provider = Arc::clone(&provider.inner);
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let mut ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let read = ticket
                .as_mut()
                .ok_or_else(|| failure("consolidation ticket was released"))?;
            let key = read
                .candidate_key()
                .ok_or_else(|| failure("consolidation source question is no longer active"))?;
            let json =
                String::from_utf8(bytes).map_err(|_| failure("provider answer is not UTF-8"))?;
            let output =
                preparation_turn(session, read, key, Some((&provider, json)), cancel, budget);
            if owner.released.load(Ordering::Acquire) {
                session
                    .cancel_consolidation_sources(read)
                    .map_err(operation_error)?;
                *ticket = None;
                return Err(failure("consolidation ticket was released"));
            }
            output
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldMaintenancePublication | null>")]
    pub fn consolidation_publication<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "consolidation ticket belongs to another native writer",
            ));
        }
        let owner = Arc::clone(&ticket.inner);
        self.compute(env, move |session, _cancel, budget| {
            let ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            let storage = budget
                .reserve(size_of::<NativeWorldMaintenancePublication>())
                .map_err(operation_error)?;
            let publication = session
                .consolidation_publication(
                    ticket
                        .as_ref()
                        .ok_or_else(|| failure("consolidation ticket was released"))?,
                )
                .map_err(operation_error)?;
            drop(ticket);
            if owner.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            Ok(publication.map(|inner| NativeWorldMaintenancePublication {
                inner: Some(inner),
                owner: MaintenancePublicationOwner::Consolidation(owner),
                _storage: storage,
            }))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_consolidation<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
        bytes: BufferSlice<'_>,
        dream: Option<&NativeWorldConsolidationDream>,
        interpretation: Option<BufferSlice<'_>>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "consolidation ticket belongs to another native writer",
            ));
        }
        let owner = Arc::clone(&ticket.inner);
        if dream.is_some_and(|dream| !Weak::ptr_eq(&dream.world, &ticket.world)) {
            return Err(failure("dream belongs to another native writer"));
        }
        let dream = dream.map(|dream| Arc::clone(&dream.inner));
        let interpretation = interpretation
            .map(|bytes| input(&bytes, &self.host.bytes))
            .transpose()?;
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let interpretation = interpretation;
            let mut ticket = owner
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let mut dream_owner = dream
                .as_ref()
                .map(|owner| {
                    owner
                        .dream
                        .try_lock()
                        .map_err(|_| failure("dream binding is busy"))
                })
                .transpose()?;
            if dream
                .as_ref()
                .is_some_and(|owner| owner.released.load(Ordering::Acquire))
            {
                return Err(failure("dream binding was released"));
            }
            let key = session
                .begin_consolidation(
                    &mut ticket,
                    &bytes,
                    dream_owner.as_ref().and_then(|owner| owner.as_ref()),
                    interpretation.as_ref().map(|(bytes, _)| bytes.as_slice()),
                )
                .map_err(operation_error)?;
            let released = owner.released.swap(true, Ordering::AcqRel)
                || dream
                    .as_ref()
                    .is_some_and(|owner| owner.released.swap(true, Ordering::AcqRel));
            if let Some(dream) = dream_owner.as_mut() {
                **dream = None;
            }
            if released {
                session.cancel(key).map_err(operation_error)?;
                return Err(failure("consolidation ticket was released"));
            }
            turn(session, key, None, cancel, budget)
        })
    }
}
