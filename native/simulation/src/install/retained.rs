//! Immutable authored records used by permitted formatting and dependency
//! checks. Retaining an unused definition never enables its action family.
//! Dynamic state cannot enter this finite owner or be changed through it.

use super::inventory::{ItemDefinitionFields, ItemDefinitionRead, PackingLoad};
use super::rows::{take_collection, take_one_row, validate_map_row};
use super::{CanonicalInput, InstallError, RowImport, WorldChildren};
use crate::host::retained_size::{HeapBytes, heap_record, map_storage};
use crate::records::{InstalledRow, RecordSchema};
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::Value;
use serde_json::value::RawValue;
use std::mem::size_of;
mod foraging;
mod residency;

pub(crate) enum RetainedOne {
    Null,
    Record(InstalledRow),
}
impl RetainedOne {
    pub(crate) fn payload(&self) -> &str {
        match self {
            Self::Null => "null",
            Self::Record(row) => &row.payload,
        }
    }
}
pub(crate) struct RetainedMap {
    rows: IndexMap<String, InstalledRow>,
    next_ordinal: u64,
}
impl RetainedMap {
    pub(crate) fn len(&self) -> usize {
        self.rows.len()
    }
    pub(crate) fn entries(&self) -> impl Iterator<Item = (&str, &str)> {
        self.rows
            .iter()
            .map(|(key, row)| (key.as_str(), row.payload.as_str()))
    }
    pub(crate) fn get(&self, key: &str) -> Option<&str> {
        self.rows.get(key).map(|row| row.payload.as_str())
    }
    pub(crate) fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }
}

// Both structs are deliberately finite. A new WorldState field needs a named
// semantic or read-only owner; it cannot silently enter a generic world bag.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RetainedDefinitionInputs {
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub knowledge_policy: Option<CanonicalInput>,
    pub item_handling: CanonicalInput,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub gathering_policy: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub work_batch_policy: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub social_offer_policy: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub hearth_definitions: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub assembly_families: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub construction_profile: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub contents_exposure_profiles: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub daily_rain_definitions: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub participation_policy: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub native_strikes: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub native_foraging_profiles: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub supply_opportunities: Option<CanonicalInput>,
    pub food_preparations: CanonicalInput,
    pub cast_definitions: CanonicalInput,
    pub invention_policy: CanonicalInput,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub story_policy: Option<CanonicalInput>,
    pub item_definitions: CanonicalInput,
    pub recipes: CanonicalInput,
    pub flight_routes: CanonicalInput,
    pub places: CanonicalInput,
}
pub(crate) struct RetainedDefinitions {
    _storage: Option<crate::host::ResidentReservation>,
    pub knowledge_policy: Option<RetainedOne>,
    pub knowledge_limits: Option<crate::knowledge::KnowledgePolicy>,
    pub item_handling: RetainedOne,
    pub item_handling_read: ItemHandlingReadPolicy,
    pub gathering_policy: Option<RetainedOne>,
    pub bare_hand_gathering: Option<u64>,
    pub work_batch_policy: Option<RetainedOne>,
    pub social_offer_policy: Option<RetainedOne>,
    pub social_offer_read: Option<SocialOfferReadPolicy>,
    pub hearth_definitions: Option<RetainedMap>,
    pub assembly_families: Option<RetainedMap>,
    pub construction_profile: Option<RetainedOne>,
    pub contents_exposure_profiles: Option<RetainedMap>,
    pub daily_rain_definitions: Option<RetainedMap>,
    pub participation_policy: Option<RetainedOne>,
    pub participation_read: Option<ParticipationReadPolicy>,
    pub native_strikes: Option<RetainedMap>,
    pub native_strike_read: IndexMap<String, crate::worlds::base_decision_offers::NativeStrikeRead>,
    pub native_foraging_profiles: Option<RetainedMap>,
    pub foraging: crate::worlds::base_foraging::InstalledForaging,
    pub supply_opportunities: Option<RetainedMap>,
    pub food_preparations: RetainedMap,
    pub cast_definitions: RetainedMap,
    pub invention_policy: RetainedOne,
    pub story_policy: Option<RetainedOne>,
    pub item_definitions: RetainedMap,
    pub items: IndexMap<String, ItemDefinitionRead>,
    pub recipes: RetainedMap,
    pub flight_routes: RetainedMap,
    pub flight_corridors: crate::flight::Corridors,
    pub places: RetainedMap,
    pub places_read: crate::reception::InstalledPlaces,
}

/// Derived once from the same validated immutable definition body. Read-only
/// trade presentation needs these fields; item effects remain unsupported.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ItemHandlingReadPolicy {
    enabled: bool,
    actor_body_profiles: Vec<String>,
    pub reach: f64,
    pub object_body: crate::state::BodyProfile,
    #[serde(default)]
    packing_loads: Vec<PackingLoad>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SocialOfferReadPolicy {
    pub pending_seconds: f64,
    pub incoming: u64,
    pub outgoing: u64,
    pub one_pending_per_pair: bool,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub cooperation: Option<SharedPhysicalSlots>,
    pub messages: SocialOfferReadMessages,
}
#[derive(Debug, Deserialize)]
// Travel consumes only the installed cooperation policy's presence for its
// shared physical slot. Its other fields remain in the canonical policy owner.
pub(crate) struct SharedPhysicalSlots {}
#[derive(Debug, Deserialize)]
pub(crate) struct SocialOfferReadMessages {
    pub incoming: crate::text::JsText,
    pub outgoing: crate::text::JsText,
    pub pair: crate::text::JsText,
}
impl SocialOfferReadPolicy {
    fn valid(&self) -> bool {
        self.pending_seconds.is_finite()
            && self.pending_seconds > 0.0
            && [self.incoming, self.outgoing]
                .iter()
                .all(|n| *n > 0 && *n <= crate::identity::MAX_SAFE_INTEGER)
            && [
                &self.messages.incoming,
                &self.messages.outgoing,
                &self.messages.pair,
            ]
            .iter()
            .all(|text| !text.trim_is_empty() && text.units_len() <= 1000)
    }
}
impl ItemHandlingReadPolicy {
    pub(super) fn packing_load(&self, pin: &crate::values::DefinitionPin) -> Option<u64> {
        self.packing_loads
            .iter()
            .find(|entry| &entry.definition == pin)
            .map(|entry| entry.load)
    }

    pub(crate) fn can_handle(&self, profile: &str) -> bool {
        self.enabled && self.actor_body_profiles.iter().any(|id| id == profile)
    }
}

/// Only the selected recovery location is needed by body admission and player
/// controls. Keep its immutable authored source beside this shared read header;
/// do not parse the complete policy again for every actor or publication.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ParticipationReadPolicy {
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub exit_exposure_seconds: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub safe_return_anchor: Option<crate::state::SurfacePoint>,
}

struct Reader<'a> {
    import: &'a mut RowImport,
    children: &'a mut WorldChildren,
    schema: &'a RecordSchema,
    budget: &'a crate::host::ByteBudget,
    preparation: crate::host::ByteReservation,
}
impl Reader<'_> {
    fn json_preparation(&self, source: &str) -> Result<crate::host::ByteReservation, InstallError> {
        super::reserve_typed_parse::<Value>(
            source,
            size_of::<Value>(),
            Some(size_of::<(usize, String, Value)>()),
            self.budget,
        )
    }
    fn presence(
        &mut self,
        field: &str,
        input: Option<&CanonicalInput>,
    ) -> Result<bool, InstallError> {
        let presence = self.children.take(field)?;
        if presence == Some(false) || (presence == Some(true)) != input.is_some() {
            return Err(InstallError::ParentPresence);
        }
        Ok(input.is_some())
    }
    fn plain(&self, table: &str, row: &InstalledRow) -> Result<(), InstallError> {
        let layout = self
            .schema
            .layout(table)
            .map_err(|_| InstallError::CurrentFormat)?;
        if !layout.children.is_empty() || !layout.columns.is_empty() || !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        Ok(())
    }
    fn one(
        &mut self,
        field: &str,
        table: &str,
        input: Option<CanonicalInput>,
    ) -> Result<Option<RetainedOne>, InstallError> {
        // Gathering explicitly supports null in the current model. It is a
        // present null policy with no child SQL row, not an omitted policy.
        if field == "gatheringPolicy"
            && input
                .as_ref()
                .is_some_and(|input| input.canonical == "null")
        {
            let input = input.ok_or(InstallError::DefinitionBody)?;
            input.verify_json(&Value::Null)?;
            if self.children.take(field)? != Some(false) {
                return Err(InstallError::ParentPresence);
            }
            take_one_row(self.import, table, "[\"world\"]", field, false)?;
            return Ok(Some(RetainedOne::Null));
        }
        let present = self.presence(field, input.as_ref())?;
        let value = take_one_row(self.import, table, "[\"world\"]", field, present)?;
        match (value, input) {
            (Some(row), Some(input)) => {
                self.plain(table, &row)?;
                let mut _parsing = self.json_preparation(&row.payload)?;
                let value =
                    serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
                _parsing = super::typed_parse::finish_json_parse(_parsing, &row.payload, &value)?;
                let _verification = self.json_preparation(&input.canonical)?;
                input.verify_json(&value)?;
                Ok(Some(RetainedOne::Record(row)))
            }
            (None, None) => Ok(None),
            _ => Err(InstallError::ParentPresence),
        }
    }
    fn map(
        &mut self,
        field: &str,
        table: &str,
        input: Option<CanonicalInput>,
    ) -> Result<Option<RetainedMap>, InstallError> {
        self.verified_map(field, table, input)
            .map(|verified| verified.map(|(rows, _)| rows))
    }
    fn verified_map(
        &mut self,
        field: &str,
        table: &str,
        input: Option<CanonicalInput>,
    ) -> Result<Option<(RetainedMap, CanonicalInput)>, InstallError> {
        let Some((rows, input)) = self.map_rows(field, table, input)? else {
            return Ok(None);
        };
        // Raw row transport does not fund this temporary semantic JSON tree.
        // Keep only completed row decodes through the independent pin check.
        let mut decoding = self
            .budget
            .reserve(
                map_storage::<String, Value>(
                    rows.len().checked_mul(2).ok_or(InstallError::Capacity)?,
                )
                .and_then(|bytes| {
                    rows.entries()
                        .try_fold(bytes, |bytes, (id, _)| bytes.checked_add(id.len()))
                })
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut assembled = serde_json::Map::new();
        for row in rows.rows.values() {
            let parsing = self.json_preparation(&row.payload)?;
            let value =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            decoding
                .merge(super::typed_parse::finish_json_parse(
                    parsing,
                    &row.payload,
                    &value,
                )?)
                .map_err(|_| InstallError::Capacity)?;
            assembled.insert(row.slot.clone(), value);
        }
        let _verification = self.json_preparation(&input.canonical)?;
        input.verify_json(&Value::Object(assembled))?;
        Ok(Some((rows, input)))
    }
    // Placement and completeness have one owner, independent of each family's
    // typed content validation. In particular, Place text must not pass through
    // serde_json::Value before the existing JsText decoder sees its UTF16 units.
    fn map_rows(
        &mut self,
        field: &str,
        table: &str,
        input: Option<CanonicalInput>,
    ) -> Result<Option<(RetainedMap, CanonicalInput)>, InstallError> {
        let present = self.presence(field, input.as_ref())?;
        let collection = take_collection(self.import, table, "[\"world\"]", present, true)?;
        let Some(input) = input else { return Ok(None) };
        let count = collection.rows.len();
        let backing = map_storage::<String, InstalledRow>(
            count.checked_mul(2).ok_or(InstallError::Capacity)?,
        )
        .and_then(|bytes| {
            collection
                .rows
                .iter()
                .try_fold(bytes, |bytes, row| bytes.checked_add(row.slot.len()))
        })
        .ok_or(InstallError::Capacity)?;
        self.preparation
            .resize(
                self.preparation
                    .bytes()
                    .checked_add(backing)
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let mut rows = IndexMap::new();
        rows.try_reserve(count)
            .map_err(|_| InstallError::Capacity)?;
        for row in collection.rows {
            validate_map_row(
                &row,
                "[\"world\"]",
                field,
                &row.slot,
                collection.coverage.next_ordinal,
            )?;
            self.plain(table, &row)?;
            if rows.contains_key(&row.slot) {
                return Err(InstallError::DuplicateRow);
            }
            rows.insert(row.slot.clone(), row);
        }
        Ok(Some((
            RetainedMap {
                rows,
                next_ordinal: collection.coverage.next_ordinal,
            },
            input,
        )))
    }
}

pub(crate) fn install_retained(
    import: &mut RowImport,
    children: &mut WorldChildren,
    input: RetainedDefinitionInputs,
    schema: &RecordSchema,
    budget: &crate::host::ByteBudget,
) -> Result<RetainedDefinitions, InstallError> {
    let mut r = Reader {
        import,
        children,
        schema,
        budget,
        preparation: budget.reserve(0).map_err(|_| InstallError::Capacity)?,
    };
    let knowledge_policy = r.one(
        "knowledgePolicy",
        "config_knowledge",
        input.knowledge_policy,
    )?;
    let item_handling = r
        .one(
            "itemHandling",
            "config_item_handling",
            Some(input.item_handling),
        )?
        .ok_or(InstallError::ParentPresence)?;
    // These derived copies outlive Reader::one's comparison trees. Transfer
    // their preparation only after the final resident owner is admitted.
    let _item_handling_preparation = super::reserve_typed_parse::<ItemHandlingReadPolicy>(
        item_handling.payload(),
        size_of::<String>(),
        None,
        budget,
    )?;
    let item_handling_read =
        serde_json::from_str(item_handling.payload()).map_err(|_| InstallError::CurrentFormat)?;
    let participation_policy = r.one(
        "participationPolicy",
        "config_participation",
        input.participation_policy,
    )?;
    let _participation_preparation = participation_policy
        .as_ref()
        .map(|policy| {
            super::reserve_typed_parse::<Option<ParticipationReadPolicy>>(
                policy.payload(),
                size_of::<usize>(),
                None,
                budget,
            )
        })
        .transpose()?;
    let participation_read = participation_policy
        .as_ref()
        .map(|policy| serde_json::from_str(policy.payload()))
        .transpose()
        .map_err(|_| InstallError::CurrentFormat)?
        .flatten();
    let knowledge_limits = knowledge_policy
        .as_ref()
        .map(|policy| {
            serde_json::from_str::<Option<crate::knowledge::KnowledgePolicy>>(policy.payload())
        })
        .transpose()
        .map_err(|_| InstallError::CurrentFormat)?
        .flatten();
    let native_strikes = r.map(
        "nativeStrikes",
        "config_native_strikes",
        input.native_strikes,
    )?;
    let count = native_strikes.as_ref().map_or(0, RetainedMap::len);
    let typed_bound = native_strikes
        .as_ref()
        .into_iter()
        .flat_map(RetainedMap::entries)
        .try_fold(
            crate::host::retained_size::map_storage::<
                String,
                crate::worlds::base_decision_offers::NativeStrikeRead,
            >(count)
            .ok_or(InstallError::Capacity)?,
            |n, (key, body)| {
                n.checked_add(
                    crate::experience::encoded_body_bound(body)
                        .map_err(|_| InstallError::Capacity)?,
                )
                .and_then(|n| n.checked_add(key.len()))
                .ok_or(InstallError::Capacity)
            },
        )?;
    let _typed_preparation = budget
        .reserve(typed_bound)
        .map_err(|_| InstallError::Capacity)?;
    let mut native_strike_read = IndexMap::with_capacity(count);
    for (key, body) in native_strikes
        .as_ref()
        .into_iter()
        .flat_map(RetainedMap::entries)
    {
        let read: crate::worlds::base_decision_offers::NativeStrikeRead =
            serde_json::from_str(body).map_err(|_| InstallError::CurrentFormat)?;
        if !read.valid(key) {
            return Err(InstallError::CurrentFormat);
        }
        native_strike_read.insert(key.to_owned(), read);
    }
    let social_offer_policy = r.one(
        "socialOfferPolicy",
        "config_social_offers",
        input.social_offer_policy,
    )?;
    let _social_offer_preparation = social_offer_policy
        .as_ref()
        .map(|policy| {
            super::reserve_typed_parse::<Option<SocialOfferReadPolicy>>(
                policy.payload(),
                size_of::<String>(),
                None,
                budget,
            )
        })
        .transpose()?;
    let social_offer_read = social_offer_policy
        .as_ref()
        .map(|policy| {
            serde_json::from_str::<Option<SocialOfferReadPolicy>>(policy.payload())
                .map_err(|_| InstallError::CurrentFormat)
        })
        .transpose()?
        .flatten();
    if social_offer_read
        .as_ref()
        .is_some_and(|policy| !policy.valid())
    {
        return Err(InstallError::CurrentFormat);
    }
    let invention_policy = r
        .one(
            "inventionPolicy",
            "config_invention",
            Some(input.invention_policy),
        )?
        .ok_or(InstallError::ParentPresence)?;
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct InventionRead {
        agent_locked: bool,
    }
    let invention: InventionRead = serde_json::from_str(invention_policy.payload())
        .map_err(|_| InstallError::CurrentFormat)?;
    if !invention.agent_locked {
        return Err(InstallError::UnsupportedFamily("autonomous-invention"));
    }
    let (places, places_input) = r
        .map_rows("places", "definition_places", Some(input.places))?
        .ok_or(InstallError::ParentPresence)?;
    let places_read = crate::reception::InstalledPlaces::install(&places, &places_input, budget)?;
    let (native_foraging_profiles, foraging_input) = match r.verified_map(
        "nativeForagingProfiles",
        "config_native_foraging_profiles",
        input.native_foraging_profiles,
    )? {
        Some((rows, canonical)) => (Some(rows), Some(canonical)),
        None => (None, None),
    };
    let (item_definitions, item_input) = r
        .verified_map(
            "itemDefinitions",
            "definition_items",
            Some(input.item_definitions),
        )?
        .ok_or(InstallError::ParentPresence)?;
    let (foraging, _foraging_preparation) =
        foraging::prepare(foraging_input.as_ref(), &item_input, budget)?;
    let assembly_families = r.map(
        "assemblyFamilies",
        "config_assembly_families",
        input.assembly_families,
    )?;
    let (items, _item_preparation) = prepare_items(
        &item_definitions,
        &item_input,
        assembly_families.as_ref(),
        budget,
    )?;
    let gathering_policy = r.one(
        "gatheringPolicy",
        "config_gathering",
        input.gathering_policy,
    )?;
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct GatheringRead {
        #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
        bare_hand_quantity: u64,
    }
    let bare_hand_gathering = match gathering_policy.as_ref().map(RetainedOne::payload) {
        None | Some("null") => None,
        Some(policy) => {
            let policy: GatheringRead =
                serde_json::from_str(policy).map_err(|_| InstallError::DefinitionBody)?;
            if policy.bare_hand_quantity == 0 {
                return Err(InstallError::DefinitionBody);
            }
            Some(policy.bare_hand_quantity)
        }
    };
    let flight_routes = r
        .map(
            "flightRoutes",
            "sim_flight_routes",
            Some(input.flight_routes),
        )?
        .ok_or(InstallError::ParentPresence)?;
    let mut flight_preparation = budget
        .reserve(
            map_storage::<String, crate::flight::Corridor>(flight_routes.len())
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut flight_corridors = IndexMap::with_capacity(flight_routes.len());
    for (id, body) in flight_routes.entries() {
        let storage =
            super::reserve_typed_parse::<crate::flight::Corridor>(body, id.len(), None, budget)?;
        flight_preparation
            .merge(storage)
            .map_err(|_| InstallError::Capacity)?;
        let route = serde_json::from_str(body).map_err(|_| InstallError::CurrentFormat)?;
        flight_corridors.insert(id.to_owned(), route);
    }
    let mut installed = RetainedDefinitions {
        _storage: None,
        knowledge_policy,
        knowledge_limits,
        item_handling,
        item_handling_read,
        gathering_policy,
        bare_hand_gathering,
        work_batch_policy: r.one(
            "workBatchPolicy",
            "config_work_batches",
            input.work_batch_policy,
        )?,
        social_offer_policy,
        social_offer_read,
        hearth_definitions: r.map(
            "hearthDefinitions",
            "config_hearth_definitions",
            input.hearth_definitions,
        )?,
        assembly_families,
        construction_profile: r.one(
            "constructionProfile",
            "config_construction_profile",
            input.construction_profile,
        )?,
        contents_exposure_profiles: r.map(
            "contentsExposureProfiles",
            "config_contents_exposure_profiles",
            input.contents_exposure_profiles,
        )?,
        daily_rain_definitions: r.map(
            "dailyRainDefinitions",
            "config_daily_rain_definitions",
            input.daily_rain_definitions,
        )?,
        participation_policy,
        participation_read,
        native_strikes,
        native_strike_read,
        native_foraging_profiles,
        foraging,
        supply_opportunities: r.map(
            "supplyOpportunities",
            "config_supply_opportunities",
            input.supply_opportunities,
        )?,
        food_preparations: r
            .map(
                "foodPreparations",
                "config_food_preparations",
                Some(input.food_preparations),
            )?
            .ok_or(InstallError::ParentPresence)?,
        cast_definitions: r
            .map(
                "castDefinitions",
                "config_cast_definitions",
                Some(input.cast_definitions),
            )?
            .ok_or(InstallError::ParentPresence)?,
        invention_policy,
        story_policy: r.one("storyPolicy", "config_story", input.story_policy)?,
        item_definitions,
        items,
        recipes: r
            .map("recipes", "definition_recipes", Some(input.recipes))?
            .ok_or(InstallError::ParentPresence)?,
        flight_routes,
        flight_corridors,
        places,
        places_read,
    };
    installed._storage = Some(
        budget
            .reserve_record(installed.heap_bytes().ok_or(InstallError::Capacity)?)
            .map_err(|_| InstallError::Capacity)?,
    );
    installed.places_read.finish_install();
    Ok(installed)
}

/// Compile the facts used by custody and visible stock from the already
/// verified release. Each nested canonical record has the exact Source pin.
fn prepare_items(
    definitions: &RetainedMap,
    input: &CanonicalInput,
    assembly: Option<&RetainedMap>,
    budget: &crate::host::ByteBudget,
) -> Result<
    (
        IndexMap<String, ItemDefinitionRead>,
        crate::host::ByteReservation,
    ),
    InstallError,
> {
    let _canonical = budget
        .reserve(
            input
                .canonical
                .len()
                .checked_add(
                    map_storage::<String, &RawValue>(
                        definitions
                            .len()
                            .checked_mul(2)
                            .ok_or(InstallError::Capacity)?,
                    )
                    .ok_or(InstallError::Capacity)?,
                )
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let canonical: IndexMap<String, &RawValue> =
        serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
    let mut workspace = budget
        .reserve(
            map_storage::<String, ItemDefinitionRead>(definitions.len())
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut items = IndexMap::new();
    items
        .try_reserve(definitions.len())
        .map_err(|_| InstallError::Capacity)?;
    for (id, source) in definitions.entries() {
        let mut preparation = super::reserve_typed_parse::<ItemDefinitionFields>(
            source,
            size_of::<String>(),
            None,
            budget,
        )?;
        let value: ItemDefinitionFields =
            serde_json::from_str(source).map_err(|_| InstallError::DefinitionBody)?;
        let exact = canonical.get(id).ok_or(InstallError::DefinitionBody)?.get();
        let value = ItemDefinitionRead::from_verified(id, exact, value, assembly, budget)?;
        preparation
            .resize(
                id.len()
                    .checked_add(value.heap_bytes().ok_or(InstallError::Capacity)?)
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        workspace
            .merge(preparation)
            .map_err(|_| InstallError::Capacity)?;
        items.insert(id.to_owned(), value);
    }
    Ok((items, workspace))
}
