//! Detached player evidence can outlive a compute slice. Releasing a canceled
//! request marks it immediately; a running job keeps custody until it returns.
use super::*;
use openlegend_simulation::runtime::{RuntimePlayerPublication, RuntimePlayerRead};
use std::sync::Weak;

struct PlayerReadRuntime {
    read: Mutex<Option<RuntimePlayerRead>>,
    released: AtomicBool,
}
#[napi]
pub struct NativeWorldPlayerRead {
    inner: Arc<PlayerReadRuntime>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
impl NativeWorldPlayerRead {
    fn compute<'a, T, F>(&self, env: &'a Env, work: F) -> Result<Object<'a>>
    where
        T: ToNapiValue + Send + 'static,
        F: FnOnce(&mut RuntimePlayerRead, &ByteBudget) -> Result<T> + Send + 'static,
    {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native player read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("native player read was released"));
            }
            let result = work(
                owner
                    .as_mut()
                    .ok_or_else(|| failure("native player read was released"))?,
                &budget,
            );
            if read.released.load(Ordering::Acquire) {
                *owner = None;
            }
            result
        })
    }
}
#[napi]
impl NativeWorldPlayerRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson | null>")]
    pub fn control_question<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, |read, budget| {
            read.control_question(budget)
                .map(|v| v.map(|value| NativeWorldJson::new(value, budget.clone())))
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn finish_controls<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |read, budget| {
            let _custody = custody;
            read.finish_controls(&bytes, budget)
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, |read, budget| {
            read.packet(budget)
                .map(|v| NativeWorldJson::new(v, budget.clone()))
                .map_err(operation_error)
        })
    }
    #[napi]
    pub fn release(&self) {
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut read) = self.inner.read.try_lock() {
            *read = None;
        }
    }
}
#[napi]
pub struct NativeWorldPlayerPublication {
    inner: Option<RuntimePlayerPublication>,
    read: Arc<PlayerReadRuntime>,
}
#[napi]
impl NativeWorldPlayerPublication {
    #[napi]
    pub fn can_use_inventory(&self) -> Result<bool> {
        if self.read.released.load(Ordering::Acquire) {
            return Err(failure("native player read was released"));
        }
        self.inner
            .as_ref()
            .map(|v| v.can_use_inventory())
            .ok_or_else(|| failure("native publication gate was released"))
    }
    #[napi]
    pub fn release(&mut self) {
        self.inner = None;
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldPlayerRead>")]
    pub fn read_player<'a>(
        &self,
        env: &'a Env,
        account: String,
        actor: String,
        event_window: u32,
    ) -> Result<Object<'a>> {
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, _budget| {
            let read = session
                .read_player(&account, &actor, event_window as usize)
                .map_err(operation_error)?;
            Ok(NativeWorldPlayerRead {
                inner: Arc::new(PlayerReadRuntime {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldPlayerPublication>")]
    pub fn player_publication<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldPlayerRead,
        selected_event_ids: Vec<String>,
        paused: bool,
        controlling: bool,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("player read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        self.compute(env, move |session, _cancel, _budget| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native player read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native player read was released"));
            }
            let publication = session
                .player_publication(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("native player read was released"))?,
                    &selected_event_ids,
                    paused,
                    controlling,
                )
                .map_err(operation_error)?;
            drop(owner);
            Ok(NativeWorldPlayerPublication {
                inner: Some(publication),
                read,
            })
        })
    }
}
