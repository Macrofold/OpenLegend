//! Join operational application facts and the selected accepted read. This
//! adapter cannot manufacture a grant or a missing gameplay product.

use super::*;
use crate::{
    authority::{Authority, RequestScope},
    player_command::PlayerCommands,
    player_references::PlayerReferences,
    presence::Presence,
};
use openlegend_simulation::encoding::{json_record, sha256_hex};
use std::sync::LazyLock;

// A cold install starts new display counters even when the saved timeline is
// unchanged. A browser cannot reuse a page from the earlier server process.
static PLACE_VIEW_EPOCH: LazyLock<uuid::Uuid> = LazyLock::new(uuid::Uuid::new_v4);

pub(crate) struct ViewHostInput {
    access: PlayerAccess,
    checkpoint: Option<CheckpointContext>,
    command_epoch: String,
    pub(super) maintenance_revision: u64,
    maintenance: Option<Arc<crate::operator_maintenance::Window>>,
    pub(crate) paused_stop: Option<PausedStop>,
    telemetry: ViewTelemetry,
    narrator: Option<NarrationBanner>,
    custody: ByteReservation,
}

pub(crate) fn checkpoint_context(
    scope: &RequestScope,
    key: &str,
) -> Result<CheckpointContext, ViewError> {
    let mut fields = serde_json::to_value(scope.recovery_fields()).map_err(ViewError::Encoding)?;
    let fields = fields.as_object_mut().ok_or(ViewError::Changed)?;
    fields.shift_remove("timelineId");
    Ok(CheckpointContext {
        scope: key.to_owned(),
        recovery_scope: sha256_hex(json_record(fields).map_err(ViewError::Encoding)?.as_bytes()),
        timeline: scope.timeline_id.clone(),
        can_load: true,
    })
}

/// Read the live operation owners before projection. The application must
/// check the same grant and operational revision again at disclosure.
pub(crate) async fn capture_host(
    authority: &Authority,
    grant: &AuthorizedScope,
    commands: &PlayerCommands,
    presence: &Presence,
    telemetry: ViewTelemetry,
    narrator: Option<NarrationBanner>,
    god_mode: bool,
    budget: &ByteBudget,
) -> Result<ViewHostInput, ViewError> {
    let scope = &grant.scope;
    let capacity = 8192_usize
        .checked_add(
            16 * (scope.account_id.len()
                + scope.actor_id.len()
                + scope.session_id.len()
                + scope.world_id.len()
                + scope.timeline_id.len()),
        )
        .ok_or(ViewError::Capacity)?;
    let custody = budget.reserve(capacity).map_err(|_| ViewError::Capacity)?;
    let access = authority
        .view_access(grant)
        .map_err(|problem| ViewError::World(problem.into()))?;
    let key = scope.key().map_err(ViewError::Encoding)?;
    let private = scope.recovery_fields();
    let private_draft_scope = sha256_hex(
        json_record(&private)
            .map_err(ViewError::Encoding)?
            .as_bytes(),
    );
    let checkpoint = if access.can_save {
        Some(checkpoint_context(scope, &key)?)
    } else {
        None
    };
    let controlled_elsewhere = !access.controlling
        && presence
            .controller_present(&scope.actor_id)
            .map_err(|problem| ViewError::World(problem.into()))?;
    let (command_epoch, maintenance_revision, maintenance) = commands.view_epoch().await;
    Ok(ViewHostInput {
        access: PlayerAccess {
            scope: key,
            private_draft_scope: private_draft_scope.clone(),
            command_recovery_scope: private_draft_scope,
            account_id: scope.account_id.clone(),
            actor_id: scope.actor_id.clone(),
            control_generation: scope.control_generation,
            controlling: access.controlling,
            controlled_elsewhere,
            can_manage_saves: access.can_save,
            can_operate: access.can_operate,
            can_inspect_mind: (god_mode && access.can_inspect).then_some(true),
            can_edit_person_memory: (god_mode && access.can_create).then_some(true),
            mode: if access.local {
                AuthenticationMode::Local
            } else {
                AuthenticationMode::Oidc
            },
        },
        checkpoint,
        command_epoch,
        maintenance_revision,
        maintenance,
        paused_stop: None,
        telemetry,
        narrator,
        custody,
    })
}

impl ViewHostInput {
    pub(super) fn controlling(&self) -> bool {
        self.access.controlling
    }
    pub(super) fn matches(
        &self,
        scope: &crate::authority::RequestScope,
    ) -> Result<bool, ViewError> {
        Ok(scope.embodied()
            && scope.key().map_err(ViewError::Encoding)? == self.access.scope
            && scope.actor_id == self.access.actor_id
            && scope.account_id == self.access.account_id
            && scope.control_generation == self.access.control_generation)
    }
    pub(super) fn assemble(
        self,
        revision: u64,
        save_failed: bool,
        read: &RuntimePlayerRead,
        policy: &PlayerViewPolicy,
        references: &PlayerReferences<'_>,
    ) -> Result<(ViewHostFacts, Option<NarrationBanner>), ViewError> {
        let input = read.view_source().map_err(runtime)?;
        let control = read.control_facts().map_err(runtime)?;
        let history_revision = format!("{}:{}", control.generation, input.history_order);
        let epoch = format!("{}:{}", control.generation, input.privacy_revision);
        let events_revision = format!("{history_revision}:{}", input.privacy_revision);
        let memory_revision =
            json_record(&(&epoch, input.memory_cut)).map_err(ViewError::Encoding)?;
        let disclosure = references
            .personal_source(&(
                "inventory-disclosure",
                Option::<()>::None,
                input.privacy_revision,
                &epoch,
            ))
            .map_err(ViewError::Encoding)?;
        let milestones = policy
            .world
            .milestones
            .iter()
            .map(|milestone| Milestone {
                id: milestone.id.clone(),
                label: milestone.label.clone(),
                done: input.milestone_done(&milestone.id),
            })
            .collect();
        let telemetry = self.telemetry;
        let presentation_release_revision = self
            .access
            .can_manage_saves
            .then_some(input.presentation_release_revision.unwrap_or(0));
        let facts = ViewHostFacts {
            revision,
            access: self.access,
            checkpoint: self.checkpoint,
            command_epoch: self.command_epoch,
            base_ratio: policy.base_ratio(),
            persistence: if save_failed {
                PersistenceView {
                    status: PersistenceStatus::Error,
                    message: "Saving must recover before playing.".into(),
                }
            } else {
                PersistenceView {
                    status: PersistenceStatus::Saved,
                    message: "Saved locally; the world pauses when you leave".into(),
                }
            },
            inventory: InventoryReadRevision {
                bindings: input.inventory_revision,
                details: input.inventory_revision,
                disclosure,
            },
            history: HistoryViewFacts {
                events_revision,
                revision: history_revision,
                epoch,
                memory_revision,
                places_revision: format!(
                    "{}:{}:{}:{}",
                    *PLACE_VIEW_EPOCH,
                    control.generation,
                    input.places_revision,
                    input.place_note_revision,
                ),
                narrator: None,
            },
            paused_stop: self.paused_stop,
            weather: read.perception().map_err(runtime)?.weather.cloned(),
            maintenance: self.maintenance,
            presentation_release: None,
            presentation_release_revision,
            milestones,
            telemetry,
            custody: self.custody,
        };
        Ok((facts, self.narrator))
    }
}
