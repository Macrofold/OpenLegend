//! Server-internal NPC capture. It retains one actual accepted read until its
//! context owner releases it or moves it into a native response ticket.
use super::*;
use openlegend_simulation::runtime::{RuntimeNpcPreparationStep, RuntimeNpcRead};
use std::sync::Weak;

struct NpcReadRuntime {
    read: Mutex<Option<RuntimeNpcRead>>,
    released: AtomicBool,
}
#[napi(object, object_from_js = false)]
pub struct NativeWorldNpcTurn {
    pub key: NativeCandidateKey,
    pub kind: String,
    pub provider: Option<NativeWorldProvider>,
}
fn preparation_turn(
    session: &mut NativeWorldSession,
    read: &mut RuntimeNpcRead,
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
            .step_npc_preparation(read, key, answer.take())
            .map_err(operation_error)?
        {
            RuntimeNpcPreparationStep::Continue => continue,
            RuntimeNpcPreparationStep::Provider(value) => {
                return Ok(NativeWorldNpcTurn {
                    key: key.into(),
                    kind: "provider".into(),
                    provider: Some(NativeWorldProvider {
                        inner: Arc::new(value),
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
pub struct NativeWorldNpcRead {
    inner: Arc<NpcReadRuntime>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
impl Drop for NativeWorldNpcRead {
    fn drop(&mut self) {
        self.release();
    }
}

#[napi]
impl NativeWorldNpcRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("native NPC read was released"));
            }
            let result = owner
                .as_ref()
                .ok_or_else(|| failure("native NPC read was released"))?
                .packet(&budget)
                .map(|value| NativeWorldJson::new(value, budget))
                .map_err(operation_error);
            if read.released.load(Ordering::Acquire) {
                *owner = None;
            }
            result
        })
    }

    #[napi]
    pub fn release(&self) {
        if self.inner.released.swap(true, Ordering::AcqRel) {
            return;
        }
        let Some(world) = self.world.upgrade() else {
            if let Ok(mut read) = self.inner.read.try_lock() {
                *read = None;
            }
            return;
        };
        if let Ok(mut session) = world.session.try_lock() {
            if let Ok(mut owner) = self.inner.read.try_lock() {
                if let (Some(session), Some(read)) = (session.as_mut(), owner.as_ref()) {
                    if session.cancel_npc_preparation(read).is_err() {
                        world.fence.poison();
                    }
                }
                *owner = None;
                return;
            }
        }
        let read = Arc::clone(&self.inner);
        let custody = self.host.bytes.reserve(
            std::mem::size_of::<Arc<NpcReadRuntime>>() + std::mem::size_of::<Arc<WorldRuntime>>(),
        );
        let Ok(custody) = custody else {
            world.fence.poison();
            return;
        };
        let failed = Arc::clone(&world);
        // A release between provider questions must unwind the real private
        // candidate, even when the caller never sends another answer. The same
        // serialized writer owns cancellation; no Node cleanup mutates state.
        let submitted = self.host.pool.submit(
            move |_cancel| {
                let _custody = custody;
                let mut session = world.session.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                let mut owner = read.read.lock().map_err(|_| {
                    world.fence.poison();
                    crate::pool::HostError::SynchronizationFailed
                })?;
                if let (Some(session), Some(read)) = (session.as_mut(), owner.as_ref()) {
                    if session.cancel_npc_preparation(read).is_err() {
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

enum PreparationKind {
    Candidates,
    Sources,
}
fn begin_preparation<'a>(
    world: &NativeWorld,
    env: &'a Env,
    read: &NativeWorldNpcRead,
    request: BufferSlice<'_>,
    kind: PreparationKind,
) -> Result<Object<'a>> {
    if !Weak::ptr_eq(&read.world, &Arc::downgrade(&world.world)) {
        return Err(failure("NPC read belongs to another native writer"));
    }
    let read = Arc::clone(&read.inner);
    let (request, custody) = input(&request, &world.host.bytes)?;
    world.compute(env, move |session, cancel, budget| {
        let _custody = custody;
        let mut owner = read
            .read
            .try_lock()
            .map_err(|_| failure("native NPC read is busy or unavailable"))?;
        if read.released.load(Ordering::Acquire) {
            return Err(failure("native NPC read was released"));
        }
        let read_owner = owner
            .as_mut()
            .ok_or_else(|| failure("native NPC read was released"))?;
        let key = match kind {
            PreparationKind::Candidates => session.begin_npc_candidates(read_owner, &request),
            PreparationKind::Sources => session.begin_npc_sources(read_owner, &request),
        }
        .map_err(operation_error)?;
        let result = preparation_turn(session, read_owner, key, None, cancel, budget);
        if read.released.load(Ordering::Acquire) {
            session
                .cancel_npc_preparation(read_owner)
                .map_err(operation_error)?;
            *owner = None;
            return Err(failure("native NPC read was released"));
        }
        result
    })
}

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn npc_presentation_labels<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native NPC read was released"));
            }
            session
                .npc_presentation_labels(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("native NPC read was released"))?,
                    &request,
                )
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn npc_candidates<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        begin_preparation(self, env, read, request, PreparationKind::Candidates)
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn npc_sources<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        begin_preparation(self, env, read, request, PreparationKind::Sources)
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn answer_npc_preparation<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        key: NativeCandidateKey,
        provider: &NativeWorldProvider,
        answer: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        let key = key.try_into()?;
        let read = Arc::clone(&read.inner);
        let provider = Arc::clone(&provider.inner);
        let (answer, custody) = input(&answer, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native NPC read was released"));
            }
            let read_owner = owner
                .as_mut()
                .ok_or_else(|| failure("native NPC read was released"))?;
            let answer = String::from_utf8(answer)
                .map_err(|_| failure("native provider answer must be UTF-8 JSON"))?;
            let result = preparation_turn(
                session,
                read_owner,
                key,
                Some((&provider, answer)),
                cancel,
                budget,
            );
            if read.released.load(Ordering::Acquire) {
                session
                    .cancel_npc_preparation(read_owner)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("native NPC read was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcRead>")]
    pub fn read_npc<'a>(&self, env: &'a Env, request: BufferSlice<'_>) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, _budget| {
            let _custody = custody;
            let read = session.read_npc(&request).map_err(operation_error)?;
            Ok(NativeWorldNpcRead {
                inner: Arc::new(NpcReadRuntime {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                }),
                host,
                world,
            })
        })
    }
}
