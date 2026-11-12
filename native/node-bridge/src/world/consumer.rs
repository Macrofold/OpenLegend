//! Operational memory admission is separate from semantic world authority.
use super::*;
use std::mem::{align_of, size_of};

impl NativeWorldConsumer {
    pub(crate) fn reserve_bytes(bytes: f64, budget: &ByteBudget) -> Result<Self> {
        let bytes = usize::try_from(integer(bytes)?)
            .map_err(|_| failure("native consumer allocation overflow"))?;
        Ok(Self {
            value: RuntimeConsumer::reserve(bytes, budget).map_err(operation_error)?,
        })
    }
    pub(crate) fn reserve_json(bytes: &[u8], budget: &ByteBudget) -> Result<Self> {
        Ok(Self {
            value: RuntimeConsumer::for_json(bytes, budget).map_err(operation_error)?,
        })
    }
}

impl NativeJsonScratch {
    fn admission_open(
        host: &Option<Weak<HostRuntime>>,
        world: &Option<Weak<WorldRuntime>>,
    ) -> bool {
        let Some(host) = host.as_ref().and_then(Weak::upgrade) else {
            return false;
        };
        !host.pool.is_closing()
            && world
                .as_ref()
                .is_none_or(|world| world.upgrade().is_some_and(|world| !world.stopped()))
    }

    pub(crate) fn reserve(
        host: &Arc<HostRuntime>,
        world: Option<&Arc<WorldRuntime>>,
    ) -> Result<Self> {
        let parent = Some(Arc::downgrade(host));
        let world = world.map(Arc::downgrade);
        if !Self::admission_open(&parent, &world) {
            return Err(failure("native JSON scratch admission is closed"));
        }
        // Fund this complete carrier, including weak parents and lifecycle
        // state, plus the existing opaque Node wrapper/alignment envelope.
        // docs/projects/native-runtime-foundations-tech-design.md#32-narrow-api-and-ownership
        let reference_bytes = size_of::<Self>()
            .checked_add(32 * size_of::<u64>())
            .and_then(|bytes| bytes.checked_add(align_of::<Self>() - 1))
            .ok_or_else(|| failure("native scratch allocation overflow"))?;
        let reference = host
            .bytes
            .reserve(reference_bytes)
            .map_err(operation_error)?;
        Ok(Self {
            value: RuntimeJsonScratch::reserve(&host.bytes).map_err(operation_error)?,
            host: parent,
            world,
            _reference: reference,
        })
    }
}

#[napi]
impl NativeJsonScratch {
    #[napi]
    pub fn resize(&mut self, bytes: f64) -> Result<()> {
        boundary(|| {
            let bytes = usize::try_from(integer(bytes)?)
                .map_err(|_| failure("native scratch allocation overflow"))?;
            let host = &self.host;
            let world = &self.world;
            self.value
                .resize(bytes, || Self::admission_open(host, world))
                .map_err(operation_error)
        })
    }

    #[napi]
    pub fn close(&mut self) {
        self.value.close();
        self.host = None;
        self.world = None;
    }
}

#[napi]
impl NativeWorld {
    #[napi]
    pub fn reserve_json_scratch(&self) -> Result<NativeJsonScratch> {
        boundary(|| NativeJsonScratch::reserve(&self.host, Some(&self.world)))
    }

    #[napi]
    pub fn reserve_consumer_bytes(&self, bytes: f64) -> Result<NativeWorldConsumer> {
        boundary(|| {
            if self.world.stopped() || self.host.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            NativeWorldConsumer::reserve_bytes(bytes, &self.host.bytes)
        })
    }

    #[napi]
    pub fn reserve_consumer_json(&self, bytes: BufferSlice<'_>) -> Result<NativeWorldConsumer> {
        boundary(|| {
            if self.world.stopped() || self.host.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            NativeWorldConsumer::reserve_json(&bytes, &self.host.bytes)
        })
    }
}
