//! One detached pure pair read; release/cancellation retains running custody
//! until its actual compute slice returns. Only the owning writer can finish it.
use super::*;
use openlegend_simulation::runtime::{RuntimeReplyPreviewPublication, RuntimeReplyPreviewRead};
use std::mem::size_of;
use std::sync::Weak;

struct ReplyPreviewReadRuntime {
    read: Mutex<Option<RuntimeReplyPreviewRead>>,
    released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldReplyPreviewPublication {
    inner: Option<RuntimeReplyPreviewPublication>,
    world: Weak<WorldRuntime>,
    host: Weak<HostRuntime>,
    _storage: ByteReservation,
}
#[napi]
impl NativeWorldReplyPreviewPublication {
    #[napi]
    pub fn is_current(&self) -> bool {
        self.host
            .upgrade()
            .is_some_and(|host| !host.poisoned.load(Ordering::Acquire) && !host.pool.is_closing())
            && self
                .world
                .upgrade()
                .is_some_and(|world| !world.stopped() && world.active.load(Ordering::Acquire))
            && self
                .inner
                .as_ref()
                .is_some_and(RuntimeReplyPreviewPublication::is_current)
    }
    #[napi]
    pub fn release(&mut self) {
        self.inner = None;
    }
}
#[napi]
pub struct NativeWorldReplyPreviewRead {
    inner: Option<Arc<ReplyPreviewReadRuntime>>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
    // Releasing the read frees its Arc/data, while the inert opaque class shell
    // retains its own fixed charge until JavaScript actually destroys it.
    _reference: ByteReservation,
}
#[napi]
impl NativeWorldReplyPreviewRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson | null>")]
    pub fn question<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let read = Arc::clone(
            self.inner
                .as_ref()
                .ok_or_else(|| failure("reply preview read was released"))?,
        );
        let budget = self.host.bytes.clone();
        dispatch(env, &self.host, None, move |_cancel| {
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("reply preview read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("reply preview read was released"));
            }
            let result = owner
                .as_ref()
                .ok_or_else(|| failure("reply preview read was consumed or released"))?
                .question(&budget)
                .map_err(operation_error)
                .map(|value| value.map(|value| NativeWorldJson::new(value, budget.clone())));
            if read.released.load(Ordering::Acquire) {
                *owner = None;
            }
            result
        })
    }
    #[napi]
    pub fn release(&mut self) {
        let Some(inner) = self.inner.take() else {
            return;
        };
        inner.released.store(true, Ordering::Release);
        if let Ok(mut read) = inner.read.try_lock() {
            *read = None;
        }
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldReplyPreviewPublication | null>")]
    pub fn reply_preview_publication<'a>(
        &self,
        env: &'a Env,
        account: String,
        player: String,
        expected_cut: f64,
    ) -> Result<Object<'a>> {
        let expected_cut = integer(expected_cut)?;
        let world = Arc::downgrade(&self.world);
        let host = Arc::downgrade(&self.host);
        self.compute(env, move |session, _cancel, budget| {
            // Same supported opaque Node-class carrier as the existing finite
            // consumer/maintenance gates; no actor packet is captured here.
            let storage = budget
                .reserve(size_of::<NativeWorldReplyPreviewPublication>() + 32 * size_of::<u64>())
                .map_err(operation_error)?;
            let publication = session
                .reply_preview_publication(&account, &player, expected_cut)
                .map_err(operation_error)?;
            Ok(publication.map(|inner| NativeWorldReplyPreviewPublication {
                inner: Some(inner),
                world,
                host,
                _storage: storage,
            }))
        })
    }

    #[napi]
    pub fn read_reply_preview(
        &self,
        account: String,
        player: String,
        npc: String,
        volume: Option<String>,
    ) -> Result<NativeWorldReplyPreviewRead> {
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        // The publication subscriber captures this finite pair before the next
        // writer. Never block Node or miss an intervening negative cut in a queue.
        boundary(|| {
            if self.world.stopped()
                || self.host.pool.is_closing()
                || self.host.poisoned.load(Ordering::Acquire)
            {
                return Err(failure("reply preview admission is closed"));
            }
            let mut owner = self
                .world
                .session
                .try_lock()
                .map_err(|_| failure("native writer is busy or poisoned"))?;
            let session = owner
                .as_mut()
                .ok_or_else(|| failure("native writer is stopped"))?;
            let reference = self
                .host
                .bytes
                .reserve(size_of::<NativeWorldReplyPreviewRead>() + 32 * size_of::<u64>())
                .map_err(operation_error)?;
            // This allocation retains the inline Option even after finish;
            // release detaches the Arc, unless a running slice still owns it.
            let storage = self
                .host
                .bytes
                .reserve(size_of::<ReplyPreviewReadRuntime>() + 2 * size_of::<usize>())
                .map_err(operation_error)?;
            let read = session
                .read_reply_preview(&account, &player, &npc, volume.as_deref())
                .map_err(operation_error)?;
            Ok(NativeWorldReplyPreviewRead {
                inner: Some(Arc::new(ReplyPreviewReadRuntime {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                })),
                host,
                world,
                _reference: reference,
            })
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn finish_reply_preview<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldReplyPreviewRead,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure(
                "reply preview read belongs to another native writer",
            ));
        }
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        let read = Arc::clone(
            read.inner
                .as_ref()
                .ok_or_else(|| failure("reply preview read was released"))?,
        );
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("reply preview read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                *owner = None;
                return Err(failure("reply preview read was released"));
            }
            let selected = owner
                .take()
                .ok_or_else(|| failure("reply preview read was consumed or released"))?;
            let value = session
                .finish_reply_preview(selected, &bytes)
                .map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("reply preview read was released"));
            }
            Ok(NativeWorldJson::new(value, budget.clone()))
        })
    }
}
