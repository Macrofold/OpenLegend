use super::*;

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<void>")]
    pub fn resolve_receipt_tail<'a>(
        &self,
        env: &'a Env,
        reply: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let reply = input(&reply, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, _budget| {
            session
                .resolve_receipt_tail(reply.bytes())
                .map_err(operation_error)
        })
    }
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn read_cut<'a>(&self, env: &'a Env, request: BufferSlice<'_>) -> Result<Object<'a>> {
        let request = input(&request, &self.host.bytes)?;
        self.compute(env, move |session, _cancel, budget| {
            session
                .read_cut(request.bytes())
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
}
