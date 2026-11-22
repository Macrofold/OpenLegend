//! Public body projection. Every personal alias, pose and detail is drawn
//! from the selected observer's retained current facets.

use super::PublicArt;
use super::SceneError;
use crate::player_references::PlayerReferences;
use indexmap::IndexMap;
use openlegend_simulation::{
    capture::{PlayerObservedBody, PlayerPerception},
    host::{ByteBudget, ByteReservation},
    reception::{AttributeView, CarriedItem, FacetRole, ObservedPileItem, SensoryFacet},
    state::{Named, Point},
    text::JsText,
    values::AttributeValue,
    worlds::base_observed::{
        BodyPlan, ObservedActionAnimation, RemainsPhase, StatusEffectProjection,
    },
};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedPolicy {
    /// The installed world's public kinds for each supported physical kind.
    body_kinds: IndexMap<String, Arc<str>>,
    fallback_body_kind: Arc<str>,
    #[serde(default)]
    portraits: IndexMap<String, PublicArt>,
    #[serde(default)]
    pub(super) item_art: IndexMap<String, PublicArt>,
    talk_unavailable: Arc<str>,
    trade_title: Arc<str>,
}

pub struct PreparedContacts {
    pub entities: Vec<ObservedEntity>,
    pub current_place_label: Option<JsText>,
    pub sight_confirmed_through: Option<f64>,
    _custody: ByteReservation,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct BodyIdentity {
    #[serde(skip_serializing_if = "Option::is_none")]
    known_name: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<JsText>,
    revision: u64,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct ObservedAt {
    kind: &'static str,
    modality: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    measurement_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    acquired_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    confirmed_through: Option<f64>,
    source_reference: String,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct ObservationItems {
    items: Vec<CarriedItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    measurement_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    confirmed_through: Option<f64>,
}

#[derive(PartialEq, Serialize)]
pub struct BodySize {
    pub width: f64,
    pub height: f64,
}

#[derive(PartialEq, Serialize)]
struct Heat {
    lit: bool,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct TradeSummary {
    scope: String,
    person_id: String,
    person_name: JsText,
    labels: TradeLabels,
    offers: [(); 0],
    revision: String,
}

#[derive(PartialEq, Serialize)]
struct TradeLabels {
    title: Arc<str>,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageHint {
    container_id: String,
    placement_revision: u64,
}

/// The exact ordinary `EntityView` fields backed by permitted capture families.
#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedEntity {
    id: String,
    body_reference: String,
    context_action_revision: String,
    #[serde(flatten)]
    display: Named,
    #[serde(skip_serializing_if = "Option::is_none")]
    identity: Option<BodyIdentity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attention_preference: Option<bool>,
    observation: ObservedAt,
    kind: Arc<str>,
    subtype: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    body_plan: Option<BodyPlan>,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<PublicArt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    storage: Option<StorageHint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    portrait: Option<PublicArt>,
    status_effects: Vec<StatusEffectProjection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attributes: Option<Vec<AttributeView>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    health: Option<f64>,
    observed_moving: bool,
    position: Point,
    support_surface_id: Option<String>,
    heading: f64,
    appearance: JsText,
    radius: f64,
    body_size: BodySize,
    action_animation: Option<ObservedActionAnimation>,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quantity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    heat: Option<Heat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    body_state: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    contents: Option<Vec<ObservedPileItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    observed_carried: Option<ObservationItems>,
    #[serde(skip_serializing_if = "Option::is_none")]
    can_talk: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    talk_requires_ai: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    talk_unavailable_reason: Option<Arc<str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    communication_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trade: Option<TradeSummary>,
}

/// Reserve detached application entities before cloning their selected values.
/// The owning read remains necessary through final disclosure. Independent
/// outgoing bytes keep their own reservation.
pub fn prepare_contacts(
    read: PlayerPerception<'_>,
    policy: &ObservedPolicy,
    references: &PlayerReferences<'_>,
    player_can_speak: bool,
    trade_reader_revision: &str,
    budget: &ByteBudget,
) -> Result<PreparedContacts, SceneError> {
    if read.trade_terms != "none"
        || read.finite_weather_cue != "absent"
        || !references.matches_reader(read.world_id, read.actor_id)
    {
        return Err(SceneError::Capture);
    }
    let count = read.bodies().len();
    let bytes = count
        .checked_mul(size_of::<ObservedEntity>())
        .ok_or(SceneError::Capacity)?;
    let mut custody = budget
        .reserve(bytes.saturating_add(read.current_place_label.map_or(0, JsText::storage_bytes)))?;
    let mut entities = Vec::new();
    entities
        .try_reserve_exact(count)
        .map_err(|_| SceneError::Capacity)?;
    for row in read.bodies() {
        let row = row.ok_or(SceneError::Capture)?;
        let bound = row.projection_bytes().ok_or(SceneError::Capacity)?;
        custody.resize(
            custody
                .bytes()
                .checked_add(bound)
                .ok_or(SceneError::Capacity)?,
        )?;
        entities.push(project_contact(
            row,
            read.sight_confirmed_through,
            policy,
            references,
            player_can_speak,
            trade_reader_revision,
        )?);
    }
    Ok(PreparedContacts {
        entities,
        current_place_label: read.current_place_label.cloned(),
        sight_confirmed_through: read.sight_confirmed_through,
        _custody: custody,
    })
}

fn project_contact(
    row: PlayerObservedBody<'_>,
    sight: Option<f64>,
    policy: &ObservedPolicy,
    references: &PlayerReferences<'_>,
    player_can_speak: bool,
    trade_reader_revision: &str,
) -> Result<ObservedEntity, SceneError> {
    let received = row.body_facet().ok_or(SceneError::Capture)?;
    let SensoryFacet::Body { body } = &received.value else {
        return Err(SceneError::Capture);
    };
    if body.assembly.is_some() {
        return Err(SceneError::Unsupported("the installed assembly contact"));
    }
    let time = |at| (Some(at) != sight).then_some(at);
    let (measured, acquired, confirmed, source) = received.description_support.as_ref().map_or(
        (
            received.value_measured_through,
            received.value_acquired_at,
            received.confirmed_through,
            &received.confirmation,
        ),
        |detail| {
            (
                detail.description_measured_through,
                detail.description_acquired_at,
                detail.confirmed_through,
                &detail.confirmation,
            )
        },
    );
    let id = references.contact(row.source_id, row.physical_life.unwrap_or(0), row.lease_id)?;
    let body_reference = references.body(row.source_id, row.physical_life.unwrap_or(0))?;
    let mut description = body.description.as_ref();
    let mut description_selected = false;
    let mut attributes = None;
    let mut health = None;
    let mut observed_moving = false;
    let mut contents = None;
    let mut observed_carried = None;
    for facet in row.facets() {
        match &facet.value {
            SensoryFacet::Description { text } if !description_selected => {
                description_selected = true;
                if facet.role == FacetRole::Direct {
                    description = Some(text);
                }
            }
            SensoryFacet::ObservedMotion { .. } => observed_moving = true,
            SensoryFacet::PublicAttributes { attributes: values } if attributes.is_none() => {
                health = values
                    .iter()
                    .find(|value| value.body_health.unwrap_or(false))
                    .and_then(|attribute| match attribute.value.as_ref()? {
                        AttributeValue::Number(number) => Some(*number),
                        _ => None,
                    });
                attributes = Some(values.clone());
            }
            SensoryFacet::PileContents { items } if contents.is_none() => {
                contents = Some(items.clone())
            }
            SensoryFacet::Carried { items } if observed_carried.is_none() => {
                observed_carried = Some(ObservationItems {
                    items: items.clone(),
                    measurement_at: time(facet.value_measured_through),
                    confirmed_through: time(facet.confirmed_through),
                })
            }
            _ => {}
        }
    }
    let action_animation = body
        .animation
        .as_ref()
        .and_then(Option::as_ref)
        .map(|animation| {
            let mut selected = animation.clone();
            selected.id =
                references.personal_source(&("outward-action", &received.id, &animation.id))?;
            Ok::<_, serde_json::Error>(selected)
        })
        .transpose()?;
    let portrait = row
        .actor
        .then(|| {
            body.appearance
                .as_unicode()
                .and_then(|key| policy.portraits.get(key))
                .cloned()
        })
        .flatten();
    let kind = policy
        .body_kinds
        .get(&body.kind)
        .unwrap_or(&policy.fallback_body_kind)
        .clone();
    let trade = if row.actor && row.trade_eligible {
        Some(trade_summary(
            &row,
            &id,
            policy,
            references,
            trade_reader_revision,
        )?)
    } else {
        None
    };
    let storage = body.storage.as_ref().map(|storage| StorageHint {
        container_id: id.clone(),
        placement_revision: storage.placement_revision,
    });
    Ok(ObservedEntity {
        id,
        body_reference,
        context_action_revision: references.context_action(row.context)?,
        display: row.name.clone(),
        identity: row.name_revision.map(|revision| BodyIdentity {
            known_name: row.known_name.cloned(),
            nickname: row.nickname.cloned(),
            revision,
        }),
        attention_preference: row.attention_preference,
        observation: ObservedAt {
            kind: "current",
            modality: "sight",
            measurement_at: time(measured),
            acquired_at: time(acquired),
            confirmed_through: time(confirmed),
            source_reference: references.evidence(source)?,
        },
        kind: kind.clone(),
        subtype: body.subtype.clone().unwrap_or_else(|| body.kind.clone()),
        body_plan: body.body_plan,
        icon: body.icon.clone(),
        art: if &*kind == "resource" {
            body.subtype
                .as_ref()
                .and_then(|value| policy.item_art.get(value))
                .cloned()
        } else {
            None
        },
        portrait,
        storage,
        status_effects: body.effects.clone().unwrap_or_default(),
        attributes,
        health,
        observed_moving,
        position: body.position,
        support_surface_id: body.support_surface_id.clone(),
        heading: body.heading,
        appearance: body.appearance.clone(),
        radius: body.radius,
        body_size: BodySize {
            width: body.radius * 2.0,
            height: body.height,
        },
        action_animation,
        status: body
            .outward
            .iter()
            .filter(|entry| !entry.is_empty())
            .map(String::as_str)
            .collect::<Vec<_>>()
            .join(", "),
        description: description.filter(|name| !name.is_empty()).cloned(),
        quantity: body.quantity,
        heat: body.heat_lit.map(|lit| Heat { lit }),
        body_state: match body.remains_phase {
            Some(RemainsPhase::Fresh) => Some("dead"),
            Some(RemainsPhase::Rotting) => Some("rotting"),
            _ => None,
        },
        contents,
        observed_carried,
        can_talk: row
            .actor
            .then_some(body.outward[0] == "alive" && player_can_speak),
        talk_requires_ai: row.actor.then_some(row.talk_requires_ai),
        talk_unavailable_reason: (row.actor && !player_can_speak)
            .then(|| policy.talk_unavailable.clone()),
        communication_reference: row
            .actor
            .then_some(row.communication_id)
            .flatten()
            .map(|id| references.person(id))
            .transpose()?,
        trade,
    })
}

fn trade_summary(
    row: &PlayerObservedBody<'_>,
    contact: &str,
    policy: &ObservedPolicy,
    references: &PlayerReferences<'_>,
    reader: &str,
) -> Result<TradeSummary, SceneError> {
    // Capture already verified no positive held terms. Issuing this empty
    // offer summary never reads the other person's stock or supplements it.
    let disclose = references.personal_source(&("trade-disclosures", row.source_id, [(); 0]))?;
    let revision = references.personal_source(&(
        "trade-reader",
        row.source_id,
        [(); 0],
        [(); 0],
        reader,
        disclose,
    ))?;
    Ok(TradeSummary {
        scope: references.trade_draft(row.subject, contact, row.physical_life.unwrap_or(0))?,
        person_id: contact.to_owned(),
        person_name: row.name.name.clone(),
        labels: TradeLabels {
            title: policy.trade_title.clone(),
        },
        offers: [],
        revision,
    })
}

impl ObservedEntity {
    pub(crate) fn id(&self) -> &str {
        &self.id
    }
    pub(crate) fn delta<'a>(&'a self, before: &'a Self) -> EntityFields<'a> {
        EntityFields {
            before,
            after: self,
        }
    }
}

pub(crate) struct EntityFields<'a> {
    before: &'a ObservedEntity,
    after: &'a ObservedEntity,
}

impl EntityFields<'_> {
    pub(crate) fn removed(&self) -> Vec<&'static str> {
        use super::delta::removed;
        let Self { before, after } = self;
        removed!(before,after;
            "nameForm"=>display.name_form,"indefiniteArticle"=>display.indefinite_article,
            "identity"=>identity,"attentionPreference"=>attention_preference,"bodyPlan"=>body_plan,
            "icon"=>icon,"art"=>art,"storage"=>storage,"portrait"=>portrait,"attributes"=>attributes,"health"=>health,
            "description"=>description,"quantity"=>quantity,"heat"=>heat,"bodyState"=>body_state,
            "contents"=>contents,"observedCarried"=>observed_carried,"canTalk"=>can_talk,
            "talkRequiresAi"=>talk_requires_ai,"talkUnavailableReason"=>talk_unavailable_reason,
            "communicationReference"=>communication_reference,"trade"=>trade,
        )
    }
}
impl Serialize for EntityFields<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use super::delta::fields;
        use serde::ser::SerializeMap;
        let Self { before, after } = self;
        let mut map = serializer.serialize_map(None)?;
        fields!(map,before,after;required {
          "bodyReference"=>body_reference,"contextActionRevision"=>context_action_revision,
          "name"=>display.name,"observation"=>observation,"kind"=>kind,"subtype"=>subtype,
          "statusEffects"=>status_effects,"observedMoving"=>observed_moving,"position"=>position,
          "supportSurfaceId"=>support_surface_id,"heading"=>heading,"appearance"=>appearance,
          "radius"=>radius,"bodySize"=>body_size,"actionAnimation"=>action_animation,"status"=>status,
        } optional {
          "nameForm"=>display.name_form,"indefiniteArticle"=>display.indefinite_article,
          "identity"=>identity,"attentionPreference"=>attention_preference,"bodyPlan"=>body_plan,
          "icon"=>icon,"art"=>art,"storage"=>storage,"portrait"=>portrait,"attributes"=>attributes,"health"=>health,
          "description"=>description,"quantity"=>quantity,"heat"=>heat,"bodyState"=>body_state,
          "contents"=>contents,"observedCarried"=>observed_carried,"canTalk"=>can_talk,
          "talkRequiresAi"=>talk_requires_ai,"talkUnavailableReason"=>talk_unavailable_reason,
          "communicationReference"=>communication_reference,"trade"=>trade,
        });
        map.end()
    }
}
