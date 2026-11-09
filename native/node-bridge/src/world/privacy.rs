//! Only the sealed full recall edit enters the native writer. The common turn
//! pump owns its finite history/language waits and settlement fence.
use super::*;
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn forget<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session.begin_forget(&bytes).map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
