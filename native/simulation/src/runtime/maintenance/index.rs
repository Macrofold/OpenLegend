//! Independent exact personal sources for embedding an NPC's own recollections.

use super::{witness::ConsolidationWatch, *};
use crate::{
    capture::{NpcHistoricalScope, NpcSourceSelection},
    encoding::{json_record, json_record_len},
    experience::{PersonalSourceKind, consolidation::consolidation_reading},
    text::JsText,
};

pub struct RuntimeMemoryIndex {
    scope: Arc<NpcHistoricalScope>,
    selected: Option<NpcSourceSelection>,
    candidate: Option<CandidateKey>,
    summary_prefix: String,
    maximum_text: usize,
    maximum_request: usize,
    texts: Vec<String>,
    ordinals: Vec<usize>,
    witness: Option<ConsolidationWatch>,
    _selection: ByteReservation,
    custody: ByteReservation,
}

impl RuntimeMemoryIndex {
    pub fn texts(&self) -> &[String] {
        &self.texts
    }

    pub fn ordinals(&self) -> &[usize] {
        &self.ordinals
    }

    pub fn actor_id(&self) -> &str {
        &self.scope.actor_id
    }

    pub fn accepted_cut(&self) -> u64 {
        self.scope.accepted_cut
    }

    /// Fast exact-source observation during a store write. The operation's
    /// world/actor scope and disclosure lease are checked separately.
    pub fn sources_current(&self) -> bool {
        self.witness
            .as_ref()
            .is_some_and(ConsolidationWatch::current)
    }
}

impl NativeWorldSession {
    pub fn prepare_memory_index(
        &mut self,
        world: &str,
        generation: &str,
        actor: &str,
        selected: NpcSourceSelection,
        selection: ByteReservation,
        summary_prefix: String,
        [maximum_text, maximum_request]: [usize; 2],
    ) -> Result<RuntimeMemoryIndex, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if state.physical.header.id != world
            || state.generation != generation
            || self.clock()?.paused
            || !self.npc_schedule_enrolled(actor)?
            || !self.budget.owns(&selection)
            || selected.personal.is_empty()
            || !selected.receipts.is_empty()
            || selected.consolidation_job.is_some()
            || selected
                .personal
                .iter()
                .any(|source| source.through.is_some())
        {
            return Err(failure("memory indexing authority changed"));
        }
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let custody = self
            .budget
            .reserve(std::mem::size_of::<RuntimeMemoryIndex>() + summary_prefix.capacity())?;
        let scope = NpcHistoricalScope::capture_personal(state, actor, serial, &self.budget)
            .map_err(failure)?;
        self.next_read_serial = serial;
        Ok(RuntimeMemoryIndex {
            scope: Arc::new(scope),
            selected: Some(selected),
            candidate: None,
            summary_prefix,
            maximum_text,
            maximum_request,
            texts: Vec::new(),
            ordinals: Vec::new(),
            witness: None,
            _selection: selection,
            custody,
        })
    }

    pub fn begin_memory_index(
        &mut self,
        read: &mut RuntimeMemoryIndex,
    ) -> Result<CandidateKey, RuntimeError> {
        let selected = read
            .selected
            .take()
            .ok_or_else(|| failure("memory indexing is active"))?;
        let key = self
            .session
            .begin_npc_sources(read.scope.clone(), selected)
            .map_err(failure)?;
        read.candidate = Some(key);
        Ok(key)
    }

    pub fn step_memory_index(
        &mut self,
        read: &mut RuntimeMemoryIndex,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    ) -> Result<RuntimeNpcPreparationStep, RuntimeError> {
        if read.candidate != Some(key) || !self.session.is_npc_sources(key) {
            return Err(failure("memory indexing source read is stale"));
        }
        let answer = provider_response(answer, &self.budget)?;
        let step = self
            .session
            .step(
                key,
                answer,
                crate::experience::HistorySettings {
                    policy_id: &self.history_policy_id,
                    policy_revision: self.history_policy_revision,
                },
            )
            .map_err(failure)?;
        Ok(match step {
            SessionStep::Continue => RuntimeNpcPreparationStep::Continue,
            SessionStep::Question(question) => {
                RuntimeNpcPreparationStep::Provider(self.prepare_provider(key, question)?)
            }
            SessionStep::NpcSources(sources) => {
                read.candidate = None;
                if !sources.unavailable_personal.is_empty()
                    || sources.personal.is_empty()
                    || sources.personal.iter().enumerate().any(|(index, source)| {
                        source.selection != index || source.current_record().is_none()
                    })
                {
                    return Err(failure("memory indexing source changed"));
                }
                if self.consolidation_watches.is_none() {
                    self.consolidation_watches =
                        Some(witness::ConsolidationWatches::new(&self.budget)?);
                }
                let state = &self.session.accepted().map_err(failure)?.state;
                let records = sources.personal.iter().map(|source| {
                    source
                        .current_record()
                        .expect("checked current source")
                        .as_ref()
                });
                read.custody.resize(
                    read.custody
                        .bytes()
                        .checked_add(
                            records
                                .len()
                                .checked_mul(
                                    std::mem::size_of::<String>() + std::mem::size_of::<usize>(),
                                )
                                .ok_or_else(|| failure("capacity"))?,
                        )
                        .ok_or_else(|| failure("capacity"))?,
                )?;
                read.texts = Vec::with_capacity(records.len());
                read.ordinals = Vec::with_capacity(records.len());
                let mut wire_bytes = 2_usize;
                for (ordinal, record) in records.enumerate() {
                    let header = record.header();
                    let (mut text, mut text_custody) =
                        consolidation_reading(record, &self.budget).map_err(failure)?;
                    let _decode = self.budget.reserve(
                        crate::experience::encoded_body_bound(record.payload()).map_err(failure)?,
                    )?;
                    let source = match header.reference.kind {
                        PersonalSourceKind::Awareness => {
                            #[derive(Deserialize)]
                            struct Body<'a> {
                                modality: &'a str,
                            }
                            let body: Body<'_> =
                                serde_json::from_str(record.payload()).map_err(failure)?;
                            Some(body.modality)
                        }
                        PersonalSourceKind::Memory => header.source.as_deref(),
                        PersonalSourceKind::Summary => Some("inferred"),
                    };
                    #[derive(serde::Serialize)]
                    #[serde(rename_all = "camelCase")]
                    struct Embedding<'a> {
                        kind: &'a str,
                        #[serde(skip_serializing_if = "Option::is_none")]
                        source: Option<&'a str>,
                        #[serde(skip_serializing_if = "Option::is_none")]
                        event_type: Option<&'a str>,
                        text: &'a JsText,
                    }
                    let kind = match header.reference.kind {
                        PersonalSourceKind::Awareness => "episode",
                        PersonalSourceKind::Summary => {
                            let bytes = text
                                .storage_bytes()
                                .checked_add(read.summary_prefix.len())
                                .and_then(|n| n.checked_mul(4))
                                .ok_or_else(|| failure("capacity"))?;
                            text_custody.resize(bytes)?;
                            let mut prefixed = JsText::from(read.summary_prefix.as_str());
                            prefixed.push_text(&text);
                            text = prefixed;
                            "reflection"
                        }
                        PersonalSourceKind::Memory => header
                            .record_kind
                            .as_deref()
                            .ok_or_else(|| failure("memory kind unavailable"))?,
                    };
                    let public = Embedding {
                        kind,
                        source,
                        event_type: header.event_type.as_deref(),
                        text: &text,
                    };
                    let length = json_record_len(&public).map_err(failure)?;
                    if length > read.maximum_text {
                        continue;
                    }
                    let previous = read.custody.bytes();
                    read.custody.resize(
                        previous
                            .checked_add(length.checked_mul(2).ok_or_else(|| failure("capacity"))?)
                            .ok_or_else(|| failure("capacity"))?,
                    )?;
                    let encoded = json_record(&public).map_err(failure)?;
                    wire_bytes = wire_bytes
                        .checked_add(json_record_len(&encoded).map_err(failure)?)
                        .and_then(|bytes| bytes.checked_add(usize::from(!read.texts.is_empty())))
                        .ok_or_else(|| failure("capacity"))?;
                    if wire_bytes > read.maximum_request {
                        read.custody.resize(previous)?;
                        break;
                    }
                    read.custody.resize(
                        previous
                            .checked_add(encoded.capacity())
                            .ok_or_else(|| failure("capacity"))?,
                    )?;
                    read.texts.push(encoded);
                    read.ordinals.push(ordinal);
                }
                if !read.ordinals.is_empty() {
                    let offered = read.ordinals.iter().map(|&ordinal| {
                        sources.personal[ordinal]
                            .current_record()
                            .expect("checked current source")
                            .as_ref()
                    });
                    read.witness = Some(
                        self.consolidation_watches
                            .as_ref()
                            .expect("created source registry")
                            .watch(offered, &state.installed.schema, &self.budget)?,
                    );
                }
                RuntimeNpcPreparationStep::Complete
            }
            _ => return Err(failure("memory index read produced effects")),
        })
    }

    pub fn memory_index_publication(
        &self,
        read: &RuntimeMemoryIndex,
    ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        if self.clock()?.paused
            || !read.scope.still_permitted(state)
            || !self.npc_schedule_enrolled(read.actor_id())?
            || !read
                .witness
                .as_ref()
                .is_some_and(ConsolidationWatch::current)
        {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(std::mem::size_of::<RuntimeMaintenancePublication>())?;
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeMaintenancePublication {
            _lease: lease,
            fence,
            _storage: storage,
        }))
    }
}
