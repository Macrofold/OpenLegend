//! The only bridge writer is an opaque resident session. Each compute slice
//! runs in the host pool; JavaScript receives owned finite products between
//! slices and settles through a separate constant-size control fence.
use super::{HostRuntime, NativeHost, boundary, failure, host_error};
use crate::pool::Cancellation;
use napi::bindgen_prelude::{BufferSlice, JsObjectValue, Object, ToNapiValue};
use napi::{Env, Result};
use napi_derive::napi;
use openlegend_simulation::host::{ByteBudget, ByteReservation, CandidateFence, CandidateKey};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivation, RuntimeConsumer, RuntimeJson, RuntimePrepared,
    RuntimeProvider, RuntimeSave, RuntimeSaveAcknowledgement, RuntimeStep,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
mod npc;
mod maintenance;
mod control;
mod player;
mod privacy;
mod read_cut;
mod retained_values;

fn operation_error(error: impl std::fmt::Debug) -> napi::Error {
    failure(format!("{error:?}"))
}

pub(crate) struct WorldRuntime {
    world_id: String,
    session: Mutex<Option<NativeWorldSession>>,
    fence: Arc<CandidateFence>,
    stopped: AtomicBool,
    active: AtomicBool,
}
impl WorldRuntime {
    pub(crate) fn stopped(&self) -> bool {
        self.stopped.load(Ordering::Acquire)
    }
}

#[napi(object)]
#[derive(Clone, Copy)]
pub struct NativeCandidateKey {
    pub id: f64,
    pub base_cut: f64,
    pub generation: f64,
}
fn integer(value: f64) -> Result<u64> {
    if !value.is_finite()
        || value < 0.
        || value.fract() != 0.
        || value > openlegend_simulation::identity::MAX_SAFE_INTEGER as f64
    {
        return Err(failure("native control integer is outside its exact range"));
    }
    Ok(value as u64)
}
impl TryFrom<NativeCandidateKey> for CandidateKey {
    type Error = napi::Error;
    fn try_from(value: NativeCandidateKey) -> Result<Self> {
        Ok(Self {
            id: integer(value.id)?,
            base_cut: integer(value.base_cut)?,
            generation: integer(value.generation)?,
        })
    }
}
impl From<CandidateKey> for NativeCandidateKey {
    fn from(value: CandidateKey) -> Self {
        Self {
            id: value.id as f64,
            base_cut: value.base_cut as f64,
            generation: value.generation as f64,
        }
    }
}

#[napi]
pub struct NativeWorldJson {
    value: Option<RuntimeJson>,
    budget: ByteBudget,
}
impl NativeWorldJson {
    fn new(value: RuntimeJson, budget: ByteBudget) -> Self {
        Self {
            value: Some(value),
            budget,
        }
    }
}

/// The actual decoded product owner retains this through its last consumer.
/// Native ownership is shared explicitly across optional tasks and caches.
#[napi]
pub struct NativeWorldConsumer {
    value: Option<RuntimeConsumer>,
}
#[napi]
impl NativeWorldConsumer {
    #[napi]
    pub fn retain(&self) -> Result<Self> {
        boundary(|| {
            Ok(Self {
                value: Some(
                    self.value
                        .as_ref()
                        .ok_or_else(|| failure("native consumer was released"))?
                        .retain()
                        .map_err(operation_error)?,
                ),
            })
        })
    }
    #[napi]
    pub fn release(&mut self) {
        self.value = None;
    }
}
#[napi]
impl NativeWorldJson {
    #[napi]
    pub fn consumer(&self) -> Result<NativeWorldConsumer> {
        boundary(|| {
            let value = self
                .value
                .as_ref()
                .ok_or_else(|| failure("native output was already consumed"))?;
            Ok(NativeWorldConsumer {
                value: Some(value.consumer(&self.budget).map_err(operation_error)?),
            })
        })
    }
    /// Consume once. Both external-buffer and engine-copy implementations keep
    /// the reservation on the actual Node Buffer until its finalizer runs.
    #[napi]
    pub fn consume<'a>(&mut self, env: &'a Env) -> Result<BufferSlice<'a>> {
        boundary(|| {
            let value = self
                .value
                .as_ref()
                .ok_or_else(|| failure("native output was already consumed"))?;
            let copy = self
                .budget
                .reserve(value.bytes().len())
                .map_err(|error| failure(error.to_string()))?;
            let (bytes, custody, handoff) = self.value.take().expect("checked output").into_parts();
            let mut buffer = BufferSlice::from_data(env, bytes)?;
            buffer.add_finalizer(custody, (), |context| drop(context.value))?;
            if let Some(handoff) = handoff {
                handoff.complete();
            }
            drop(copy);
            Ok(buffer)
        })
    }
}

#[napi]
pub struct NativeWorldProvider {
    inner: Arc<RuntimeProvider>,
    budget: ByteBudget,
}
#[napi]
impl NativeWorldProvider {
    #[napi]
    pub fn question(&self) -> Result<NativeWorldJson> {
        boundary(|| {
            self.inner
                .json(&self.budget)
                .map(|value| NativeWorldJson::new(value, self.budget.clone()))
                .map_err(operation_error)
        })
    }
}
#[napi]
pub struct NativeWorldPrepared {
    inner: RuntimePrepared,
    fence: Arc<CandidateFence>,
    budget: ByteBudget,
    output_delivered: bool,
}
#[napi]
impl NativeWorldPrepared {
    #[napi]
    pub fn key(&self) -> NativeCandidateKey {
        self.inner.key().into()
    }
    #[napi]
    pub fn allocation(&self) -> Result<String> {
        // Eleven exact scalar counters, not a world projection.
        serde_json::to_string(&self.inner.allocation()).map_err(operation_error)
    }
    #[napi]
    pub fn take_publication(&mut self) -> Result<NativeWorldJson> {
        boundary(|| {
            let output = self
                .inner
                .take_output()
                .ok_or_else(|| failure("native publication was already consumed"))?;
            let output = NativeWorldJson::new(output, self.budget.clone());
            self.output_delivered = true;
            Ok(output)
        })
    }
    #[napi]
    pub fn ready(&self) -> Result<()> {
        boundary(|| {
            if !self.output_delivered {
                return Err(failure(
                    "native publication must reach its Node owner before Ready",
                ));
            }
            self.inner.ready().map_err(operation_error)
        })
    }
    #[napi]
    pub fn settle(&self, accept: bool) -> Result<bool> {
        boundary(|| {
            self.fence
                .settle(self.inner.key(), accept)
                .map(|value| value == openlegend_simulation::host::Settlement::Accepted)
                .map_err(operation_error)
        })
    }
}
#[napi]
pub struct NativeWorldSave {
    inner: RuntimeSave,
    budget: ByteBudget,
}
#[napi]
impl NativeWorldSave {
    #[napi]
    pub fn rows(&self) -> Result<NativeWorldJson> {
        boundary(|| {
            self.inner
                .json(&self.budget)
                .map(|value| NativeWorldJson::new(value, self.budget.clone()))
                .map_err(operation_error)
        })
    }
}

#[napi(object, object_from_js = false)]
pub struct NativeWorldTurn {
    pub key: NativeCandidateKey,
    pub kind: String,
    pub provider: Option<NativeWorldProvider>,
    pub prepared: Option<NativeWorldPrepared>,
    pub preview: Option<NativeWorldJson>,
}

#[napi]
pub struct NativeWorld {
    host: Arc<HostRuntime>,
    world: Arc<WorldRuntime>,
}

type Resolver<T> = Box<dyn FnOnce(Env) -> Result<T> + Send>;
fn dispatch<'a, T, F>(
    env: &'a Env,
    host: &Arc<HostRuntime>,
    world: Option<Arc<WorldRuntime>>,
    work: F,
) -> Result<Object<'a>>
where
    T: ToNapiValue + Send + 'static,
    F: FnOnce(&Cancellation) -> Result<T> + Send + 'static,
{
    let permit = host
        .bytes
        .reserve(std::mem::size_of::<F>() + std::mem::size_of::<T>())
        .map_err(|error| failure(error.to_string()))?;
    let (deferred, promise) = env.create_deferred::<T, Resolver<T>>()?;
    let deferred = Arc::new(Mutex::new(Some(deferred)));
    let completion = Arc::clone(&deferred);
    let submitted = host.pool.submit(
        move |cancel| Ok(work(cancel)),
        move |result| {
            if let Some(deferred) = completion.lock().unwrap_or_else(|e| e.into_inner()).take() {
                match result {
                    Ok(Ok(value)) => deferred.resolve(Box::new(move |_env| {
                        let _permit = permit;
                        Ok(value)
                    })),
                    Ok(Err(error)) => deferred.reject(error),
                    Err(error) => deferred.reject(host_error(error)),
                }
            }
        },
        move || {
            if let Some(world) = &world {
                world.fence.poison();
            }
        },
    );
    if let Err(error) = submitted {
        if let Some(deferred) = deferred.lock().unwrap_or_else(|e| e.into_inner()).take() {
            deferred.reject(host_error(error));
        }
    }
    Ok(promise)
}
fn input(bytes: &[u8], budget: &ByteBudget) -> Result<(Vec<u8>, ByteReservation)> {
    let mut custody = budget
        .reserve(bytes.len())
        .map_err(|e| failure(e.to_string()))?;
    let bytes = bytes.to_vec();
    custody
        .resize(bytes.capacity())
        .map_err(|e| failure(e.to_string()))?;
    Ok((bytes, custody))
}
fn turn(
    session: &mut NativeWorldSession,
    key: CandidateKey,
    answer: Option<(&RuntimeProvider, String)>,
    cancel: &Cancellation,
    budget: &ByteBudget,
) -> Result<NativeWorldTurn> {
    let mut answer = answer;
    loop {
        if cancel.requested() {
            session.fence().request_stop();
        }
        let step = session.step(key, answer.take()).map_err(operation_error)?;
        let mut result = NativeWorldTurn {
            key: key.into(),
            kind: String::new(),
            provider: None,
            prepared: None,
            preview: None,
        };
        match step {
            RuntimeStep::Continue => continue,
            RuntimeStep::Provider(value) => {
                result.kind = "provider".into();
                result.provider = Some(NativeWorldProvider {
                    inner: Arc::new(value),
                    budget: budget.clone(),
                });
            }
            RuntimeStep::Prepared(value) => {
                result.kind = "prepared".into();
                result.prepared = Some(NativeWorldPrepared {
                    inner: value,
                    fence: session.fence(),
                    budget: budget.clone(),
                    output_delivered: false,
                });
            }
            RuntimeStep::Preview(value) => {
                result.kind = "preview".into();
                result.preview = Some(NativeWorldJson::new(value, budget.clone()));
            }
        }
        return Ok(result);
    }
}

#[napi]
impl NativeHost {
    #[napi(ts_return_type = "Promise<NativeWorld>")]
    pub fn install_world<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
        database_schema: String,
    ) -> Result<Object<'a>> {
        boundary(|| {
            let (bytes, custody) = input(&bytes, &self.runtime.bytes)?;
            let host = Arc::clone(&self.runtime);
            dispatch(env, &self.runtime, None, move |cancel| {
                let _custody = custody;
                let session =
                    NativeWorldSession::install(&bytes, &database_schema, host.bytes.clone())
                        .map_err(operation_error)?;
                let world = Arc::new(WorldRuntime {
                    world_id: session.world_id().map_err(operation_error)?.to_owned(),
                    fence: session.fence(),
                    session: Mutex::new(Some(session)),
                    stopped: AtomicBool::new(false),
                    active: AtomicBool::new(false),
                });
                let mut worlds = host
                    .worlds
                    .lock()
                    .map_err(|_| failure("native world registry unavailable"))?;
                if cancel.requested() || host.pool.is_closing() {
                    return Err(failure(
                        "native installation was cancelled before registration",
                    ));
                }
                worlds.push(Arc::clone(&world));
                drop(worlds);
                Ok(NativeWorld { host, world })
            })
        })
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<void>")]
    pub fn activate<'a>(&self, env: &'a Env, receipt: String) -> Result<Object<'a>> {
        let receipt: RuntimeActivation = serde_json::from_str(&receipt).map_err(operation_error)?;
        let host = Arc::clone(&self.host);
        let world = Arc::clone(&self.world);
        self.compute(env, move |session, _cancel, _budget| {
            let worlds = host
                .worlds
                .lock()
                .map_err(|_| failure("native world registry unavailable"))?;
            if world.active.load(Ordering::Acquire)
                || worlds.iter().any(|other| {
                    !Arc::ptr_eq(other, &world)
                        && other.world_id == world.world_id
                        && other.active.load(Ordering::Acquire)
                        && !other.stopped()
                })
            {
                return Err(failure("this world already has a native writer"));
            }
            session.activate(receipt).map_err(operation_error)?;
            world.active.store(true, Ordering::Release);
            Ok(())
        })
    }
}
impl NativeWorld {
    fn compute<'a, T, F>(&self, env: &'a Env, work: F) -> Result<Object<'a>>
    where
        T: ToNapiValue + Send + 'static,
        F: FnOnce(&mut NativeWorldSession, &Cancellation, &ByteBudget) -> Result<T>
            + Send
            + 'static,
    {
        let world = Arc::clone(&self.world);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, Some(Arc::clone(&world)), move |cancel| {
            let mut owner = world
                .session
                .try_lock()
                .map_err(|_| failure("native writer is busy or poisoned"))?;
            let session = owner
                .as_mut()
                .ok_or_else(|| failure("native writer is stopped"))?;
            work(session, cancel, &budget)
        })
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn definitions<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, |session, _cancel, budget| {
            session
                .definitions()
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn installation<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, |session, _cancel, budget| {
            session
                .installation()
                .map(|v| NativeWorldJson::new(v, budget.clone()))
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn advance<'a>(
        &self,
        env: &'a Env,
        seconds: f64,
        maximum_intervals: u32,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_advance(seconds, maximum_intervals as usize, &bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn command<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
        canonical: BufferSlice<'_>,
        preview: bool,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let (canonical, canonical_custody) = input(&canonical, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let _canonical_custody = canonical_custody;
            let canonical = String::from_utf8(canonical)
                .map_err(|_| failure("native command identity must be UTF-8 JSON"))?;
            let key = if preview {
                session.begin_cancel_preview(&bytes, canonical)
            } else {
                session.begin_command(&bytes, canonical)
            }
            .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn answer<'a>(
        &self,
        env: &'a Env,
        key: NativeCandidateKey,
        provider: &NativeWorldProvider,
        json: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let key = key.try_into()?;
        let provider = Arc::clone(&provider.inner);
        let (bytes, custody) = input(json.as_ref(), &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let json = String::from_utf8(bytes)
                .map_err(|_| failure("native provider answer must be UTF-8 JSON"))?;
            turn(session, key, Some((&provider, json)), cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<boolean>")]
    pub fn finish_settlement<'a>(
        &self,
        env: &'a Env,
        key: NativeCandidateKey,
    ) -> Result<Object<'a>> {
        let key = key.try_into()?;
        self.compute(env, move |session, _cancel, _budget| {
            session.finish_settlement(key).map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn cancel<'a>(&self, env: &'a Env, key: NativeCandidateKey) -> Result<Object<'a>> {
        let key = key.try_into()?;
        self.compute(env, move |session, _cancel, _budget| {
            session.cancel(key).map_err(operation_error)
        })
    }
    #[napi]
    pub fn request_yield(&self) {
        self.world.fence.request_stop();
    }
    #[napi]
    pub fn close_admission(&self) {
        self.world.fence.close_admission();
    }
    #[napi(ts_return_type = "Promise<NativeWorldSave>")]
    pub fn capture_save<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, move |session, _cancel, budget| {
            session
                .capture_save()
                .map(|inner| NativeWorldSave {
                    inner,
                    budget: budget.clone(),
                })
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn acknowledge<'a>(&self, env: &'a Env, ack: String) -> Result<Object<'a>> {
        let ack: RuntimeSaveAcknowledgement =
            serde_json::from_str(&ack).map_err(operation_error)?;
        self.compute(env, move |session, _cancel, _budget| {
            session.acknowledge(ack).map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn finish_stop<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let world = Arc::clone(&self.world);
        let host = Arc::clone(&self.host);
        dispatch(env, &self.host, Some(Arc::clone(&world)), move |_cancel| {
            let mut owner = world
                .session
                .try_lock()
                .map_err(|_| failure("native writer is busy or poisoned"))?;
            owner
                .as_ref()
                .ok_or_else(|| failure("native writer already stopped"))?
                .finish_stop()
                .map_err(operation_error)?;
            *owner = None;
            world.stopped.store(true, Ordering::Release);
            drop(owner);
            host.worlds
                .lock()
                .map_err(|_| failure("native world registry unavailable"))?
                .retain(|registered| !Arc::ptr_eq(registered, &world));
            Ok(())
        })
    }
}
