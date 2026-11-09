//! Server-internal NPC capture. It retains one actual accepted read until its
//! context owner releases it or moves it into a native response ticket.
use super::*;
use openlegend_simulation::runtime::RuntimeNpcRead;
use std::sync::Weak;

struct NpcReadRuntime {
    read: Mutex<Option<RuntimeNpcRead>>,
    released: AtomicBool,
}

#[napi]
pub struct NativeWorldNpcRead {
    inner: Arc<NpcReadRuntime>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
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
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut read) = self.inner.read.try_lock() {
            *read = None;
        }
    }
}

#[napi]
impl NativeWorld {
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
