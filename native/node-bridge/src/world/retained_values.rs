use super::*;

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson>")]
    pub fn retained_values<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        self.compute(env, |session, _cancel, budget| {
            session
                .retained_values()
                .map(|value| NativeWorldJson::new(value, budget.clone()))
                .map_err(operation_error)
        })
    }
}
