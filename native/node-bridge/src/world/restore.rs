//! The same bounded provider pump prepares a private complete installation.
//! Registry adoption still permits only one active writer for this world.
use super::*;
#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_restore<'a>(&self, env: &'a Env, bytes: BufferSlice<'_>) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session.begin_restore(&bytes).map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
    #[napi(ts_return_type = "Promise<void>")]
    pub fn activate_restored<'a>(
        &self,
        env: &'a Env,
        key: NativeCandidateKey,
        receipt: String,
    ) -> Result<Object<'a>> {
        let key = key.try_into()?;
        let receipt: RuntimeActivation = serde_json::from_str(&receipt).map_err(operation_error)?;
        let host = Arc::clone(&self.host);
        let world = Arc::clone(&self.world);
        self.compute(env, move |session, _cancel, _budget| {
            let worlds = host
                .worlds
                .lock()
                .map_err(|_| failure("native world registry unavailable"))?;
            activation_available(&world, &worlds)?;
            session
                .activate_restored(key, receipt)
                .map_err(operation_error)?;
            world.active.store(true, Ordering::Release);
            Ok(())
        })
    }
}
