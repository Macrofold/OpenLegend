//! Prepare the first daily request and apply its answer through the same
//! private mind-publication owner used by the bridge.

use super::*;
use crate::{
    cognition::{EvidenceRelation, InnerKind, InnerSource, InnerStatus, reflection::MindFile},
    text::JsText,
};
use serde::Serialize;

pub(super) struct DreamPrompt {
    files: Vec<MindFile>,
    labels: Vec<JsText>,
    mind: Arc<MaintenanceInterpretation>,
    _custody: ByteReservation,
}

pub struct RuntimePreparedDream {
    pub(in crate::runtime::maintenance::consolidation) scope: Arc<NpcHistoricalScope>,
    pub(in crate::runtime::maintenance::consolidation) input: crate::cognition::dream::DreamInput,
}
impl NativeWorldSession {
    /// Offer the exact permitted subjects and existing private files to the
    /// first partition only. Each index refers to the already selected batch,
    /// and the same ticket seals the view before transfer and application.
    pub fn prepare_consolidation_dream_direct(
        &self,
        ticket: &mut RuntimeConsolidationTicket,
        first_positions: &[usize],
    ) -> Result<Option<RuntimeConsolidationDream>, RuntimeError> {
        if !ticket.sources_ready() || !self.consolidation_current(ticket)? {
            return Err(failure("daily consolidation source preparation changed"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let actor = &ticket.scope.actor_id;
        let mind = state
            .minds
            .minds
            .as_ref()
            .and_then(|owners| owners.get(actor))
            .ok_or_else(|| failure("daily workspace is unavailable"))?;
        let episode = ticket
            .admission
            .dream_episode
            .as_ref()
            .ok_or_else(|| failure("daily review has no sleep episode"))?;
        if mind.last_dream_episode.as_ref() == Some(episode) {
            return Ok(None);
        }
        let inner_revision = ticket
            .inner_revision
            .ok_or_else(|| failure("daily inner revision is unavailable"))?;
        let view = Arc::new(
            MaintenanceInterpretation::capture(state, actor, &self.budget).map_err(failure)?,
        );
        let sources = ticket.sources.as_ref().expect("checked private sources");
        let mut bytes = size_of::<DreamPrompt>()
            .checked_add(512)
            .and_then(|n| n.checked_add(first_positions.len().checked_mul(128)?))
            .ok_or_else(|| failure("capacity"))?;
        let from_source = first_positions
            .iter()
            .try_fold(0usize, |count, &position| {
                let row = sources
                    .personal
                    .get(position)
                    .filter(|source| {
                        source.record.header().importance < ticket.limits.protected_importance
                    })
                    .ok_or_else(|| {
                        failure("daily request selected a source outside its routine partition")
                    })?;
                count
                    .checked_add(
                        (0..)
                            .map_while(|ordinal| row.attribution.subject(ordinal))
                            .count(),
                    )
                    .ok_or_else(|| failure("capacity"))
            })?;
        let candidates = from_source
            .checked_add(view.subjects.len())
            .ok_or_else(|| failure("capacity"))?;
        bytes = bytes
            .checked_add(
                crate::host::retained_size::map_storage::<(bool, &str), ()>(candidates)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .and_then(|n| {
                n.checked_add(
                    candidates.checked_mul(size_of::<Identity>() + size_of::<JsText>() + 64)?,
                )
            })
            .ok_or_else(|| failure("capacity"))?;
        for file in &mind.documents {
            bytes = bytes
                .checked_add(size_of::<MindFile>() + file.id.len() + 3)
                .and_then(|n| n.checked_add(file.text.storage_bytes()))
                .ok_or_else(|| failure("capacity"))?;
        }
        let mut custody = self.budget.reserve(bytes)?;
        let mut evidence_aliases = Vec::with_capacity(first_positions.len());
        let mut identities = Vec::with_capacity(candidates);
        let mut labels = Vec::with_capacity(candidates);
        for (index, &position) in first_positions.iter().enumerate() {
            evidence_aliases.push(Evidence {
                alias: format!("s{index}"),
                ordinal: position,
            });
        }
        let source_facts = first_positions.iter().flat_map(|&position| {
            let row = sources
                .personal
                .get(position)
                .expect("checked routine source");
            (0..).map_while(move |subject| {
                row.attribution.subject(subject).map(|fact| {
                    (
                        fact,
                        Subject::Personal {
                            ordinal: position,
                            subject,
                        },
                    )
                })
            })
        });
        let mind_facts = view
            .subjects
            .iter()
            .enumerate()
            .filter_map(|(ordinal, fact)| {
                fact.as_ref()
                    .map(|fact| (fact, Subject::MindRecord { ordinal }))
            });
        let mut seen = IndexSet::with_capacity(candidates);
        for (fact, source) in source_facts.chain(mind_facts) {
            let key = match &fact.subject {
                ObserverSubject::Entity { entity_id } => (false, entity_id.as_str()),
                ObserverSubject::Individual { individual_id } => (true, individual_id.as_str()),
            };
            if seen.insert(key) {
                let label = fact.label();
                custody.resize(
                    custody
                        .bytes()
                        .checked_add(label.storage_bytes())
                        .ok_or_else(|| failure("capacity"))?,
                )?;
                identities.push(Identity {
                    alias: format!("p{}", labels.len()),
                    source,
                });
                labels.push(label.clone());
            }
        }
        drop(seen);
        let files = mind
            .documents
            .iter()
            .map(|doc| MindFile {
                path: format!("{}.md", doc.id).into(),
                text: doc.text.clone(),
            })
            .collect();
        ticket.interpretation = Some(view.clone());
        let mut dream = self.bind_consolidation_dream_owned(
            ticket,
            Binding {
                evidence_aliases,
                identities,
            },
        )?;
        ticket.dream_revision = Some((mind.revision, inner_revision));
        dream.direct = Some(DreamPrompt {
            files,
            labels,
            mind: view,
            _custody: custody,
        });
        Ok(Some(dream))
    }
}

impl RuntimeConsolidationDream {
    pub fn evidence_aliases(&self) -> impl Iterator<Item = &str> {
        self.evidence.keys().map(String::as_str)
    }

    pub fn subject_aliases(&self) -> impl Iterator<Item = &str> {
        self.identities.keys().map(String::as_str)
    }

    /// A borrowed serialization of the exact first-request interpretation
    /// facts. The transport owns its resulting JSON independently.
    pub fn prompt_fields(&self) -> impl Serialize + '_ {
        struct View<'a>(&'a RuntimeConsolidationDream);
        impl Serialize for View<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::{Error, SerializeStruct};
                let offer = self.0;
                let prompt = offer
                    .direct
                    .as_ref()
                    .ok_or_else(|| Error::custom("missing daily offer"))?;
                let mut output = serializer.serialize_struct("DailyInterpretation", 4)?;
                output.serialize_field("mindFiles", &prompt.files)?;
                output.serialize_field("interpretationDocuments", &prompt.mind.documents)?;
                output.serialize_field("interpretationSubjects", &Subjects(offer, prompt))?;
                output.serialize_field("interpretations", &Records(offer, prompt))?;
                output.end()
            }
        }
        View(self)
    }

    /// The provider decoder funds the actual answer before this crosses into
    /// the world. Keep the authorized alias map until native publication.
    pub fn prepare_publication_direct(
        &self,
        ticket: &RuntimeConsolidationTicket,
        answer: SqlCell,
        admitted_reply: &mut ByteReservation,
        budget: &ByteBudget,
    ) -> Result<RuntimePreparedDream, RuntimeError> {
        if !Arc::ptr_eq(&self.scope, &ticket.scope)
            || ticket.dream_revision.is_none()
            || !budget.owns(admitted_reply)
            || ["files", "thoughts", "recordChanges"]
                .into_iter()
                .any(|field| answer.get(field).is_none())
        {
            return Err(failure("daily answer lost its original offer"));
        }
        let prompt = self
            .direct
            .as_ref()
            .ok_or_else(|| failure("missing daily offer"))?;
        let bytes = prompt
            .files
            .iter()
            .try_fold(0usize, |n, file| {
                n.checked_add(file.path.storage_bytes())?
                    .checked_add(file.text.storage_bytes())?
                    .checked_add(
                        crate::host::retained_size::map_storage::<String, SqlCell>(2)? + 64,
                    )
            })
            .ok_or_else(|| failure("capacity"))?;
        let mut storage = self.reserve_publication(ticket, bytes, budget)?;
        let answer_custody = admitted_reply.split_off(
            answer
                .heap_bytes()
                .and_then(|bytes| bytes.checked_add(size_of::<SqlCell>()))
                .ok_or_else(|| failure("capacity"))?,
        )?;
        storage.merge(answer_custody)?;
        let input = self.prepare_value(ticket, answer, storage, || {
            Ok(SqlCell::Array(
                prompt
                    .files
                    .iter()
                    .map(|file| {
                        SqlCell::Object(IndexMap::from([
                            ("path".to_owned(), SqlCell::Text(file.path.clone())),
                            ("text".to_owned(), SqlCell::Text(file.text.clone())),
                        ]))
                    })
                    .collect(),
            ))
        })?;
        Ok(RuntimePreparedDream {
            scope: self.scope.clone(),
            input,
        })
    }
}

struct Subjects<'a>(&'a RuntimeConsolidationDream, &'a DreamPrompt);
impl Serialize for Subjects<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Label<'a> {
            handle: &'a str,
            label: &'a JsText,
        }
        serializer.collect_seq(
            self.0
                .identities
                .keys()
                .zip(&self.1.labels)
                .map(|(handle, label)| Label { handle, label }),
        )
    }
}

struct Records<'a>(&'a RuntimeConsolidationDream, &'a DreamPrompt);
impl Serialize for Records<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeSeq;
        #[derive(Serialize)]
        struct Link<'a> {
            id: &'a str,
            relation: &'a EvidenceRelation,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Record<'a> {
            id: &'a str,
            revision: u64,
            document_id: &'a str,
            kind: &'a InnerKind,
            subject_id: Option<&'a str>,
            source: &'a InnerSource,
            confidence: f64,
            trust: Option<f64>,
            status: InnerStatus,
            evidence: Vec<Link<'a>>,
            support_complete: bool,
        }
        let mut out = serializer.serialize_seq(Some(self.1.mind.records.len()))?;
        for record in &self.1.mind.records {
            let subject_id = record.subject_id.as_ref().and_then(|subject| {
                self.0
                    .identities
                    .iter()
                    .find(|(_, candidate)| *candidate == subject)
                    .map(|(alias, _)| alias.as_str())
            });
            let evidence: Vec<_> = record
                .evidence
                .iter()
                .filter_map(|link| {
                    self.0
                        .evidence
                        .iter()
                        .rev()
                        .find(|(_, source)| *source == &link.id)
                        .map(|(id, _)| Link {
                            id,
                            relation: &link.relation,
                        })
                })
                .collect();
            out.serialize_element(&Record {
                id: &record.id,
                revision: record.revision,
                document_id: &record.document_id,
                kind: &record.kind,
                subject_id,
                source: &record.source,
                confidence: record.confidence,
                trust: record.trust,
                status: record.status,
                support_complete: evidence.len() == record.evidence.len(),
                evidence,
            })?;
        }
        out.end()
    }
}
