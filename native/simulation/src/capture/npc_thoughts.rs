//! A thought can mention only an individual, thing, place, interval or passage
//! in its acquired context. The formatter supplies aliases and ordinals, while
//! the accepted native read supplies the meaning of every alias.
use super::{CapturedActorPerception, CapturedBodyBinding, NpcBindingRead, NpcPersonalEvidence};
use crate::execution::ExecutionError;
use crate::experience::{
    LiteralRange, LiteralReference, LiteralReferences, PersonalSourceKind, PersonalSourceRef,
};
use crate::host::retained_size::{HeapBytes, heap_record, map_storage};
use crate::host::{ByteBudget, ByteReservation, CapacityError};
use crate::install::ItemDefinitionRead;
use crate::narration::NativeText;
use crate::reception::{
    EncounterExposure, ObservedBody, SensoryFacet, SpeechSegment, VersionedFamily,
};
use crate::simulation::InstalledWorld;
use crate::text::JsText;
use indexmap::{IndexMap, IndexSet};
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum NpcThoughtOrdinal {
    Object {
        ordinal: usize,
    },
    Category {
        ordinal: usize,
    },
    InspectedObject {
        inventory: usize,
        ordinal: usize,
    },
    InspectedCategory {
        inventory: usize,
        ordinal: usize,
    },
    Place {
        inventory: usize,
        ordinal: usize,
    },
    NextDay {
        origin: Option<NpcPersonalEvidence>,
    },
    Quotation {
        inventory: usize,
        ordinal: usize,
        segment: usize,
    },
    Inherited {
        inventory: usize,
        ordinal: usize,
        reference: usize,
    },
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NpcThoughtAlias {
    pub alias: String,
    pub source: NpcThoughtOrdinal,
}
heap_record!(NpcThoughtAlias { alias });

pub(crate) struct ThoughtOffer {
    pub reference: LiteralReference,
    pub support: Option<Arc<ThoughtSupport>>,
    pub passage: Option<JsText>,
}
heap_record!(ThoughtOffer { reference, passage });

/// A selected parent and its existing exact citation ancestry, shared across
/// all offers from that account. This proof grants no read of the old bodies.
pub(crate) struct ThoughtSupport {
    pub sources: Vec<PersonalSourceRef>,
    _custody: ByteReservation,
}

impl ThoughtSupport {
    fn capture(
        parent: &PersonalSourceRef,
        annotations: Option<&LiteralReferences>,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, CapacityError> {
        let limit = annotations
            .map_or(0, |annotations| annotations.references.len())
            .checked_add(1)
            .ok_or(CapacityError)?;
        let _scratch =
            budget.reserve(map_storage::<&PersonalSourceRef, ()>(limit).ok_or(CapacityError)?)?;
        let mut sources = IndexSet::with_capacity(limit);
        sources.insert(parent);
        if let Some(annotations) = annotations {
            sources.extend(annotations.source_references());
        }
        let bytes =
            sources
                .iter()
                .try_fold(size_of::<Self>() + 2 * size_of::<usize>(), |sum, source| {
                    sum.checked_add(size_of::<PersonalSourceRef>())?
                        .checked_add(source.heap_bytes()?)
                });
        let custody = budget.reserve(bytes.ok_or(CapacityError)?)?;
        Ok(Arc::new(Self {
            sources: sources.into_iter().cloned().collect(),
            _custody: custody,
        }))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceFacts {
    text: Option<NativeText>,
    summary: Option<JsText>,
    exposure: Option<EncounterExposure>,
    speech: Option<SpeechFacts>,
    literal_references: Option<LiteralReferences>,
    #[serde(skip)]
    support: Option<Arc<ThoughtSupport>>,
}

#[derive(Deserialize)]
struct SpeechFacts {
    segments: Vec<SpeechSegment>,
    #[serde(skip)]
    offsets: Option<Vec<Option<LiteralRange>>>,
}

impl SpeechFacts {
    fn prepare_ranges(&mut self, storage: &mut ByteReservation) -> Result<(), ExecutionError> {
        let needed = self
            .segments
            .len()
            .checked_mul(size_of::<Option<LiteralRange>>())
            .ok_or(ExecutionError::Capacity)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(needed)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut offsets = vec![None; self.segments.len()];
        for (index, range, _) in crate::speech::quoted_segments(&self.segments) {
            offsets[index] = Some(range);
        }
        self.offsets = Some(offsets);
        Ok(())
    }

    fn quote(&self, index: usize) -> Option<(LiteralRange, &JsText)> {
        let range = self.offsets.as_ref()?.get(index)?.as_ref()?;
        let text = crate::speech::heard_segment(self.segments.get(index)?)?;
        Some((*range, text))
    }
}

pub(crate) fn observed_body<'a>(
    read: &'a CapturedActorPerception,
    body: &CapturedBodyBinding,
) -> Option<&'a ObservedBody> {
    if body.actor {
        return None;
    }
    let end = body.first.checked_add(body.count)?;
    read.evidence
        .cut()
        .current
        .get(body.first..end)?
        .iter()
        .find_map(|facet| match &facet.value {
            SensoryFacet::Body { body } => Some(body),
            _ => None,
        })
}

pub(crate) fn observed_category<'a>(
    world: &'a InstalledWorld,
    body: &ObservedBody,
) -> Option<&'a ItemDefinitionRead> {
    world.retained.items.get(body.subtype.as_deref()?)
}

pub(crate) fn inspection(
    exposure: Option<&EncounterExposure>,
) -> Option<(&str, &VersionedFamily, &JsText)> {
    match exposure? {
        EncounterExposure::InventoryItem {
            id,
            definition,
            label,
            ..
        } => Some((id, definition, label)),
        _ => None,
    }
}

pub(crate) fn inspected_category<'a>(
    world: &'a InstalledWorld,
    definition: &VersionedFamily,
) -> Option<&'a ItemDefinitionRead> {
    world
        .retained
        .items
        .get(&definition.id)
        .filter(|item| item.pin.version == definition.version)
}

pub(crate) fn place(exposure: Option<&EncounterExposure>) -> Option<(&str, &JsText)> {
    match exposure? {
        EncounterExposure::Place { id, label, .. } => Some((id, label)),
        _ => None,
    }
}

/// Reopen only selected occurrence bodies that supply typed thought references.
/// Multiple aliases into one body share its single bounded decode. The results
/// retain only exact IDs/ranges and the owned received words needed at apply.
pub(super) fn prepare(
    read: &NpcBindingRead<'_>,
    selection: &[NpcThoughtAlias],
    selected_personal: &[(usize, usize)],
    storage: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<IndexMap<String, ThoughtOffer>, ExecutionError> {
    if selection.is_empty() {
        return Ok(IndexMap::new());
    }
    let invalid = || ExecutionError::InvalidCheckpoint;
    // The prompt used this same installation for visible categories and time.
    let installed = read.current_installed;
    let mut decoded = IndexMap::<_, SourceFacts>::new();
    let mut scratch = budget.reserve(
        map_storage::<(usize, usize), SourceFacts>(selection.len())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    storage.resize(
        storage
            .bytes()
            .checked_add(
                map_storage::<String, ThoughtOffer>(selection.len())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| {
                n.checked_add(size_of::<IndexMap<String, ThoughtOffer>>() + 2 * size_of::<usize>())
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut offers = IndexMap::with_capacity(selection.len());
    for selected in selection {
        let origin = match &selected.source {
            NpcThoughtOrdinal::Place { inventory, ordinal }
            | NpcThoughtOrdinal::InspectedObject { inventory, ordinal }
            | NpcThoughtOrdinal::InspectedCategory { inventory, ordinal }
            | NpcThoughtOrdinal::Quotation {
                inventory, ordinal, ..
            }
            | NpcThoughtOrdinal::Inherited {
                inventory, ordinal, ..
            } => Some((*inventory, *ordinal)),
            NpcThoughtOrdinal::NextDay { origin } => {
                origin.as_ref().map(|src| (src.inventory, src.ordinal))
            }
            NpcThoughtOrdinal::Object { .. } | NpcThoughtOrdinal::Category { .. } => None,
        };
        let source = if let Some(key) = origin {
            let record = &read
                .sources
                .get(key.0)
                .and_then(|source| source.personal.get(key.1))
                .ok_or_else(invalid)?
                .record;
            let facts = match decoded.entry(key) {
                indexmap::map::Entry::Occupied(entry) => entry.into_mut(),
                indexmap::map::Entry::Vacant(entry) => {
                    if !selected_personal.contains(&key) {
                        return Err(invalid());
                    }
                    let payload = record.payload();
                    scratch.resize(
                        scratch
                            .bytes()
                            .checked_add(crate::experience::encoded_body_bound(payload)?)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let mut facts: SourceFacts =
                        serde_json::from_str(payload).map_err(|_| invalid())?;
                    facts.support = ThoughtSupport::capture(
                        &record.header().reference,
                        facts.literal_references.as_ref(),
                        budget,
                    )
                    .ok();
                    entry.insert(facts)
                }
            };
            if facts.support.is_none() {
                // The optional offer cannot preserve its full citation proof.
                continue;
            }
            if matches!(selected.source, NpcThoughtOrdinal::Quotation { .. }) {
                let speech = facts.speech.as_mut().ok_or_else(invalid)?;
                if speech.offsets.is_none() {
                    speech.prepare_ranges(&mut scratch)?;
                }
            }
            Some((record.header(), &*facts))
        } else {
            None
        };
        let generated;
        let (reference, passage) = match &selected.source {
            NpcThoughtOrdinal::Object { ordinal } | NpcThoughtOrdinal::Category { ordinal } => {
                let body = read.body(*ordinal)?;
                let observed = observed_body(&read.current.perception, body).ok_or_else(invalid)?;
                generated = match selected.source {
                    NpcThoughtOrdinal::Object { .. } => LiteralReference::Object {
                        object_id: body.source_id.clone(),
                    },
                    _ => LiteralReference::Category {
                        definition: observed_category(installed, observed)
                            .ok_or_else(invalid)?
                            .pin
                            .clone(),
                    },
                };
                (&generated, None)
            }
            NpcThoughtOrdinal::InspectedObject { .. }
            | NpcThoughtOrdinal::InspectedCategory { .. } => {
                let (header, facts) = source.ok_or_else(invalid)?;
                let (object_id, definition, _) =
                    inspection(facts.exposure.as_ref()).ok_or_else(invalid)?;
                if header.reference.kind != PersonalSourceKind::Awareness {
                    return Err(invalid());
                }
                generated = match selected.source {
                    NpcThoughtOrdinal::InspectedObject { .. } => LiteralReference::Object {
                        object_id: object_id.to_owned(),
                    },
                    _ => LiteralReference::Category {
                        definition: inspected_category(installed, definition)
                            .ok_or_else(invalid)?
                            .pin
                            .clone(),
                    },
                };
                (&generated, None)
            }
            NpcThoughtOrdinal::Place { .. } => {
                let (header, facts) = source.ok_or_else(invalid)?;
                let (place_id, _) = place(facts.exposure.as_ref()).ok_or_else(invalid)?;
                if header.reference.kind != PersonalSourceKind::Awareness {
                    return Err(invalid());
                }
                generated = LiteralReference::Place {
                    place_id: place_id.to_owned(),
                };
                (&generated, None)
            }
            NpcThoughtOrdinal::NextDay { .. } => {
                let at = if let Some((header, facts)) = source {
                    if header.reference.kind != PersonalSourceKind::Awareness
                        || !facts.speech.as_ref().is_some_and(|speech| {
                            speech
                                .segments
                                .iter()
                                .any(|segment| crate::speech::heard_segment(segment).is_some())
                        })
                    {
                        return Err(invalid());
                    }
                    header.at
                } else {
                    read.current.perception.at
                };
                let (from, through) = crate::time::local_clock::next_local_day(
                    at,
                    installed.status_policy.clock_offset_hours,
                )
                .ok_or_else(invalid)?;
                generated = LiteralReference::Time {
                    from,
                    through,
                    calendar: installed.calendar.clone(),
                };
                (&generated, None)
            }
            NpcThoughtOrdinal::Quotation { segment, .. } => {
                let (header, facts) = source.ok_or_else(invalid)?;
                if header.reference.kind != PersonalSourceKind::Awareness {
                    return Err(invalid());
                }
                let (range, passage) = facts
                    .speech
                    .as_ref()
                    .and_then(|speech| speech.quote(*segment))
                    .ok_or_else(invalid)?;
                generated = LiteralReference::Source {
                    source: header.reference.clone(),
                    quote: Some(range),
                };
                (&generated, Some(passage.borrowed()))
            }
            NpcThoughtOrdinal::Inherited { reference, .. } => {
                let (_, facts) = source.ok_or_else(invalid)?;
                let annotations = facts.literal_references.as_ref().ok_or_else(invalid)?;
                let inherited = annotations.references.get(*reference).ok_or_else(invalid)?;
                let passage =
                    if matches!(inherited, LiteralReference::Source { quote: Some(_), .. }) {
                        let literal = facts
                            .summary
                            .as_ref()
                            .or_else(|| match facts.text.as_ref()? {
                                NativeText::Literal(text) => Some(text),
                                _ => None,
                            })
                            .ok_or_else(invalid)?;
                        let range = annotations
                            .bindings
                            .iter()
                            .find(|binding| binding.reference == *reference)
                            .ok_or_else(invalid)?
                            .range;
                        Some(
                            literal
                                .borrowed()
                                .slice(range.start..range.end)
                                .ok_or_else(invalid)?,
                        )
                    } else {
                        None
                    };
                (inherited, passage)
            }
        };
        let bytes = selected
            .alias
            .len()
            .checked_add(reference.heap_bytes().ok_or(ExecutionError::Capacity)?)
            .and_then(|n| n.checked_add(passage.map_or(Some(0), |text| text.storage_bound())?))
            .ok_or(ExecutionError::Capacity)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let offer = ThoughtOffer {
            reference: reference.clone(),
            support: source.and_then(|(_, facts)| facts.support.clone()),
            passage: passage.map(|text| text.to_owned()),
        };
        if offers.insert(selected.alias.clone(), offer).is_some() {
            return Err(invalid());
        }
    }
    Ok(offers)
}
