//! The operator replaces one stopped world inside its original protected SQL
//! transaction. Adopt the same prepared native candidate only after its result
//! is durable. Ordinary readers never see the prospective checkpoint.

use super::authority::{AcceptedPrivacy, validate_privacy};
use super::pre_load::{self, BeforeLoad};
use super::{AdministrativeCheckpoint, read_recovery_authority, reconcile_history_positions};
use crate::authority::{RequestScope, assert_saved_grant};
use crate::command_epoch::RequestIdentity;
use crate::language::LanguageProvider;
use crate::store::assets::AssetRevision;
use crate::store::read::admitted_query;
use crate::store::{
    CommitError, DurableHead, Store, StoreError, StoreResult, durable_head, sql_ordinal,
};
use openlegend_simulation::encoding::json_record;
use openlegend_simulation::host::{ByteReservation, CandidateKey};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivation, RuntimeDirectOutput, RuntimeDirectStep, RuntimeHistory,
    RuntimeInstallDefinitions, RuntimeInstallSources, RuntimeJson, RuntimeProvider,
    RuntimeProviderInput,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use tokio_postgres::Transaction;
use uuid::Uuid;

pub struct RecoveredCheckpoint {
    pub head: DurableHead,
    pub slot_id: String,
    pub operation_id: String,
    pub timeline: String,
    pub accepted_cut: u64,
}

#[derive(Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Receipt {
    save_id: String,
    world_id: String,
    generation: String,
    timeline: String,
    revision: u64,
    accepted_cut: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    operator: Option<Operator>,
}

#[derive(Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Operator {
    account_id: String,
    timeline: String,
}

pub(crate) enum LoadReceipt {
    Completed,
    Missing,
    Conflict,
}

impl Receipt {
    pub(super) fn head(&self) -> DurableHead {
        DurableHead {
            world_id: self.world_id.clone(),
            generation: self.generation.clone(),
            revision: self.revision,
        }
    }

    fn report(self, operation_id: &str) -> RecoveredCheckpoint {
        RecoveredCheckpoint {
            head: self.head(),
            slot_id: self.save_id,
            operation_id: operation_id.to_owned(),
            timeline: self.timeline,
            accepted_cut: self.accepted_cut,
        }
    }

    pub(super) fn verify_stopped(&self, head: &DurableHead, source: &str) -> StoreResult<()> {
        if self.operator.is_some()
            || self.save_id != source
            || self.world_id != head.world_id
            || self.generation != head.generation
            || self.revision > head.revision
        {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

struct FinalPlacement {
    history: RuntimeHistory,
    privacy: String,
    initial_archives: RuntimeJson,
    final_archives: RuntimeJson,
    receipt: Receipt,
    _storage: ByteReservation,
}

pub(super) struct Adoption {
    session: NativeWorldSession,
    key: CandidateKey,
    receipt: Receipt,
}

pub(super) enum ReplacementAuthority {
    RetainedCheckpoint,
    DamagedBackup,
}

impl Adoption {
    pub(super) fn activate(
        mut self,
        operation_id: &str,
    ) -> Result<RecoveredCheckpoint, CommitError> {
        let actual = &self.receipt;
        self.session
            .fence()
            .settle(self.key, true)
            .map_err(|_| CommitError::Unknown(StoreError::StaleCut))?;
        self.session
            .activate_restored(
                self.key,
                RuntimeActivation {
                    world_id: actual.world_id.clone(),
                    generation: actual.generation.clone(),
                    revision: actual.revision,
                    accepted_cut: actual.accepted_cut,
                },
            )
            .map_err(|_| CommitError::Unknown(StoreError::StaleCut))?;
        Ok(self.receipt.report(operation_id))
    }
}

impl Store {
    /// Check and replace a retained slot under the database's unique writer.
    /// The live listener must be fully drained. A browser restore additionally
    /// captures the preceding cut and rechecks the operator before commit.
    #[allow(clippy::too_many_arguments)]
    pub async fn recover_checkpoint(
        self: &Arc<Self>,
        directory: &Path,
        slot_id: &str,
        floor_slot_id: Option<&str>,
        operation_id: &str,
        definitions: RuntimeInstallDefinitions,
        definition_custody: ByteReservation,
        language: Arc<LanguageProvider>,
        installed_release: &AssetRevision,
        operator: Option<&RequestScope>,
    ) -> Result<RecoveredCheckpoint, CommitError> {
        if Uuid::parse_str(operation_id).is_err() {
            return Err(CommitError::RolledBack(StoreError::InvalidRecord));
        }
        let key = format!("integration:load-request:{operation_id}");
        let (head, prior) = self
            .read_recovery_witness(&key)
            .await
            .map_err(CommitError::RolledBack)?;
        let expected = head.ok_or(CommitError::RolledBack(StoreError::InitializationRequired))?;
        if let Some(prior) = prior {
            if prior.save_id != slot_id
                || prior.world_id != expected.world_id
                || prior.generation != expected.generation
                || prior.revision > expected.revision
            {
                return Err(CommitError::RolledBack(StoreError::StaleCut));
            }
            return Ok(prior.report(operation_id));
        }
        let file_id = if slot_id == pre_load::ID {
            self.pre_load_file(&expected.world_id)
                .await
                .map_err(CommitError::RolledBack)?
                .ok_or(CommitError::RolledBack(StoreError::InvalidRecord))?
        } else {
            slot_id.to_owned()
        };
        let slot = self
            .retained_checkpoint(directory.to_owned(), file_id, expected.world_id.clone())
            .await
            .map_err(CommitError::RolledBack)?;
        let floor = match floor_slot_id {
            Some(floor) if floor != slot_id => Some(
                self.retained_checkpoint(
                    directory.to_owned(),
                    floor.to_owned(),
                    expected.world_id.clone(),
                )
                .await
                .map_err(CommitError::RolledBack)?,
            ),
            _ => None,
        };
        let before_load = if let Some(operator) = operator {
            if operator.world_id != expected.world_id {
                return Err(CommitError::RolledBack(StoreError::StaleCut));
            }
            Some(
                self.capture_pre_load(directory, &operator.world_id)
                    .await
                    .map_err(|error| {
                        eprintln!("Could not protect the world before checkpoint load: {error}");
                        CommitError::RolledBack(StoreError::InvalidRecord)
                    })?,
            )
        } else {
            None
        };
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        let mut writer = self.writer.lock().await;
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        let tx = writer
            .client
            .transaction()
            .await
            .map_err(|error| CommitError::RolledBack(error.into()))?;
        match receipt(&tx, &key).await {
            Ok(Some(saved)) => {
                if saved.save_id != slot_id
                    || saved.world_id != expected.world_id
                    || saved.generation != expected.generation
                    || saved.revision > expected.revision
                {
                    return Err(self.rollback(tx, StoreError::StaleCut).await);
                }
                self.commit(tx).await?;
                return Ok(saved.report(operation_id));
            }
            Ok(None) => {}
            Err(error) => return Err(self.rollback(tx, error).await),
        }
        let replacement = DurableHead {
            world_id: expected.world_id.clone(),
            generation: Uuid::new_v4().to_string(),
            revision: expected
                .revision
                .checked_add(1)
                .ok_or(CommitError::RolledBack(StoreError::Capacity))?,
        };
        let timeline = Uuid::new_v4().to_string();
        let prepared = self
            .stage_recovery(
                &tx,
                &expected,
                replacement,
                &timeline,
                &key,
                slot_id,
                slot,
                floor.as_ref(),
                definitions,
                definition_custody,
                &language,
                installed_release,
                operator,
                before_load.as_ref(),
                ReplacementAuthority::RetainedCheckpoint,
            )
            .await;
        let mut adoption = match prepared {
            Ok(adoption) => adoption,
            Err(error) => {
                let error = self.rollback(tx, error).await;
                drop(writer);
                if matches!(error, CommitError::RolledBack(_))
                    && let Some(point) = before_load
                {
                    self.discard_pre_load(directory, &expected.world_id, point)
                        .await;
                }
                return Err(error);
            }
        };
        let commit = self.commit(tx).await;
        drop(writer);
        if let Err(error) = commit {
            let expected_receipt = &adoption.receipt;
            match self.read_recovery_witness(&key).await {
                Ok((Some(head), Some(received)))
                    if head == expected_receipt.head() && received == *expected_receipt => {}
                Ok((Some(head), None)) if head == expected => {
                    adoption
                        .session
                        .cancel(adoption.key)
                        .map_err(|_| CommitError::Unknown(StoreError::StaleCut))?;
                    return Err(CommitError::RolledBack(StoreError::StaleCut));
                }
                _ => return Err(error),
            }
        }
        let result = adoption.activate(operation_id)?;
        if let Some(point) = before_load {
            self.retain_pre_load(directory, &expected.world_id, point.file_id())
                .await;
        }
        Ok(result)
    }

    /// Read only the existing operation receipt; this never restores a slot.
    /// A completed browser receipt belongs to its original account and input.
    pub(crate) async fn load_receipt(
        &self,
        scope: &RequestScope,
        operation: Uuid,
        slot: &str,
        original_timeline: Option<&str>,
    ) -> StoreResult<LoadReceipt> {
        let key = format!("integration:load-request:{operation}");
        let (_, prior) = self.read_recovery_witness(&key).await?;
        Ok(match prior {
            None => LoadReceipt::Missing,
            Some(prior)
                if prior.world_id == scope.world_id
                    && prior.save_id == slot
                    && prior.operator.as_ref().is_some_and(|operator| {
                        operator.account_id == scope.account_id
                            && original_timeline
                                .is_none_or(|timeline| timeline == operator.timeline)
                    }) =>
            {
                LoadReceipt::Completed
            }
            Some(_) => LoadReceipt::Conflict,
        })
    }

    pub(super) async fn read_recovery_witness(
        &self,
        key: &str,
    ) -> StoreResult<(Option<DurableHead>, Option<Receipt>)> {
        let mut reader = self.reader.lock().await;
        let tx = reader
            .client
            .build_transaction()
            .read_only(true)
            .isolation_level(tokio_postgres::IsolationLevel::RepeatableRead)
            .start()
            .await?;
        let head = durable_head(&tx).await?;
        let completed = receipt(&tx, key).await?;
        tx.commit().await?;
        Ok((head, completed))
    }

    #[allow(clippy::too_many_arguments)]
    pub(super) async fn stage_recovery(
        &self,
        tx: &Transaction<'_>,
        expected: &DurableHead,
        replacement: DurableHead,
        timeline: &str,
        request_key: &str,
        requested_slot: &str,
        slot: AdministrativeCheckpoint,
        floor: Option<&AdministrativeCheckpoint>,
        definitions: RuntimeInstallDefinitions,
        definition_custody: ByteReservation,
        language: &LanguageProvider,
        installed_release: &AssetRevision,
        operator: Option<&RequestScope>,
        before_load: Option<&BeforeLoad>,
        source: ReplacementAuthority,
    ) -> StoreResult<Adoption> {
        if slot.revision > expected.revision {
            return Err(StoreError::StaleCut);
        }
        let slot_id = slot.id.clone();
        let floor = match source {
            ReplacementAuthority::RetainedCheckpoint => {
                floor.or_else(|| (slot.revision == expected.revision).then_some(&slot))
            }
            ReplacementAuthority::DamagedBackup => floor,
        };
        let mut authority = read_recovery_authority(tx, expected, floor, &self.budget).await?;
        if let Some(operator) = operator {
            if operator.timeline_id != authority.timeline {
                return Err(StoreError::StaleCut);
            }
            assert_saved_grant(tx, operator, "save").await?;
        }
        let (privacy, privacy_custody) = if let Some(ledger) = authority.ledger.take() {
            (ledger, None)
        } else {
            if matches!(source, ReplacementAuthority::DamagedBackup) {
                return Err(StoreError::InvalidRecord);
            }
            let (ledger, custody) = self.current_recovery_privacy(tx, &expected.world_id).await?;
            (ledger, Some(custody))
        };
        let (mut opening, history) = slot.into_opening(self, replacement.clone())?;
        opening.prepare_language(language, &self.budget)?;
        self.recovery_asset_binding(
            tx,
            &replacement.world_id,
            &slot_id,
            &opening,
            installed_release,
            operator,
        )
        .await?;
        reconcile_history_positions(
            self,
            tx,
            expected,
            &self.schema.checkpoint.history_position_tables,
            self.schema.checkpoint.page,
            &mut opening,
        )
        .await?;
        self.stage_checkpoint(tx, expected, &opening, &history)
            .await?;
        tx.execute(
            "DELETE FROM memory_vectors WHERE world_id=$1 AND generation<>$2",
            &[&replacement.world_id, &replacement.generation],
        )
        .await?;
        let (restore_input, restore_custody) =
            self.prepare_restore_input(authority, &history, timeline, privacy)?;
        drop(history);
        let mut upstream = opening.custody;
        upstream
            .merge(definition_custody)
            .map_err(|_| StoreError::Capacity)?;
        let mut session = definitions
            .install_current_for_restore(
                RuntimeInstallSources {
                    records: opening.records,
                    originals: opening.originals,
                    cold_directories: None,
                    working_set: None,
                    accepted_cut: 0,
                },
                self.database_schema(),
                self.budget.clone(),
                upstream,
            )
            .map_err(runtime)?;
        {
            let decoder = session.checkpoint_recall_decoder().map_err(runtime)?;
            self.rebuild_checkpoint_projections(tx, &replacement.world_id, &decoder)
                .await?;
        }
        let materials = if session.has_bound_material_gather().map_err(runtime)? {
            Some(
                self.construction_materials_in(tx, &replacement.world_id, None)
                    .await?,
            )
        } else {
            None
        };
        let key = session
            .begin_restore_direct(restore_input, materials)
            .map_err(runtime)?;
        drop((restore_custody, privacy_custody));
        let mut pending: Option<(RuntimeProvider, RuntimeProviderInput)> = None;
        let ready = loop {
            let (provider, answer) = match pending.take() {
                Some((provider, answer)) => (Some(provider), Some(answer)),
                None => (None, None),
            };
            match session
                .step_direct(key, provider.as_ref().zip(answer), |product, budget| {
                    let RuntimeDirectOutput::Prepared(products) = product else {
                        return Err(
                            openlegend_simulation::runtime::RuntimeError::application_refused(
                                "Unexpected checkpoint preview",
                            ),
                        );
                    };
                    let placement = products.restored_placement().ok_or_else(|| {
                        openlegend_simulation::runtime::RuntimeError::application_refused(
                            "Missing exact checkpoint placement",
                        )
                    })?;
                    if (placement.world_id, placement.generation, placement.revision)
                        != (
                            replacement.world_id.as_str(),
                            replacement.generation.as_str(),
                            replacement.revision,
                        )
                        || placement.accepted_cut != 1
                    {
                        return Err(
                            openlegend_simulation::runtime::RuntimeError::application_refused(
                                "Checkpoint cut changed",
                            ),
                        );
                    }
                    #[derive(Serialize)]
                    struct Privacy<'a> {
                        forgotten: &'a indexmap::IndexMap<String, Vec<String>>,
                        corrections:
                            &'a indexmap::IndexMap<String, indexmap::IndexMap<String, String>>,
                    }
                    let privacy = Privacy {
                        forgotten: placement.forgotten,
                        corrections: placement.corrections,
                    };
                    let length = openlegend_simulation::encoding::json_record_len(&privacy)
                        .map_err(
                            openlegend_simulation::runtime::RuntimeError::application_refused,
                        )?;
                    let bytes = length
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(1024))
                        .ok_or_else(|| {
                            openlegend_simulation::runtime::RuntimeError::application_refused(
                                "Checkpoint product exceeds allowance",
                            )
                        })?;
                    let storage = budget.reserve(bytes)?;
                    let privacy = json_record(&privacy).map_err(
                        openlegend_simulation::runtime::RuntimeError::application_refused,
                    )?;
                    let (initial_archives, final_archives) =
                        placement.encode_archive_placement(budget)?;
                    Ok(FinalPlacement {
                        history: products.retain_history(),
                        privacy,
                        initial_archives,
                        final_archives,
                        receipt: Receipt {
                            save_id: requested_slot.to_owned(),
                            world_id: placement.world_id.to_owned(),
                            generation: placement.generation.to_owned(),
                            timeline: timeline.to_owned(),
                            revision: placement.revision,
                            accepted_cut: placement.accepted_cut,
                            operator: operator.map(|operator| Operator {
                                account_id: operator.account_id.clone(),
                                timeline: operator.timeline_id.clone(),
                            }),
                        },
                        _storage: storage,
                    })
                })
                .map_err(runtime)?
            {
                RuntimeDirectStep::Continue => {}
                RuntimeDirectStep::Provider(provider) => {
                    let answer = self
                        .answer_recovery(tx, &replacement, &session, &provider, language)
                        .await?;
                    pending = Some((provider, answer));
                }
                RuntimeDirectStep::Prepared(ready) => break ready,
                RuntimeDirectStep::Preview(_) => return Err(StoreError::InvalidRecord),
            }
        };
        let output = ready.output();
        let save = ready.protected_save().ok_or(StoreError::StaleCut)?;
        let rows = save.rows();
        if (
            rows.world_id.as_str(),
            rows.generation.as_str(),
            rows.base_revision,
            rows.through_cut,
        ) != (
            replacement.world_id.as_str(),
            replacement.generation.as_str(),
            replacement.revision,
            output.receipt.accepted_cut,
        ) {
            return Err(StoreError::StaleCut);
        }
        if output.history.accounts().next().is_some() {
            return Err(StoreError::DerivedProjectionRequired);
        }
        let initial = archive_metadata(&output.initial_archives)?;
        let final_archives = archive_metadata(&output.final_archives)?;
        self.apply_checkpoint_archive_baseline(tx, &replacement, initial)
            .await?;
        self.apply_archives_at(tx, save, sql_ordinal(replacement.revision)?)
            .await?;
        self.write_records(
            tx,
            &replacement.world_id,
            sql_ordinal(replacement.revision)?,
            &rows.changes,
        )
        .await?;
        self.project_support_places(tx, &replacement.world_id, &rows.changes)
            .await?;
        self.apply_checkpoint_archive_baseline(tx, &replacement, final_archives)
            .await?;
        self.append_originals(tx, rows, std::slice::from_ref(&output.history))
            .await?;
        self.finish_checkpoint_privacy(tx, &replacement, &output.privacy)
            .await?;
        self.rebuild_received(
            tx,
            &replacement.world_id,
            sql_ordinal(replacement.revision)?,
        )
        .await?;
        self.validate_received(tx, &replacement.world_id).await?;
        {
            let decoder = session.checkpoint_recall_decoder().map_err(runtime)?;
            self.rebuild_checkpoint_projections(tx, &replacement.world_id, &decoder)
                .await?;
            self.finish_checkpoint_operations(tx, &replacement, timeline, decoder.hard_bytes)
                .await?;
        }
        // Session expiry can change while preparing the isolated candidate.
        // Only this last check can authorize the operation receipt and pointer.
        if let Some(operator) = operator {
            assert_saved_grant(tx, operator, "save").await?;
        }
        if let Some(before_load) = before_load {
            before_load.install(tx).await?;
        }
        let encoded = json_record(&output.receipt).map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO meta (key,value) VALUES ($1,$2)",
            &[&request_key, &encoded],
        )
        .await?;
        ready.ready().map_err(runtime)?;
        Ok(Adoption {
            session,
            key,
            receipt: ready.into_output().receipt,
        })
    }

    async fn answer_recovery(
        &self,
        tx: &Transaction<'_>,
        candidate: &DurableHead,
        session: &NativeWorldSession,
        provider: &RuntimeProvider,
        language: &LanguageProvider,
    ) -> StoreResult<RuntimeProviderInput> {
        #[derive(Deserialize)]
        struct Request<'a> {
            kind: &'a str,
            value: RequestValue<'a>,
        }
        #[derive(Deserialize)]
        struct RequestValue<'a> {
            phase: Option<&'a str>,
        }
        enum Selection {
            History,
            Collation,
            Archives,
            Support,
            Members,
            Accounts,
            Versions,
        }
        let selected = provider
            .with_request(|text| {
                let request: Request =
                    serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)?;
                Ok::<_, StoreError>(match (request.kind, request.value.phase) {
                    ("history", _) => Selection::History,
                    ("collation", _) => Selection::Collation,
                    ("restore-archives", _) => Selection::Archives,
                    ("support-membership", _) => Selection::Support,
                    ("restore-retention", Some("membership")) => Selection::Members,
                    ("restore-retention", Some("metadata" | "records")) => Selection::Accounts,
                    ("source-versions", _) => Selection::Versions,
                    _ => return Err(StoreError::InvalidRecord),
                })
            })
            .map_err(runtime)??;
        match selected {
            Selection::History => {
                let prepared = self.prepare_checkpoint_history(provider)?;
                let decoder = session.checkpoint_recall_decoder().map_err(runtime)?;
                self.with_checkpoint_recall_view(
                    tx,
                    candidate,
                    prepared.projection(),
                    &decoder,
                    None,
                    self.read_checkpoint_history(tx, candidate, &prepared),
                )
                .await
            }
            Selection::Collation => {
                crate::operation_format::answer(provider, &self.budget, Some(language))
                    .map_err(|_| StoreError::InvalidRecord)?
                    .ok_or(StoreError::InvalidRecord)
            }
            Selection::Archives => {
                self.answer_checkpoint_archives(tx, candidate, provider)
                    .await
            }
            Selection::Support => {
                self.answer_checkpoint_support(tx, candidate, provider)
                    .await
            }
            Selection::Members => {
                let request = provider
                    .prepare_restore_membership(&self.budget)
                    .map_err(runtime)?;
                let matched = self
                    .checkpoint_retention_membership(tx, candidate, &request)
                    .await?;
                session
                    .complete_restore_membership(
                        &request,
                        &matched.aliases,
                        &matched.individuals,
                        matched.max_pages,
                        matched.max_bytes,
                    )
                    .map_err(runtime)
            }
            Selection::Accounts => {
                self.answer_checkpoint_account_retention(tx, candidate, provider)
                    .await
            }
            Selection::Versions => {
                let decoder = session.checkpoint_recall_decoder().map_err(runtime)?;
                self.answer_checkpoint_source_versions(tx, candidate, provider, &decoder)
                    .await
            }
        }
    }

    pub(super) async fn current_recovery_privacy(
        &self,
        tx: &Transaction<'_>,
        world: &str,
    ) -> StoreResult<(AcceptedPrivacy, ByteReservation)> {
        let mut privacy = AcceptedPrivacy {
            forgotten: indexmap::IndexMap::new(),
            corrections: indexmap::IndexMap::new(),
        };
        let (mut custody, rows) = admitted_query(
            tx,
            "SELECT actor_id,source_id,payload FROM mind_forgotten WHERE world_id=$1 ORDER BY parent_id,position,id",
            &[&world], &self.budget,
        ).await?;
        for row in rows {
            let actor: String = row.try_get(0)?;
            let id: String = row.try_get(1)?;
            let payload: String =
                serde_json::from_str(row.try_get(2)?).map_err(|_| StoreError::InvalidRecord)?;
            if id != payload {
                return Err(StoreError::InvalidRecord);
            }
            privacy.forgotten.entry(actor).or_default().push(id);
        }
        let (wire, rows) = admitted_query(
            tx,
            "SELECT actor_id,source_id,payload FROM mind_corrections WHERE world_id=$1 ORDER BY parent_id,position,id",
            &[&world], &self.budget,
        ).await?;
        for row in rows {
            let actor: String = row.try_get(0)?;
            let id: String = row.try_get(1)?;
            let payload =
                serde_json::from_str(row.try_get(2)?).map_err(|_| StoreError::InvalidRecord)?;
            if privacy
                .corrections
                .entry(actor)
                .or_default()
                .insert(id, payload)
                .is_some()
            {
                return Err(StoreError::InvalidRecord);
            }
        }
        validate_privacy(&privacy)?;
        custody.merge(wire).map_err(|_| StoreError::Capacity)?;
        Ok((privacy, custody))
    }

    async fn finish_checkpoint_privacy(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        body: &str,
    ) -> StoreResult<()> {
        let world = &head.world_id;
        let key = format!("integration:privacy-ledger:{world}");
        tx.execute("INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value", &[&key, &body]).await?;
        tx.execute(
            "DELETE FROM history_perspectives p
             WHERE p.world_id=$1 AND EXISTS (
               SELECT 1 FROM mind_forgotten f WHERE f.world_id=p.world_id AND f.actor_id=p.actor_id AND f.source_id=p.event_id
               UNION ALL
               SELECT 1 FROM mind_corrections c WHERE c.world_id=p.world_id AND c.actor_id=p.actor_id AND (
                 c.source_id=p.event_id OR EXISTS(SELECT 1 FROM mind_memories m WHERE m.world_id=c.world_id
                   AND m.actor_id=c.actor_id AND m.source_id=c.source_id AND m.event_id=p.event_id)
               ))",
            &[world],
        ).await?;
        for table in [
            "mind_source_annotations",
            "memory_vector_cache",
            "memory_vectors",
        ] {
            tx.execute(&format!(
                "DELETE FROM {table} t USING mind_forgotten f WHERE t.world_id=$1 AND f.world_id=t.world_id
                 AND f.actor_id=t.actor_id AND f.source_id=t.source_id"
            ), &[world]).await?;
        }
        Ok(())
    }

    async fn finish_checkpoint_operations(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        timeline: &str,
        recall_hard_bytes: u64,
    ) -> StoreResult<()> {
        let world = &head.world_id;
        RequestIdentity::restore(tx, world, timeline).await?;
        tx.execute(
            "UPDATE story_jobs SET state='cancelled' WHERE world_id=$1 AND state IN ('running','queued')",
            &[world],
        ).await?;
        self.detach_job_speech(tx).await?;
        tx.execute(
            &self.schema.recall.restore_vectors,
            &[world, &sql_ordinal(recall_hard_bytes)?],
        )
        .await?;
        tx.execute(&self.schema.recall.reused_vector_queue, &[world])
            .await?;
        // Scheduling caches can only refer to this old timeline. Provider
        // charges, invocation receipts and independently granted accounts stay.
        let roots = [
            format!("integration:vectors:{world}:"),
            format!("integration:interests:{world}:"),
            format!("integration:reflection-queue:{world}:"),
            format!("integration:semantic-schedule:{world}:"),
            crate::store::recall::semantic::query_world_prefix(world)?,
        ];
        tx.execute("DELETE FROM meta WHERE EXISTS (SELECT 1 FROM unnest($1::text[]) q(prefix) WHERE starts_with(key,q.prefix))", &[&roots.as_slice()]).await?;
        Ok(())
    }
}

fn archive_metadata(value: &RuntimeJson) -> StoreResult<&str> {
    std::str::from_utf8(value.bytes()).map_err(|_| StoreError::InvalidRecord)
}

fn runtime(error: openlegend_simulation::runtime::RuntimeError) -> StoreError {
    if error.is_capacity() {
        StoreError::Capacity
    } else {
        StoreError::InvalidRecord
    }
}

async fn receipt(tx: &Transaction<'_>, request: &str) -> StoreResult<Option<Receipt>> {
    tx.query_opt("SELECT value FROM meta WHERE key=$1", &[&request])
        .await?
        .map(|row| {
            let payload: &str = row.try_get(0)?;
            serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)
        })
        .transpose()
}
