//! Read-only entity-local route preparation. The originating opaque read and
//! its exact finite physical answers are consumed on the shared host pool.
use super::*;
use openlegend_simulation::runtime::RuntimeNavigationRead;
use std::sync::Weak;

struct NavigationRuntime {
    read: Mutex<Option<RuntimeNavigationRead>>,
    released: AtomicBool,
    _custody: ByteReservation,
}
#[napi]
pub struct NativeWorldNavigationRead {
    inner: Arc<NavigationRuntime>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi]
impl NativeWorldNavigationRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("navigation read is busy"))?;
            let result = (|| {
                if read.released.load(Ordering::Acquire) {
                    return Err(failure("navigation read was released"));
                }
                let value = owner
                    .as_ref()
                    .ok_or_else(|| failure("navigation read was consumed"))?;
                value.packet(&budget).map_err(operation_error)
            })();
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("navigation read was released"));
            }
            result.map(|value| NativeWorldJson::new(value, budget))
        })
    }
    #[napi]
    pub fn release(&self) {
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut owner) = self.inner.read.try_lock() {
            *owner = None;
        }
    }
}
impl Drop for NativeWorldNavigationRead {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldNavigationRead | null>")]
    pub fn read_navigation<'a>(&self, env: &'a Env, actor: String) -> Result<Object<'a>> {
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, cancel, budget| {
            let custody = budget
                .reserve(
                    std::mem::size_of::<NavigationRuntime>()
                        - std::mem::size_of::<RuntimeNavigationRead>()
                        + 2 * std::mem::size_of::<usize>()
                        + std::mem::size_of::<NativeWorldNavigationRead>(),
                )
                .map_err(operation_error)?;
            let read = session.read_navigation(&actor).map_err(operation_error)?;
            if cancel.requested() {
                return Err(failure("navigation preparation was cancelled"));
            }
            Ok(read.map(|read| NativeWorldNavigationRead {
                inner: Arc::new(NavigationRuntime {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _custody: custody,
                }),
                host,
                world,
            }))
        })
    }
    #[napi(ts_return_type = "Promise<boolean>")]
    pub fn resolve_navigation<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNavigationRead,
        answer: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("navigation read belongs to another writer"));
        }
        let read = Arc::clone(&read.inner);
        let (answer, custody) = input(&answer, &self.host.bytes)?;
        self.compute(env, move |session, cancel, _budget| {
            let _custody = custody;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("navigation read is busy"))?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                *owner = None;
                return Err(failure("navigation read was released"));
            }
            let result = session.resolve_navigation(
                owner
                    .as_mut()
                    .ok_or_else(|| failure("navigation read was consumed"))?,
                &answer,
            );
            let released = read.released.load(Ordering::Acquire) || cancel.requested();
            if released || !matches!(result, Ok(true)) {
                *owner = None;
            }
            if released {
                return Err(failure("navigation read was released"));
            }
            result.map_err(operation_error)
        })
    }
}
