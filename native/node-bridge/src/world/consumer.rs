//! Operational memory admission is separate from semantic world authority.
use super::*;

#[napi]
impl NativeWorld {
    #[napi]
    pub fn reserve_consumer_bytes(&self, bytes: f64) -> Result<NativeWorldConsumer> {
        boundary(|| {
            if self.world.stopped() || self.host.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            let bytes = usize::try_from(integer(bytes)?)
                .map_err(|_| failure("native consumer allocation overflow"))?;
            Ok(NativeWorldConsumer {
                value: Some(
                    RuntimeConsumer::reserve(bytes, &self.host.bytes).map_err(operation_error)?,
                ),
            })
        })
    }

    #[napi]
    pub fn reserve_consumer_json(&self, bytes: BufferSlice<'_>) -> Result<NativeWorldConsumer> {
        boundary(|| {
            if self.world.stopped() || self.host.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            Ok(NativeWorldConsumer {
                value: Some(
                    RuntimeConsumer::for_json(&bytes, &self.host.bytes).map_err(operation_error)?,
                ),
            })
        })
    }
}
