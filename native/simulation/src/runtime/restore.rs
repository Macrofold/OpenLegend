//! Restoration alone can reconcile an inactive installation. Until a genuine
//! whole-install receipt is adopted, it cannot admit gameplay or private reads.
use super::*;
pub use crate::experience::retention::{
    AccountBodiesReply, AccountBodyRow, AccountCandidate, AccountMetadataReply, RestoreAccountAnswer,
    RestoreAccountBinding, RestoreAccountQuery, RestoreAccountRequest,
};
pub use crate::{
    experience::RestorePrivacyInput,
    restore::{
        ArchiveCategory as RestoreArchiveCategory, RestoreArchive, RestoreArchiveMatch, RestoreArchiveSelection,
        RestoreBinding, RestoreGrant, RestoreMetadataInput,
    },
    simulation::restore::{RestoreInput, RestoreRetentionPreparation},
};

/// Retains exactly the inactive candidate's funded archive request and
/// prospective SQL rows. This read grants no authority over a live world.
pub struct RuntimeRestoreArchives(Arc<ProviderQuestion>);

impl RuntimeRestoreArchives {
    pub fn parts(&self) -> (&crate::restore::RestoreArchivesRequest, &crate::records::ChangedRows) {
        self.0.restore_archives().expect("checked restore archives request")
    }
}

impl RuntimeProvider {
    pub fn restore_archives(&self) -> Result<Option<RuntimeRestoreArchives>, RuntimeError> {
        let question = self.question()?;
        Ok(question.restore_archives().is_some().then_some(RuntimeRestoreArchives(question)))
    }
}

impl RuntimeProviderInput {
    /// Transfer the selected archive identities to the original restore owner.
    pub fn restore_archives(
        request: &RuntimeRestoreArchives,
        selected: Vec<crate::restore::RestoreArchiveMatch>,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let header = custody.split_off(size_of::<crate::restore::RestoreArchivesAnswer>())?;
        let answer = crate::restore::RestoreArchivesAnswer::from_rows(request.parts().0, selected, custody).map_err(failure)?;
        Ok(Self { body: RuntimeAnswerBody::RestoreArchives(Box::new(answer)), custody: header })
    }
}

/// Retains the actual inactive candidate's selected accounts and prospective
/// SQL changes across that read. It grants no access to the live world.
pub struct RuntimeRestoreAccounts(Arc<ProviderQuestion>);

impl RuntimeRestoreAccounts {
    pub fn parts(&self) -> (RestoreAccountRequest<'_>, &crate::records::ChangedRows) {
        let (question, changes) = self.0.restore_accounts().expect("checked restore account request");
        (question.accounts().expect("checked account selection"), changes)
    }
}

impl RuntimeProvider {
    pub fn restore_accounts(&self) -> Result<Option<RuntimeRestoreAccounts>, RuntimeError> {
        let question = self.question()?;
        Ok(question.restore_accounts().is_some().then_some(RuntimeRestoreAccounts(question)))
    }
}

impl RuntimeProviderInput {
    /// Adopt the selected account metadata or bodies under their own custody.
    /// The inactive cursor validates the exact binding and row semantics.
    pub fn restore_accounts(
        request: &RuntimeRestoreAccounts,
        answer: RestoreAccountAnswer,
        custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let (question, _) = request.0.restore_accounts().expect("checked restore account request");
        let (answer, custody) = crate::experience::retention::RestoreRetentionAnswer::from_accounts(question, answer, custody).map_err(|error| match error {
            crate::experience::HistoryPreparationError::Capacity => RuntimeError::from(CapacityError),
            _ => failure(error),
        })?;
        Ok(Self { body: RuntimeAnswerBody::RestoreAccounts(Box::new(answer)), custody })
    }
}

/// Owns the funded aliases and prospective row changes for one inactive
/// restore. The SQL reader may retain this cut across its own await.
pub struct RuntimeRestoreSupport(Arc<ProviderQuestion>);

impl RuntimeRestoreSupport {
    pub fn parts(&self) -> (&crate::received::SupportMembershipRequest, &crate::records::ChangedRows) {
        let (request, projection) = self.0.support_membership().expect("checked support question");
        (request, projection.expect("restore support has a staged projection"))
    }
}

impl RuntimeProvider {
    pub fn restore_support(&self) -> Result<Option<RuntimeRestoreSupport>, RuntimeError> {
        let question = self.question()?;
        Ok(question.support_membership().is_some_and(|(_, projection)| projection.is_some())
            .then_some(RuntimeRestoreSupport(question)))
    }
}

impl RuntimeProviderInput {
    /// Return the selected aliases under the existing question's binding.
    pub fn support_membership(
        request: &RuntimeRestoreSupport,
        retained: Vec<usize>,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        use crate::received::SupportMembershipAnswer;
        let bytes = retained.capacity().checked_mul(size_of::<usize>())
            .and_then(|n| n.checked_add(size_of::<SupportMembershipAnswer>()))
            .ok_or(CapacityError)?;
        custody.resize(bytes)?;
        let answer = SupportMembershipAnswer { binding: request.parts().0.binding, retained };
        Ok(Self {
            body: RuntimeAnswerBody::SupportMembership(Box::new(answer)),
            custody,
        })
    }
}

/// Exact application metadata of a prepared, still closed installation.
pub struct RuntimeRestorePlacement<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub revision: u64,
    pub accepted_cut: u64,
    pub forgotten: &'a indexmap::IndexMap<String, Vec<String>>,
    pub corrections: &'a indexmap::IndexMap<String, indexmap::IndexMap<String, String>>,
    archive_baseline: &'a [crate::restore::RestoreArchive],
    kept_archives: &'a [crate::restore::RestoreArchive],
}

impl RuntimeRestorePlacement<'_> {
    /// Fund the two finite archive ledgers for SQL. Bodies remain in the
    /// checkpoint writer and the actual native save plan.
    pub fn encode_archive_placement(
        &self,
        budget: &ByteBudget,
    ) -> Result<(RuntimeJson, RuntimeJson), RuntimeError> {
        Ok((
            RuntimeJson::encode(&self.archive_baseline, budget)?,
            RuntimeJson::encode(&self.kept_archives, budget)?,
        ))
    }
}

impl RuntimePreparedProducts<'_> {
    pub fn restored_placement(&self) -> Option<RuntimeRestorePlacement<'_>> {
        let facts = self.restore.as_ref()?;
        let CompletedOperation::Restore(result) = self.operation else {
            return None;
        };
        Some(RuntimeRestorePlacement {
            world_id: facts.world_id,
            generation: facts.generation,
            revision: facts.revision,
            accepted_cut: facts.accepted_cut,
            forgotten: &result.metadata.privacy.forgotten,
            corrections: &result.metadata.privacy.corrections,
            archive_baseline: &result.metadata.archive_baseline,
            kept_archives: &result.metadata.kept_archives,
        })
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RestoreMembershipBinding {
    world_id: String,
    generation: String,
    actor_id: String,
    accepted_cut: u64,
    identity_through: u64,
    candidate_id: u64,
    candidate_generation: u64,
    request_serial: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestoreMembershipData {
    actor_id: String,
    at: f64,
    max_age_seconds: f64,
    aliases: Vec<String>,
    individual_ids: Vec<String>,
    recent_bytes: u64,
    recent_count: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RestoreMembershipInput {
    binding: RestoreMembershipBinding,
    phase: String,
    data: RestoreMembershipData,
    maximum_transfer_bytes: usize,
    restore_projection: Box<serde_json::value::RawValue>,
}

/// A detached private request stays bound to the original pending ticket
/// across the SQL membership await. Ending that ticket invalidates this read.
pub struct RuntimeRestoreMembership {
    provider: Weak<ProviderQuestion>,
    input: RestoreMembershipInput,
    _custody: ByteReservation,
}

impl RuntimeRestoreMembership {
    pub fn scope(&self) -> (&str, &str, &str, u64) {
        let binding = &self.input.binding;
        (
            &binding.world_id,
            &binding.generation,
            &binding.actor_id,
            binding.accepted_cut,
        )
    }
    pub fn requested(&self) -> (&[String], &[String]) {
        (&self.input.data.aliases, &self.input.data.individual_ids)
    }
    pub fn projection(&self) -> &serde_json::value::RawValue {
        &self.input.restore_projection
    }
}

impl RuntimeProvider {
    /// Admit only the finite inactive recent-membership request. A copied
    /// request does not grant access to the current gameplay installation.
    pub fn prepare_restore_membership(
        &self,
        budget: &ByteBudget,
    ) -> Result<RuntimeRestoreMembership, RuntimeError> {
        let provider = self.question()?;
        if provider.kind() != crate::simulation::ProviderKind::RestoreRetention {
            return Err(failure(
                "restore membership requires its actual pending question",
            ));
        }
        #[derive(Deserialize)]
        struct Envelope {
            value: RestoreMembershipInput,
        }
        let payload = provider
            .json()
            .ok_or_else(|| failure("missing restore membership request"))?;
        let custody = decode_preparation(payload.as_bytes(), budget)?;
        let Envelope { value: input } = serde_json::from_str(payload).map_err(failure)?;
        if input.phase != "membership" || input.binding.actor_id != input.data.actor_id {
            return Err(failure("invalid bound restore membership request"));
        }
        Ok(RuntimeRestoreMembership {
            provider: Arc::downgrade(&provider),
            input,
            _custody: custody,
        })
    }
}

impl NativeWorldSession {
    /// Join canonical-account membership from the prospective SQL cut with
    /// exact recent membership from this full inactive candidate only.
    pub fn complete_restore_membership(
        &self,
        request: &RuntimeRestoreMembership,
        account_aliases: &[usize],
        account_individuals: &[usize],
        max_pages: usize,
        max_bytes: usize,
    ) -> Result<RuntimeProviderInput, RuntimeError> {
        let key = self
            .restoring
            .filter(|_| !self.active)
            .ok_or_else(|| failure("recent membership requires an inactive restore"))?;
        let provider = request
            .provider
            .upgrade()
            .ok_or_else(|| failure("stale restore membership provider"))?;
        let state = self
            .session
            .restore_provider_state(key, &provider)
            .map_err(failure)?;
        let input = &request.input;
        if state.physical.header.id != input.binding.world_id
            || state.generation != input.binding.generation
            || state.accepted_cut != input.binding.accepted_cut
            || state.physical.identity.next_id() != input.binding.identity_through
            || state.physical.header.sim_time != input.data.at
        {
            return Err(failure("restore membership lost its exact candidate"));
        }
        let actor = state
            .temporal
            .actor(&input.binding.actor_id)
            .ok_or_else(|| failure("missing restore membership actor"))?;
        if actor.recent().bytes() != input.data.recent_bytes
            || actor.recent().count() != input.data.recent_count
        {
            return Err(failure(
                "restore membership lost its exact receiving directory",
            ));
        }
        let (aliases, individuals) = request.requested();
        let items = aliases
            .len()
            .checked_add(individuals.len())
            .ok_or_else(|| failure("capacity"))?;
        let _answers = self
            .budget
            .reserve(items.checked_mul(32).ok_or_else(|| failure("capacity"))?)
            .map_err(failure)?;
        let mut alias_matches = vec![false; aliases.len()];
        let mut individual_matches = vec![false; individuals.len()];
        for (found, selected) in [
            (account_aliases, &mut alias_matches),
            (account_individuals, &mut individual_matches),
        ] {
            for index in found {
                let included = selected
                    .get_mut(*index)
                    .ok_or_else(|| failure("invalid retained account membership index"))?;
                if std::mem::replace(included, true) {
                    return Err(failure("repeated retained account membership index"));
                }
            }
        }
        crate::received::restore_recent_membership(
            crate::received::RestoreRecentSelection {
                actor,
                at: input.data.at,
                max_age: input.data.max_age_seconds,
                aliases,
                individuals,
                max_pages,
                max_bytes,
            },
            &mut alias_matches,
            &mut individual_matches,
            &state.reception.received_values.as_ref(),
            &state.installed.account_law(),
            &self.budget,
        )
        .map_err(failure)?;
        #[derive(Serialize)]
        struct Data {
            aliases: Vec<usize>,
            individuals: Vec<usize>,
        }
        #[derive(Serialize)]
        struct Answer<'a> {
            binding: &'a RestoreMembershipBinding,
            phase: &'static str,
            data: Data,
        }
        let selected = |included: Vec<bool>| {
            included
                .into_iter()
                .enumerate()
                .filter_map(|(index, included)| included.then_some(index))
                .collect()
        };
        let answer = Answer {
            binding: &input.binding,
            phase: "membership",
            data: Data {
                aliases: selected(alias_matches),
                individuals: selected(individual_matches),
            },
        };
        let bytes = crate::encoding::json_record_len(&answer).map_err(failure)?;
        if bytes > input.maximum_transfer_bytes {
            return Err(failure(
                "restore membership answer exceeds the actual request allowance",
            ));
        }
        let mut custody = self
            .budget
            .reserve(bytes.checked_mul(4).ok_or_else(|| failure("capacity"))?)
            .map_err(failure)?;
        let encoded = crate::encoding::json_record(&answer).map_err(failure)?;
        custody.resize(encoded.capacity()).map_err(failure)?;
        Ok(RuntimeProviderInput::new(encoded, custody))
    }

    pub fn begin_restore(&mut self, bytes: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.begin_restore_with_materials(bytes, None)
    }

    pub fn begin_restore_with_materials(
        &mut self,
        bytes: &[u8],
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_unused_restore()?;
        let _decode = decode_preparation(bytes, &self.budget)?;
        let input: RestoreInput = serde_json::from_slice(bytes).map_err(failure)?;
        self.start_restore_reconciliation(input, materials)
    }

    /// Start reconciliation from the Rust application's admitted operational
    /// input. The caller keeps its staging reservation until the cursor has
    /// admitted its own metadata, privacy and retention work.
    pub fn begin_restore_direct(
        &mut self,
        input: RestoreInput,
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_unused_restore()?;
        self.start_restore_reconciliation(input, materials)
    }

    fn require_unused_restore(&self) -> Result<(), RuntimeError> {
        if self.active || !self.restore_installation || self.restoring.is_some() {
            return Err(failure("restore requires an unused inactive installation"));
        }
        Ok(())
    }

    fn start_restore_reconciliation(
        &mut self,
        input: RestoreInput,
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        let key = self
            .session
            .begin_restore(input, self.history_edit_limits, materials)
            .map_err(failure)?;
        self.restoring = Some(key);
        Ok(key)
    }
    pub fn activate_restored(
        &mut self,
        key: CandidateKey,
        receipt: RuntimeActivation,
    ) -> Result<(), RuntimeError> {
        if self.active || self.restoring != Some(key) || self.prepared_output != Some(key) {
            return Err(failure(
                "restored activation requires its actual prepared installation",
            ));
        }
        if self.session.fence().phase() != crate::host::CandidatePhase::Accepted {
            return Err(failure(
                "restored activation requires accepted whole-install settlement",
            ));
        }
        if !self
            .session
            .finish_restore(
                key,
                &receipt.world_id,
                &receipt.generation,
                receipt.revision,
                receipt.accepted_cut,
            )
            .map_err(failure)?
        {
            return Err(failure("restored installation was not accepted"));
        }
        self.prepared_output = None;
        self.restoring = None;
        self.active = true;
        Ok(())
    }
}
