//! Recent maintenance uses the common bounded compute/pump/settlement path.
use super::*;
use openlegend_simulation::runtime::{RuntimeMaintenancePublication, RuntimeMaintenanceRead};
use std::mem::size_of;
use std::sync::Weak;
mod consolidation;
mod learning;
mod reflection;

pub(super) struct MaintenanceOwner {
    pub(super) read: Mutex<Option<RuntimeMaintenanceRead>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldMaintenanceRead {
    pub(super) inner: Arc<MaintenanceOwner>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
#[napi]
pub struct NativeWorldMaintenancePublication {
    inner: Option<RuntimeMaintenancePublication>,
    owner: MaintenancePublicationOwner,
    _storage: ByteReservation,
}
enum MaintenancePublicationOwner {
    Read(Arc<MaintenanceOwner>),
    Reflection(Arc<reflection::ReflectionOwner>),
    Consolidation(Arc<consolidation::ConsolidationOwner>),
}
#[napi]
impl NativeWorldMaintenancePublication {
    #[napi]
    pub fn is_current(&self) -> bool {
        !match &self.owner {
            MaintenancePublicationOwner::Read(owner) => owner.released.load(Ordering::Acquire),
            MaintenancePublicationOwner::Reflection(owner) => {
                owner.released.load(Ordering::Acquire)
            }
            MaintenancePublicationOwner::Consolidation(owner) => {
                owner.released.load(Ordering::Acquire)
            }
        } && self
            .inner
            .as_ref()
            .is_some_and(RuntimeMaintenancePublication::is_current)
    }
    #[napi]
    pub fn release(&mut self) {
        self.inner = None;
    }
}
#[napi]
impl NativeWorldMaintenanceRead {
    /// Queue acknowledgement checks the originating wakeup inputs separately
    /// from the narrower body admission used when starting an HTTP request.
    #[napi]
    pub fn inputs_current(&self) -> bool {
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
            .is_some_and(|read| session.maintenance_inputs_current(read).unwrap_or(false))
            && !self.inner.released.load(Ordering::Acquire)
    }
    /// Used inside an existing history publication lease, immediately before
    /// fetch. This checks the real resident owner without an asynchronous gap.
    #[napi]
    pub fn is_current(&self, input: BufferSlice<'_>) -> bool {
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
            .is_some_and(|read| session.maintenance_current(read, &input).unwrap_or(false))
            && !self.inner.released.load(Ordering::Acquire)
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("maintenance read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            let value = owner
                .as_ref()
                .ok_or_else(|| failure("maintenance read was released"))?;
            let result = value.packet(&budget).map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            Ok(NativeWorldJson::new(result, budget))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn details<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, false)
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn raw_times<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, true)
    }
    #[napi]
    pub fn release(&self) {
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut read) = self.inner.read.try_lock() {
            *read = None;
        }
    }
}
impl Drop for NativeWorldMaintenanceRead {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn maintenance_population<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, move |session, _cancel, budget| {
            Ok(NativeWorldJson::new(
                session.maintenance_population().map_err(operation_error)?,
                budget.clone(),
            ))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn maintenance_pressure<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            Ok(NativeWorldJson::new(
                session
                    .maintenance_pressure(&bytes)
                    .map_err(operation_error)?,
                budget.clone(),
            ))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldMaintenanceRead>")]
    pub fn read_maintenance<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let storage = budget
                .reserve(
                    std::mem::size_of::<MaintenanceOwner>()
                        + std::mem::size_of::<NativeWorldMaintenanceRead>()
                        + 2 * std::mem::size_of::<usize>(),
                )
                .map_err(operation_error)?;
            let read = session.read_maintenance(&bytes).map_err(operation_error)?;
            Ok(NativeWorldMaintenanceRead {
                inner: Arc::new(MaintenanceOwner {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                host,
                world,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldMaintenancePublication | null>")]
    pub fn maintenance_publication<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldMaintenanceRead,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("maintenance read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        self.compute(env, move |session, _cancel, budget| {
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("maintenance read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            let value = owner
                .as_ref()
                .ok_or_else(|| failure("maintenance read was released"))?;
            let storage = budget
                .reserve(std::mem::size_of::<NativeWorldMaintenancePublication>())
                .map_err(operation_error)?;
            let _custody = custody;
            let publication = session
                .maintenance_publication(value, &bytes)
                .map_err(operation_error)?;
            drop(owner);
            if read.released.load(Ordering::Acquire) {
                return Ok(None);
            }
            Ok(publication.map(|inner| NativeWorldMaintenancePublication {
                inner: Some(inner),
                owner: MaintenancePublicationOwner::Read(read),
                _storage: storage,
            }))
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_support_retention<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_support_retention(&bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_knowledge_retention<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_knowledge_retention(&bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_recent_retention<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_recent_retention(&bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
impl NativeWorldMaintenanceRead {
    fn product<'a>(&self, env: &'a Env, times: bool) -> Result<Object<'a>> {
        let world = self
            .world
            .upgrade()
            .ok_or_else(|| failure("maintenance world stopped"))?;
        let read = Arc::clone(&self.inner);
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            if world.stopped() || !world.active.load(Ordering::Acquire) {
                return Err(failure("maintenance world stopped"));
            }
            let session = world
                .session
                .try_lock()
                .map_err(|_| failure("maintenance writer is busy"))?;
            let session = session
                .as_ref()
                .ok_or_else(|| failure("maintenance writer stopped"))?;
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("maintenance read is busy"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            let value = owner
                .as_ref()
                .ok_or_else(|| failure("maintenance read was released"))?;
            let result = if times {
                session.maintenance_raw_times(value)
            } else {
                session.maintenance_files(value)
            }
            .map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("maintenance read was released"));
            }
            Ok(NativeWorldJson::new(result, budget))
        })
    }
}
