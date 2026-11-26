//! Exact source/frame interning and selected public proof expansion.

use super::*;
use crate::encoding::json_record;
use crate::received::{ReceivedError, ReceivedValueReference};
use crate::reception::{
    EvidenceSource, ObservationFactKey, ObservationFrame, ObservationOrigin, ObserverLife,
    ReceivedFacetProof,
};
use std::collections::BTreeSet;

struct CompactMetadata<'a> {
    owner: &'a ObserverLife,
    sources: Vec<ReceivedSource>,
    source_keys: indexmap::IndexMap<String, u64>,
    frames: Vec<ObservationFrame>,
}

impl CompactMetadata<'_> {
    fn source(&mut self, value: &EvidenceSource) -> Result<u64, ReceivedError> {
        let compact = ReceivedSource {
            family: value.family,
            id: value.id.clone(),
            revision: value.revision.clone(),
            observer: (value.observer != *self.owner).then(|| value.observer.clone()),
        };
        let key =
            json_record(&compact).map_err(|_| ReceivedError("Received source encoding failed."))?;
        if let Some(index) = self.source_keys.get(&key) {
            return Ok(*index);
        }
        let index = self.sources.len() as u64;
        self.source_keys.insert(key, index);
        self.sources.push(compact);
        Ok(index)
    }

    fn fact(&mut self, value: &ObservationFactKey) -> Result<ReceivedFact, ReceivedError> {
        Ok(ReceivedFact(self.source(&value.source)?, value.ordinal))
    }

    fn frame(&mut self, value: &ObservationFrame) -> u64 {
        if let Some(index) = self.frames.iter().position(|held| held == value) {
            return index as u64;
        }
        let index = self.frames.len() as u64;
        self.frames.push(value.clone());
        index
    }

    fn proof(
        &mut self,
        value: &ReceivedFacetProof,
        field: &TemporalFacetReference,
        original: Option<ReceivedFact>,
        received_from: Option<u64>,
    ) -> Result<ReceivedProof, ReceivedError> {
        let own_original = self.fact(&value.original)?;
        let confirmation = self.source(&value.confirmation)?;
        Ok(ReceivedProof {
            original: (Some(own_original) != original).then_some(own_original),
            confirmation: (Some(confirmation) != received_from).then_some(confirmation),
            from: (value.confirmed_from != field.clock.measured_from)
                .then_some(value.confirmed_from),
            through: (value.confirmed_through
                != field
                    .clock
                    .confirmed_through
                    .unwrap_or(field.clock.measured_through))
            .then_some(value.confirmed_through),
            aliases: value.aliases.clone(),
        })
    }
}

pub fn compact_received_receipt(
    owner: &ObserverLife,
    receipt: &TemporalReceipt,
) -> Result<ReceivedReceipt, ReceivedError> {
    if owner.actor_id != receipt.locator.actor_id
        || owner.physical_life != receipt.locator.physical_life
    {
        return Err(ReceivedError("Foreign received record owner."));
    }
    let mut metadata = CompactMetadata {
        owner,
        sources: Vec::new(),
        source_keys: indexmap::IndexMap::new(),
        frames: Vec::new(),
    };
    let clock = receipt.facets.first().map(|field| field.clock.clone());
    let mut facets = Vec::with_capacity(receipt.facets.len());
    for field in &receipt.facets {
        let original = field
            .original
            .as_ref()
            .map(|value| metadata.fact(value))
            .transpose()?;
        let received_from = field
            .received_from
            .as_ref()
            .map(|value| metadata.source(value))
            .transpose()?;
        let support = field
            .support
            .as_ref()
            .map(|value| metadata.proof(value, field, original, received_from))
            .transpose()?;
        let detail = field
            .detail_support
            .as_ref()
            .map(|value| {
                Ok::<_, ReceivedError>(ReceivedDetail {
                    proof: metadata.proof(&value.proof, field, original, received_from)?,
                    role: (value.role != field.clock.role).then_some(value.role),
                    from: (value.from != field.clock.measured_from).then_some(value.from),
                    through: (value.through != field.clock.measured_through)
                        .then_some(value.through),
                    acquired_at: (value.acquired_at != field.clock.acquired_at)
                        .then_some(value.acquired_at),
                })
            })
            .transpose()?;
        facets.push(ReceivedField {
            member_index: field.member_index,
            value_ref: field.value_ref.clone(),
            track: field.track.clone(),
            clock: clock
                .as_ref()
                .and_then(|base| ReceivedClockDifference::between(&field.clock, base)),
            original,
            received_from,
            support,
            detail,
            pose_frame: field.pose_frame.as_ref().map(|value| metadata.frame(value)),
            reception: field.reception.as_ref().map(|value| match value {
                TemporalReception::Body { pose } => ReceivedReception::Body { pose: pose.clone() },
                TemporalReception::Location { frame } => ReceivedReception::Location {
                    frame: metadata.frame(frame),
                },
            }),
        });
    }
    // Source registration from origin precedes receiver-frame registration in the
    // original codec. Neither table may be reconstructed from sorted identities.
    let origin = receipt
        .origin
        .as_ref()
        .map(|value| {
            Ok::<_, ReceivedError>(match value {
                ObservationOrigin::Occurrence {
                    event_id,
                    at,
                    order,
                } => ReceivedOrigin::Occurrence {
                    event_id: event_id.clone(),
                    at: *at,
                    order: *order,
                },
                ObservationOrigin::Exposure {
                    episode_id,
                    detector_id,
                    measured_from,
                    measured_through,
                    source,
                } => ReceivedOrigin::Exposure {
                    episode_id: episode_id.clone(),
                    detector_id: detector_id.clone(),
                    measured_from: *measured_from,
                    measured_through: *measured_through,
                    source: source
                        .as_ref()
                        .map(|value| metadata.source(value))
                        .transpose()?,
                },
            })
        })
        .transpose()?;
    let frame = receipt
        .receiver_frame
        .as_ref()
        .map(|value| metadata.frame(value));
    Ok(ReceivedReceipt {
        header: receipt.header.clone(),
        clock,
        sources: metadata.sources,
        frames: metadata.frames,
        frame,
        origin,
        facets,
    })
}

struct ExpandedMetadata<'a> {
    record: &'a ReceivedReceipt,
    owner: ObserverLife,
    sources: BTreeSet<u64>,
    frames: BTreeSet<u64>,
}

impl ExpandedMetadata<'_> {
    fn source(&mut self, index: u64) -> Result<EvidenceSource, ReceivedError> {
        let value = self
            .record
            .sources
            .get(index as usize)
            .ok_or(ReceivedError("Missing received source."))?;
        self.sources.insert(index);
        Ok(EvidenceSource {
            family: value.family,
            id: value.id.clone(),
            revision: value.revision.clone(),
            observer: value.observer.clone().unwrap_or_else(|| self.owner.clone()),
        })
    }

    fn fact(&mut self, value: ReceivedFact) -> Result<ObservationFactKey, ReceivedError> {
        Ok(ObservationFactKey {
            source: self.source(value.0)?,
            ordinal: value.1,
        })
    }

    fn frame(&mut self, index: u64) -> Result<ObservationFrame, ReceivedError> {
        let value = self
            .record
            .frames
            .get(index as usize)
            .ok_or(ReceivedError("Missing received frame."))?;
        self.frames.insert(index);
        Ok(value.clone())
    }

    fn proof(
        &mut self,
        value: &ReceivedProof,
        clock: &ReceivedFieldClock,
        original: &Option<ObservationFactKey>,
        received_from: &Option<EvidenceSource>,
    ) -> Result<ReceivedFacetProof, ReceivedError> {
        let original = match value.original {
            Some(value) => Some(self.fact(value)?),
            None => original.clone(),
        }
        .ok_or(ReceivedError("Incomplete received proof."))?;
        let confirmation = match value.confirmation {
            Some(index) => Some(self.source(index)?),
            None => received_from.clone(),
        }
        .ok_or(ReceivedError("Incomplete received proof."))?;
        Ok(ReceivedFacetProof {
            original,
            confirmation,
            confirmed_from: value.from.unwrap_or(clock.measured_from),
            confirmed_through: value
                .through
                .or(clock.confirmed_through)
                .unwrap_or(clock.measured_through),
            aliases: value.aliases.clone(),
        })
    }
}

pub fn materialize_received_receipt(
    owner: &ReceivedBatch,
    entry: &ReceivedEntry,
    members: Option<&BTreeSet<u64>>,
) -> Result<TemporalReceipt, ReceivedError> {
    let record = &entry.receipt;
    let mut metadata = ExpandedMetadata {
        record,
        owner: owner.observer(),
        sources: BTreeSet::new(),
        frames: BTreeSet::new(),
    };
    let mut facets = Vec::new();
    for field in &record.facets {
        if members.is_some_and(|members| !members.contains(&field.member_index)) {
            continue;
        }
        let base = record
            .clock
            .as_ref()
            .ok_or(ReceivedError("Missing received field clocks."))?;
        let clock = field
            .clock
            .as_ref()
            .map_or_else(|| base.clone(), |difference| difference.apply(base));
        let original = field
            .original
            .map(|value| metadata.fact(value))
            .transpose()?;
        let received_from = field
            .received_from
            .map(|index| metadata.source(index))
            .transpose()?;
        let support = field
            .support
            .as_ref()
            .map(|value| metadata.proof(value, &clock, &original, &received_from))
            .transpose()?;
        let detail_support = field
            .detail
            .as_ref()
            .map(|value| {
                Ok::<_, ReceivedError>(TemporalDetailSupport {
                    proof: metadata.proof(&value.proof, &clock, &original, &received_from)?,
                    role: value.role.unwrap_or(clock.role),
                    from: value.from.unwrap_or(clock.measured_from),
                    through: value.through.unwrap_or(clock.measured_through),
                    acquired_at: value.acquired_at.unwrap_or(clock.acquired_at),
                })
            })
            .transpose()?;
        facets.push(TemporalFacetReference {
            clock,
            member_index: field.member_index,
            value_ref: field.value_ref.clone(),
            track: field.track.clone(),
            original,
            received_from,
            support,
            detail_support,
            pose_frame: field
                .pose_frame
                .map(|index| metadata.frame(index))
                .transpose()?,
            reception: field
                .reception
                .as_ref()
                .map(|value| {
                    Ok::<_, ReceivedError>(match value {
                        ReceivedReception::Body { pose } => {
                            TemporalReception::Body { pose: pose.clone() }
                        }
                        ReceivedReception::Location { frame } => TemporalReception::Location {
                            frame: metadata.frame(*frame)?,
                        },
                    })
                })
                .transpose()?,
        });
    }
    let origin = record
        .origin
        .as_ref()
        .map(|value| {
            Ok::<_, ReceivedError>(match value {
                ReceivedOrigin::Occurrence {
                    event_id,
                    at,
                    order,
                } => ObservationOrigin::Occurrence {
                    event_id: event_id.clone(),
                    at: *at,
                    order: *order,
                },
                ReceivedOrigin::Exposure {
                    episode_id,
                    detector_id,
                    measured_from,
                    measured_through,
                    source,
                } => ObservationOrigin::Exposure {
                    episode_id: episode_id.clone(),
                    detector_id: detector_id.clone(),
                    measured_from: *measured_from,
                    measured_through: *measured_through,
                    source: source.map(|index| metadata.source(index)).transpose()?,
                },
            })
        })
        .transpose()?;
    let receiver_frame = record
        .frame
        .map(|index| metadata.frame(index))
        .transpose()?;
    if members.is_none()
        && (metadata.sources.len() != record.sources.len()
            || metadata.frames.len() != record.frames.len())
    {
        return Err(ReceivedError("Unreferenced received metadata."));
    }
    let locator = owner.locator(entry.entry_index);
    Ok(TemporalReceipt {
        header: record.header.clone(),
        id: locator.id(),
        locator,
        at: entry.received_at,
        order: entry.order,
        required: entry.required,
        receiver_frame,
        origin,
        facets,
    })
}

pub fn received_record_value_references<'a>(
    record: &'a ReceivedReceipt,
    members: Option<&BTreeSet<u64>>,
) -> indexmap::IndexSet<&'a str> {
    let mut references = indexmap::IndexSet::new();
    for field in &record.facets {
        if members.is_some_and(|members| !members.contains(&field.member_index)) {
            continue;
        }
        if let ReceivedValueReference::Shared(id) = &field.value_ref {
            references.insert(id.as_str());
        }
        if let Some(ReceivedReception::Body {
            pose:
                BodyReception::Reference {
                    pose_ref: ReceivedValueReference::Shared(id),
                },
        }) = &field.reception
        {
            references.insert(id.as_str());
        }
    }
    references
}
