//! Allocation bounds for one changed action record. History collections are
//! never cloned: the journal retains only a changed record's mutable subtrees.

use super::*;
use crate::commands::{ActivityOutput, CooperationBinding, NativeCommand, Outcome, PurposeBinding};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};

impl HeapBytes for ActivityScalar {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::String(v) => v.heap_bytes(),
            _ => Some(0),
        }
    }
}
impl HeapBytes for ActivityDetail {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Scalar(v) => v.heap_bytes(),
            Self::List(v) => v.heap_bytes(),
            Self::Fields(v) => v.heap_bytes(),
        }
    }
}
heap_record!(ActivityFact {
    name,
    value,
    critical,
    sentence
});
heap_record!(ActivityView {
    name,
    actor,
    target,
    tool,
    facts,
    children,
    result
});
heap_record!(ActivityOutput {
    port,
    item_id,
    definition_id,
    quantity
});
heap_record!(Outcome {
    spent,
    outputs,
    ok,
    code,
    message,
    recipe_id,
    item_id,
    entity_id,
    goal_id,
    plan_id,
    action_id
});
heap_record!(ActivityEffect {
    id,
    subject_id,
    label,
    property,
    unit,
    before,
    after
});
impl HeapBytes for ActivityConnection {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.from.heap_bytes()?, self.port.heap_bytes()?])
    }
}
impl HeapBytes for ResultEvidence {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Account { id, .. } => id.heap_bytes(),
            Self::Recent { subject, receipt } => heap_sum([
                subject.heap_bytes()?,
                receipt.actor_id.heap_bytes()?,
                receipt.epoch.heap_bytes()?,
            ]),
        }
    }
}
heap_record!(LearningInspection {
    event_id,
    after,
    method_after
});
heap_record!(LearningCursor {
    inspection,
    after,
    position,
    examined,
    pending,
    assessed
});
heap_record!(ActivityReference {
    actor_id,
    occurrence_id
});
heap_record!(ActivityObject {
    kind,
    definition_id,
    definition_version,
    definition_digest
});
heap_record!(CooperationBinding { id, revision });
heap_record!(PurposeBinding {
    definition,
    id,
    description,
    roles,
    source_ids
});

impl HeapBytes for NativeCommand {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Move {
                envelope,
                destination,
            } => heap_sum([envelope.heap_bytes()?, destination.heap_bytes()?]),
            Self::Say {
                envelope,
                text,
                target_id,
                self_introduction,
                volume,
                ..
            } => heap_sum([
                envelope.heap_bytes()?,
                text.heap_bytes()?,
                target_id.heap_bytes()?,
                self_introduction.heap_bytes()?,
                volume.heap_bytes()?,
            ]),
            Self::StatusEffect {
                envelope,
                target_id,
                definition_id,
                resting_place_id,
                ..
            } => heap_sum([
                envelope.heap_bytes()?,
                target_id.heap_bytes()?,
                definition_id.heap_bytes()?,
                resting_place_id.heap_bytes()?,
            ]),
            Self::Cancel {
                envelope,
                expected_action_id,
            } => heap_sum([envelope.heap_bytes()?, expected_action_id.heap_bytes()?]),
        }
    }
}
impl ActivityOccurrence {
    pub(super) fn live_heap_bytes(&self) -> Option<usize> {
        if self.attack_execution.is_some()
            || self.release.is_some()
            || self.stock_resolution.is_some()
        {
            return None;
        }
        heap_sum([
            self.cooperation.heap_bytes()?,
            self.id.heap_bytes()?,
            self.actor_id.heap_bytes()?,
            self.command_id.heap_bytes()?,
            self.action_id.heap_bytes()?,
            self.parent_id.heap_bytes()?,
            self.parent_name.heap_bytes()?,
            self.method_id.heap_bytes()?,
            self.command.heap_bytes()?,
            self.objects.heap_bytes()?,
            self.view.heap_bytes()?,
            self.outputs.heap_bytes()?,
            self.connections.heap_bytes()?,
            self.outcome.heap_bytes()?,
            self.evidence_ids.heap_bytes()?,
            self.result_evidence.heap_bytes()?,
            self.effects.heap_bytes()?,
        ])
    }
}
