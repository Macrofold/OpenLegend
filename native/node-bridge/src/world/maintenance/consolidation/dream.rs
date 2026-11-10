use super::*;
use openlegend_simulation::runtime::RuntimeConsolidationDream;
pub(super) struct DreamOwner {
    pub(super) dream: Mutex<Option<RuntimeConsolidationDream>>,
    pub(super) released: AtomicBool,
    _storage: ByteReservation,
}
#[napi]
pub struct NativeWorldConsolidationDream {
    pub(super) inner: Arc<DreamOwner>,
    pub(super) world: Weak<WorldRuntime>,
}
#[napi]
impl NativeWorldConsolidationDream {
    #[napi]
    pub fn release(&self) {
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut owner) = self.inner.dream.try_lock() {
            *owner = None;
        }
    }
}
impl Drop for NativeWorldConsolidationDream {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldConsolidationDream>")]
    pub fn bind_consolidation_dream<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldConsolidationTicket,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let world = Arc::downgrade(&self.world);
        if !Weak::ptr_eq(&world, &ticket.world) {
            return Err(failure("dream belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("consolidation ticket is busy"))?;
            if ticket.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            let storage = budget
                .reserve(
                    size_of::<DreamOwner>()
                        .checked_sub(size_of::<RuntimeConsolidationDream>())
                        .and_then(|n| {
                            n.checked_add(
                                size_of::<NativeWorldConsolidationDream>() + 2 * size_of::<usize>(),
                            )
                        })
                        .ok_or_else(|| failure("capacity"))?,
                )
                .map_err(operation_error)?;
            let dream = session
                .bind_consolidation_dream(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("consolidation ticket was released"))?,
                    &bytes,
                )
                .map_err(operation_error)?;
            if ticket.released.load(Ordering::Acquire) {
                return Err(failure("consolidation ticket was released"));
            }
            Ok(NativeWorldConsolidationDream {
                inner: Arc::new(DreamOwner {
                    dream: Mutex::new(Some(dream)),
                    released: AtomicBool::new(false),
                    _storage: storage,
                }),
                world,
            })
        })
    }
}
