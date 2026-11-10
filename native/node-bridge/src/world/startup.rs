//! Startup uses the same genuine candidate, Ready, settlement and save owner.
use super::*;
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_startup<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, move |session, cancel, budget| {
            let key = session.begin_startup().map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
