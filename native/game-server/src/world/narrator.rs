//! The private Journal uses the same accepted history lease as a player
//! transcript. A claim may retain this witness, never a live world borrow.

use super::*;
use crate::store::{ClaimedStory, StoryRevisions};
use openlegend_simulation::{
    host::ByteReservation, reception::EncounterExposure, runtime::RuntimePlayerTranscriptRead,
};

pub(crate) struct StoryDisclosure {
    pub(crate) claim: Arc<ClaimedStory>,
    pub(crate) authority: Arc<Authority>,
    read: RuntimePlayerTranscriptRead,
    host_generation: u64,
    revisions: StoryRevisions,
    exposures: Vec<EncounterExposure>,
    _custody: ByteReservation,
}

impl HostedWorld {
    pub(crate) async fn capture_story(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        claim: Arc<ClaimedStory>,
        revisions: StoryRevisions,
    ) -> Result<Option<StoryDisclosure>, WorldError> {
        let budget = self.host.budget().clone();
        let _turn = self.enter().await?;
        self.call(move |session| {
            let result = || -> Result<Option<StoryDisclosure>, WorldError> {
                let (owner, actor) = claim.principal();
                let read = session.read_player_transcript(owner, actor)?;
                let (world, generation, _) = read.durable_head();
                if world != claim.head.world_id
                    || generation != claim.head.generation
                    || read.privacy_revision() != revisions.privacy_revision
                {
                    return Ok(None);
                }
                let custody = budget
                    .reserve(claim.exposure_bound())
                    .map_err(HostError::from)?;
                let exposures = claim.exposures()?;
                Ok(Some(StoryDisclosure {
                    claim,
                    authority,
                    read,
                    host_generation: session.work_generation(),
                    revisions,
                    exposures,
                    _custody: custody,
                }))
            };
            Ok(result())
        })
        .await?
    }
}

impl NpcDisclosureTurn<'_> {
    /// The claim's selected sources and the native lease must still agree
    /// at the first real provider poll or final Journal admission.
    pub(crate) fn disclose_story<T>(
        &self,
        selected: &StoryDisclosure,
        deliver: impl FnOnce() -> T,
    ) -> Result<Result<T, NpcDisclosure>, WorldError> {
        let world = self.world;
        let (owner, actor) = selected.claim.principal();
        if world.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        let pending = world
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(actor) {
            return Ok(Err(NpcDisclosure::Refused("story-source-edit-pending")));
        }
        let session = match world.session.try_lock() {
            Ok(session) => session,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(Err(NpcDisclosure::Busy)),
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        if !session.work_is_current(selected.host_generation) {
            return Ok(Err(NpcDisclosure::Refused("story-maintenance-boundary")));
        }
        if session.clock()?.paused {
            return Ok(Err(NpcDisclosure::Refused("story-world-paused")));
        }
        // The selected mandatory and optional receipts already carry exact
        // revisions and their funded backing through this synchronous check.
        let temporal = selected
            .revisions
            .rows
            .iter()
            .filter_map(|row| row.temporal.as_ref().map(|(receipt, at)| (receipt, *at)))
            .collect::<Vec<_>>();
        let Some(lease) = session.story_publication(
            owner,
            &selected.read,
            &temporal,
            selected.revisions.expires_at,
            selected.claim.selection(),
            &selected.exposures,
        )?
        else {
            return Ok(Err(NpcDisclosure::Refused(
                "story-source-or-selection-changed",
            )));
        };
        let result = deliver();
        drop(lease);
        Ok(Ok(result))
    }
}
