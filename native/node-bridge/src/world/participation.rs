//! Participation uses the ordinary bounded provider pump and protected commit
//! owner. A heartbeat or wall-clock timer cannot directly remove a body.
use super::*;
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_participation<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_participation(&bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
