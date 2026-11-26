//! Base outing record grammar, matching outings.ts/cooperation.ts. These
//! checks describe saved terms, not participant eligibility or executable work.
//! Current policy pins, life/placement/work and all physical consumers must be
//! joined before the generic owner opens positive installation or commands.
use crate::host::retained_size::{HeapBytes, heap_sum};

use crate::records::SqlCell;
use crate::values::{is_safe_record_id, is_safe_record_text};
use indexmap::IndexMap;

#[path = "outings/travel.rs"]
mod travel;
#[path = "outings/cooperation.rs"]
mod cooperation;
pub(crate) use cooperation::{CooperationPolicy,visit_agreements};
#[path = "outings/personal_terms.rs"]
mod personal_terms;
pub(crate) use personal_terms::{MovementTerms, MovementTermsKind, MovementTermsStatus};
#[path = "outings/travel_notice.rs"]
mod travel_notice;
pub(crate) use travel_notice::{TravelNoticeCause, TravelNoticeEnding, TravelNoticePreparation};
#[path = "outings/travel_accept.rs"]
mod travel_accept;
#[path = "outings/travel_work.rs"]
mod travel_work;
pub use travel::TravelOperation;
pub(crate) use travel::{
    TravelActivityRules, TravelCompanyLabels, TravelDestination, TravelInput, TravelInputError,
    TravelMessages, TravelParticipantCapability, TravelRules, TravelTemplates,
    travel_command_type,
};
pub(crate) use travel_accept::{
    TravelAcceptAnswer, TravelAcceptCursor, TravelAcceptStep, TravelAcceptance,
};
pub(crate) use travel_work::{
    TravelWorkRefusal, travel_able, travel_requested_input, travel_work_preview,
    travel_work_problem,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OutingKind {
    Travel,
    CombatHelp,
    Cooperate,
}
impl OutingKind {
    pub(crate) fn name(self) -> &'static str {
        match self {
            Self::Travel => "travel",
            Self::CombatHelp => "combat-help",
            Self::Cooperate => "cooperate",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OutingStatus {
    Pending,
    Traveling,
    Helping,
    Accepted,
}

pub(crate) struct OutingFacts {
    pub id: String,
    pub proposer: String,
    pub recipient: String,
    pub kind: OutingKind,
    pub status: OutingStatus,
    pub destinations: Vec<String>,
    pub deadline: Option<f64>,
}
impl HeapBytes for OutingFacts {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.capacity(),
            self.proposer.capacity(),
            self.recipient.capacity(),
            self.destinations.heap_bytes()?,
        ])
    }
}
type Check<T = ()> = Result<T, ()>;
fn object(value: &SqlCell) -> Check<&IndexMap<String, SqlCell>> {
    value.as_object().ok_or(())
}
fn get<'a>(v: &'a SqlCell, k: &str) -> Check<&'a SqlCell> {
    v.get(k).ok_or(())
}
fn text<'a>(v: &'a SqlCell, k: &str) -> Check<&'a str> {
    get(v, k)?.as_str().ok_or(())
}
fn array<'a>(v: &'a SqlCell, k: &str) -> Check<&'a [SqlCell]> {
    get(v, k)?.as_array().ok_or(())
}
fn fields(v: &SqlCell, required: &[&str], optional: &[&str]) -> Check {
    let map = object(v)?;
    if required.iter().any(|k| !map.contains_key(*k))
        || map
            .keys()
            .any(|k| !required.contains(&k.as_str()) && !optional.contains(&k.as_str()))
    {
        return Err(());
    }
    Ok(())
}
fn id(v: &SqlCell, k: &str) -> Check {
    if is_safe_record_id(text(v, k)?) {
        Ok(())
    } else {
        Err(())
    }
}
fn optional_id(v: &SqlCell, k: &str) -> Check {
    if v.get(k).is_some() {
        id(v, k)?;
    }
    Ok(())
}
fn number(v: &SqlCell, k: &str) -> Check<f64> {
    get(v, k)?.as_f64().filter(|n| n.is_finite()).ok_or(())
}
fn count(v: &SqlCell, k: &str, minimum: u64) -> Check<u64> {
    get(v, k)?
        .as_u64()
        .filter(|n| *n >= minimum && *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(())
}
fn signed_count(v: &SqlCell) -> Check {
    if v.as_f64().is_some_and(|n| {
        n.is_finite() && n.fract() == 0. && n.abs() <= crate::identity::MAX_SAFE_INTEGER as f64
    }) {
        Ok(())
    } else {
        Err(())
    }
}
fn words(v: &SqlCell, k: &str, max: usize) -> Check {
    if get(v, k)?
        .as_text()
        .is_some_and(|s| !s.trim_is_empty() && s.units_len() <= max)
    {
        Ok(())
    } else {
        Err(())
    }
}
fn pin(v: &SqlCell, digest: bool) -> Check {
    fields(
        v,
        if digest {
            &["id", "version", "digest"]
        } else {
            &["id", "version"]
        },
        &[],
    )?;
    id(v, "id")?;
    count(v, "version", 1)?;
    if digest && text(v, "digest")?.is_empty() {
        return Err(());
    }
    Ok(())
}
fn point(v: &SqlCell, surface: bool) -> Check {
    for k in ["x", "y", "z"] {
        number(v, k)?;
    }
    if surface {
        id(v, "surfaceId")?;
    }
    Ok(())
}
fn participants<'a>(v: &'a SqlCell) -> Check<[&'a str; 2]> {
    id(v, "proposerId")?;
    id(v, "recipientId")?;
    let a = text(v, "proposerId")?;
    let b = text(v, "recipientId")?;
    if a == b {
        return Err(());
    }
    Ok([a, b])
}
fn actor_map<'a>(v: &'a SqlCell, actors: [&str; 2], exact: bool) -> Check<&'a SqlCell> {
    let len = v.object_len().ok_or(())?;
    let selected = actors.iter().filter(|id| v.get(id).is_some()).count();
    if len != selected || (exact && len != 2) {
        return Err(());
    }
    Ok(v)
}
fn keys_in(source: &SqlCell, target: &SqlCell) -> Check {
    match source {
        SqlCell::Object(map) => {
            if map.keys().any(|key| target.get(key).is_none()) {
                return Err(());
            }
        }
        SqlCell::ExactObject(map) => {
            if map
                .members()
                .iter()
                .any(|(key, _)| target.get_text(key).is_none())
            {
                return Err(());
            }
        }
        _ => return Err(()),
    }
    Ok(())
}
fn arrived(v: &SqlCell, actors: [&str; 2]) -> Check {
    let a = array(v, "arrived")?;
    if a.len() > 2
        || a.iter()
            .any(|id| id.as_str().is_none_or(|id| !actors.contains(&id)))
        || a.len() == 2 && a[0] == a[1]
    {
        return Err(());
    }
    Ok(())
}
fn destination(v: &SqlCell, personal: bool, targets: &mut Vec<String>) -> Check {
    if personal {
        fields(
            v,
            &["point", "label", "source"],
            &["entityId", "placement", "anchor"],
        )?;
    } else if !v.is_object() {
        return Err(());
    }
    point(get(v, "point")?, true)?;
    if personal {
        fields(get(v, "point")?, &["x", "y", "z", "surfaceId"], &[])?;
    }
    words(v, "label", if personal { 500 } else { usize::MAX })?;
    optional_id(v, "entityId")?;
    if (personal && v.get("entityId").is_some() != v.get("placement").is_some())
        || v.get("entityId").is_some() && v.get("placement").is_none()
    {
        return Err(());
    }
    if v.get("placement").is_some() {
        text(v, "placement")?;
    }
    if let Some(id) = v.get("entityId").and_then(SqlCell::as_str) {
        targets.push(id.into());
    }
    if personal {
        let source = get(v, "source")?;
        fields(
            source,
            &["subjectId", "observedAt", "episode"],
            &["evidenceId", "placeRevision"],
        )?;
        id(source, "subjectId")?;
        if number(source, "observedAt")? < 0. {
            return Err(());
        }
        if !matches!(get(source, "episode")?, SqlCell::Null) {
            id(source, "episode")?;
        }
        if source.get("evidenceId").is_some() != source.get("placeRevision").is_some() {
            return Err(());
        }
        optional_id(source, "evidenceId")?;
        if source.get("placeRevision").is_some() {
            count(source, "placeRevision", 1)?;
        }
        if let Some(anchor) = v.get("anchor") {
            fields(anchor, &["entityId", "placement"], &[])?;
            id(anchor, "entityId")?;
            text(anchor, "placement")?;
            if v.get("entityId").is_none() {
                return Err(());
            }
            targets.push(text(anchor, "entityId")?.into());
        }
    }
    Ok(())
}
fn phase(v: &SqlCell) -> Check {
    point(get(v, "destination")?, true)?;
    count(v, "expectedRevision", 0)?;
    let heading = number(v, "heading")?;
    if ![
        0.,
        std::f64::consts::FRAC_PI_2,
        std::f64::consts::PI,
        3. * std::f64::consts::FRAC_PI_2,
    ]
    .contains(&heading)
    {
        return Err(());
    }
    for key in ["familyId", "requestId", "editId", "slot", "itemId"] {
        id(v, key)?;
    }
    if v.get("implementation").is_none() {
        // validAssemblyPhase intentionally permits unrelated retained fields
        // for this current flexible phase. Do not tighten its saved grammar.
        id(v, "arrangementId")?;
        count(v, "bay", 0)?;
        if !["post", "cover", "lower", "reclaim-post", "reclaim-lowered"]
            .contains(&text(v, "operation")?)
        {
            return Err(());
        }
        for k in [
            "rootId",
            "binding1",
            "binding2",
            "binding3",
            "binding4",
            "destinationId",
        ] {
            optional_id(v, k)?;
        }
        return Ok(());
    }
    if text(v, "implementation")? != "grounded-panel-boundary" {
        return Err(());
    }
    count(v, "familyVersion", 1)?;
    id(v, "familyDigest")?;
    let common = [
        "implementation",
        "operation",
        "familyId",
        "familyVersion",
        "familyDigest",
        "requestId",
        "editId",
        "expectedRevision",
        "destination",
        "heading",
        "slot",
        "itemId",
    ];
    let optional = [
        "rootId",
        "permissionId",
        "toolId",
        "fromSlot",
        "toSlot",
        "thirdSlot",
        "sectionId",
        "parkingSectionId",
        "rail1Id",
        "rail2Id",
        "binding1",
        "binding2",
        "binding3",
        "binding4",
        "binding5",
        "binding6",
        "destinationId",
    ];
    let map = object(v)?;
    let repair_index = |k: &str| {
        k.strip_prefix("input:repair_")
            .and_then(|n| n.parse::<usize>().ok().filter(|i| i.to_string() == n))
    };
    if common.iter().any(|k| !map.contains_key(*k))
        || map.keys().any(|k| {
            !common.contains(&k.as_str())
                && !optional.contains(&k.as_str())
                && repair_index(k).is_none()
        })
    {
        return Err(());
    }
    for k in optional {
        if !["fromSlot", "toSlot", "thirdSlot"].contains(&k) {
            optional_id(v, k)?;
        }
    }
    let grid = |k: &str| -> Check {
        let raw = text(v, k)?;
        let nums: Vec<f64> = serde_json::from_str(raw).map_err(|_| ())?;
        if nums.len() != 2
            || nums.iter().any(|n| {
                !n.is_finite()
                    || n.fract() != 0.
                    || n.abs() > crate::identity::MAX_SAFE_INTEGER as f64
            })
            || crate::encoding::json_record(&nums).map_err(|_| ())? != raw
        {
            return Err(());
        }
        Ok(())
    };
    for k in ["fromSlot", "toSlot", "thirdSlot"] {
        if v.get(k).is_some() {
            grid(k)?;
        }
    }
    let (required, permitted): (&[&str], &[&str]) = match text(v, "operation")? {
        "post" => (&["toolId"], &["toolId"]),
        "boundary-panel" => (
            &["fromSlot", "toSlot", "sectionId", "binding1", "binding2"],
            &["fromSlot", "toSlot", "sectionId", "binding1", "binding2"],
        ),
        "boundary-gate" => (
            &[
                "fromSlot",
                "toSlot",
                "thirdSlot",
                "sectionId",
                "parkingSectionId",
                "rail1Id",
                "rail2Id",
                "binding1",
                "binding2",
                "binding3",
                "binding4",
                "binding5",
                "binding6",
            ],
            &[
                "fromSlot",
                "toSlot",
                "thirdSlot",
                "sectionId",
                "parkingSectionId",
                "rail1Id",
                "rail2Id",
                "binding1",
                "binding2",
                "binding3",
                "binding4",
                "binding5",
                "binding6",
            ],
        ),
        "repair-boundary" => (&["toolId"], &["toolId"]),
        "remove-boundary-panel" | "remove-boundary-gate" | "reclaim-post" | "reclaim-lowered" => {
            (&[], &["destinationId", "sectionId"])
        }
        _ => return Err(()),
    };
    for k in required {
        id(v, k)?;
    }
    let mut repairs = 0usize;
    for (k, value) in map {
        if let Some(i) = repair_index(k) {
            if text(v, "operation")? != "repair-boundary"
                || i >= 64
                || value.as_str().is_none_or(|s| !is_safe_record_id(s))
            {
                return Err(());
            }
            repairs += 1;
        } else if optional.contains(&k.as_str())
            && !matches!(k.as_str(), "rootId" | "permissionId")
            && !permitted.contains(&k.as_str())
        {
            return Err(());
        }
    }
    if text(v, "operation") == Ok("repair-boundary")
        && (repairs == 0 || (0..repairs).any(|i| !map.contains_key(&format!("input:repair_{i}"))))
    {
        return Err(());
    }
    if text(v, "operation") == Ok("post") {
        grid("slot")?;
    }
    Ok(())
}
fn terms(v: &SqlCell, targets: &mut Vec<String>) -> Check {
    match text(v, "purpose")? {
        "guide" => {
            fields(v, &["purpose", "destination"], &[])?;
            destination(get(v, "destination")?, true, targets)?;
        }
        "hunt" => {
            fields(v, &["purpose", "quarry", "meetingPlace"], &[])?;
            let q = get(v, "quarry")?;
            fields(q, &["id", "life", "labels", "encounters"], &[])?;
            id(q, "id")?;
            count(q, "life", 0)?;
            let labels = get(q, "labels")?;
            let encounters = get(q, "encounters")?;
            if labels.object_len().is_none_or(|n| n == 0 || n > 2) {
                return Err(());
            }
            keys_in(encounters, labels)?;
            for value in labels.object_values() {
                if value
                    .as_text()
                    .is_none_or(|s| s.trim_is_empty() || s.units_len() > 500)
                {
                    return Err(());
                }
            }
            for value in encounters.object_values() {
                if !matches!(value, SqlCell::Null)
                    && value.as_text().is_none_or(|id| !is_safe_record_text(id))
                {
                    return Err(());
                }
            }
            targets.push(text(q, "id")?.into());
            destination(get(v, "meetingPlace")?, true, targets)?;
        }
        "help" => {
            fields(v, &["purpose", "task"], &[])?;
            let task = get(v, "task")?;
            id(task, "helperId")?;
            match text(task, "kind")? {
                "prepare" => {
                    fields(
                        task,
                        &[
                            "kind",
                            "helperId",
                            "recipe",
                            "recipeLabel",
                            "outputLabel",
                            "output",
                            "quantity",
                            "unit",
                        ],
                        &[],
                    )?;
                    pin(get(task, "recipe")?, true)?;
                    words(task, "recipeLabel", 500)?;
                    words(task, "outputLabel", 500)?;
                    let output = get(task, "output")?;
                    fields(output, &["port", "definition"], &[])?;
                    id(output, "port")?;
                    pin(get(output, "definition")?, true)?;
                    count(task, "quantity", 1)?;
                    if text(task, "unit")? != "item-count" {
                        return Err(());
                    }
                }
                "carry" => {
                    fields(
                        task,
                        &[
                            "kind",
                            "helperId",
                            "offerId",
                            "offerRevision",
                            "itemId",
                            "itemRevision",
                            "definition",
                            "quantity",
                            "itemLabel",
                            "destination",
                        ],
                        &[],
                    )?;
                    id(task, "offerId")?;
                    id(task, "itemId")?;
                    count(task, "offerRevision", 1)?;
                    count(task, "itemRevision", 0)?;
                    pin(get(task, "definition")?, true)?;
                    count(task, "quantity", 1)?;
                    words(task, "itemLabel", 500)?;
                    destination(get(task, "destination")?, true, targets)?;
                }
                "construction" => {
                    fields(
                        task,
                        &["kind", "helperId", "phase", "family", "grant", "label"],
                        &[],
                    )?;
                    phase(get(task, "phase")?)?;
                    pin(get(task, "family")?, true)?;
                    let grant = get(task, "grant")?;
                    fields(grant, &["id", "revision"], &[])?;
                    id(grant, "id")?;
                    count(grant, "revision", 1)?;
                    words(task, "label", 500)?;
                    if let Some(root) = get(task, "phase")?.get("rootId").and_then(SqlCell::as_str)
                    {
                        targets.push(root.into());
                    }
                }
                _ => return Err(()),
            }
        }
        _ => return Err(()),
    }
    Ok(())
}
pub(crate) fn inspect(v: &SqlCell, movement_purpose_max: u64) -> Check<OutingFacts> {
    id(v, "id")?;
    count(v, "revision", 1)?;
    let actors = participants(v)?;
    arrived(v, actors)?;
    let created = number(v, "createdAt")?;
    let expires = number(v, "expiresAt")?;
    if expires <= created {
        return Err(());
    }
    let pending = text(v, "status") == Ok("pending");
    let mut targets = Vec::new();
    let (kind, status) = match text(v, "kind")? {
        "travel" | "combat-help" => {
            // Source validates these terms without an unknown-field filter;
            // keep the canonical extras rather than silently dropping them.
            if !v.is_object() {
                return Err(());
            }
            if !["enqueue", "replace", "interrupt"].contains(&text(v, "proposerMode")?) {
                return Err(());
            }
            if let Some(p) = v.get("purpose") {
                if p.as_text()
                    .is_none_or(|s| s.units_len() as u64 > movement_purpose_max)
                {
                    return Err(());
                }
            }
            let work = get(v, "work")?;
            if !work.is_object() {
                return Err(());
            }
            for actor in actors {
                signed_count(work.get(actor).ok_or(())?)?;
            }
            for value in actor_map(get(v, "company")?, actors, false)?.object_values() {
                value.as_bool().ok_or(())?;
            }
            let combat = text(v, "kind") == Ok("combat-help");
            let status = match text(v, "status")? {
                "pending" => OutingStatus::Pending,
                "traveling" if !combat => OutingStatus::Traveling,
                "helping" if combat => OutingStatus::Helping,
                _ => return Err(()),
            };
            if count(v, "revision", 1)? != if pending { 1 } else { 2 } {
                return Err(());
            }
            let d = get(v, "destination")?;
            if combat {
                point(get(d, "point")?, false)?;
                words(d, "label", usize::MAX)?;
                optional_id(d, "entityId")?;
                if d.get("entityId").is_some() {
                    text(d, "placement")?;
                }
            } else {
                destination(d, false, &mut targets)?;
            }
            if pending {
                if v.get("plans").is_some() || !array(v, "arrived")?.is_empty() {
                    return Err(());
                }
            } else if !combat {
                let plans = get(v, "plans")?;
                if !plans.is_object() {
                    return Err(());
                }
                for actor in actors {
                    if plans
                        .get(actor)
                        .and_then(SqlCell::as_str)
                        .is_none_or(|id| !is_safe_record_id(id))
                    {
                        return Err(());
                    }
                }
            } else if let Some(plans) = v.get("plans") {
                if !plans.is_object() {
                    return Err(());
                }
            }
            if combat {
                let c = get(v, "combat")?;
                fields(
                    c,
                    &[
                        "opponentId",
                        "opponentLife",
                        "lives",
                        "labels",
                        "humanProposed",
                    ],
                    &["goalId"],
                )?;
                id(c, "opponentId")?;
                count(c, "opponentLife", 0)?;
                for value in actor_map(get(c, "lives")?, actors, true)?.object_values() {
                    if value
                        .as_u64()
                        .is_none_or(|n| n > crate::identity::MAX_SAFE_INTEGER)
                    {
                        return Err(());
                    }
                }
                actor_map(get(c, "labels")?, actors, true)?;
                for actor in actors {
                    words(get(c, "labels")?, actor, usize::MAX)?;
                }
                get(c, "humanProposed")?.as_bool().ok_or(())?;
                optional_id(c, "goalId")?;
                if pending && c.get("goalId").is_some() {
                    return Err(());
                }
                targets.push(text(c, "opponentId")?.into());
            } else if v.get("combat").is_some() {
                return Err(());
            }
            (
                if combat {
                    OutingKind::CombatHelp
                } else {
                    OutingKind::Travel
                },
                status,
            )
        }
        "cooperate" => {
            fields(
                v,
                &[
                    "id",
                    "revision",
                    "kind",
                    "proposerId",
                    "recipientId",
                    "definition",
                    "lives",
                    "terms",
                    "status",
                    "createdAt",
                    "expiresAt",
                    "ownedWork",
                    "arrived",
                ],
                &[
                    "acceptedAt",
                    "acceptedRevision",
                    "endAt",
                    "pendingAmendment",
                    "prepared",
                    "reportedPrepared",
                    "carried",
                    "constructionResult",
                ],
            )?;
            if created < 0. {
                return Err(());
            }
            pin(get(v, "definition")?, false)?;
            for value in actor_map(get(v, "lives")?, actors, true)?.object_values() {
                if value
                    .as_u64()
                    .is_none_or(|n| n > crate::identity::MAX_SAFE_INTEGER)
                {
                    return Err(());
                }
            }
            terms(get(v, "terms")?, &mut targets)?;
            let task = get(v, "terms")?.get("task");
            if let Some(task) = task {
                let helper = text(task, "helperId")?;
                if !actors.contains(&helper)
                    || pending
                        && helper
                            != if text(task, "kind") == Ok("construction") {
                                actors[0]
                            } else {
                                actors[1]
                            }
                {
                    return Err(());
                }
            }
            for work in actor_map(get(v, "ownedWork")?, actors, false)?.object_values() {
                fields(work, &[], &["planId", "activityId"])?;
                if work.get("planId").is_none() && work.get("activityId").is_none() {
                    return Err(());
                }
                optional_id(work, "planId")?;
                optional_id(work, "activityId")?;
            }
            if text(get(v, "terms")?, "purpose") == Ok("hunt") {
                let q = get(get(v, "terms")?, "quarry")?;
                actor_map(get(q, "labels")?, actors, true)?;
                actor_map(get(q, "encounters")?, actors, true)?;
            }
            if !pending && text(v, "status")? != "accepted" {
                return Err(());
            }
            if pending {
                if [
                    "acceptedAt",
                    "acceptedRevision",
                    "endAt",
                    "pendingAmendment",
                ]
                .iter()
                .any(|k| v.get(k).is_some())
                    || !array(v, "arrived")?.is_empty()
                    || get(v, "ownedWork")?.object_len() != Some(0)
                {
                    return Err(());
                }
            } else {
                let accepted = number(v, "acceptedAt")?;
                if accepted < created
                    || number(v, "endAt")? < accepted
                    || count(v, "acceptedRevision", 2)? > count(v, "revision", 1)?
                {
                    return Err(());
                }
            }
            if !pending && task.is_some_and(|t| text(t, "kind") == Ok("prepare")) {
                if count(v, "reportedPrepared", 0)? > count(v, "prepared", 0)? {
                    return Err(());
                }
            } else if v.get("prepared").is_some() || v.get("reportedPrepared").is_some() {
                return Err(());
            }
            if let Some(carried) = v.get("carried") {
                let t = task.ok_or(())?;
                if pending || text(t, "kind")? != "carry" {
                    return Err(());
                }
                fields(
                    carried,
                    &["itemId", "revision", "at", "eventId"],
                    &["placed"],
                )?;
                if text(carried, "itemId")? != text(t, "itemId")?
                    || count(carried, "revision", 0)? < count(t, "itemRevision", 0)?
                    || number(carried, "at")? < number(v, "acceptedAt")?
                {
                    return Err(());
                }
                id(carried, "eventId")?;
                if carried
                    .get("placed")
                    .is_some_and(|v| v.as_bool() != Some(true))
                {
                    return Err(());
                }
            }
            if let Some(result) = v.get("constructionResult") {
                let t = task.ok_or(())?;
                if pending || text(t, "kind")? != "construction" {
                    return Err(());
                }
                fields(result, &["actorId", "occurrenceId"], &[])?;
                if text(result, "actorId")? != text(t, "helperId")? {
                    return Err(());
                }
                id(result, "occurrenceId")?;
            }
            if let Some(a) = v.get("pendingAmendment") {
                fields(
                    a,
                    &["revision", "proposedBy", "terms", "createdAt", "expiresAt"],
                    &[],
                )?;
                if pending
                    || count(a, "revision", 1)? != count(v, "revision", 1)?
                    || !actors.contains(&text(a, "proposedBy")?)
                    || number(a, "createdAt")? < number(v, "acceptedAt")?
                    || number(a, "expiresAt")? <= number(a, "createdAt")?
                {
                    return Err(());
                }
                terms(get(a, "terms")?, &mut Vec::new())?;
            }
            (
                OutingKind::Cooperate,
                if pending {
                    OutingStatus::Pending
                } else {
                    OutingStatus::Accepted
                },
            )
        }
        _ => return Err(()),
    };
    let deadline = if pending {
        Some(expires)
    } else if kind == OutingKind::Cooperate {
        Some(
            v.get("pendingAmendment")
                .map(|a| number(a, "expiresAt"))
                .transpose()?
                .map_or(number(v, "endAt")?, |at| {
                    crate::values::js_min(at, number(v, "endAt").expect("validated end"))
                }),
        )
    } else {
        None
    };
    Ok(OutingFacts {
        id: text(v, "id")?.into(),
        proposer: actors[0].into(),
        recipient: actors[1].into(),
        kind,
        status,
        destinations: targets,
        deadline,
    })
}
