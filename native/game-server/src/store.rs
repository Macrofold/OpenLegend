//! Direct PostgreSQL ownership. One session owns the writer lock. Independently
//! admitted readers use fixed read-only snapshots on separate connections.

pub(crate) mod activity_learning;
mod archives;
pub(crate) mod assets;
mod attempts;
pub(crate) use attempts::{
    AttemptAdmission, AttemptRequest, InferenceClass, ModelReceipt, ModelUsage, ReservedAttempt,
};
pub(crate) mod checkpoint;
pub(crate) mod creation;
pub use checkpoint::RecoveredCheckpoint;
pub(crate) use checkpoint::{
    AdministrativeCheckpoint, CheckpointHistory, RecoveryAuthority, read_recovery_authority,
    reconcile_history_positions,
};
mod history;
mod jobs;
mod known_places;
mod lexical;
mod metadata;
mod npc_schedule;
mod npc_sources;
mod privacy_edit;
mod read;
pub(crate) mod recall;
mod received;
pub(crate) mod reflection;
mod schema;
mod source_versions;
mod view_cognition;
mod view_profile;
mod write;
pub(crate) use view_cognition::AiDisplay;

pub use history::OrdinaryProjection;
pub(crate) use history::{ClaimedStory, OptionalStorySource, StoryOutput, StoryRevisions};
pub(crate) use history::banner::NarrationBanner;
pub(crate) use history::events::{EventBoundary, EventEdge, EventFeed, EventSourceQuery};
pub(crate) use history::transcript::{Transcript, TranscriptItem, TranscriptRequest};
pub(crate) use jobs::{AdmittedJob, ConversationJob, JobRequest, TerminalOutcome};
pub use known_places::PreparedKnownPlaceRead;
pub(crate) use known_places::{KnownPlaceViewPage, PlaceViewRequest, PlaceViewSearch};
pub use lexical::{PendingLexical, PreparedLexical};
pub use metadata::MetadataProjection;
pub(crate) use npc_schedule::ThoughtRead;
pub(crate) use npc_sources::{PreparedNpcSources, RecallScope};
pub(crate) use privacy_edit::PreparedPrivacyEdit;
pub use read::{AdmittedReceipt, CurrentOpening, GameplayReceipt};
pub use recall::PreparedRecall;
pub(crate) use recall::activity_results::PreparedActivityMemories;
pub(crate) use recall::consolidation::PreparedConsolidation;
pub use schema::StorageSchema;
pub(crate) use source_versions::PreparedSourceVersions;
pub use write::{CommitError, PrefixProjection};

use openlegend_simulation::{host::ByteBudget, text::JsText};
use std::fmt;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_postgres::config::{Host, SslMode};
use tokio_postgres::{Client, Config, GenericClient};
use tokio_postgres_rustls::MakeRustlsConnect;

const SQL_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

/// Borrow exact text when it can participate in a PostgreSQL comparison.
fn postgres_text(value: &JsText) -> Option<&str> {
    value
        .as_unicode()
        .filter(|text| !text.as_bytes().contains(&0))
}

#[derive(Debug)]
pub enum StoreError {
    Sql(tokio_postgres::Error),
    Timeout,
    SecureConnectionRequired,
    WriterOwned,
    WriterUnavailable,
    Schema,
    InitializationRequired,
    OpeningRequired,
    AwaitingCreation,
    DamagedInstallation,
    StaleCut,
    InvalidRecord,
    Capacity,
    Cancelled,
    Maintenance,
    DerivedProjectionRequired,
}

impl fmt::Display for StoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let reason = match self {
            Self::Sql(_) => "PostgreSQL operation failed",
            Self::Timeout => "PostgreSQL operation timed out",
            Self::SecureConnectionRequired => "A remote PostgreSQL writer requires TLS",
            Self::WriterOwned => "Another Open Legend writer owns this database",
            Self::WriterUnavailable => "The PostgreSQL writer is unavailable",
            Self::Schema => "PostgreSQL does not match the current Open Legend schema",
            Self::InitializationRequired => "An empty database requires explicit initialization",
            Self::OpeningRequired => "This database is initialized and requires a starting world",
            Self::AwaitingCreation => "This database is registered to receive a new world",
            Self::DamagedInstallation =>
                "This database contains retained data but has no current world header",
            Self::StaleCut => "PostgreSQL does not match the selected world revision",
            Self::InvalidRecord => "A current PostgreSQL record is invalid",
            Self::Capacity => "PostgreSQL transfer cannot fit its allowance",
            Self::Cancelled => "PostgreSQL operation was cancelled before commit",
            Self::Maintenance => "This server cannot open an active maintenance schedule",
            Self::DerivedProjectionRequired => {
                "This save requires its history or personal index projection"
            }
        };
        formatter.write_str(reason)
    }
}

impl std::error::Error for StoreError {}
impl From<tokio_postgres::Error> for StoreError {
    fn from(error: tokio_postgres::Error) -> Self {
        Self::Sql(error)
    }
}

pub type StoreResult<T> = Result<T, StoreError>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DurableHead {
    pub world_id: String,
    pub generation: String,
    pub revision: u64,
}

struct Session {
    client: Client,
    task: JoinHandle<Result<(), tokio_postgres::Error>>,
    connected: Arc<AtomicBool>,
    uncertain_save: Option<write::PreparedSaveCommit>,
}

impl Drop for Session {
    fn drop(&mut self) {
        self.task.abort();
    }
}

pub struct Store {
    pub(crate) schema: StorageSchema,
    _schema_custody: openlegend_simulation::host::ByteReservation,
    writer: Mutex<Session>,
    reader: Mutex<Session>,
    simulation_reader: Mutex<Session>,
    checkpoint_connection: (Config, MakeRustlsConnect),
    admitted: AtomicBool,
    writer_connected: Arc<AtomicBool>,
    budget: ByteBudget,
}

impl Store {
    /// Connect one locked writer and independent read-only sessions for
    /// operational reads and simulation-cut reads. The generated artifact is
    /// trusted release input. Its DDL is only applied on explicit initialization
    /// after the preexisting metadata check.
    pub async fn open(
        config: Config,
        tls: MakeRustlsConnect,
        mut schema: StorageSchema,
        initialize: bool,
        budget: ByteBudget,
    ) -> StoreResult<Self> {
        let bytes = schema.retained_bytes().ok_or(StoreError::Capacity)?;
        let validation_bytes = schema
            .tables
            .len()
            .checked_mul(64)
            .and_then(|bytes| bytes.checked_add(8192))
            .ok_or(StoreError::Capacity)?;
        let mut schema_custody = budget
            .reserve(
                bytes
                    .checked_add(validation_bytes)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        schema.validate()?;
        schema_custody
            .resize(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let config = Self::checked_database(config)?;
        let mut writer = Self::session(&config, tls.clone()).await?;
        let acquired: bool = writer
            .client
            .query_one("SELECT pg_try_advisory_lock(187114, 1)", &[])
            .await?
            .try_get(0)?;
        if !acquired {
            return Err(StoreError::WriterOwned);
        }
        Self::initialize(&mut writer.client, &schema, initialize).await?;
        // The release DDL is only used during initialization. End its storage
        // before keeping the reusable table descriptors with the live writer.
        drop(std::mem::take(&mut schema.initialization));
        schema_custody
            .resize(schema.retained_bytes().ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let reader = Self::read_only_session(&config, tls.clone()).await?;
        let simulation_reader = Self::read_only_session(&config, tls.clone()).await?;
        let writer_connected = Arc::clone(&writer.connected);
        Ok(Self {
            schema,
            _schema_custody: schema_custody,
            writer: Mutex::new(writer),
            reader: Mutex::new(reader),
            simulation_reader: Mutex::new(simulation_reader),
            checkpoint_connection: (config, tls),
            admitted: AtomicBool::new(true),
            writer_connected,
            budget,
        })
    }

    fn checked_database(mut config: Config) -> StoreResult<Config> {
        config.connect_timeout(SQL_TIMEOUT);
        let loopback = config.get_hosts().iter().all(|host| match host {
            Host::Tcp(name) => name
                .parse::<std::net::IpAddr>()
                .is_ok_and(|ip| ip.is_loopback()),
            #[cfg(unix)]
            Host::Unix(_) => true,
        }) && config
            .get_hostaddrs()
            .iter()
            .all(std::net::IpAddr::is_loopback);
        if !loopback && config.get_ssl_mode() != SslMode::Require {
            return Err(StoreError::SecureConnectionRequired);
        }
        Ok(config)
    }

    /// Export holds the writer key in shared mode on a read-only connection.
    /// The source cannot start accepting changes until that connection closes.
    pub(crate) async fn backup_world(
        database: Config,
        tls: MakeRustlsConnect,
        schema: &StorageSchema,
        budget: &ByteBudget,
        data: &Path,
        destination: &Path,
    ) -> Result<usize, checkpoint::CaptureError> {
        schema.validate()?;
        let database = Self::checked_database(database)?;
        let reader = Self::read_only_session(&database, tls).await?;
        let stopped: bool = reader
            .client
            .query_one("SELECT pg_try_advisory_lock_shared(187114, 1)", &[])
            .await?
            .try_get(0)?;
        if !stopped {
            return Err(StoreError::WriterOwned.into());
        }
        checkpoint::write_operational_backup(reader, schema, budget, data, destination).await
    }

    async fn read_only_session(config: &Config, tls: MakeRustlsConnect) -> StoreResult<Session> {
        let session = Self::session(config, tls).await?;
        session
            .client
            .batch_execute("SET default_transaction_read_only=on")
            .await?;
        Ok(session)
    }

    async fn session(config: &Config, tls: MakeRustlsConnect) -> StoreResult<Session> {
        let (client, connection) = tokio::time::timeout(SQL_TIMEOUT, config.connect(tls))
            .await
            .map_err(|_| StoreError::Timeout)??;
        let connected = Arc::new(AtomicBool::new(true));
        let monitor = Arc::clone(&connected);
        let session = Session {
            client,
            connected,
            uncertain_save: None,
            task: tokio::spawn(async move {
                let result = connection.await;
                monitor.store(false, Ordering::Release);
                result
            }),
        };
        session
            .client
            .batch_execute("SET statement_timeout=5000; SET search_path=open_legend")
            .await?;
        Ok(session)
    }

    async fn current_schema(
        client: &impl GenericClient,
        schema: &StorageSchema,
    ) -> StoreResult<bool> {
        let marker: bool = client
            .query_one("SELECT to_regclass('open_legend.meta') IS NOT NULL", &[])
            .await?
            .try_get(0)?;
        if marker {
            let actual: Option<String> = client
                .query_opt("SELECT value FROM meta WHERE key='schema'", &[])
                .await?
                .map(|row| row.try_get(0))
                .transpose()?;
            if actual.as_deref() != Some(&schema.version) {
                return Err(StoreError::Schema);
            }
        }
        Ok(marker)
    }

    async fn initialize(
        client: &mut Client,
        schema: &StorageSchema,
        initialize: bool,
    ) -> StoreResult<()> {
        let transaction = client.transaction().await?;
        if !Self::current_schema(&transaction, schema).await? {
            // An unmarked gameplay layout is never mistaken for a new database.
            if transaction
                .query_opt(
                    "SELECT 1 FROM information_schema.tables \
                     WHERE table_schema IN ('open_legend','mind') AND NOT \
                     (table_schema='open_legend' AND table_name=ANY($1::text[])) LIMIT 1",
                    &[&schema.permitted_unmarked],
                )
                .await?
                .is_some()
            {
                return Err(StoreError::Schema);
            }
            if !initialize {
                return Err(StoreError::InitializationRequired);
            }
            transaction
                .batch_execute(
                    "CREATE SCHEMA IF NOT EXISTS open_legend; CREATE SCHEMA IF NOT EXISTS mind",
                )
                .await?;
            for sql in &schema.initialization {
                transaction.batch_execute(sql).await?;
            }
            transaction
                .execute("INSERT INTO meta VALUES ('schema',$1)", &[&schema.version])
                .await?;
        }
        for table in &schema.tables {
            let fixed = schema::FIXED_COLUMNS;
            let columns = fixed.into_iter().chain(
                table
                    .columns
                    .iter()
                    .map(|column| (column.name.as_str(), column.data_type)),
            );
            let select = columns
                .clone()
                .map(|(name, _)| name)
                .collect::<Vec<_>>()
                .join(",");
            let statement = transaction
                .prepare(&format!("SELECT {select} FROM {} LIMIT 0", table.name))
                .await?;
            if !statement
                .columns()
                .iter()
                .map(|column| column.type_())
                .eq(columns
                    .map(|(_, data_type)| data_type.postgres())
                    .collect::<Vec<_>>()
                    .iter())
            {
                return Err(StoreError::Schema);
            }
        }
        transaction.commit().await?;
        Ok(())
    }

    pub fn database_schema(&self) -> &str {
        &self.schema.version
    }

    /// Gameplay admission checks the original writer after taking its world
    /// turn. No query is needed per input. An uncertain/closed session stays fenced.
    pub fn assert_write_admission(&self) -> StoreResult<()> {
        if self.admitted.load(Ordering::Acquire) && self.writer_connected.load(Ordering::Acquire) {
            Ok(())
        } else {
            Err(StoreError::WriterUnavailable)
        }
    }
}

pub(crate) async fn durable_head(client: &impl GenericClient) -> StoreResult<Option<DurableHead>> {
    let row = client
        .query_opt(
            "SELECT world_id,generation,revision FROM world_head WHERE id=1",
            &[],
        )
        .await?;
    row.map(|row| {
        let world_id: String = row.try_get(0)?;
        let generation: String = row.try_get(1)?;
        let revision = ordinal(row.try_get(2)?)?;
        if world_id.is_empty() || generation.is_empty() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(DurableHead {
            world_id,
            generation,
            revision,
        })
    })
    .transpose()
}

fn ordinal(value: i64) -> StoreResult<u64> {
    u64::try_from(value)
        .ok()
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or(StoreError::InvalidRecord)
}

pub(crate) fn sql_ordinal(value: u64) -> StoreResult<i64> {
    if value <= MAX_SAFE_INTEGER {
        Ok(value as i64)
    } else {
        Err(StoreError::InvalidRecord)
    }
}
