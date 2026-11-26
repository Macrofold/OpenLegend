//! Verify the exact source field rows before their private, local file leaves
//! the checkpoint owner. Imported ownership always comes from the active grant.
use super::{Binding, Field, FieldRevision, Subject};
use crate::{
    authority::RequestScope,
    store::{Store, StoreError, StoreResult},
};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    runtime::{NativeWorldSession, RuntimeError},
};
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
pub(crate) struct Values {
    fields: Vec<Field<Binding>>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl Values {
    /// Measure the selected immutable cut before decoding it. A foreign
    /// author's field withholds the complete scenario, including its label.
    pub(crate) async fn read(
        store: &Store,
        selection: FieldRevision,
        owner: String,
        budget: ByteBudget,
    ) -> StoreResult<Arc<Self>> {
        store
            .read_operational(move |tx| {
                Box::pin(async move {
                    let source = selection.scenario.to_string();
                    let revision = selection.number()?;
                    let params: &[&(dyn tokio_postgres::types::ToSql + Sync)] =
                        &[&source, &revision];
                    let visible =
                        " FROM cognition_lab.fields WHERE scenario=$1::text::uuid AND since<=$2
                AND (until_revision IS NULL OR until_revision>$2)";
                    let row = tx
                        .query_one(
                            &format!(
                                "SELECT count(*),coalesce(sum(octet_length(record)),0)::bigint,
                coalesce(bool_and(owner=$3),true){visible}"
                            ),
                            &[&source, &revision, &owner],
                        )
                        .await?;
                    if !row.try_get::<_, bool>(2)? {
                        return Err(StoreError::Cancelled);
                    }
                    let count = usize::try_from(row.try_get::<_, i64>(0)?)
                        .map_err(|_| StoreError::Capacity)?;
                    let bytes = usize::try_from(row.try_get::<_, i64>(1)?)
                        .map_err(|_| StoreError::Capacity)?;
                    let bound = bytes
                        .checked_mul(16)
                        .and_then(|v| v.checked_add(count.checked_mul(512)?))
                        .ok_or(StoreError::Capacity)?;
                    let custody = budget.reserve(bound).map_err(|_| StoreError::Capacity)?;
                    let rows = tx
                        .query(&format!("SELECT record{visible} ORDER BY id"), params)
                        .await?;
                    let fields = rows
                        .iter()
                        .map(|r| {
                            serde_json::from_str(r.get(0)).map_err(|_| StoreError::InvalidRecord)
                        })
                        .collect::<StoreResult<Vec<_>>>()?;
                    Ok(Arc::new(Self {
                        fields,
                        _custody: custody,
                    }))
                })
            })
            .await
    }

    pub(crate) fn permitted(
        &self,
        world: &NativeWorldSession,
        scope: &RequestScope,
    ) -> Result<bool, RuntimeError> {
        let permitted = |binding: &Binding| -> Result<bool, RuntimeError> {
            match binding.life {
                Some(life) => Ok(world.intelligence_person_current(
                    &scope.account_id,
                    &scope.actor_id,
                    &binding.id,
                    life,
                )? && world.npc_schedule_enrolled(&binding.id)?),
                None => world.with_player_contacts(&scope.account_id, &scope.actor_id, |body| {
                    !body.actor && body.source_id == binding.id
                }),
            }
        };
        for field in &self.fields {
            for recipient in &field.recipients {
                if !permitted(recipient)? {
                    return Ok(false);
                }
            }
            let allowed = match &field.subject {
                Subject::Scene => true,
                Subject::Person { person } => permitted(person)?,
                Subject::Object { object } => permitted(object)?,
                Subject::Relation { from, to } => permitted(from)? && permitted(to)?,
            };
            if !allowed {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
