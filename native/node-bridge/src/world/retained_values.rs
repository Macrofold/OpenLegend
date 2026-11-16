use super::*;

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldJson | null>")]
    pub fn retained_values<'a>(
        &self,
        env: &'a Env,
        accepted_cut: Option<f64>,
        membership_revision: Option<f64>,
    ) -> Result<Object<'a>> {
        let known = match (accepted_cut, membership_revision) {
            (Some(cut), Some(revision)) => Some((integer(cut)?, integer(revision)?)),
            (None, None) => None,
            _ => {
                return Err(failure(
                    "Native value protection requires both cut and membership",
                ));
            }
        };
        self.compute(env, move |session, _cancel, budget| {
            session
                .retained_values(known)
                .map(|result| result.map(|value| NativeWorldJson::new(value, budget.clone())))
                .map_err(operation_error)
        })
    }
}
