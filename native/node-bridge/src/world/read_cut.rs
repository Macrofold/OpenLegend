use super::*;

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<void>")]
    pub fn resolve_receipt_tail<'a>(
        &self,
        env: &'a Env,
        reply: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (reply, custody) = input(&reply, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, _budget| {
            let _custody = custody;
            session
                .resolve_receipt_tail(&reply)
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn read_cut<'a>(&self, env: &'a Env, request: BufferSlice<'_>) -> Result<Object<'a>> {
        let (request, custody) = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            let _custody = custody;
            session
                .read_cut(&request)
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
}
