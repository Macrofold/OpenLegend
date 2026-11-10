//! A held batch owns native discovery, not JavaScript-supplied occurrence maps.
use super::*;
use openlegend_simulation::runtime::{RuntimeActivityLearning, RuntimeActivityLearningStep};
struct LearningOwner {
    read: Mutex<Option<RuntimeActivityLearning>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldActivityLearningBatch {
    inner: Arc<LearningOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi(object, object_from_js = false)]
pub struct NativeWorldActivityLearningTurn {
    pub key: NativeCandidateKey,
    pub kind: String,
    pub provider: Option<NativeWorldProvider>,
}
fn prepare_turn(
    session: &mut NativeWorldSession,
    read: &mut RuntimeActivityLearning,
    answer: Option<(&RuntimeProvider, String)>,
    cancel: &Cancellation,
    budget: &ByteBudget,
) -> Result<NativeWorldActivityLearningTurn> {
    let key = read
        .key()
        .ok_or_else(|| failure("learning preparation is complete"))?;
    let mut answer = answer;
    loop {
        if cancel.requested() {
            session
                .cancel_activity_learning(read)
                .map_err(operation_error)?;
            return Err(failure("learning preparation was canceled"));
        }
        match session
            .step_activity_learning(read, answer.take())
            .map_err(operation_error)?
        {
            RuntimeActivityLearningStep::Continue => continue,
            RuntimeActivityLearningStep::Provider(value) => {
                return Ok(NativeWorldActivityLearningTurn {
                    key: key.into(),
                    kind: "provider".into(),
                    provider: Some(NativeWorldProvider {
                        inner: Arc::new(value),
                        budget: budget.clone(),
                    }),
                });
            }
            RuntimeActivityLearningStep::Complete => {
                return Ok(NativeWorldActivityLearningTurn {
                    key: key.into(),
                    kind: "complete".into(),
                    provider: None,
                });
            }
        }
    }
}
impl Drop for NativeWorldActivityLearningBatch {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorldActivityLearningBatch {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |cancel| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("learning batch is busy"))?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("learning batch was released"));
            }
            let result = owner
                .as_ref()
                .ok_or_else(|| failure("learning batch was released"))?
                .packet(&budget)
                .map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("learning batch was released"));
            }
            Ok(NativeWorldJson::new(result, budget))
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
                    if session.cancel_activity_learning(read).is_err() {
                        world.fence.poison();
                    }
                }
                *owner = None;
                return;
            }
        }
        let read = Arc::clone(&self.inner);
        let custody = self.host.bytes.reserve(
            std::mem::size_of::<Arc<LearningOwner>>() + std::mem::size_of::<Arc<WorldRuntime>>(),
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
                    if session.cancel_activity_learning(read).is_err() {
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
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldActivityLearningBatch>")]
    pub fn prepare_activity_learning<'a>(
        &self,
        env: &'a Env,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, cancel, budget| {
            let _input = custody;
            if cancel.requested() {
                return Err(failure("learning preparation was canceled"));
            }
            let storage = budget
                .reserve(
                    size_of::<LearningOwner>()
                        + 2 * size_of::<usize>()
                        + size_of::<NativeWorldActivityLearningBatch>(),
                )
                .map_err(operation_error)?;
            let read = session
                .prepare_activity_learning(&request)
                .map_err(operation_error)?;
            Ok(NativeWorldActivityLearningBatch {
                inner: Arc::new(LearningOwner {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldActivityLearningTurn>")]
    pub fn step_activity_learning<'a>(
        &self,
        env: &'a Env,
        batch: &NativeWorldActivityLearningBatch,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&batch.world, &Arc::downgrade(&self.world)) {
            return Err(failure("learning batch belongs to another native writer"));
        }
        let batch = Arc::clone(&batch.inner);
        self.compute(env, move |session, cancel, budget| {
            let mut owner = batch
                .read
                .try_lock()
                .map_err(|_| failure("learning batch is busy"))?;
            if batch.released.load(Ordering::Acquire) {
                return Err(failure("learning batch was released"));
            }
            let read = owner
                .as_mut()
                .ok_or_else(|| failure("learning batch was released"))?;
            let result = prepare_turn(session, read, None, cancel, budget);
            if batch.released.load(Ordering::Acquire) {
                session
                    .cancel_activity_learning(read)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("learning batch was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldActivityLearningTurn>")]
    pub fn answer_activity_learning<'a>(
        &self,
        env: &'a Env,
        batch: &NativeWorldActivityLearningBatch,
        provider: &NativeWorldProvider,
        answer: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&batch.world, &Arc::downgrade(&self.world)) {
            return Err(failure("learning batch belongs to another native writer"));
        }
        let batch = Arc::clone(&batch.inner);
        let provider = Arc::clone(&provider.inner);
        let (answer, custody) = input(&answer, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _input = custody;
            let mut owner = batch
                .read
                .try_lock()
                .map_err(|_| failure("learning batch is busy"))?;
            if batch.released.load(Ordering::Acquire) {
                return Err(failure("learning batch was released"));
            }
            let read = owner
                .as_mut()
                .ok_or_else(|| failure("learning batch was released"))?;
            let answer = String::from_utf8(answer)
                .map_err(|_| failure("native provider answer must be UTF-8 JSON"))?;
            let result = prepare_turn(session, read, Some((&provider, answer)), cancel, budget);
            if batch.released.load(Ordering::Acquire) {
                session
                    .cancel_activity_learning(read)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("learning batch was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_activity_learning_publication<'a>(
        &self,
        env: &'a Env,
        batch: &NativeWorldActivityLearningBatch,
        request: BufferSlice<'_>,
        admission: Option<&NativeWorldMaintenanceRead>,
    ) -> Result<Object<'a>> {
        let world = Arc::downgrade(&self.world);
        if !Weak::ptr_eq(&batch.world, &world)
            || admission.is_some_and(|read| !Weak::ptr_eq(&read.world, &world))
        {
            return Err(failure(
                "learning admission belongs to another native writer",
            ));
        }
        let batch = Arc::clone(&batch.inner);
        let admission = admission.map(|read| Arc::clone(&read.inner));
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _input = custody;
            let owner = batch
                .read
                .try_lock()
                .map_err(|_| failure("learning batch is busy"))?;
            if batch.released.load(Ordering::Acquire) {
                return Err(failure("learning batch was released"));
            }
            let admission_owner = admission
                .as_ref()
                .map(|read| {
                    read.read
                        .try_lock()
                        .map_err(|_| failure("maintenance admission is busy"))
                })
                .transpose()?;
            if admission
                .as_ref()
                .is_some_and(|read| read.released.load(Ordering::Acquire))
            {
                return Err(failure("maintenance admission was released"));
            }
            let admitted = admission_owner
                .as_ref()
                .map(|owner| {
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("maintenance admission was released"))
                })
                .transpose()?;
            let key = session
                .begin_activity_learning_publication(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("learning batch was released"))?,
                    &request,
                    admitted,
                )
                .map_err(operation_error)?;
            let result = turn(session, key, None, cancel, budget);
            if batch.released.load(Ordering::Acquire)
                || admission
                    .as_ref()
                    .is_some_and(|read| read.released.load(Ordering::Acquire))
            {
                session.cancel(key).map_err(operation_error)?;
                return Err(failure("learning publication was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn acquired_activity_signatures<'a>(
        &self,
        env: &'a Env,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _input = custody;
            Ok(NativeWorldJson::new(
                session
                    .acquired_activity_signatures(&request)
                    .map_err(operation_error)?,
                budget.clone(),
            ))
        })
    }
}
