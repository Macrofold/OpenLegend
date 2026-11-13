//! Operational memory admission is separate from semantic world authority.
use super::*;

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

#[napi]
impl NativeWorld {
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
