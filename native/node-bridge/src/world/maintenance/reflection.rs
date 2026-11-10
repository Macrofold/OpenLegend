use super::*;
use crate::world::npc::NativeWorldNpcResponseTicket;
use openlegend_simulation::runtime::RuntimeReflectionTicket;

pub(super) struct ReflectionOwner {
    payloads: [Weak<AtomicBool>; 2],
    ticket: Mutex<Option<RuntimeReflectionTicket>>,
    pub(super) released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldReflectionTicket {
    inner: Arc<ReflectionOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi]
impl NativeWorldReflectionTicket {
    /// Source-only freshness can join an already held history disclosure gate.
    /// Body/workspace admission belongs to the maintenance read, separately.
    #[napi]
    pub fn sources_current(&self) -> bool {
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
            .is_some_and(|ticket| session.reflection_sources_current(ticket).unwrap_or(false))
            && !self.inner.released.load(Ordering::Acquire)
    }
    #[napi]
    pub fn release(&self) {
        if self.inner.released.swap(true, Ordering::AcqRel) {
            return;
        }
        for payload in &self.inner.payloads {
            if let Some(payload) = payload.upgrade() {
                payload.store(false, Ordering::Release);
            }
        }
        if let Ok(mut ticket) = self.inner.ticket.try_lock() {
            *ticket = None;
            return;
        }
        let Some(world) = self.world.upgrade() else {
            return;
        };
        let custody = self
            .host
            .bytes
            .reserve(size_of::<Arc<ReflectionOwner>>() + 2 * size_of::<Arc<WorldRuntime>>());
        let Ok(custody) = custody else {
            world.fence.poison();
            return;
        };
        let ticket = Arc::clone(&self.inner);
        let failed = Arc::clone(&world);
        let submitted = self.host.pool.submit(
            move |_cancel| {
                let _custody = custody;
                let mut owner = ticket.ticket.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
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
impl Drop for NativeWorldReflectionTicket {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldReflectionTicket>")]
    pub fn bind_reflection<'a>(
        &self,
        env: &'a Env,
        body_read: &NativeWorldMaintenanceRead,
        workspace_read: &NativeWorldMaintenanceRead,
        npc: &NativeWorldNpcResponseTicket,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let world = Arc::downgrade(&self.world);
        if !Weak::ptr_eq(&world, &body_read.world)
            || !Weak::ptr_eq(&world, &workspace_read.world)
            || !Weak::ptr_eq(&world, &npc.world)
        {
            return Err(failure("reflection scopes belong to another native writer"));
        }
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let body_read = Arc::clone(&body_read.inner);
        let workspace_read = Arc::clone(&workspace_read.inner);
        let npc = Arc::clone(&npc.inner);
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let storage = budget
                .reserve(
                    size_of::<ReflectionOwner>()
                        .checked_sub(size_of::<RuntimeReflectionTicket>())
                        .and_then(|n| {
                            n.checked_add(
                                size_of::<NativeWorldReflectionTicket>() + 2 * size_of::<usize>(),
                            )
                        })
                        .and_then(|n| {
                            n.checked_add(
                                2 * openlegend_simulation::runtime::RuntimeNpcRead::receipt_liveness_backing_bytes(),
                            )
                        })
                        .ok_or_else(|| failure("capacity"))?,
                )
                .map_err(operation_error)?;
            let body = body_read
                .read
                .try_lock()
                .map_err(|_| failure("maintenance read is busy"))?;
            let mut owner = npc
                .ticket
                .try_lock()
                .map_err(|_| failure("NPC reflection is busy"))?;
            if body_read.released.load(Ordering::Acquire)
                || workspace_read.released.load(Ordering::Acquire)
                || npc.released.load(Ordering::Acquire)
            {
                return Err(failure("reflection scope was released"));
            }
            let body = body
                .as_ref()
                .ok_or_else(|| failure("maintenance body read was released"))?;
            let ticket = if Arc::ptr_eq(&body_read, &workspace_read) {
                session.bind_reflection(body, body, &mut owner, &bytes)
            } else {
                let workspace = workspace_read
                    .read
                    .try_lock()
                    .map_err(|_| failure("maintenance workspace read is busy"))?;
                session.bind_reflection(
                    body,
                    workspace
                        .as_ref()
                        .ok_or_else(|| failure("maintenance workspace read was released"))?,
                    &mut owner,
                    &bytes,
                )
            }
            .map_err(operation_error)?;
            let released = body_read.released.load(Ordering::Acquire)
                || workspace_read.released.load(Ordering::Acquire)
                || npc.released.load(Ordering::Acquire);
            npc.released.store(true, Ordering::Release);
            if released {
                return Err(failure("reflection scope was released"));
            }
            Ok(NativeWorldReflectionTicket {
                inner: Arc::new(ReflectionOwner {
                    payloads: ticket.receipt_liveness(),
                    ticket: Mutex::new(Some(ticket)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldMaintenancePublication | null>")]
    pub fn reflection_publication<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldReflectionTicket,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure("reflection belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        self.compute(env, move |session, _cancel, budget| {
            let owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("reflection ticket is busy"))?;
            if ticket.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            let read = owner
                .as_ref()
                .ok_or_else(|| failure("reflection ticket was released"))?;
            let storage = budget
                .reserve(size_of::<NativeWorldMaintenancePublication>())
                .map_err(operation_error)?;
            let publication = session
                .reflection_publication(read)
                .map_err(operation_error)?;
            drop(owner);
            if ticket.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            Ok(publication.map(|inner| NativeWorldMaintenancePublication {
                inner: Some(inner),
                owner: MaintenancePublicationOwner::Reflection(ticket),
                _storage: storage,
            }))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_reflection<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldReflectionTicket,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure("reflection belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let mut owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("reflection ticket is busy"))?;
            if ticket.released.load(Ordering::Acquire) {
                return Err(failure("reflection ticket was released"));
            }
            let key = session
                .begin_reflection(&mut owner, &bytes)
                .map_err(operation_error)?;
            let released = ticket.released.load(Ordering::Acquire);
            ticket.released.store(true, Ordering::Release);
            if released {
                session.cancel(key).map_err(operation_error)?;
                return Err(failure("reflection ticket was released"));
            }
            turn(session, key, None, cancel, budget)
        })
    }
}
