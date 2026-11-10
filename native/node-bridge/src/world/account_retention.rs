//! SQL preparation lives outside the writer lane. This opaque handle has no
//! mutation authority until the same world consumes it into a real candidate.
use super::*;
use openlegend_simulation::runtime::RuntimeAccountRetention;
use std::{mem::size_of, sync::Weak};
struct RetentionOwner {
    read: Mutex<Option<RuntimeAccountRetention>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldAccountRetention {
    inner: Arc<RetentionOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi]
impl NativeWorldAccountRetention {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, None)
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn select<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let value = input(&bytes, &self.host.bytes)?;
        self.product(env, Some(value))
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn load<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let owner = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        let world = self
            .world
            .upgrade()
            .ok_or_else(|| failure("retention world stopped"))?;
        dispatch(env, &self.host, None, move |_cancel| {
            let _custody = custody;
            let mut read = owner
                .read
                .try_lock()
                .map_err(|_| failure("retention read is busy"))?;
            if owner.released.load(Ordering::Acquire) || world.stopped() {
                *read = None;
                return Err(failure("retention read was released"));
            }
            let result = read
                .as_mut()
                .ok_or_else(|| failure("retention read was consumed"))?
                .load(&bytes, &budget)
                .map_err(operation_error);
            if owner.released.load(Ordering::Acquire) {
                *read = None;
                return Err(failure("retention read was released"));
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
impl NativeWorldAccountRetention {
    fn product<'a>(
        &self,
        env: &'a Env,
        input: Option<(Vec<u8>, ByteReservation)>,
    ) -> Result<Object<'a>> {
        let owner = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        let world = self
            .world
            .upgrade()
            .ok_or_else(|| failure("retention world stopped"))?;
        dispatch(env, &self.host, None, move |_cancel| {
            let mut read = owner
                .read
                .try_lock()
                .map_err(|_| failure("retention read is busy"))?;
            if owner.released.load(Ordering::Acquire) || world.stopped() {
                *read = None;
                return Err(failure("retention read was released"));
            }
            let value = read
                .as_mut()
                .ok_or_else(|| failure("retention read was consumed"))?;
            let result = match input {
                Some((bytes, custody)) => {
                    let _custody = custody;
                    value.select(&bytes, &budget)
                }
                None => value.packet(&budget),
            }
            .map_err(operation_error);
            if owner.released.load(Ordering::Acquire) {
                *read = None;
                return Err(failure("retention read was released"));
            }
            Ok(NativeWorldJson::new(result?, budget))
        })
    }
}
impl Drop for NativeWorldAccountRetention {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldAccountRetention>")]
    pub fn read_account_retention<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let storage = budget
                .reserve(size_of::<RetentionOwner>() + size_of::<NativeWorldAccountRetention>())
                .map_err(operation_error)?;
            let read = session
                .read_account_retention(&bytes)
                .map_err(operation_error)?;
            Ok(NativeWorldAccountRetention {
                inner: Arc::new(RetentionOwner {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_account_retention<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldAccountRetention,
    ) -> Result<Object<'a>> {
        let origin = read
            .world
            .upgrade()
            .ok_or_else(|| failure("retention world stopped"))?;
        if !Arc::ptr_eq(&origin, &self.world) {
            return Err(failure("retention read belongs to another world"));
        }
        let owner = Arc::clone(&read.inner);
        self.compute(env, move |session, cancel, budget| {
            let mut read = owner
                .read
                .try_lock()
                .map_err(|_| failure("retention read is busy"))?;
            if owner.released.load(Ordering::Acquire) {
                *read = None;
                return Err(failure("retention read was released"));
            }
            let result = session
                .begin_account_retention(
                    read.as_mut()
                        .ok_or_else(|| failure("retention read was consumed"))?,
                )
                .map_err(operation_error);
            owner.released.store(true, Ordering::Release);
            *read = None;
            drop(read);
            turn(session, result?, None, cancel, budget)
        })
    }
}
