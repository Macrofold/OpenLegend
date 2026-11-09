//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(AttentionRetentionPolicy {
    maintenance_headroom,
    required_pressure_start,
    speech_maintenance_headroom,
    derived_low_water,
    recent,
    optional,
    required,
    speech,
    derived_max_bytes,
    impression,
    aftermath_seconds
});
heap_record!(AccountRetentionLimits {
    max_bytes,
    max_records
});
heap_record!(ImpressionRetentionLimits {
    max_bytes,
    max_claims,
    max_spans,
    weaken_after_seconds,
    expire_after_seconds,
    reinforce_interval_seconds
});
heap_record!(AttentionPolicy {
    geometry,
    semantic,
    scene,
    id,
    version,
    default_capacity,
    maximum_capacity,
    maximum_score,
    ongoing_share,
    stability_seconds,
    switch_margin,
    familiarity_bonus,
    displacement_metres_per_point,
    maximum_motion_cue,
    new_description_cue,
    urgent_cue,
    relation,
    retention
});
heap_record!(GeometryAttentionPolicy {
    interval_seconds,
    visits,
    extent_metres,
    error_metres,
    max_views,
    max_bytes,
    feature_priority
});
heap_record!(FeaturePriority {
    support,
    solid_face
});
heap_record!(SemanticAttentionPolicy { discovery });
heap_record!(SceneAttentionPolicy {
    max_bytes,
    max_rows,
    node_visits,
    static_bytes,
    static_rows,
    discovery_bytes,
    discovery_rows,
    history_bytes,
    history_receipts,
    candidate_visits,
    initial_visits,
    query_visits,
    per_anchor_visits,
    maximum_queries,
    expansion_bytes,
    expansion_receipts
});
heap_record!(RelationAttentionPolicy {
    interval_seconds,
    candidates,
    clear_seconds,
    minimum_decrease,
    body,
    drop
});
heap_record!(BodyRelationDistances { enter, clear });
heap_record!(DropRelationDistances {
    enter,
    clear,
    minimum_drop
});

crate::install::definition_layout!(AttentionPolicy; arrays []; maps []);
