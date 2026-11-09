//! Explicit detail checks supplement the completed broad certificate. They
//! renew only the actual checked body exposure and preserve onset pose clocks.
use super::*;
impl VisualReception {
    pub(super) fn finish_checks(
        &mut self,
        core: &mut CoreMutation<'_>,
        full: bool,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.publish_confirmation(core, full)?;
        self.current
            .note_frame_checked(self.checked.iter().map(String::as_str), self.frame_changed)?;
        let now = core.state.physical.header.sim_time;
        for source in &self.checked {
            let detailed = self.detailed.contains(source);
            if !detailed && full {
                continue;
            }
            let Some(body) = current_native_facet_at(
                Some(owner(core, &self.observer.actor_id)?),
                source,
                "body",
                CurrentFacetSelector {
                    modality: Some(Modality::Sight),
                    ..Default::default()
                },
            )?
            else {
                continue;
            };
            let exposure = body.grant.exposure.clone();
            let token = match self.sample_tokens.get(source) {
                Some(token) => *token,
                None => {
                    core.state
                        .physical
                        .identity
                        .allocate("received-sample")?
                        .sequence
                }
            };
            let transition = core.journal.acquisitions.begin_received(
                &self.observer.actor_id,
                self.observer.physical_life,
                Some(token),
            )?;
            let mut exposures = IndexSet::new();
            exposures.insert(exposure);
            let scopes = if detailed {
                &[CurrentCheck::Broad, CurrentCheck::Detail][..]
            } else {
                &[CurrentCheck::Broad][..]
            };
            let confirmed = current_confirm_groups(
                &mut core.journal.current,
                &mut core.state.reception,
                &self.observer.actor_id,
                source,
                &self.channel,
                now,
                &CurrentReceptionStamp {
                    received_at: now,
                    received_order: token,
                    confirmed_revision: self.revision,
                    frame_ref: Some(self.frame_ref.clone()),
                },
                Some(scopes),
                Some(&exposures),
                None,
            )?;
            if !confirmed.is_empty() {
                self.current.note(source, false)?;
                if confirmed.iter().any(|s| {
                    s.partition
                        .members
                        .iter()
                        .any(|(kind, part)| kind == "body" && *part == CurrentReceivedPart::Detail)
                }) {
                    let stamp = CurrentSightStamp {
                        through: now,
                        revision: self.revision,
                        input_revision: self.input_revision,
                        received_order: token,
                        frame_ref: self.frame_ref.clone(),
                    };
                    let contact = core
                        .journal
                        .current
                        .contact_mut(&mut core.state.reception, &self.observer.actor_id, source)?
                        .ok_or_else(invalid)?;
                    if contact.sight.as_ref().is_none_or(|old| now >= old.through) {
                        let detail = if detailed {
                            Some(stamp.clone())
                        } else {
                            contact.sight.as_ref().and_then(|s| s.detail.clone())
                        };
                        contact.sight = Some(CurrentSightCheck {
                            through: stamp.through,
                            revision: stamp.revision,
                            input_revision: stamp.input_revision,
                            received_order: stamp.received_order,
                            frame_ref: stamp.frame_ref,
                            detail,
                        });
                    }
                    core.journal.current.settle_contact(
                        &mut core.state.reception,
                        &self.observer.actor_id,
                        source,
                    )?;
                }
            }
            // Source's explicit confirmation repairs its checked current groups
            // inside this same sample transition. Deferring them until the phase
            // loop ends would allocate unrelated received-order IDs.
            if let Some(before) = self.current.before.as_ref() {
                let tracks =
                    before.active_tracks(&core.state.reception, &core.state.experience, source)?;
                repair_current_recordings(
                    core,
                    &self.observer.actor_id,
                    source,
                    &tracks,
                    Some(&confirmed),
                    budget,
                )?;
            }
            super::super::retirement::finish_received(core, transition)?;
        }
        // Fresh source/group correspondence can need a baseline even when the
        // physical source preparation was unchanged. The recording owner alone
        // decides complete marks and actual quota admission.
        if let Some(before) = self.current.before.as_ref().map(Arc::clone) {
            for source in &self.checked {
                let tracks =
                    before.active_tracks(&core.state.reception, &core.state.experience, source)?;
                repair_current_recordings(
                    core,
                    &self.observer.actor_id,
                    source,
                    &tracks,
                    None,
                    budget,
                )?;
            }
        }
        Ok(())
    }
}
