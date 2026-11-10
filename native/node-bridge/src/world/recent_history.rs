//! The recent-observation reader retains a real native receipt scope and uses
//! the existing Sources preparation before any private row is disclosed.
use super::*;
use crate::world::npc::NativeWorldNpcTurn;
use openlegend_simulation::runtime::{
    RuntimeNpcPreparationStep, RuntimeRecentHistoryPublication, RuntimeRecentHistoryRead,
};
use std::mem::size_of;
use std::sync::Weak;

struct RecentOwner {
    payload: Weak<AtomicBool>,
    read: Mutex<Option<RuntimeRecentHistoryRead>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldRecentHistoryRead {
    inner: Arc<RecentOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi]
pub struct NativeWorldRecentHistoryPublication {
    inner: Option<RuntimeRecentHistoryPublication>,
    owner: Arc<RecentOwner>,
    _storage: ByteReservation,
}
#[napi]
impl NativeWorldRecentHistoryPublication {
    #[napi]
    pub fn is_current(&self) -> bool {
        self.inner.is_some() && !self.owner.released.load(Ordering::Acquire)
    }
    #[napi]
    pub fn release(&mut self) {
        self.inner = None;
    }
}
impl NativeWorldRecentHistoryRead {
    fn product<'a>(
        &self,
        env: &'a Env,
        encode: fn(
            &RuntimeRecentHistoryRead,
            &ByteBudget,
        ) -> std::result::Result<
            RuntimeJson,
            openlegend_simulation::runtime::RuntimeError,
        >,
    ) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("recent history read is busy"))?;
            // Queued release still needs this payload's actual private key.
            // A JSON product must not discard it ahead of cancellation.
            if read.released.load(Ordering::Acquire) {
                return Err(failure("recent history read was released"));
            }
            let result = encode(
                owner
                    .as_ref()
                    .ok_or_else(|| failure("recent history read was released"))?,
                &budget,
            )
            .map(|value| NativeWorldJson::new(value, budget))
            .map_err(operation_error);
            if read.released.load(Ordering::Acquire) {
                return Err(failure("recent history read was released"));
            }
            result
        })
    }
}
impl Drop for NativeWorldRecentHistoryRead {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorldRecentHistoryRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, RuntimeRecentHistoryRead::packet)
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn sources<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, RuntimeRecentHistoryRead::sources)
    }
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
        let Ok(owner) = self.inner.read.try_lock() else {
            return false;
        };
        owner
            .as_ref()
            .is_some_and(|read| session.recent_history_current(read).unwrap_or(false))
            && !self.inner.released.load(Ordering::Acquire)
    }
    #[napi]
    pub fn release(&self) {
        if self.inner.released.swap(true, Ordering::AcqRel) {
            return;
        }
        if let Some(payload) = self.inner.payload.upgrade() {
            payload.store(false, Ordering::Release);
        }
        let Some(world) = self.world.upgrade() else {
            if let Ok(mut owner) = self.inner.read.try_lock() {
                *owner = None;
            }
            return;
        };
        if let Ok(mut session) = world.session.try_lock() {
            if let Ok(mut owner) = self.inner.read.try_lock() {
                if let (Some(session), Some(read)) = (session.as_mut(), owner.as_ref()) {
                    if session.cancel_recent_history_sources(read).is_err() {
                        world.fence.poison();
                    }
                }
                *owner = None;
                return;
            }
        }
        let storage = self
            .host
            .bytes
            .reserve(size_of::<Arc<RecentOwner>>() + 2 * size_of::<Arc<WorldRuntime>>());
        let Ok(storage) = storage else {
            world.fence.poison();
            return;
        };
        let read = Arc::clone(&self.inner);
        let failed = Arc::clone(&world);
        let submitted = self.host.pool.submit(
            move |_cancel| {
                let _storage = storage;
                let mut session = world.session.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                let mut owner = read.read.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                if let (Some(session), Some(read)) = (session.as_mut(), owner.as_ref()) {
                    if session.cancel_recent_history_sources(read).is_err() {
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
fn turn_sources(
    session: &mut NativeWorldSession,
    read: &mut RuntimeRecentHistoryRead,
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
            .step_recent_history_sources(read, key, answer.take())
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
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldRecentHistoryRead>")]
    pub fn read_recent_history<'a>(&self, env: &'a Env, actor_id: String) -> Result<Object<'a>> {
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        let input_storage = self
            .host
            .bytes
            .reserve(actor_id.capacity())
            .map_err(operation_error)?;
        self.compute(env, move |session, _cancel, budget| {
            let _input_storage = input_storage;
            let storage = budget.reserve(
                size_of::<RecentOwner>().checked_sub(size_of::<RuntimeRecentHistoryRead>())
                    .and_then(|n| n.checked_add(size_of::<NativeWorldRecentHistoryRead>() + 2 * size_of::<usize>()))
                    .and_then(|n| n.checked_add(openlegend_simulation::runtime::RuntimeNpcRead::receipt_liveness_backing_bytes()))
                    .ok_or_else(|| failure("capacity"))?,
            ).map_err(operation_error)?;
            let read = session.read_recent_history(&actor_id).map_err(operation_error)?;
            Ok(NativeWorldRecentHistoryRead {
                inner: Arc::new(RecentOwner { payload: read.receipt_liveness(), read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false), _storage: storage }), host, world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn recent_history_sources<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldRecentHistoryRead,
        input_bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("history read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        let (input, storage) = input(&input_bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _storage = storage;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("recent history read is busy"))?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("recent history read was released"));
            }
            let value = owner
                .as_mut()
                .ok_or_else(|| failure("recent history read was released"))?;
            let key = session
                .begin_recent_history_sources(value, &input)
                .map_err(operation_error)?;
            let result = turn_sources(session, value, key, None, cancel, budget);
            if read.released.load(Ordering::Acquire) {
                session
                    .cancel_recent_history_sources(value)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("recent history read was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn answer_recent_history_sources<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldRecentHistoryRead,
        key: NativeCandidateKey,
        provider: &NativeWorldProvider,
        answer: String,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("history read belongs to another native writer"));
        }
        let key = key.try_into()?;
        let read = Arc::clone(&read.inner);
        let provider = Arc::clone(&provider.inner);
        let storage = self
            .host
            .bytes
            .reserve(answer.capacity())
            .map_err(operation_error)?;
        self.compute(env, move |session, cancel, budget| {
            let _storage = storage;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("recent history read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("recent history read was released"));
            }
            let value = owner
                .as_mut()
                .ok_or_else(|| failure("recent history read was released"))?;
            let result = turn_sources(
                session,
                value,
                key,
                Some((&provider, answer)),
                cancel,
                budget,
            );
            if read.released.load(Ordering::Acquire) {
                session
                    .cancel_recent_history_sources(value)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("recent history read was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn cancel_recent_history_sources<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldRecentHistoryRead,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("history read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        self.compute(env, move |session, _cancel, _budget| {
            let owner = read
                .read
                .lock()
                .map_err(|_| failure("recent history owner synchronization failed"))?;
            if let Some(value) = owner.as_ref() {
                session
                    .cancel_recent_history_sources(value)
                    .map_err(operation_error)?;
            }
            Ok(())
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldRecentHistoryPublication | null>")]
    pub fn recent_history_publication<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldRecentHistoryRead,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("history read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        self.compute(env, move |session, _cancel, budget| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("recent history read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            let storage = budget
                .reserve(size_of::<NativeWorldRecentHistoryPublication>())
                .map_err(operation_error)?;
            let publication = session
                .recent_history_publication(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("recent history read was released"))?,
                )
                .map_err(operation_error)?;
            drop(owner);
            if read.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            Ok(
                publication.map(|inner| NativeWorldRecentHistoryPublication {
                    inner: Some(inner),
                    owner: read,
                    _storage: storage,
                }),
            )
        })
    }
}
