//! A deliberate, bounded world inspection. The ordinary command owns sight,
//! reach, exact continuation, private acquisitions and the accepted page.
use super::inspect_item::{ItemEvidence, ItemPlace, prepare_item_evidence};
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::ground_items::inspection::{PAGE_DESCRIPTION_BYTES, PAGE_ITEMS, WorldStorage};
use crate::narration::{NameArticle, Narration, NarrationPart, PersonRole};
use crate::reception::{EncounterExposure, EventScalar, SightBatch};
use crate::state::InventoryInspection;
use crate::text::JsText;

pub(super) struct PreparedStorage {
    page: InventoryInspection,
    custody: ByteReservation,
    occurrences: std::vec::IntoIter<ItemEvidence>,
    summary: JsText,
}

impl CommandCursor {
    pub(super) fn start_storage_inspection(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::InspectInventory {
            world: Some(selected),
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if WorldStorage::selected(&core.state, actor, &selected.root).is_none() {
            self.refuse_inspection()?;
            return Ok(false);
        }
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                actor,
                &[&selected.root],
                self.binding,
                &self.budget,
            )
            .map_err(|_| ExecutionError::Invariant)?,
        );
        self.phase = Phase::StorageSight;
        Ok(true)
    }

    pub(super) fn storage_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let NativeCommand::InspectInventory {
            world: Some(selected),
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let ray = if sight.seen(&selected.root) == Some(true) {
            WorldStorage::selected(&core.state, actor, &selected.root)
                .map(|root| root.reach(&self.budget))
                .transpose()?
                .flatten()
        } else {
            None
        };
        if let Some(ray) = ray {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::StorageReach)?.sight.push(ray);
            return Ok(Progress::Geometry);
        }
        self.refuse_inspection()?;
        self.drive(core, None)
    }

    pub(super) fn storage_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let supplied = self.queries.take().ok_or(ExecutionError::Invariant)?;
        supplied
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        if answer.sight.as_slice() != [true] {
            self.refuse_inspection()?;
            return self.drive(core, None);
        }
        let NativeCommand::InspectInventory {
            world: Some(selected),
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let Some(root) = WorldStorage::selected(&core.state, actor, &selected.root) else {
            self.refuse_inspection()?;
            return self.drive(core, None);
        };
        if let Some(after) = selected.after.as_deref() {
            let previous = root.inspection(&self.budget)?;
            if !previous.is_some_and(|page| {
                page.more
                    && page.after == after
                    && Some(page.revision) == selected.expected_revision
                    && Some(&page.scope) == selected.expected_scope.as_ref()
            }) {
                self.refuse_inspection()?;
                return self.drive(core, None);
            }
        }
        let Some(items) = root.children_after(selected.after.as_deref()) else {
            self.refuse_inspection()?;
            return self.drive(core, None);
        };
        if self.options.preview || self.preparation_mode.is_some() {
            self.finish_inspection()?;
            return self.drive(core, None);
        }
        let prepared = prepare_storage(&core.state, actor, root, items, &self.budget)?;
        let Some(prepared) = prepared else {
            self.refuse_inspection()?;
            return self.drive(core, None);
        };
        self.storage_inspection = Some(prepared);
        self.phase = Phase::StoragePage;
        self.drive(core, None)
    }

    pub(super) fn storage_occurrence(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let pending = self
            .storage_inspection
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        if let Some(prepared) = pending.occurrences.next() {
            self._reservation.merge(prepared.custody)?;
            let event = core.stage_event(prepared.intent)?;
            self.reserve(event.id.len())?;
            self.storage_inspection
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .page
                .evidence_ids
                .push(event.id.clone());
            self.event = Some(event.id.clone());
            self.after_event = Phase::StoragePage;
            return Ok(Progress::Occurrence(event));
        }
        let PreparedStorage {
            mut page,
            custody,
            summary,
            ..
        } = self
            .storage_inspection
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let target = page
            .container_id
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        self.reserve(1024 + target.len() + actor.len() * 4)?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "inventory-inspected".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor.to_owned(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(" ".into()),
                    NarrationPart::Verb {
                        subject_id: actor.to_owned(),
                        verb: "inspect".into(),
                    },
                    NarrationPart::Literal(" the accessible contents of ".into()),
                    NarrationPart::Participant {
                        entity_id: target.to_owned(),
                        role: PersonRole::Object,
                        article: Some(NameArticle::Definite),
                    },
                    NarrationPart::Literal(summary),
                ],
            }),
            audience: AudienceSelection::Explicit(vec![actor.to_owned()]),
            source_id: Some(actor.to_owned()),
            target_id: None,
            data: Some(IndexMap::from([
                ("importance".into(), EventScalar::Number(6.0)),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
            ])),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        page.evidence_ids.push(event.id.clone());
        core.physical()
            .install_inventory_inspection(actor, page, custody)?;
        self.finish_inspection()?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        Ok(Progress::Occurrence(event))
    }
}

fn prepare_storage(
    state: &crate::simulation::SimulationState,
    actor: &str,
    root: WorldStorage<'_>,
    children: &[crate::state::EntityHandle],
    budget: &ByteBudget,
) -> Result<Option<PreparedStorage>, ExecutionError> {
    let names = crate::worlds::InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor,
    )
    .map_err(ExecutionError::Received)?;
    let name = names
        .capture_observer_name(&root.root.id, budget)
        .map_err(ExecutionError::Received)?;
    let (mut page, mut custody) = root.prepare(name.name(), budget)?;
    custody.resize(
        custody
            .bytes()
            .checked_add(PAGE_DESCRIPTION_BYTES * 4 + PAGE_ITEMS * size_of::<ItemEvidence>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut summary = JsText::from(":");
    let mut used = 0_usize;
    let mut occurrences = Vec::with_capacity(PAGE_ITEMS);
    for handle in children.iter().take(PAGE_ITEMS) {
        let body = state
            .physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::Invariant)?;
        let lot = crate::install::project_owned(
            &state.installed.retained,
            "",
            body,
            false,
            state.physical.holds.quantity(&body.id),
        )?;
        let Some(prepared) = prepare_item_evidence(
            state,
            actor,
            body,
            lot,
            ItemPlace::World {
                parent: root.root,
                label: &name.name().name,
            },
            budget,
        )?
        else {
            if occurrences.is_empty() {
                return Ok(None);
            }
            break;
        };
        if used + prepared.description_bytes > PAGE_DESCRIPTION_BYTES {
            break;
        }
        used += prepared.description_bytes;
        let Some(EncounterExposure::InventoryItem { description, .. }) =
            prepared.intent.exposure.as_ref()
        else {
            return Err(ExecutionError::Invariant);
        };
        custody.resize(
            custody
                .bytes()
                .checked_add(
                    body.id.len() * 2
                        + lot.named.heap_bytes().ok_or(ExecutionError::Capacity)?
                        + 64,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        page.after.clone_from(&body.id);
        page.item_ids.push(body.id.clone());
        page.item_names.push(lot.named.clone());
        summary.push_str(" ");
        summary.push_text(description);
        occurrences.push(prepared);
    }
    page.more = children.len() > occurrences.len();
    if page.more {
        summary.push_str(" More items remain; the next page can be inspected explicitly.");
    } else {
        summary.push_str(" This is the last page.");
    }
    Ok(Some(PreparedStorage {
        page,
        custody,
        occurrences: occurrences.into_iter(),
        summary,
    }))
}
