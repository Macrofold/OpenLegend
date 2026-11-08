//! Lasting support borrows a currently owned field and copies its received
//! clocks/provenance. It creates no sensory acquisition or recent-history page.

use super::*;
use crate::attention::{AccountRetentionLimits, AttentionRetentionPolicy};
use crate::received::state::SupportEncoding;
use crate::reception::{CurrentFacetSelector, CurrentNativeFacet, current_native_facet_at};
use std::sync::Arc;

impl TemporalState {
    pub(crate) fn retain_current_support(
        &mut self,
        context: &mut CurrentRecordingContext<'_>,
        native: CurrentNativeFacet<'_>,
        required: bool,
        limits: &AccountRetentionLimits,
        policy: &AttentionRetentionPolicy,
    ) -> Result<Option<Arc<TemporalSupportRecord>>, ExecutionError> {
        let Some(owned) = current_native_facet_at(
            Some(context.owner),
            &native.grant.subject_id,
            &native.field.value.kind,
            CurrentFacetSelector {
                exposure: Some(&native.grant.exposure),
                channel: Some(&native.grant.channel),
                modality: None,
            },
        )?
        else {
            return Ok(None);
        };
        // This API accepts an actual canonical borrow, rather than a copied
        // current record whose rich content would need comparing again.
        if !std::ptr::eq(owned.field, native.field)
            || !std::ptr::eq(owned.metadata, native.metadata)
            || !std::ptr::eq(owned.original_source, native.original_source)
            || !std::ptr::eq(owned.grant, native.grant)
        {
            return Ok(None);
        }
        let observer = context.owner.observer.as_ref().ok_or_else(error)?;
        let Some(actor) = self.actor(context.actor_id) else {
            return Ok(None);
        };
        if observer.actor_id != context.actor_id
            || observer.physical_life != actor.header().physical_life
        {
            return Err(error().into());
        }
        if actor.header().accounts.is_none() {
            return Err(ReceivedError(
                "Current support requires complete personal account ownership.",
            )
            .into());
        }
        let primary = context
            .values
            .value_at(&native.field.value.reference)
            .ok_or_else(error)?;
        let pose_bytes = match &native.field.value.reception {
            Some(crate::reception::FacetReception::Body { pose_ref }) => context
                .values
                .value_at(pose_ref)
                .ok_or_else(error)?
                .heap_bytes()
                .ok_or_else(capacity)?,
            _ => 0,
        };
        let heap = heap_sum([
            native.field.heap_bytes().ok_or_else(capacity)?,
            native.grant.heap_bytes().ok_or_else(capacity)?,
            native.metadata.heap_bytes().ok_or_else(capacity)?,
            primary.heap_bytes().ok_or_else(capacity)?,
            pose_bytes,
            actor.header().epoch.len(),
            context.actor_id.len(),
            actor.payload().len(),
        ])
        .ok_or_else(capacity)?;
        let reservation = context.budget.reserve(
            heap.checked_mul(8)
                .and_then(|n| n.checked_add(4096))
                .ok_or_else(capacity)?,
        )?;
        let epoch = actor.header().epoch.clone();
        let mut field = projection::native_facet_input(context.owner, context.values, native)?;
        let subject = received_track_key(&native.grant.exposure, &native.grant.channel)?;
        let availability = native.metadata.availability.as_ref().map(|availability| {
            vec![TemporalAvailability {
                reason: AvailabilityReason::Unchecked,
                at: availability.at,
                fields: vec![0],
            }]
        });
        self.retain_reservation(reservation)?;
        // Source allocates retained-support before value retention and the
        // independent/reused received order. No received lease is opened here.
        let batch_order = context
            .identity
            .allocate("retained-support")
            .map_err(|_| error())?
            .sequence;
        let retained = context.values.retain(
            field.value.clone(),
            field.preferred.as_ref(),
            context.now,
            context.sequence,
            context.identity,
        )?;
        if let Some(TemporalReception::Body {
            pose: BodyReception::Reference { pose_ref },
        }) = field.reception.as_ref()
        {
            let ReceivedValueFragment::BodyPose(pose) =
                context.values.value_at(pose_ref).ok_or_else(error)?
            else {
                return Err(ReceivedError("Retained support has no received pose.").into());
            };
            field.reception = Some(TemporalReception::Body {
                pose: BodyReception::Pose {
                    pose: pose.pose.clone(),
                },
            });
        }
        let locator = TemporalReceiptLocator {
            actor_id: context.actor_id.to_owned(),
            physical_life: observer.physical_life,
            epoch,
            batch_order,
            entry_index: 0,
        };
        let receipt = TemporalReceipt {
            header: ReceivedReceiptHeader {
                subject,
                change: TemporalChange::RetainedState,
                acquisition: batch_order,
                source_ids: Vec::new(),
                spatial_context: None,
                subject_identity: native.field.local_subject.clone(),
                context_subjects: None,
                availability,
                availability_at: None,
                coverage_gap: None,
                ended_fields: None,
            },
            id: locator.id(),
            locator,
            at: context.now,
            order: context
                .scopes
                .received_order(context.actor_id, context.identity)?,
            required,
            receiver_frame: None,
            origin: None,
            facets: vec![TemporalFacetReference {
                clock: field.clock,
                member_index: field.member_index.unwrap_or(0),
                value_ref: retained.reference,
                track: field.track,
                original: field.original,
                received_from: field.received_from,
                support: field.support,
                detail_support: field.detail_support,
                pose_frame: field.pose_frame,
                reception: field.reception,
            }],
        };
        self.admit_support(
            context.actor_id,
            TemporalSupportCapsule {
                receipt: Arc::new(receipt),
                values: Arc::from([field.value]),
                bytes: 0,
                required,
            },
            limits,
            context.values,
            context.now,
            policy,
            context.meters,
            None,
            SupportEncoding::Current,
        )
        .map_err(|error| match error {
            TemporalAppendError::Received(error) => ExecutionError::Received(error),
            TemporalAppendError::Work(error) => ExecutionError::Work(error),
        })
    }

    /// The receiving owner has already selected the checked, attended tracks.
    /// Observer motion is one contextual frame, never movement of each subject.
    pub(crate) fn append_receiver_frame(
        &mut self,
        context: &mut CurrentRecordingContext<'_>,
        tracks: &[&str],
        frame: &crate::reception::ObservationFrame,
    ) -> Result<Option<TemporalReceiptLocator>, ExecutionError> {
        let Some(first) = tracks.first() else {
            return Ok(None);
        };
        let bytes = tracks
            .iter()
            .try_fold(size_of::<TemporalCaptureInput>(), |sum, track| {
                sum.checked_add(track.len())?
                    .checked_add(size_of::<String>())
            })
            .and_then(|sum| sum.checked_add(frame.heap_bytes()?))
            .ok_or_else(capacity)?;
        let _reservation = context.budget.reserve(bytes)?;
        context.scopes.append_receipt(
            self,
            context.values,
            context.identity,
            context.meaning,
            context.meters,
            context.actor_id,
            context
                .owner
                .observer
                .as_ref()
                .ok_or_else(error)?
                .physical_life,
            context.now,
            context.sequence,
            TemporalCaptureInput {
                spatial_context: true,
                availability_at: None,
                coverage_gap: None,
                ended_fields: None,
                terminal_reservation_bytes: None,
                terminal_reservation_delta: None,
                received_at: None,
                received_order: None,
                availability: None,
                receiver_frame: Some(frame.clone()),
                subject: (*first).to_owned(),
                context_subjects: (tracks.len() > 1).then(|| {
                    tracks[1..]
                        .iter()
                        .map(|track| (*track).to_owned())
                        .collect()
                }),
                subject_identity: None,
                change: TemporalChange::ReceiverFrame,
                required: false,
                source_ids: Vec::new(),
                origin: None,
                facets: Vec::new(),
            },
            context.recent_policy,
            context.maintenance_headroom,
        )
    }
}
