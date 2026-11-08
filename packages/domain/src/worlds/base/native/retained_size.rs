//! Allocation capacities retained by immutable wilderness outward facts. This
//! accounting stays beside their world-owned fields rather than teaching the
//! engine a world's assembly roles, voice dimensions or claim vocabulary.
use super::base_knowledge::ObserverIdentity;
use super::base_observed::*;
use super::base_recognition::{
    AuthoredExemplar, AuthoredFamiliarity, AuthoredRecognition, FamiliarityRoot, FamiliarityState,
    IndividualRecognition, RecognitionBaseline, RecognitionCandidate, RecognitionInterval,
    RecognitionKnowledge, RecognitionSample, SeedCorrelation, VoiceFeatures,
};
use crate::reception::retained_size::{HeapBytes, heap_record, heap_sum};

impl HeapBytes for VoiceFeatures {
    fn heap_bytes(&self) -> Option<usize> {
        // This family's four bounded integer fields are inline, with no heap
        // allocation. Their meaning remains with the recognition owner.
        Some(0)
    }
}
heap_record!(RecognitionCandidate {
    individual_id,
    distance
});
heap_record!(SeedCorrelation {
    sample_key,
    individual_id
});
heap_record!(IndividualRecognition {
    recognized,
    subject,
    learned_subject,
    candidates,
    more_candidates,
    quality,
    perception,
    policy,
    prior_exemplar_key,
    learning_support,
    seed_correlation,
    familiarity
});
heap_record!(RecognitionInterval { min, max });
heap_record!(RecognitionSample {
    key,
    source_key,
    at,
    order,
    encounter,
    features,
    quality,
    perception,
    policy,
    support,
    contact_eligible
});
heap_record!(RecognitionKnowledge {
    samples,
    authored,
    last_credit_at,
    next_credit_at
});
heap_record!(AuthoredExemplar {
    features,
    quality,
    ordinal
});
heap_record!(AuthoredRecognition {
    source,
    installed_at,
    perception,
    order,
    baseline,
    exemplars
});
impl HeapBytes for RecognitionBaseline {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
heap_record!(FamiliarityRoot {
    key,
    source_key,
    at,
    order,
    support,
    required,
    credited
});
heap_record!(AuthoredFamiliarity { source, value });
heap_record!(FamiliarityState {
    roots,
    authored,
    last_credit_at,
    next_credit_at,
    fast_credits
});
heap_record!(ObserverIdentity {
    retained,
    familiarity,
    individual_id,
    canonical_id,
    seed_only,
    voice,
    sight,
    name_evidence_ids,
    given_name,
    nickname,
    revision,
    encounter_id,
    authored
});
heap_record!(FinitePanel { corners, thickness });
impl HeapBytes for AssemblyRole {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Post => Some(0),
            Self::GatePost => Some(0),
            Self::Cover => Some(0),
            Self::Binding => Some(0),
            Self::Hearth => Some(0),
            Self::Panel => Some(0),
            Self::AccessPanel => Some(0),
            Self::Gate => Some(0),
            Self::FirstRail => Some(0),
            Self::SecondRail => Some(0),
        }
    }
}
impl HeapBytes for ShapeGeometry {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Cylinder => Some(0),
        }
    }
}
heap_record!(ObservedAssemblyShape {
    min,
    max,
    id,
    role,
    geometry,
    panel
});
heap_record!(AssemblyPresentation {
    post_color,
    cover_color,
    cover_opacity
});
heap_record!(FlexiblePart {
    id,
    name,
    slot,
    condition,
    role,
    bay
});
impl HeapBytes for FlexibleRole {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Post => Some(0),
            Self::Cover => Some(0),
            Self::Binding => Some(0),
        }
    }
}
heap_record!(BoundaryPart {
    id,
    name,
    slot,
    condition,
    role
});
impl HeapBytes for BoundaryRole {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Post => Some(0),
            Self::GatePost => Some(0),
            Self::Panel => Some(0),
            Self::AccessPanel => Some(0),
            Self::Gate => Some(0),
            Self::FirstRail => Some(0),
            Self::SecondRail => Some(0),
            Self::Binding => Some(0),
        }
    }
}
impl HeapBytes for ObservedAssembly {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::FlexibleBays {
                presentation,
                family_id,
                revision,
                heading,
                site,
                shapes,
                arrangement_id,
                parts,
            } => heap_sum([
                presentation.heap_bytes()?,
                family_id.heap_bytes()?,
                revision.heap_bytes()?,
                heading.heap_bytes()?,
                site.heap_bytes()?,
                shapes.heap_bytes()?,
                arrangement_id.heap_bytes()?,
                parts.heap_bytes()?,
            ]),
            Self::GroundedBoundary {
                presentation,
                family_id,
                revision,
                heading,
                site,
                shapes,
                material_revision,
                parts,
            } => heap_sum([
                presentation.heap_bytes()?,
                family_id.heap_bytes()?,
                revision.heap_bytes()?,
                heading.heap_bytes()?,
                site.heap_bytes()?,
                shapes.heap_bytes()?,
                material_revision.heap_bytes()?,
                parts.heap_bytes()?,
            ]),
        }
    }
}
impl HeapBytes for AnimationKind {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Punch => Some(0),
            Self::Melee => Some(0),
        }
    }
}
impl HeapBytes for AnimationPhase {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Windup => Some(0),
            Self::Recovery => Some(0),
        }
    }
}
heap_record!(HorizontalDirection { x, z });
heap_record!(ObservedActionAnimation {
    id,
    kind,
    phase,
    tool,
    progress,
    direction
});
impl HeapBytes for RemainsPhase {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Fresh => Some(0),
            Self::Rotting => Some(0),
            Self::Removed => Some(0),
        }
    }
}
impl HeapBytes for BodyPlan {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Biped => Some(0),
            Self::Quadruped => Some(0),
            Self::Avian => Some(0),
        }
    }
}
impl HeapBytes for ProjectedPose {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Horizontal => Some(0),
        }
    }
}
impl HeapBytes for ParticleAnchor {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Head => Some(0),
        }
    }
}
impl HeapBytes for ParticleMotion {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::FloatAway => Some(0),
        }
    }
}
heap_record!(Particle {
    text,
    anchor,
    motion
});
impl HeapBytes for TimingClock {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::SimulationSeconds => Some(0),
        }
    }
}
heap_record!(EffectTiming {
    expires_at,
    duration_seconds,
    clock
});
heap_record!(StatusEffectProjection {
    id,
    label,
    explanation,
    icon,
    timing,
    pose,
    particle
});
impl HeapBytes for SpeechVolume {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Whisper => Some(0),
            Self::Normal => Some(0),
            Self::Shout => Some(0),
        }
    }
}
impl HeapBytes for ClaimPresence {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Possible => Some(0),
        }
    }
}
impl HeapBytes for IntervalKind {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::StatedInterval => Some(0),
        }
    }
}
impl HeapBytes for IntervalPrecision {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Approximate => Some(0),
        }
    }
}
heap_record!(ClaimedInterval {
    kind,
    from,
    through,
    precision
});
impl HeapBytes for ObservationClaim {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Danger {
                location,
                when,
                presence,
            } => heap_sum([
                location.heap_bytes()?,
                when.heap_bytes()?,
                presence.heap_bytes()?,
            ]),
        }
    }
}
