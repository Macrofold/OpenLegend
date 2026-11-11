//! A pure current speech/sight read for one private reply preview. It neither
//! receives an occurrence nor acquires names, attention, history or randomness.
use super::*;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::reception::{AcousticEmission, SightBatch, SoundBatch, sound_origin};
use crate::worlds::{InstalledHearingDetail, InstalledPersonalNameReader};
use std::mem::size_of;

/// A final synchronous egress lease, never held during physical/SQL work.
pub struct RuntimeReplyPreviewPublication {
    _lease: crate::host::PublicationLease,
    fence: Arc<CandidateFence>,
}
impl RuntimeReplyPreviewPublication {
    pub fn is_current(&self) -> bool {
        self.fence.phase() == crate::host::CandidatePhase::Publishing
            && !self.fence.stop_requested()
    }
}

pub struct RuntimeReplyPreviewRead {
    account: String,
    player: String,
    npc: String,
    world_id: String,
    generation: String,
    binding: GeometryBinding,
    eligible: bool,
    queries: GeometryQueries,
    sound: Option<SoundBatch>,
    sight: Option<SightBatch>,
    speaker_name_data: Option<crate::worlds::OwnedPersonalName>,
    installed: Arc<crate::simulation::InstalledWorld>,
    // The bridge separately funds its actual inline read/class carrier. This
    // reservation owns the strings and combined query arrays. Installed immutable
    // definitions retain their actual resident reservation through the Arc.
    _custody: ByteReservation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplyPreviewFacts<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    eligible: bool,
    clear: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_name_data: Option<crate::worlds::OwnedPersonalName>,
}

impl NativeWorldSession {
    pub fn reply_preview_publication(
        &self,
        account: &str,
        player: &str,
        expected_cut: u64,
    ) -> Result<Option<RuntimeReplyPreviewPublication>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, player)
            .map_err(failure)?;
        if simulation.state.accepted_cut != expected_cut {
            return Ok(None);
        }
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeReplyPreviewPublication {
            _lease: lease,
            fence,
        }))
    }

    pub fn read_reply_preview(
        &mut self,
        account: &str,
        player: &str,
        npc: &str,
        volume: Option<&str>,
    ) -> Result<RuntimeReplyPreviewRead, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, player)
            .map_err(failure)?;
        let state = &simulation.state;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let binding = GeometryBinding::new(
            CandidateKey {
                id: 0,
                base_cut: state.accepted_cut,
                generation: self.session.operational_generation(),
            },
            state.installed.geometry.spatial.revision,
            serial,
        );
        let source = state.physical.entities.get(npc);
        let recipient = state.physical.entities.get(player);
        let source_actor = source.and_then(|entity| entity.actor.as_ref());
        let recipient_actor = recipient.and_then(|entity| entity.actor.as_ref());
        let eligible = source_actor.is_some_and(|actor| {
            actor.alive
                && !actor.incapacitated
                && actor
                    .capabilities
                    .as_ref()
                    .map_or(actor.controller != "native", |c| c.speech)
        }) && recipient_actor
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
            && !state
                .installed
                .capabilities
                .capability_blocked(source, "speech")
                .map_err(failure)?;
        let volume = volume
            .map(|name| {
                state
                    .installed
                    .acoustics
                    .value()
                    .volume(name)
                    .ok_or_else(|| failure("unsupported speech volume"))
            })
            .transpose()?;
        let bytes = account
            .len()
            .checked_add(player.len())
            .and_then(|n| n.checked_add(npc.len()))
            .and_then(|n| n.checked_add(state.physical.header.id.len()))
            .and_then(|n| n.checked_add(state.generation.len()))
            .and_then(|n| n.checked_add(4 * size_of::<SightRay>()))
            .ok_or_else(|| failure("capacity"))?;
        let mut custody = self.budget.reserve(bytes).map_err(failure)?;
        let mut queries = GeometryQueries::new(binding);
        let (sound, sight, speaker_name_data) = if let Some(volume) = volume
            .filter(|_| eligible && source.is_some_and(|entity| entity.actively_participates()))
        {
            let source = source.ok_or_else(|| failure("missing speech source"))?;
            let sound = SoundBatch::prepare(
                &state.physical,
                &state.installed,
                &AcousticEmission {
                    origin: sound_origin(source)
                        .ok_or_else(|| failure("speech position unavailable"))?,
                    // SoundBatch consumes only the emission origin and level.
                    emitter_id: None,
                    source_level_db_spl_at1m: state
                        .installed
                        .acoustics
                        .value()
                        .source_level(volume),
                },
                &[player],
                binding,
                &self.budget,
            )
            .map_err(failure)?;
            let sight = SightBatch::prepare(
                &state.physical,
                &state.installed,
                player,
                &[npc],
                binding,
                &self.budget,
            )
            .map_err(failure)?;
            queries
                .sound
                .try_reserve_exact(sound.queries().sound.len())
                .map_err(failure)?;
            queries.sound.extend_from_slice(&sound.queries().sound);
            queries
                .sight
                .try_reserve_exact(sight.queries().sight.len())
                .map_err(failure)?;
            queries.sight.extend_from_slice(&sight.queries().sight);
            let name = InstalledPersonalNameReader::prepare(
                &state.physical,
                &state.reception,
                &state.installed,
                &state.experience,
                player,
            )
            .map_err(failure)?
            .capture_observer_name(npc, &self.budget)
            .map_err(failure)?;
            (Some(sound), Some(sight), Some(name))
        } else {
            (None, None, None)
        };
        custody
            .resize(
                account.len()
                    + player.len()
                    + npc.len()
                    + state.physical.header.id.len()
                    + state.generation.len()
                    + (queries.sound.capacity() + queries.sight.capacity()) * size_of::<SightRay>(),
            )
            .map_err(failure)?;
        self.next_read_serial = serial;
        Ok(RuntimeReplyPreviewRead {
            account: account.to_owned(),
            player: player.to_owned(),
            npc: npc.to_owned(),
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            binding,
            eligible,
            queries,
            sound,
            sight,
            speaker_name_data,
            installed: Arc::clone(&state.installed),
            _custody: custody,
        })
    }

    /// The host additionally checks its current session/control lease before
    /// publishing. Older cuts can prove lost exposure and withdraw words; only
    /// the host's exact current-cut gate grants a positive disclosure.
    pub fn finish_reply_preview(
        &self,
        read: RuntimeReplyPreviewRead,
        bytes: &[u8],
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(&read.account, &read.player)
            .map_err(failure)?;
        let state = &simulation.state;
        if read.binding.generation != self.session.operational_generation()
            || read.world_id != state.physical.header.id
            || read.generation != state.generation
        {
            return Err(failure("reply preview read is stale"));
        }
        let mut clear = false;
        if let (Some(sound), Some(sight)) = (read.sound, read.sight) {
            let (binding, sound_answers, sight_answers, _decode) = if read.queries.is_empty() {
                if !bytes.is_empty() {
                    return Err(failure("unexpected preview geometry"));
                }
                (read.binding, Vec::new(), Vec::new(), None)
            } else {
                let decode = decode_preparation(bytes, &self.budget)?;
                let answers: GeometryAnswers = serde_json::from_slice(bytes).map_err(failure)?;
                read.queries.validate_answers(&answers).map_err(failure)?;
                (answers.binding, answers.sound, answers.sight, Some(decode))
            };
            let sound = sound
                .finish_exposure(binding, &sound_answers, &read.installed.acoustics)
                .map_err(failure)?;
            let sight = sight
                .finish_sight(binding, &sight_answers)
                .map_err(failure)?;
            clear = sound
                .exposure(&read.player)
                .is_some_and(|exposure| exposure.detail == InstalledHearingDetail::Clear)
                && sight.seen(&read.npc) == Some(true);
        } else if !bytes.is_empty() {
            return Err(failure("unexpected preview geometry"));
        }
        let speaker_name_data = if clear { read.speaker_name_data } else { None };
        RuntimeJson::encode(
            &ReplyPreviewFacts {
                world_id: &read.world_id,
                generation: &read.generation,
                accepted_cut: read.binding.base_cut,
                eligible: read.eligible,
                clear,
                speaker_name_data,
            },
            &self.budget,
        )
    }
}
impl RuntimeReplyPreviewRead {
    pub fn question(&self, budget: &ByteBudget) -> Result<Option<RuntimeJson>, RuntimeError> {
        if self.queries.is_empty() {
            Ok(None)
        } else {
            RuntimeJson::encode(&self.queries, budget).map(Some)
        }
    }
}
