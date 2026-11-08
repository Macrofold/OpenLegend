//! Current receiving tracks retain only proof of an actually admitted frame.
//! Context is finalized by the owning phase, separately from sample recording.
use super::*;

impl CurrentJournal {
    pub(in super::super) fn note_frame_context(
        &mut self,
        observer: &str,
        changed: bool,
    ) -> Result<(), ReceivedError> {
        let (key, batch) = self.batches.get_key_value(observer).ok_or_else(invalid)?;
        let next = Some(batch.frame_changed.unwrap_or(false) || changed);
        if batch.frame_changed == next {
            return Ok(());
        }
        let key = key.clone();
        let before = batch.frame_changed;
        self.reserve_growth(0)?;
        self.undo.push(CurrentUndo::BatchFrameContext {
            observer: key,
            before,
        });
        self.batches
            .get_mut(observer)
            .ok_or_else(invalid)?
            .frame_changed = next;
        Ok(())
    }
    pub(crate) fn wants_capture_frame(&self, observer: &str) -> bool {
        self.batches
            .get(observer)
            .is_some_and(|batch| batch.frame_changed != Some(false))
    }
    pub(in super::super) fn recorded_frame(
        &self,
        observer: &str,
        track: &str,
    ) -> Option<&ObservationFrame> {
        self.batches.get(observer)?.recorded_frames.get(track)
    }
    /// A successful temporal admission supplies this proof. Changed input or
    /// a refused sample cannot suppress another track's contextual receipt.
    pub(crate) fn note_captured_frame(
        &mut self,
        observer: &str,
        track: &str,
        frame: &ObservationFrame,
    ) -> Result<(), ReceivedError> {
        let Some((key, batch)) = self.batches.get_key_value(observer) else {
            return Ok(());
        };
        if batch.frame_changed == Some(false) || batch.recorded_frames.get(track) == Some(frame) {
            return Ok(());
        }
        let key = key.clone();
        let before = batch.recorded_frames.get(track).cloned();
        let storage = if before.is_none()
            && batch.recorded_frames.len() == batch.recorded_frames.capacity()
        {
            map_storage::<Arc<str>, ObservationFrame>(
                batch
                    .recorded_frames
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(
            heap_sum([
                storage,
                track.len(),
                2 * size_of::<usize>(),
                2 * size_of::<ObservationFrame>(),
            ])
            .ok_or_else(capacity)?,
        )?;
        let batch = self.batches.get_mut(observer).ok_or_else(invalid)?;
        batch
            .recorded_frames
            .try_reserve(usize::from(before.is_none()))
            .map_err(|_| capacity())?;
        let track: Arc<str> = Arc::from(track);
        batch.recorded_frames.insert(track.clone(), frame.clone());
        self.undo.push(CurrentUndo::CapturedFrame {
            observer: key,
            track,
            before,
        });
        Ok(())
    }
}
