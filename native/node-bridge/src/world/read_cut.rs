use super::*;

#[napi]
impl NativeWorld {
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
