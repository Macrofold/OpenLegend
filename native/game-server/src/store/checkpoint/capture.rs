//! One retained checkpoint. SQL pages keep their own admission until their
//! bytes are handed to the file worker. The gameplay save gate ends at the
//! first read in the dedicated repeatable-read transaction.

use super::{CheckpointFormat, FILE_BUFFER, Header, Metadata, MetadataKind};
use crate::live_save::LiveSaves;
use crate::store::{StorageSchema, Store, StoreError, durable_head};
use crate::world::WorldError;
use openlegend_simulation::encoding::hex_bytes;
use openlegend_simulation::host::ByteBudget;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::io;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::process::{ChildStdin, Command};
use tokio::time::Instant;
use tokio_postgres::types::ToSql;
use tokio_postgres::{IsolationLevel, Transaction};

const SCAN_TIME: Duration = Duration::from_secs(120);
const CAPTURE_TIME: Duration = Duration::from_secs(125);

#[derive(Debug)]
pub(crate) enum CaptureError {
    World(WorldError),
    File(io::Error),
    Format,
    Busy,
    IntakeBusy,
    Conflict,
    Deadline,
}

impl std::fmt::Display for CaptureError {
    fn fmt(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::World(error) => error.fmt(out),
            Self::File(error) => error.kind().fmt(out),
            Self::Format => out.write_str("Checkpoint output could not be completed"),
            Self::Busy => out.write_str("A checkpoint is already waiting to be saved"),
            Self::IntakeBusy => out.write_str("Gameplay is still using the save gate."),
            Self::Conflict => out.write_str("Save identity conflicts"),
            Self::Deadline => out.write_str("Checkpoint capture reached its time limit"),
        }
    }
}

impl std::error::Error for CaptureError {}

impl CaptureError {
    pub(super) fn is_admission_refusal(&self) -> bool {
        matches!(self, Self::IntakeBusy)
            || matches!(self, Self::World(error) if error.is_admission_refusal())
    }
}

impl From<WorldError> for CaptureError {
    fn from(error: WorldError) -> Self {
        Self::World(error)
    }
}
impl From<StoreError> for CaptureError {
    fn from(error: StoreError) -> Self {
        Self::World(error.into())
    }
}
impl From<tokio_postgres::Error> for CaptureError {
    fn from(error: tokio_postgres::Error) -> Self {
        StoreError::from(error).into()
    }
}
impl From<io::Error> for CaptureError {
    fn from(error: io::Error) -> Self {
        Self::File(error)
    }
}

impl Store {
    /// Stream a fresh package without loading the gameplay state. Drain
    /// earlier accepted writes, hold asset custody and pin the read snapshot
    /// under the barrier, then let new gameplay and ordinary saves proceed.
    pub(super) async fn capture_local_checkpoint(
        self: &Arc<Self>,
        saves: Option<&Arc<LiveSaves>>,
        root: PathBuf,
        staged_root: Option<PathBuf>,
        world: &str,
        id: String,
        kind: MetadataKind,
        label: String,
        validate: impl Fn() -> Result<(), WorldError>,
    ) -> Result<Metadata, CaptureError> {
        let opened = Instant::now();
        let known = self.clone();
        let directory = root.clone();
        let world_id = world.to_owned();
        let highest = tokio::task::spawn_blocking(move || {
            super::catalog::highest_sequence(&directory, &world_id, &known.schema.checkpoint)
        })
        .await
        .map_err(|_| CaptureError::Format)??;
        // Stopped backup replacement scans the real catalog for sequence
        // allocation while the file remains private to the recorded attempt.
        let output = staged_root.unwrap_or(root);
        let mut reader = Self::read_only_session(
            &self.checkpoint_connection.0,
            self.checkpoint_connection.1.clone(),
        )
        .await?;
        // Recovery runs after the old listener, clock and final save have
        // joined. Running-world callers always pass the accepted-save owner.
        let barrier = match saves {
            Some(saves) if kind == MetadataKind::Auto => Some(
                saves
                    .enter_automatic_checkpoint()
                    .await?
                    .ok_or(CaptureError::IntakeBusy)?,
            ),
            Some(saves) => Some(saves.enter_protected().await?),
            None if kind == MetadataKind::Recovery => None,
            None => return Err(CaptureError::Format),
        };
        validate()?;
        let (expected, sequence) = self.claim_checkpoint(world, &id, highest).await?;
        let result: Result<Metadata, CaptureError> = async {
            let tx = reader
                .client
                .build_transaction()
                .isolation_level(IsolationLevel::RepeatableRead)
                .read_only(true)
                .start()
                .await?;
            let captured = durable_head(&tx).await?.ok_or(StoreError::InvalidRecord)?;
            if captured != expected {
                return Err(StoreError::StaleCut.into());
            }
            validate()?;
            drop(barrier);
            let capture = SnapshotCapture::new(&self.schema, &self.budget, opened);
            let file = capture
                .write(
                    &output,
                    world,
                    &id,
                    &tx,
                    SnapshotKind::Gameplay {
                        revision: captured.revision,
                        sequence: Some(sequence),
                        kind: Some(kind),
                        label,
                    },
                )
                .await?;
            tx.commit().await?;
            // Promotion is idempotent and uses the same immutable slot
            // identity. An ambiguous failure leaves its asset hold intact.
            self.complete_checkpoint_assets(world, &id).await?;
            Ok(file)
        }
        .await;
        if result.is_err()
            && let Ok(false) = tokio::fs::try_exists(output.join(&id)).await
        {
            let _ = self.release_checkpoint_assets(world, &id, true).await;
        }
        result
    }
}

pub(super) enum SnapshotKind {
    Gameplay {
        revision: u64,
        sequence: Option<u64>,
        kind: Option<MetadataKind>,
        label: String,
    },
    Operations,
}

/// Streams from the caller's fixed, read-only PostgreSQL transaction. Each
/// product has an independent bounded file worker and the same capture start
/// sets its deadline; no world or account authority is loaded into memory.
pub(super) struct SnapshotCapture<'a> {
    schema: &'a StorageSchema,
    budget: &'a ByteBudget,
    opened: Instant,
}

impl<'a> SnapshotCapture<'a> {
    pub(super) fn new(schema: &'a StorageSchema, budget: &'a ByteBudget, opened: Instant) -> Self {
        Self {
            schema,
            budget,
            opened,
        }
    }

    pub(super) async fn write(
        &self,
        root: &Path,
        world: &str,
        id: &str,
        snapshot: &Transaction<'_>,
        content: SnapshotKind,
    ) -> Result<Metadata, CaptureError> {
        let contract = &self.schema.checkpoint;
        // Parent/child buffers, the manifest and pipe custody are separate
        // from each admitted SQL page.
        let _workspace = self
            .budget
            .reserve(5 * FILE_BUFFER + super::METADATA)
            .map_err(|_| StoreError::Capacity)?;
        let (sim_time, header) = match &content {
            SnapshotKind::Gameplay { revision, .. } => {
                let time = self.game_time(snapshot, world).await?;
                let header = Header {
                    encoding: contract.encoding.clone(),
                    format: contract.format.clone(),
                    world_id: world.to_owned(),
                    revision: *revision,
                    tables: self
                        .schema
                        .tables
                        .iter()
                        .map(|table| table.name.clone())
                        .chain(contract.history_tables.iter().cloned())
                        .collect(),
                };
                (
                    time,
                    Some(serde_json::to_vec(&header).map_err(|_| CaptureError::Format)?),
                )
            }
            SnapshotKind::Operations => (0.0, None),
        };
        let nonce = uuid::Uuid::new_v4().to_string();
        let stage = root.join(format!(".pending-{nonce}"));
        let mut child = Command::new(std::env::current_exe()?)
            .arg("checkpoint-file")
            .arg(root)
            .arg(id)
            .arg(nonce)
            .env_clear()
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .kill_on_drop(true)
            .spawn()?;
        let result = tokio::time::timeout_at(self.opened + CAPTURE_TIME, async {
            let input = child.stdin.take().ok_or(CaptureError::Format)?;
            let mut package = Package::new(input, contract);
            tokio::time::timeout_at(self.opened + SCAN_TIME, async {
                match header {
                    Some(header) => {
                        package.emit(&[&header, b"\n"]).await?;
                        self.capture_gameplay(snapshot, world, &mut package).await
                    }
                    None => {
                        for table in &contract.backup.tables {
                            self.capture_table(snapshot, table, None, &mut package)
                                .await?;
                        }
                        Ok(())
                    }
                }
            })
            .await
            .map_err(|_| CaptureError::Deadline)??;
            let (label, format, revision, sequence, kind) = match content {
                SnapshotKind::Gameplay {
                    revision,
                    sequence,
                    kind,
                    label,
                } => (
                    label,
                    contract.format.clone(),
                    Some(revision),
                    sequence,
                    kind,
                ),
                SnapshotKind::Operations => (
                    "External authority".into(),
                    contract.backup.operations_format.clone(),
                    None,
                    None,
                    None,
                ),
            };
            let metadata = Metadata {
                id: id.to_owned(),
                world_id: world.to_owned(),
                label,
                created_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                sim_time,
                format,
                checksum: hex_bytes(&package.hash.finalize()),
                encoding: contract.encoding.clone(),
                kind,
                bytes: package.bytes,
                rows: package.rows,
                revision,
                sequence,
            };
            let mut input = package.input;
            let manifest = serde_json::to_vec(&metadata).map_err(|_| CaptureError::Format)?;
            if manifest.len() > super::METADATA {
                return Err(StoreError::InvalidRecord.into());
            }
            input.write_u32(0).await?;
            input.write_u32(manifest.len() as u32).await?;
            input.write_all(&manifest).await?;
            input.shutdown().await?;
            drop(input);
            if !child.wait().await?.success() {
                return Err(CaptureError::Format);
            }
            Ok(metadata)
        })
        .await
        .unwrap_or(Err(CaptureError::Deadline));
        if result.is_err() {
            let _ = child.start_kill();
            child.wait().await?;
            let _ = tokio::fs::remove_dir_all(stage).await;
        }
        result
    }

    async fn game_time(
        &self,
        snapshot: &Transaction<'_>,
        world: &str,
    ) -> Result<f64, CaptureError> {
        let (_custody, rows) = crate::store::read::admitted_query(
            snapshot,
            r#"SELECT payload FROM world_settings WHERE world_id=$1 AND id='["world"]'"#,
            &[&world],
            self.budget,
        )
        .await?;
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Time {
            sim_time: f64,
        }
        let [row] = rows.as_slice() else {
            return Err(StoreError::InvalidRecord.into());
        };
        let settings: &str = row.try_get(0)?;
        let time: Time = serde_json::from_str(settings).map_err(|_| StoreError::InvalidRecord)?;
        if !time.sim_time.is_finite() {
            return Err(StoreError::InvalidRecord.into());
        }
        Ok(time.sim_time)
    }

    async fn capture_gameplay(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        package: &mut Package<'_>,
    ) -> Result<(), CaptureError> {
        let contract = &self.schema.checkpoint;
        let count_matches: bool = tx.query_one(
            "SELECT (SELECT event_count FROM history_totals WHERE world_id=$1) IS NOT DISTINCT FROM (SELECT count(*) FROM history_events WHERE world_id=$1)",
            &[&world],
        ).await?.try_get(0)?;
        if !count_matches
            || tx
                .query_opt(&contract.capture_ownership, &[&world])
                .await?
                .is_some()
        {
            return Err(StoreError::InvalidRecord.into());
        }
        for table in self
            .schema
            .tables
            .iter()
            .map(|table| table.name.as_str())
            .chain(contract.history_tables.iter().map(String::as_str))
        {
            self.capture_table(tx, table, Some(world), package).await?;
        }
        Ok(())
    }

    async fn capture_table(
        &self,
        tx: &Transaction<'_>,
        table: &str,
        world: Option<&str>,
        package: &mut Package<'_>,
    ) -> Result<(), CaptureError> {
        package
            .emit(&[b"{\"table\":\"", table.as_bytes(), b"\"}\n"])
            .await?;
        let keys = stable_keys(tx, table, world.is_some()).await?;
        let contract = &self.schema.checkpoint;
        let predicate = match world {
            Some(_) => format!(
                "t.world_id=$1 AND {}",
                contract
                    .capture_selection
                    .get(table)
                    .map_or("TRUE", String::as_str)
            ),
            None if table == "intelligence_calls" => super::super::diagnostics::STAGE_BACKUP_FILTER.to_owned(),
            None => "TRUE".to_owned(),
        };
        let output = keys
            .iter()
            .map(|(key, _)| format!("t.{key}::text"))
            .collect::<Vec<_>>()
            .join(",");
        let order = keys
            .iter()
            .map(|(key, _)| format!("t.{key}"))
            .collect::<Vec<_>>()
            .join(",");
        let bound = keys
            .iter()
            .enumerate()
            .map(|(index, (_, ty))| {
                format!(
                    "(${}::text)::{ty}",
                    index + 1 + usize::from(world.is_some())
                )
            })
            .collect::<Vec<_>>()
            .join(",");
        let first = format!(
            "SELECT row_to_json(t)::text,{output} FROM {table} t WHERE {predicate} ORDER BY {order} LIMIT {}",
            contract.page
        );
        let next = format!(
            "SELECT row_to_json(t)::text,{output} FROM {table} t WHERE {predicate} AND ({order}) > ({bound}) ORDER BY {order} LIMIT {}",
            contract.page
        );
        let mut cursor = Vec::<String>::new();
        loop {
            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(keys.len() + 1);
            if let Some(ref world) = world {
                params.push(world);
            }
            params.extend(cursor.iter().map(|value| value as &(dyn ToSql + Sync)));
            let (_custody, rows) = crate::store::read::admitted_query(
                tx,
                if cursor.is_empty() { &first } else { &next },
                &params,
                self.budget,
            )
            .await?;
            let full = rows.len() == contract.page;
            if full {
                let last = rows.last().expect("full checkpoint page");
                cursor = (1..=keys.len())
                    .map(|index| last.try_get(index))
                    .collect::<Result<_, _>>()?;
            }
            for row in rows {
                let value: &str = row.try_get(0)?;
                package
                    .emit(&[
                        b"{\"table\":\"",
                        table.as_bytes(),
                        b"\",\"row\":",
                        value.as_bytes(),
                        b"}\n",
                    ])
                    .await?;
            }
            if !full {
                break;
            }
        }
        Ok(())
    }
}

async fn stable_keys(
    tx: &Transaction<'_>,
    table: &str,
    fixed_world: bool,
) -> Result<Vec<(String, String)>, CaptureError> {
    let rows = tx.query(
        "SELECT a.attname,format_type(a.atttypid,NULL) FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=($1::text)::regclass AND i.indisprimary ORDER BY array_position(i.indkey,a.attnum)", &[&table]
    ).await?;
    let mut keys = rows
        .into_iter()
        .map(|row| -> Result<(String, String), tokio_postgres::Error> {
            Ok((row.try_get(0)?, row.try_get(1)?))
        })
        .collect::<Result<Vec<_>, _>>()?;
    if fixed_world && keys.len() > 1 {
        // world_id is fixed for the capture and never advances the cursor.
        keys.retain(|(name, _)| name != "world_id");
    }
    if keys.is_empty()
        || keys.iter().any(|(name, ty)| {
            name.is_empty()
                || !name
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte == b'_')
                || !matches!(
                    ty.as_str(),
                    "text" | "bigint" | "integer" | "double precision" | "boolean"
                )
        })
    {
        return Err(StoreError::Schema.into());
    }
    Ok(keys)
}

struct Package<'a> {
    input: BufWriter<ChildStdin>,
    format: &'a CheckpointFormat,
    hash: Sha256,
    bytes: usize,
    rows: usize,
}

impl<'a> Package<'a> {
    fn new(input: ChildStdin, format: &'a CheckpointFormat) -> Self {
        Self {
            input: BufWriter::with_capacity(FILE_BUFFER, input),
            format,
            hash: Sha256::new(),
            bytes: 0,
            rows: 0,
        }
    }

    async fn emit(&mut self, parts: &[&[u8]]) -> Result<(), CaptureError> {
        let length = parts
            .iter()
            .try_fold(0usize, |bytes, part| bytes.checked_add(part.len()))
            .ok_or(StoreError::Capacity)?;
        self.rows = self.rows.checked_add(1).ok_or(StoreError::Capacity)?;
        self.bytes = self.bytes.checked_add(length).ok_or(StoreError::Capacity)?;
        if length > self.format.row_bytes
            || self.bytes > self.format.bytes
            || self.rows > self.format.rows
        {
            return Err(StoreError::Capacity.into());
        }
        self.input
            .write_u32(u32::try_from(length).map_err(|_| StoreError::Capacity)?)
            .await?;
        for part in parts {
            self.input.write_all(part).await?;
            self.hash.update(part);
        }
        Ok(())
    }
}
