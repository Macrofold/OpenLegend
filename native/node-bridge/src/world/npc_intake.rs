//! Native intake handles are scoped, readonly and explicitly releasable.
use super::*;
use openlegend_simulation::runtime::RuntimeNpcTrigger;

struct TriggerOwner {
    read: Mutex<Option<RuntimeNpcTrigger>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldNpcTrigger {
    inner: Arc<TriggerOwner>,
    host: Arc<HostRuntime>,
}
#[napi]
impl NativeWorldNpcTrigger {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native trigger owner lock failed"))?;
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("native trigger read was released"));
            }
            let read = owner
                .as_ref()
                .ok_or_else(|| failure("native trigger read was released"))?;
            read.packet(&budget)
                .map(|value| NativeWorldJson::new(value, budget))
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
impl Drop for NativeWorldNpcTrigger {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldNpcTrigger>")]
    pub fn read_npc_trigger<'a>(
        &self,
        env: &'a Env,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let storage = budget
                .reserve(std::mem::size_of::<TriggerOwner>() + 2 * std::mem::size_of::<usize>())
                .map_err(operation_error)?;
            let read = session
                .read_npc_trigger(&request)
                .map_err(operation_error)?;
            Ok(NativeWorldNpcTrigger {
                inner: Arc::new(TriggerOwner {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
            })
        })
    }
    #[napi(ts_return_type = "Promise<boolean>")]
    pub fn npc_trigger_current<'a>(
        &self,
        env: &'a Env,
        trigger: &NativeWorldNpcTrigger,
    ) -> Result<Object<'a>> {
        if !Arc::ptr_eq(&self.host, &trigger.host) {
            return Err(failure("native trigger belongs to a different host"));
        }
        let trigger = Arc::clone(&trigger.inner);
        self.compute(env, move |session, _cancel, _budget| {
            if trigger.released.load(Ordering::Acquire) {
                return Ok(false);
            }
            let trigger = trigger
                .read
                .try_lock()
                .map_err(|_| failure("native trigger owner lock failed"))?;
            let Some(trigger) = trigger.as_ref() else {
                return Ok(false);
            };
            session
                .npc_trigger_current(trigger)
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_npc_intake<'a>(
        &self,
        env: &'a Env,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_npc_intake(&request)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
