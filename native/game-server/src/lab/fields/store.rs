//! Checkpoints retain an immutable revision number. The first edit after a
//! historical restore materializes that cut once; ordinary edits version one row.
use crate::store::{CommitError, Store, StoreError, StoreResult};
use serde::{Deserialize, Serialize};
use tokio_postgres::Transaction;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub(crate) struct FieldRevision {
    pub(crate) scenario: Uuid,
    pub(crate) revision: u64,
}
impl FieldRevision {
    fn from_row(row: &tokio_postgres::Row) -> StoreResult<Self> {
        Ok(Self {
            scenario: Uuid::parse_str(row.try_get(0)?).map_err(|_| StoreError::InvalidRecord)?,
            revision: u64::try_from(row.try_get::<_, i64>(1)?)
                .map_err(|_| StoreError::InvalidRecord)?,
        })
    }
    pub(super) fn number(&self) -> StoreResult<i64> {
        self.revision.try_into().map_err(|_| StoreError::Capacity)
    }
}

pub(crate) async fn initialize(store: &Store) -> Result<(), CommitError> {
    store.operational(|tx| Box::pin(async move {
        tx.batch_execute(
            "CREATE TABLE IF NOT EXISTS cognition_lab.field_scenarios (
               id uuid PRIMARY KEY, tip bigint NOT NULL CHECK(tip >= 0));
             CREATE TABLE IF NOT EXISTS cognition_lab.field_selection (
               singleton boolean PRIMARY KEY CHECK(singleton), scenario uuid NOT NULL
               REFERENCES cognition_lab.field_scenarios, revision bigint NOT NULL CHECK(revision >= 0));
             CREATE TABLE IF NOT EXISTS cognition_lab.fields (
               scenario uuid NOT NULL REFERENCES cognition_lab.field_scenarios, id uuid NOT NULL,
               since bigint NOT NULL, until_revision bigint, owner text NOT NULL,
               recipients text[] NOT NULL, record text NOT NULL,
               CHECK(until_revision IS NULL OR until_revision > since),
               PRIMARY KEY(scenario,id,since));
             CREATE INDEX IF NOT EXISTS field_recipients ON cognition_lab.fields USING gin(recipients);"
        ).await?;
        if tx.query_opt("SELECT 1 FROM cognition_lab.field_selection", &[]).await?.is_none() {
            let id = Uuid::new_v4().to_string();
            tx.execute("INSERT INTO cognition_lab.field_scenarios VALUES ($1::text::uuid,0)", &[&id]).await?;
            tx.execute("INSERT INTO cognition_lab.field_selection VALUES(true,$1::text::uuid,0)", &[&id]).await?;
        }
        Ok(())
    })).await
}

pub(crate) async fn read_checkpoint_ref(tx: &Transaction<'_>) -> StoreResult<FieldRevision> {
    FieldRevision::from_row(
        &tx.query_one(
            "SELECT scenario::text,revision FROM cognition_lab.field_selection",
            &[],
        )
        .await?,
    )
}

pub(crate) async fn restore_checkpoint_ref(
    tx: &Transaction<'_>,
    selected: &FieldRevision,
) -> StoreResult<()> {
    let rows=tx.execute(
        "UPDATE cognition_lab.field_selection SET scenario=s.id, revision=$2 FROM cognition_lab.field_scenarios s
         WHERE s.id=$1::text::uuid AND s.tip >= $2",
        &[&selected.scenario.to_string(), &selected.number()?],
    ).await?;
    if rows != 1 {
        return Err(StoreError::StaleCut);
    }
    Ok(())
}

/// A stale form cannot modify the new branch selected by a restore.
pub(super) async fn begin_edit(
    tx: &Transaction<'_>,
    expected: &FieldRevision,
) -> StoreResult<FieldRevision> {
    let row = tx
        .query_one(
            "SELECT s.id::text, c.revision, s.tip FROM cognition_lab.field_selection c
        JOIN cognition_lab.field_scenarios s ON s.id=c.scenario FOR UPDATE OF c,s",
            &[],
        )
        .await?;
    let current = FieldRevision::from_row(&row)?;
    if current != *expected {
        return Err(StoreError::StaleCut);
    }
    let revision = current.number()?;
    let tip: i64 = row.try_get(2)?;
    let id = if revision == tip {
        current.scenario
    } else {
        let branch = Uuid::new_v4();
        tx.execute(
            "INSERT INTO cognition_lab.field_scenarios VALUES($1::text::uuid,$2)",
            &[&branch.to_string(), &revision],
        )
        .await?;
        tx.execute("INSERT INTO cognition_lab.fields SELECT $1::text::uuid,id,$3,NULL,owner,recipients,record FROM cognition_lab.fields
                    WHERE scenario=$2::text::uuid AND since<=$3 AND (until_revision IS NULL OR until_revision>$3)",
                    &[&branch.to_string(),&current.scenario.to_string(),&revision]).await?;
        branch
    };
    let next = revision.checked_add(1).ok_or(StoreError::Capacity)?;
    tx.execute(
        "UPDATE cognition_lab.field_scenarios SET tip=$2 WHERE id=$1::text::uuid",
        &[&id.to_string(), &next],
    )
    .await?;
    let selection = FieldRevision {
        scenario: id,
        revision: next as u64,
    };
    restore_checkpoint_ref(tx, &selection).await?;
    Ok(selection)
}
