//! Durable retry windows stay in operational storage across player and world
//! restarts. They grant no authority to recover a receipt or start an action.

use crate::{
    authority::now_ms,
    store::{CommitError, Store, StoreError, StoreResult},
};
use openlegend_simulation::{encoding::json_record, identity::MAX_SAFE_INTEGER};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use tokio_postgres::Transaction;
use uuid::Uuid;

pub(crate) const RETRY_MS: i64 = 24 * 60 * 60 * 1_000;
const METADATA_BYTES: i32 = 256;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CommandEpoch {
    pub generation: u64,
    pub opened_at: i64,
    pub token: String,
}

pub struct RequestIdentity {
    pub timeline: String,
    pub epoch: CommandEpoch,
}

impl RequestIdentity {
    pub(crate) fn due(&self) -> bool {
        now_ms().saturating_sub(self.epoch.opened_at) >= RETRY_MS
    }

    /// Create the first timeline, or keep the exact existing one. Start a new
    /// durable epoch before accepting any requests with the new writer.
    pub async fn open(store: &Store, world: &str) -> Result<Self, CommitError> {
        store
            .operational(move |tx| {
                let world = world.to_owned();
                Box::pin(async move {
                    let key = format!("integration:world-timeline:{world}");
                    let timeline = match read::<String>(tx, &key).await? {
                        Some(timeline) if !timeline.is_empty() => timeline,
                        Some(_) => return Err(StoreError::InvalidRecord),
                        None => {
                            let timeline = Uuid::new_v4().to_string();
                            write(tx, &key, &timeline).await?;
                            timeline
                        }
                    };
                    let epoch = rotate(tx, &world, now_ms()).await?;
                    Ok(Self { timeline, epoch })
                })
            })
            .await
    }

    /// Install the recovery timeline and invalidate prior command tokens
    /// inside the same transaction as the staged world replacement.
    pub(crate) async fn restore(
        tx: &Transaction<'_>,
        world: &str,
        timeline: &str,
    ) -> StoreResult<Self> {
        Uuid::parse_str(timeline).map_err(|_| StoreError::InvalidRecord)?;
        write(
            tx,
            &format!("integration:world-timeline:{world}"),
            &timeline,
        )
        .await?;
        let epoch = rotate(tx, world, now_ms()).await?;
        Ok(Self {
            timeline: timeline.to_owned(),
            epoch,
        })
    }

    /// The accepted-operation turn calls this before resolving new commands.
    /// Keep the prior live token if the required durable rotation rolls back.
    pub async fn refresh(&mut self, store: &Store, world: &str) -> Result<bool, CommitError> {
        let now = now_ms();
        if now.saturating_sub(self.epoch.opened_at) < RETRY_MS {
            return Ok(false);
        }
        self.epoch = store
            .operational(move |tx| {
                let world = world.to_owned();
                Box::pin(async move { rotate(tx, &world, now).await })
            })
            .await?;
        Ok(true)
    }
}

pub(crate) async fn rotate(
    tx: &Transaction<'_>,
    world: &str,
    now: i64,
) -> StoreResult<CommandEpoch> {
    let key = format!("integration:command-epoch:{world}");
    let previous = read::<CommandEpoch>(tx, &key).await?;
    if previous.as_ref().is_some_and(|epoch| {
        !(0..=MAX_SAFE_INTEGER as i64).contains(&epoch.opened_at)
            || Uuid::parse_str(&epoch.token).is_err()
    }) {
        return Err(StoreError::InvalidRecord);
    }
    let generation = previous
        .map_or(0, |epoch| epoch.generation)
        .checked_add(1)
        .filter(|generation| *generation <= MAX_SAFE_INTEGER)
        .ok_or(StoreError::InvalidRecord)?;
    let epoch = CommandEpoch {
        generation,
        opened_at: now,
        token: Uuid::new_v4().to_string(),
    };
    write(tx, &key, &epoch).await?;
    let earliest = generation as i64 - 1;
    tx.execute(
        "DELETE FROM gameplay_receipts WHERE world_id=$1 AND epoch>0 AND epoch<$2 AND expires_at<=$3",
        &[&world, &earliest, &now],
    )
    .await?;
    Ok(epoch)
}

async fn read<T: DeserializeOwned>(tx: &Transaction<'_>, key: &str) -> StoreResult<Option<T>> {
    let row = tx
        .query_opt(
            "SELECT CASE WHEN octet_length(value)<=$2 THEN value END FROM meta WHERE key=$1",
            &[&key, &METADATA_BYTES],
        )
        .await?;
    row.map(|row| {
        let value: Option<&str> = row.try_get(0)?;
        serde_json::from_str(value.ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::InvalidRecord)
    })
    .transpose()
}

async fn write(tx: &Transaction<'_>, key: &str, value: &impl Serialize) -> StoreResult<()> {
    let value = json_record(value).map_err(|_| StoreError::InvalidRecord)?;
    tx.execute(
        "INSERT INTO meta(key,value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        &[&key, &value],
    )
    .await?;
    Ok(())
}
