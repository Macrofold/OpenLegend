//! Host controls share actual preparation, protected-save and settlement.
use super::*;
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_control<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session.begin_control(&bytes).map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
