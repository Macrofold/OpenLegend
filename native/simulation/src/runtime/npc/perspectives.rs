use super::*;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PerspectiveRequest {
    entities: Vec<crate::capture::NpcPerspectiveEntity>,
}
impl NativeWorldSession {
    pub fn npc_perspectives(
        &mut self,
        read: &mut RuntimeNpcRead,
        input: &[u8],
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: PerspectiveRequest = serde_json::from_slice(input).map_err(failure)?;
        if read.candidate_key.is_some()
            || Arc::strong_count(&read.perspectives) != 1
            || Arc::strong_count(&read._custody) != 1
        {
            return Err(failure("NPC naming preparation is busy or already issued"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        if !read.historical_scope.still_permitted(state) {
            return Err(failure("NPC naming preparation was revoked"));
        }
        let snapshot = crate::capture::NpcPerspectiveSnapshot::capture(
            state,
            &read.read,
            &read.sources,
            &request.entities,
            &self.budget,
        )
        .map_err(failure)?;
        let ordinal = read.perspectives.len();
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Product<'a, T: Serialize> {
            snapshot: usize,
            attribution_identities: &'a T,
        }
        let output = RuntimeJson::encode(
            &Product {
                snapshot: ordinal,
                attribution_identities: snapshot.identities(),
            },
            &self.budget,
        )?;
        if read.perspectives.len() == read.perspectives.capacity() {
            let capacity = ordinal
                .checked_add(1)
                .and_then(|n| n.max(4).checked_next_power_of_two())
                .ok_or_else(|| failure("capacity"))?;
            let before = read._custody.bytes();
            let bytes = before
                .checked_add(
                    capacity
                        .checked_sub(read.perspectives.capacity())
                        .and_then(|n| {
                            n.checked_mul(size_of::<crate::capture::NpcPerspectiveSnapshot>())
                        })
                        .ok_or_else(|| failure("capacity"))?,
                )
                .ok_or_else(|| failure("capacity"))?;
            Arc::get_mut(&mut read._custody)
                .ok_or_else(|| failure("NPC naming custody is already issued"))?
                .resize(bytes)
                .map_err(failure)?;
            if let Err(error) = Arc::get_mut(&mut read.perspectives)
                .ok_or_else(|| failure("NPC naming snapshots are already issued"))?
                .try_reserve_exact(capacity - ordinal)
            {
                Arc::get_mut(&mut read._custody)
                    .ok_or_else(|| failure("NPC naming custody is already issued"))?
                    .resize(before)
                    .map_err(failure)?;
                return Err(failure(error));
            }
        }
        Arc::get_mut(&mut read.perspectives)
            .ok_or_else(|| failure("NPC naming snapshots are already issued"))?
            .push(snapshot);
        Ok(output)
    }
}
