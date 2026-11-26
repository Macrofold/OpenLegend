//! Current-format MP03 records share the one PostgreSQL world writer.
use super::{MetadataProjection, PrefixProjection, Store, StoreError, StoreResult};
use crate::command_epoch::{self, CommandEpoch};
use crate::{
    authority::{RequestScope, now_ms},
    operator_maintenance::{Error, Field, HISTORY, LocalTime, Occurrence, Planned, Window},
};
use chrono::NaiveDateTime;
use openlegend_simulation::{encoding::json_record, host::ByteBudget, records::SaveRows};
use std::sync::{Arc, Mutex};
use tokio_postgres::Transaction;

const ROW_BYTES: i32 = 24_576;
pub(crate) const WORKSPACE_BYTES: usize = ROW_BYTES as usize * 2;

pub(crate) struct MaintenanceProjection<'a> {
    pub(crate) metadata: &'a MetadataProjection,
    pub(crate) edit: Option<(Arc<Window>, Option<u64>)>,
    pub(crate) operator: Option<Arc<crate::authority::AuthorizedScope>>,
    pub(crate) budget: ByteBudget,
    pub(crate) staged_epoch: Option<Arc<Mutex<Option<CommandEpoch>>>>,
}

impl PrefixProjection for MaintenanceProjection<'_> {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.metadata
            .before_records(transaction, rows, revision)
            .await?;
        if let Some(operator) = &self.operator {
            current_creator(transaction, &operator.scope, &rows.world_id).await?;
        }
        if let Some((window, expected)) = &self.edit {
            if window.world_id != rows.world_id {
                return Err(StoreError::StaleCut);
            }
            write(transaction, window, *expected, &self.budget).await?;
        }
        if let Some(slot) = &self.staged_epoch {
            let epoch = command_epoch::rotate(transaction, &rows.world_id, now_ms()).await?;
            *slot.lock().map_err(|_| StoreError::WriterUnavailable)? = Some(epoch);
        }
        Ok(())
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.metadata
            .after_records(transaction, rows, revision)
            .await
    }
}

async fn current_creator(
    transaction: &Transaction<'_>,
    scope: &RequestScope,
    world: &str,
) -> StoreResult<()> {
    if scope.world_id != world {
        return Err(StoreError::StaleCut);
    }
    let session = i64::try_from(scope.session_revision).map_err(|_| StoreError::InvalidRecord)?;
    let grant = i64::try_from(scope.grant_revision).map_err(|_| StoreError::InvalidRecord)?;
    let allowed: bool = transaction.query_one(
        "SELECT EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_grants g ON s.account_id=g.account_id \
         WHERE g.world_id=$1 AND g.account_id=$2 AND s.id=$3 AND s.revision=$4 AND \
         s.expires_at>$5 AND g.revision=$6 AND g.capabilities::jsonb ? 'create')",
        &[&world, &scope.account_id, &scope.session_id, &session, &now_ms(), &grant],
    ).await?.try_get(0)?;
    if !allowed {
        return Err(StoreError::StaleCut);
    }
    Ok(())
}

async fn write(
    transaction: &Transaction<'_>,
    window: &Window,
    expected: Option<u64>,
    budget: &ByteBudget,
) -> StoreResult<()> {
    let _encoding = budget
        .reserve(ROW_BYTES as usize)
        .map_err(|_| StoreError::Capacity)?;
    let id = window.notice.id.to_string();
    let data = json_record(window).map_err(|_| StoreError::InvalidRecord)?;
    if data.len() > ROW_BYTES as usize {
        return Err(StoreError::InvalidRecord);
    }
    let updated = match expected {
        Some(expected) => transaction
            .execute(
                "UPDATE ops_maintenance SET updated_at=$3,payload=$4 WHERE world_id=$1 AND id=$2 \
             AND (payload::jsonb->>'revision')=$5",
                &[
                    &window.world_id,
                    &id,
                    &window.notice.updated_at,
                    &data,
                    &expected.to_string(),
                ],
            )
            .await?,
        None => transaction
            .execute(
                "INSERT INTO ops_maintenance (world_id,id,updated_at,payload) VALUES ($1,$2,$3,$4) \
             ON CONFLICT(world_id,id) DO NOTHING",
                &[&window.world_id, &id, &window.notice.updated_at, &data],
            )
            .await?,
    };
    if updated != 1 {
        return Err(StoreError::StaleCut);
    }
    transaction.execute(
        "DELETE FROM ops_maintenance WHERE world_id=$1 AND id IN (SELECT id FROM ops_maintenance \
         WHERE world_id=$1 AND payload::jsonb->>'status' IN ('completed','cancelled') \
         ORDER BY updated_at DESC,id DESC OFFSET $2)",
        &[&window.world_id, &(HISTORY as i64)],
    ).await?;
    Ok(())
}

impl Store {
    pub(crate) async fn operator_windows(&self, world: &str) -> StoreResult<Vec<Arc<Window>>> {
        let max = (HISTORY + 2) as i64;
        // Reserve the maximum transfer before querying. Each retained row
        // transfers to its own backing and can outlive the temporary result.
        let transfer = self
            .budget
            .reserve(max as usize * (ROW_BYTES as usize + 256))
            .map_err(|_| StoreError::Capacity)?;
        let world = world.to_owned();
        let budget = self.budget.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                let _transfer = transfer;
                let data = tx
                    .query(
                        "SELECT CASE WHEN octet_length(id)<=64 THEN id END,updated_at, \
                 CASE WHEN octet_length(payload)<=$2 THEN payload END FROM ops_maintenance \
                 WHERE world_id=$1 ORDER BY updated_at DESC,id DESC LIMIT $3",
                        &[&world, &ROW_BYTES, &max],
                    )
                    .await?;
                if data.len() > HISTORY + 1 {
                    return Err(StoreError::InvalidRecord);
                }
                data.iter()
                    .map(|row| {
                        let id = row
                            .try_get::<_, Option<&str>>(0)?
                            .ok_or(StoreError::InvalidRecord)?;
                        let updated = row.try_get(1)?;
                        let payload = row
                            .try_get::<_, Option<&str>>(2)?
                            .ok_or(StoreError::InvalidRecord)?;
                        let window = serde_json::from_str::<Window>(payload)
                            .map_err(|_| StoreError::InvalidRecord)?;
                        window.validated(&budget, &world, id, updated)
                    })
                    .collect()
            })
        })
        .await
    }

    pub(crate) async fn resolve_maintenance_dates(
        &self,
        planned: &Planned,
    ) -> Result<(Option<i64>, i64), Error> {
        if planned.time_zone.len() > 64 || !planned.time_zone.is_ascii() {
            return Err(Error::invalid("Choose a valid time zone.", None));
        }
        let start = planned
            .start
            .as_ref()
            .map(|time| when(time, Field::Start))
            .transpose()?;
        let end = when(&planned.end, Field::End)?;
        let zone = planned.time_zone.clone();
        let found = self
            .read_operational(move |tx| {
                Box::pin(async move {
                    let valid: bool = tx
                        .query_one(
                            "SELECT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=$1)",
                            &[&zone],
                        )
                        .await?
                        .try_get(0)?;
                    if !valid {
                        return Ok(None);
                    }
                    let from = match &start {
                        Some(start) => Some(candidates(tx, &zone, start).await?),
                        None => None,
                    };
                    let to = candidates(tx, &zone, &end).await?;
                    Ok(Some((from, to)))
                })
            })
            .await?;
        let (start, end) =
            found.ok_or_else(|| Error::invalid("Choose a valid time zone.", None))?;
        let from = match planned.start.as_ref().zip(start) {
            Some((local, candidates)) => Some(select(
                local,
                &planned.time_zone,
                Field::Start,
                &candidates,
            )?),
            None => None,
        };
        Ok((
            from,
            select(&planned.end, &planned.time_zone, Field::End, &end)?,
        ))
    }
}

fn when(local: &LocalTime, field: Field) -> Result<String, Error> {
    let label = match field {
        Field::Start => "start",
        Field::End => "end",
    };
    let invalid = || {
        Error::invalid(
            format!("The {label} date or time is not valid."),
            Some(field),
        )
    };
    if local.date.len() != 10
        || local.time.len() != 5
        || !local.date.is_ascii()
        || !local.time.is_ascii()
    {
        return Err(invalid());
    }
    let value = format!("{} {}", local.date, local.time);
    let datetime =
        NaiveDateTime::parse_from_str(&value, "%Y-%m-%d %H:%M").map_err(|_| invalid())?;
    if datetime.format("%Y-%m-%d %H:%M").to_string() != value || value.as_str() < "0100-01-01 00:00"
    {
        return Err(invalid());
    }
    Ok(value)
}

async fn candidates(
    transaction: &Transaction<'_>,
    zone: &str,
    local: &str,
) -> StoreResult<Vec<i64>> {
    // Probe offsets either side of a possible civil-time transition, then
    // round-trip each candidate so a skipped minute never becomes a later one.
    let rows = transaction
        .query(
            "WITH local AS (SELECT $1::text::timestamp AS value), \
         probes AS (SELECT value,value+hours*interval '1 hour' AS probe FROM local CROSS JOIN \
         (VALUES(-36),(0),(36)) AS offsets(hours)), \
         candidates AS (SELECT (value-(((probe AT TIME ZONE 'UTC') AT TIME ZONE $2)-probe)) \
         AT TIME ZONE 'UTC' AS instant,value FROM probes) \
         SELECT DISTINCT (extract(epoch FROM instant)*1000)::bigint AS ms FROM candidates \
         WHERE instant AT TIME ZONE $2=value ORDER BY ms",
            &[&local, &zone],
        )
        .await?;
    rows.iter()
        .map(|row| row.try_get(0).map_err(StoreError::from))
        .collect()
}

fn select(local: &LocalTime, zone: &str, field: Field, candidates: &[i64]) -> Result<i64, Error> {
    let label = match field {
        Field::Start => "start",
        Field::End => "end",
    };
    let (Some(first), Some(last)) = (candidates.first(), candidates.last()) else {
        return Err(Error::invalid(
            format!(
                "{} {} does not occur in {zone} because the clocks change. Choose another {label} time.",
                local.date, local.time
            ),
            Some(field),
        ));
    };
    if first != last && local.occurrence.is_none() {
        return Err(Error::ambiguous(
            format!(
                "{} {} occurs twice in {zone} because the clocks change. Choose the earlier or later occurrence for the {label}.",
                local.date, local.time
            ),
            field,
        ));
    }
    Ok(if matches!(local.occurrence, Some(Occurrence::Later)) {
        *last
    } else {
        *first
    })
}
