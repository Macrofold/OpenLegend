//! One authenticated player's admitted place note enters the ordinary candidate
//! and changed-record path. The bridge never mutates a TypeScript document.
use super::*;

#[napi]
impl NativeWorld {
    #[napi(ts_return_type = "Promise<NativeWorldTurn>")]
    pub fn begin_knowledge_edit<'a>(
        &self,
        env: &'a Env,
        bytes: BufferSlice<'_>,
    ) -> Result<Object<'a>> {
        let (bytes, custody) = input(&bytes, &self.host.bytes)?;
        self.compute(env, move |session, cancel, budget| {
            let _custody = custody;
            let key = session
                .begin_knowledge_edit(&bytes)
                .map_err(operation_error)?;
            turn(session, key, None, cancel, budget)
        })
    }
}
