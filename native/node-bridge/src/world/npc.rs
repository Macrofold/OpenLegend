//! Server-internal NPC capture. It retains one actual accepted read until its
//! context owner releases it or moves it into a native response ticket.
use super::*;
use openlegend_simulation::runtime::{
    RuntimeNpcPreparationStep, RuntimeNpcPublication, RuntimeNpcRead, RuntimeNpcResponseTicket,
};
use std::sync::Weak;

struct NpcReadRuntime {
    read: Mutex<Option<RuntimeNpcRead>>,
    released: AtomicBool,
    _custody: openlegend_simulation::host::ByteReservation,
}

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn npc_perspectives<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC naming read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("NPC naming read is busy"))?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("NPC naming read was released"));
            }
            let output = session
                .npc_perspectives(
                    owner
                        .as_mut()
                        .ok_or_else(|| failure("NPC naming read was released"))?,
                    &request,
                )
                .map_err(operation_error)?;
            if read.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("NPC naming read was released"));
            }
            Ok(NativeWorldJson::new(output, budget.clone()))
        })
    }
    /// Trusted operational protection chooses the actual SQL-before-acceptance
    /// route. Model JSON contains no persistence or permission selector.
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_npc_response<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldNpcResponseTicket,
        response: BufferSlice<'_>,
        protected: bool,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC response belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        let (response, custody) = input(&response, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let response = String::from_utf8(response)
                .map_err(|_| failure("native response must be UTF-8 JSON"))?;
            let mut owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("native NPC response is busy or unavailable"))?;
            if ticket.released.load(Ordering::Acquire) {
                return Err(failure("native NPC response was released"));
            }
            let result = session.begin_npc_response(&mut owner, &response, protected);
            let released = ticket.released.load(Ordering::Acquire);
            if owner.is_none() {
                ticket.released.store(true, Ordering::Release);
            }
            let key = result.map_err(operation_error)?;
            if released {
                session.cancel(key).map_err(operation_error)?;
                return Err(failure("native NPC response was released"));
            }
            turn(session, key, None, cancel, budget)
        })
    }
}

fn read_wrapper_custody(
    budget: &ByteBudget,
) -> Result<openlegend_simulation::host::ByteReservation> {
    budget
        .reserve(
            std::mem::size_of::<NpcReadRuntime>()
                .checked_sub(std::mem::size_of::<RuntimeNpcRead>())
                .and_then(|n| n.checked_add(2 * std::mem::size_of::<usize>()))
                .and_then(|n| n.checked_add(std::mem::size_of::<NativeWorldNpcRead>()))
                .ok_or_else(|| failure("capacity"))?,
        )
        .map_err(operation_error)
}

#[napi(object, object_from_js = false)]
pub struct NativeWorldNpcReads {
    pub original: NativeWorldNpcRead,
    pub current: NativeWorldNpcRead,
}

pub(super) struct NpcResponseTicketRuntime {
    pub(super) ticket: Mutex<Option<RuntimeNpcResponseTicket>>,
    pub(super) released: AtomicBool,
    _custody: openlegend_simulation::host::ByteReservation,
}

enum NpcPublicationOwner {
    Read(Arc<NpcReadRuntime>),
    Response(Arc<NpcResponseTicketRuntime>),
}
#[napi]
pub struct NativeWorldNpcPublication {
    inner: Option<RuntimeNpcPublication>,
    owner: NpcPublicationOwner,
    _custody: openlegend_simulation::host::ByteReservation,
}
#[napi]
impl NativeWorldNpcPublication {
    #[napi]
    pub fn is_current(&self) -> bool {
        self.inner.is_some()
            && !match &self.owner {
                NpcPublicationOwner::Read(read) => read.released.load(Ordering::Acquire),
                NpcPublicationOwner::Response(ticket) => ticket.released.load(Ordering::Acquire),
            }
    }
    #[napi]
    pub fn release(&mut self) {
        self.inner = None;
    }
}

/// This handle has no permission-map or command constructor. The native writer
/// issues it only by consuming the two originating accepted read handles.
#[napi]
pub struct NativeWorldNpcResponseTicket {
    pub(super) inner: Arc<NpcResponseTicketRuntime>,
    host: Arc<HostRuntime>,
    pub(super) world: Weak<WorldRuntime>,
}
impl Drop for NativeWorldNpcResponseTicket {
    fn drop(&mut self) {
        self.release();
    }
}
#[napi]
impl NativeWorldNpcResponseTicket {
    #[napi]
    pub fn release(&self) {
        self.inner.released.store(true, Ordering::Release);
        if let Ok(mut owner) = self.inner.ticket.try_lock() {
            *owner = None;
        }
    }
}
#[napi(object, object_from_js = false)]
pub struct NativeWorldNpcTurn {
    pub key: NativeCandidateKey,
    pub kind: String,
    pub provider: Option<NativeWorldProvider>,
}
fn preparation_turn(
    session: &mut NativeWorldSession,
    read: &mut RuntimeNpcRead,
    key: CandidateKey,
    answer: Option<(&RuntimeProvider, String)>,
    cancel: &Cancellation,
    budget: &ByteBudget,
) -> Result<NativeWorldNpcTurn> {
    let mut answer = answer;
    loop {
        if cancel.requested() {
            session.fence().request_stop();
        }
        match session
            .step_npc_preparation(read, key, answer.take())
            .map_err(operation_error)?
        {
            RuntimeNpcPreparationStep::Continue => continue,
            RuntimeNpcPreparationStep::Provider(value) => {
                return Ok(NativeWorldNpcTurn {
                    key: key.into(),
                    kind: "provider".into(),
                    provider: Some(NativeWorldProvider {
                        inner: Arc::new(value),
                        budget: budget.clone(),
                    }),
                });
            }
            RuntimeNpcPreparationStep::Complete => {
                return Ok(NativeWorldNpcTurn {
                    key: key.into(),
                    kind: "complete".into(),
                    provider: None,
                });
            }
        }
    }
}

#[napi]
pub struct NativeWorldNpcRead {
    inner: Arc<NpcReadRuntime>,
    host: Arc<HostRuntime>,
    world: Weak<WorldRuntime>,
}
impl Drop for NativeWorldNpcRead {
    fn drop(&mut self) {
        self.release();
    }
}

impl NativeWorldNpcRead {
    fn product<'a>(
        &self,
        env: &'a Env,
        encode: fn(
            &RuntimeNpcRead,
            &ByteBudget,
        ) -> std::result::Result<
            RuntimeJson,
            openlegend_simulation::runtime::RuntimeError,
        >,
    ) -> Result<Object<'a>> {
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
            let value = owner
                .as_ref()
                .ok_or_else(|| failure("native NPC read was released"))?;
            let result = encode(value, &budget)
                .map(|value| NativeWorldJson::new(value, budget))
                .map_err(operation_error);
            if read.released.load(Ordering::Acquire) {
                *owner = None;
            }
            result
        })
    }
}

#[napi]
impl NativeWorldNpcRead {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn packet<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, RuntimeNpcRead::packet)
    }

    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn candidates<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, RuntimeNpcRead::candidates_packet)
    }

    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn latest_sources<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.product(env, RuntimeNpcRead::latest_sources_packet)
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
                    if session.cancel_npc_preparation(read).is_err() {
                        world.fence.poison();
                    }
                }
                *owner = None;
                return;
            }
        }
        let read = Arc::clone(&self.inner);
        let custody = self.host.bytes.reserve(
            std::mem::size_of::<Arc<NpcReadRuntime>>() + std::mem::size_of::<Arc<WorldRuntime>>(),
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
                    if session.cancel_npc_preparation(read).is_err() {
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

enum PreparationKind {
    Candidates,
    Sources,
}
fn begin_preparation<'a>(
    world: &NativeWorld,
    env: &'a Env,
    read: &NativeWorldNpcRead,
    request: BufferSlice<'_>,
    kind: PreparationKind,
) -> Result<Object<'a>> {
    if !Weak::ptr_eq(&read.world, &Arc::downgrade(&world.world)) {
        return Err(failure("NPC read belongs to another native writer"));
    }
    let read = Arc::clone(&read.inner);
    let (request, custody) = input(&request, &world.host.bytes)?;
    world.compute(env, move |session, cancel, budget| {
        let _custody = custody;
        let mut owner = read
            .read
            .try_lock()
            .map_err(|_| failure("native NPC read is busy or unavailable"))?;
        if read.released.load(Ordering::Acquire) {
            return Err(failure("native NPC read was released"));
        }
        let read_owner = owner
            .as_mut()
            .ok_or_else(|| failure("native NPC read was released"))?;
        let key = match kind {
            PreparationKind::Candidates => session.begin_npc_candidates(read_owner, &request),
            PreparationKind::Sources => session.begin_npc_sources(read_owner, &request),
        }
        .map_err(operation_error)?;
        let result = preparation_turn(session, read_owner, key, None, cancel, budget);
        if read.released.load(Ordering::Acquire) {
            session
                .cancel_npc_preparation(read_owner)
                .map_err(operation_error)?;
            *owner = None;
            return Err(failure("native NPC read was released"));
        }
        result
    })
}

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<void>")]
    pub fn rebind_npc_response<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldNpcResponseTicket,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC response belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, cancel, _budget| {
            let _custody = custody;
            let mut owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("native NPC response is busy or unavailable"))?;
            if ticket.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("native NPC response was released"));
            }
            session
                .rebind_npc_response(
                    owner
                        .as_mut()
                        .ok_or_else(|| failure("native NPC response was released"))?,
                    &request,
                )
                .map_err(operation_error)
        })
    }

    #[napi(ts_return_type = "Promise<NativeWorldNpcReads>")]
    pub fn open_npc_response<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldNpcResponseTicket,
    ) -> Result<Object<'a>> {
        let world = Arc::downgrade(&self.world);
        if !Weak::ptr_eq(&ticket.world, &world) {
            return Err(failure("NPC response belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        let host = Arc::clone(&self.host);
        self.compute(env, move |session, cancel, budget| {
            let mut owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("native NPC response is busy or unavailable"))?;
            if ticket.released.load(Ordering::Acquire) || cancel.requested() {
                return Err(failure("native NPC response was released"));
            }
            // Both real class/Arc wrappers are funded before consuming the old
            // ticket. A capacity refusal leaves its original owners available.
            let original_custody = read_wrapper_custody(budget)?;
            let current_custody = read_wrapper_custody(budget)?;
            let (original, current) = session
                .open_npc_response(&mut owner)
                .map_err(operation_error)?;
            ticket.released.store(true, Ordering::Release);
            Ok(NativeWorldNpcReads {
                original: NativeWorldNpcRead {
                    inner: Arc::new(NpcReadRuntime {
                        read: Mutex::new(Some(original)),
                        released: AtomicBool::new(false),
                        _custody: original_custody,
                    }),
                    host: Arc::clone(&host),
                    world: world.clone(),
                },
                current: NativeWorldNpcRead {
                    inner: Arc::new(NpcReadRuntime {
                        read: Mutex::new(Some(current)),
                        released: AtomicBool::new(false),
                        _custody: current_custody,
                    }),
                    host,
                    world,
                },
            })
        })
    }

    #[napi(ts_return_type = "Promise<NativeWorldNpcPublication | null>")]
    pub fn npc_history_publication<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        let (request, input_custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _input_custody = input_custody;
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native NPC read was released"));
            }
            let custody = budget
                .reserve(std::mem::size_of::<NativeWorldNpcPublication>())
                .map_err(operation_error)?;
            let publication = session
                .npc_history_publication(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("native NPC read was released"))?,
                    &request,
                )
                .map_err(operation_error)?;
            drop(owner);
            Ok(publication.map(|inner| NativeWorldNpcPublication {
                inner: Some(inner),
                owner: NpcPublicationOwner::Read(read),
                _custody: custody,
            }))
        })
    }

    #[napi(ts_return_type = "Promise<NativeWorldNpcPublication | null>")]
    pub fn npc_response_publication<'a>(
        &self,
        env: &'a Env,
        ticket: &NativeWorldNpcResponseTicket,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&ticket.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC response belongs to another native writer"));
        }
        let ticket = Arc::clone(&ticket.inner);
        self.compute(env, move |session, _cancel, budget| {
            let owner = ticket
                .ticket
                .try_lock()
                .map_err(|_| failure("native NPC response is busy or unavailable"))?;
            if ticket.released.load(Ordering::Acquire) {
                return Err(failure("native NPC response was released"));
            }
            let custody = budget
                .reserve(std::mem::size_of::<NativeWorldNpcPublication>())
                .map_err(operation_error)?;
            let publication = session
                .npc_response_publication(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("native NPC response was released"))?,
                )
                .map_err(operation_error)?;
            drop(owner);
            Ok(publication.map(|inner| NativeWorldNpcPublication {
                inner: Some(inner),
                owner: NpcPublicationOwner::Response(ticket),
                _custody: custody,
            }))
        })
    }

    #[napi(ts_return_type = "Promise<NativeWorldNpcResponseTicket>")]
    pub fn bind_npc_response<'a>(
        &self,
        env: &'a Env,
        original: &NativeWorldNpcRead,
        current: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
        trigger: Option<&super::npc_intake::NativeWorldNpcTrigger>,
    ) -> Result<Object<'a>> {
        let world = Arc::downgrade(&self.world);
        if !Weak::ptr_eq(&original.world, &world) || !Weak::ptr_eq(&current.world, &world) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        if Arc::ptr_eq(&original.inner, &current.inner) {
            return Err(failure(
                "Original and current NPC captures must be distinct handles",
            ));
        }
        let first = Arc::clone(&original.inner);
        let fresh = Arc::clone(&current.inner);
        let trigger = trigger.map(|trigger| Arc::clone(&trigger.inner));
        let host = Arc::clone(&self.host);
        let (request, input_custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _input_custody = input_custody;
            let mut original = first
                .read
                .try_lock()
                .map_err(|_| failure("original NPC read is busy"))?;
            let mut current = fresh
                .read
                .try_lock()
                .map_err(|_| failure("current NPC read is busy"))?;
            if first.released.load(Ordering::Acquire)
                || fresh.released.load(Ordering::Acquire)
                || cancel.requested()
            {
                return Err(failure("NPC response capture was released"));
            }
            // Runtime custody already covers the ticket body and its captures.
            // This guard funds this actual Arc/Mutex wrapper before allocation.
            let custody = budget
                .reserve(
                    std::mem::size_of::<NpcResponseTicketRuntime>()
                        .checked_sub(std::mem::size_of::<RuntimeNpcResponseTicket>())
                        .and_then(|n| n.checked_add(2 * std::mem::size_of::<usize>()))
                        .and_then(|n| {
                            n.checked_add(std::mem::size_of::<NativeWorldNpcResponseTicket>())
                        })
                        .ok_or_else(|| failure("capacity"))?,
                )
                .map_err(operation_error)?;
            let trigger_read = trigger
                .as_ref()
                .map(|trigger| {
                    if trigger.released.load(Ordering::Acquire) {
                        return Err(failure("native NPC intake was released"));
                    }
                    trigger
                        .read
                        .try_lock()
                        .map_err(|_| failure("native NPC intake is busy"))
                })
                .transpose()?;
            let ticket = session
                .bind_npc_response(
                    &mut original,
                    &mut current,
                    &request,
                    trigger_read.as_ref().and_then(|owner| owner.as_ref()),
                )
                .map_err(operation_error)?;
            if first.released.load(Ordering::Acquire)
                || fresh.released.load(Ordering::Acquire)
                || cancel.requested()
            {
                return Err(failure("NPC response capture was released"));
            }
            Ok(NativeWorldNpcResponseTicket {
                inner: Arc::new(NpcResponseTicketRuntime {
                    ticket: Mutex::new(Some(ticket)),
                    released: AtomicBool::new(false),
                    _custody: custody,
                }),
                host,
                world,
            })
        })
    }

    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn npc_presentation_labels<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        let read = Arc::clone(&read.inner);
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            let owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native NPC read was released"));
            }
            session
                .npc_presentation_labels(
                    owner
                        .as_ref()
                        .ok_or_else(|| failure("native NPC read was released"))?,
                    &request,
                )
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn npc_candidates<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        begin_preparation(self, env, read, request, PreparationKind::Candidates)
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn npc_sources<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        request: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        begin_preparation(self, env, read, request, PreparationKind::Sources)
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcTurn>")]
    pub fn answer_npc_preparation<'a>(
        &self,
        env: &'a Env,
        read: &NativeWorldNpcRead,
        key: NativeCandidateKey,
        provider: &NativeWorldProvider,
        answer: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        if !Weak::ptr_eq(&read.world, &Arc::downgrade(&self.world)) {
            return Err(failure("NPC read belongs to another native writer"));
        }
        let key = key.try_into()?;
        let read = Arc::clone(&read.inner);
        let provider = Arc::clone(&provider.inner);
        let (answer, custody) = input(&answer, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let mut owner = read
                .read
                .try_lock()
                .map_err(|_| failure("native NPC read is busy or unavailable"))?;
            if read.released.load(Ordering::Acquire) {
                return Err(failure("native NPC read was released"));
            }
            let read_owner = owner
                .as_mut()
                .ok_or_else(|| failure("native NPC read was released"))?;
            let answer = String::from_utf8(answer)
                .map_err(|_| failure("native provider answer must be UTF-8 JSON"))?;
            let result = preparation_turn(
                session,
                read_owner,
                key,
                Some((&provider, answer)),
                cancel,
                budget,
            );
            if read.released.load(Ordering::Acquire) {
                session
                    .cancel_npc_preparation(read_owner)
                    .map_err(operation_error)?;
                *owner = None;
                return Err(failure("native NPC read was released"));
            }
            result
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldNpcRead>")]
    pub fn read_npc<'a>(&self, env: &'a Env, request: BufferSlice<'_>) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        let host = Arc::clone(&self.host);
        let world = Arc::downgrade(&self.world);
        self.compute(env, move |session, _cancel, _budget| {
            let _custody = custody;
            let read_custody = read_wrapper_custody(_budget)?;
            let read = session.read_npc(&request).map_err(operation_error)?;
            Ok(NativeWorldNpcRead {
                inner: Arc::new(NpcReadRuntime {
                    read: Mutex::new(Some(read)),
                    released: AtomicBool::new(false),
                    _custody: read_custody,
                }),
                host,
                world,
            })
        })
    }
}
