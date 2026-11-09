//! Immutable authored records used by permitted formatting and dependency
//! checks. Retaining an unused definition never enables its action family.
//! Dynamic state cannot enter this finite owner or be changed through it.

use super::rows::{take_collection, take_one, validate_map_row};
use super::{CanonicalInput, InstallError, RowImport, WorldChildren};
use crate::records::{InstalledRow, RecordSchema};
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::Value;

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
    pub knowledge_policy: Option<RetainedOne>,
    pub knowledge_limits: Option<crate::knowledge::KnowledgePolicy>,
    pub item_handling: RetainedOne,
    pub item_handling_read: ItemHandlingReadPolicy,
    pub gathering_policy: Option<RetainedOne>,
    pub work_batch_policy: Option<RetainedOne>,
    pub social_offer_policy: Option<RetainedOne>,
    pub hearth_definitions: Option<RetainedMap>,
    pub assembly_families: Option<RetainedMap>,
    pub construction_profile: Option<RetainedOne>,
    pub contents_exposure_profiles: Option<RetainedMap>,
    pub daily_rain_definitions: Option<RetainedMap>,
    pub participation_policy: Option<RetainedOne>,
    pub participation_read: Option<ParticipationReadPolicy>,
    pub native_strikes: Option<RetainedMap>,
    pub native_foraging_profiles: Option<RetainedMap>,
    pub supply_opportunities: Option<RetainedMap>,
    pub food_preparations: RetainedMap,
    pub cast_definitions: RetainedMap,
    pub invention_policy: RetainedOne,
    pub story_policy: Option<RetainedOne>,
    pub item_definitions: RetainedMap,
    pub recipes: RetainedMap,
    pub flight_routes: RetainedMap,
    pub places: RetainedMap,
}

/// Derived once from the same validated immutable definition body. Read-only
/// trade presentation needs these fields; item effects remain unsupported.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ItemHandlingReadPolicy {
    enabled: bool,
    actor_body_profiles: Vec<String>,
}
impl ItemHandlingReadPolicy {
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
    pub safe_return_anchor: Option<crate::state::SurfacePoint>,
}

struct Reader<'a> {
    import: &'a mut RowImport,
    children: &'a mut WorldChildren,
    schema: &'a RecordSchema,
}
impl Reader<'_> {
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
            take_one::<Value>(self.import, table, "[\"world\"]", field, false)?;
            return Ok(Some(RetainedOne::Null));
        }
        let present = self.presence(field, input.as_ref())?;
        let value = take_one::<Value>(self.import, table, "[\"world\"]", field, present)?;
        match (value, input) {
            (Some((row, value)), Some(input)) => {
                self.plain(table, &row)?;
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
        let present = self.presence(field, input.as_ref())?;
        let collection = take_collection(self.import, table, "[\"world\"]", present, true)?;
        let Some(input) = input else { return Ok(None) };
        let mut assembled = serde_json::Map::new();
        let mut rows = IndexMap::with_capacity(collection.rows.len());
        for row in collection.rows {
            validate_map_row(
                &row,
                "[\"world\"]",
                field,
                &row.slot,
                collection.coverage.next_ordinal,
            )?;
            self.plain(table, &row)?;
            let value =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if assembled.insert(row.slot.clone(), value).is_some() {
                return Err(InstallError::DuplicateRow);
            }
            rows.insert(row.slot.clone(), row);
        }
        input.verify_json(&Value::Object(assembled))?;
        Ok(Some(RetainedMap {
            rows,
            next_ordinal: collection.coverage.next_ordinal,
        }))
    }
}

pub(crate) fn install_retained(
    import: &mut RowImport,
    children: &mut WorldChildren,
    input: RetainedDefinitionInputs,
    schema: &RecordSchema,
) -> Result<RetainedDefinitions, InstallError> {
    let mut r = Reader {
        import,
        children,
        schema,
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
    let item_handling_read =
        serde_json::from_str(item_handling.payload()).map_err(|_| InstallError::CurrentFormat)?;
    let participation_policy = r.one(
        "participationPolicy",
        "config_participation",
        input.participation_policy,
    )?;
    let participation_read = participation_policy
        .as_ref()
        .map(|policy| serde_json::from_str(policy.payload()))
        .transpose()
        .map_err(|_| InstallError::CurrentFormat)?
        .flatten();
    let knowledge_limits = knowledge_policy.as_ref()
        .map(|policy| serde_json::from_str::<Option<crate::knowledge::KnowledgePolicy>>(policy.payload()))
        .transpose().map_err(|_| InstallError::CurrentFormat)?.flatten();
    Ok(RetainedDefinitions {
        knowledge_policy,
        knowledge_limits,
        item_handling,
        item_handling_read,
        gathering_policy: r.one(
            "gatheringPolicy",
            "config_gathering",
            input.gathering_policy,
        )?,
        work_batch_policy: r.one(
            "workBatchPolicy",
            "config_work_batches",
            input.work_batch_policy,
        )?,
        social_offer_policy: r.one(
            "socialOfferPolicy",
            "config_social_offers",
            input.social_offer_policy,
        )?,
        hearth_definitions: r.map(
            "hearthDefinitions",
            "config_hearth_definitions",
            input.hearth_definitions,
        )?,
        assembly_families: r.map(
            "assemblyFamilies",
            "config_assembly_families",
            input.assembly_families,
        )?,
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
        native_strikes: r.map(
            "nativeStrikes",
            "config_native_strikes",
            input.native_strikes,
        )?,
        native_foraging_profiles: r.map(
            "nativeForagingProfiles",
            "config_native_foraging_profiles",
            input.native_foraging_profiles,
        )?,
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
        invention_policy: r
            .one(
                "inventionPolicy",
                "config_invention",
                Some(input.invention_policy),
            )?
            .ok_or(InstallError::ParentPresence)?,
        story_policy: r.one("storyPolicy", "config_story", input.story_policy)?,
        item_definitions: r
            .map(
                "itemDefinitions",
                "definition_items",
                Some(input.item_definitions),
            )?
            .ok_or(InstallError::ParentPresence)?,
        recipes: r
            .map("recipes", "definition_recipes", Some(input.recipes))?
            .ok_or(InstallError::ParentPresence)?,
        flight_routes: r
            .map(
                "flightRoutes",
                "sim_flight_routes",
                Some(input.flight_routes),
            )?
            .ok_or(InstallError::ParentPresence)?,
        places: r
            .map("places", "definition_places", Some(input.places))?
            .ok_or(InstallError::ParentPresence)?,
    })
}
