//! One-time current-record import and exact installed-definition verification.
//!
//! Consuming this transport is not a supported simulation installation. Each
//! compiled semantic owner must consume and validate its complete field/row
//! closure; unclaimed input refuses before the host can replace a live runtime.

use std::collections::BTreeSet;
use std::fmt;
use std::sync::Arc;

use indexmap::IndexMap;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::encoding::{content_label, json_record};
use crate::identity::MAX_SAFE_INTEGER;
use crate::records::{CurrentRecords, EntityOrdering, InstalledRow, OwnerCoverage};
use crate::values::{DefinitionPin, is_safe_record_id};

mod coaching;
mod content;
pub(crate) use coaching::ClosedCoachingState;
mod inventory;
pub(crate) use inventory::ClosedInventory;
mod knowledge;
mod retained;
pub(crate) use knowledge::{LearnedCapabilities, install_learned_capabilities};
pub(crate) use retained::{RetainedDefinitionInputs, RetainedDefinitions, install_retained};
mod social;
pub(crate) use social::{SocialSettings, install_social};
mod definitions;
pub(crate) use content::{InstalledContent, TimePolicy, WorldProfile};
pub(crate) use definitions::{
    AuthoredManifest, PhysicalDefinitionInputs, PhysicalMeanings, install_physical_meanings,
};
mod geometry;
pub(crate) use geometry::install_geometry;
mod core;
mod scope;
pub(crate) use core::{CoreInstallError, CoreInstallInput, CoreInstallation, assemble_core};
pub(crate) use scope::finish_record_ownership;

mod physical;
pub(crate) mod rows;
pub(crate) use physical::*;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InstallError {
    CurrentFormat,
    Identity,
    RowIdentity,
    RowPlacement,
    DuplicateRow,
    DuplicateCoverage,
    MissingCoverage,
    ParentPresence,
    UnclaimedRows(Vec<String>),
    UnclaimedCoverage,
    UnclaimedOrdering,
    DefinitionPin,
    DefinitionBody,
    DefinitionCollision,
    UnsupportedFamily(&'static str),
}

impl fmt::Display for InstallError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedFamily(family) => write!(
                f,
                "Native proof does not support the installed {family} family."
            ),
            Self::UnclaimedRows(tables) => write!(
                f,
                "Native installation has no owner for record tables: {}.",
                tables.join(", ")
            ),
            Self::DefinitionBody | Self::DefinitionCollision => {
                f.write_str("Native definition content does not match its installed meaning.")
            }
            Self::DefinitionPin => {
                f.write_str("Native definition identity does not match its installed content.")
            }
            Self::CurrentFormat => {
                f.write_str("Native installation requires the current record format.")
            }
            Self::MissingCoverage | Self::UnclaimedCoverage | Self::UnclaimedOrdering => {
                f.write_str("Native installation has incomplete record ownership coverage.")
            }
            Self::ParentPresence => {
                f.write_str("Native record ownership disagrees with its parent presence.")
            }
            _ => f.write_str("Invalid native installation record identity or placement."),
        }
    }
}
impl std::error::Error for InstallError {}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DefinitionInput {
    pub pin: DefinitionPin,
    /// Existing canonicalJson bytes supplied once by the authored owner. Native
    /// code never substitutes Rust lexical ordering for localeCompare.
    pub canonical: String,
    /// Source JSON enumeration order is observable in acquisition signatures;
    /// canonicalJson's sorted identity bytes cannot reproduce that spelling.
    pub source: String,
}

/// The installed family supplies identity fields; the bridge does not redefine
/// its meaning or register arbitrary executable family callbacks.
pub trait DefinitionIdentity {
    fn definition_id(&self) -> &str;
    fn definition_version(&self) -> u64;
}

impl DefinitionIdentity for crate::status::AttributeDefinition {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl DefinitionIdentity for crate::reception::SenseDefinition {
    fn definition_id(&self) -> &str {
        self.id()
    }
    fn definition_version(&self) -> u64 {
        self.version()
    }
}
impl DefinitionIdentity for crate::reception::AcousticPolicy {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl DefinitionIdentity for crate::native_response::NativeResponseProfile {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

#[derive(Debug)]
pub struct VerifiedDefinition<T> {
    pin: DefinitionPin,
    canonical: Arc<str>,
    source: Arc<str>,
    value: T,
}

impl DefinitionInput {
    /// `expected` is the complete typed definition consumed from the actual
    /// installed world record. A small content label alone is never equality.
    pub fn verify<T>(self, expected: T) -> Result<VerifiedDefinition<T>, InstallError>
    where
        T: DefinitionIdentity + DeserializeOwned + PartialEq,
    {
        if !self.pin.is_valid()
            || self.pin.id != expected.definition_id()
            || self.pin.version != expected.definition_version()
            || content_label(&self.canonical) != self.pin.digest
        {
            return Err(InstallError::DefinitionPin);
        }
        let decoded: T =
            serde_json::from_str(&self.canonical).map_err(|_| InstallError::DefinitionBody)?;
        let source: T =
            serde_json::from_str(&self.source).map_err(|_| InstallError::DefinitionBody)?;
        if decoded != expected || source != expected {
            return Err(InstallError::DefinitionBody);
        }
        Ok(VerifiedDefinition {
            pin: self.pin,
            canonical: Arc::from(self.canonical),
            source: Arc::from(self.source),
            // canonicalJson sorts record keys for identity. The actual source
            // record retains its own declared enumeration order; validating its
            // canonical content must not replace that order with sorted keys.
            value: expected,
        })
    }
}

impl<T> VerifiedDefinition<T> {
    pub fn pin(&self) -> &DefinitionPin {
        &self.pin
    }
    pub fn canonical(&self) -> &str {
        &self.canonical
    }
    pub fn source(&self) -> &str {
        &self.source
    }
    pub fn value(&self) -> &T {
        &self.value
    }
    pub fn into_value(self) -> T {
        self.value
    }

    pub fn same_content(&self, other: &Self) -> bool {
        self.pin == other.pin && self.canonical == other.canonical && self.source == other.source
    }
}

/// The existing application format owner supplies its marker. No copied marker,
/// legacy reader, fallback schema or self-selected migration is created here.
pub struct CurrentFormat<'a> {
    pub database_schema: &'a str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedCut {
    pub world_id: String,
    pub generation: String,
    pub durable_revision: u64,
    pub row_count: usize,
}

pub struct ImportedCollection {
    pub rows: Vec<InstalledRow>,
    pub coverage: OwnerCoverage,
}

/// Owns each imported row until its real canonical owner consumes it. This
/// process-local index is discarded when installation finishes; it is neither a
/// writable world nor an alternative current-row database.
pub struct RowImport {
    world_id: String,
    generation: String,
    durable_revision: u64,
    row_count: usize,
    tables: IndexMap<String, IndexMap<String, Vec<InstalledRow>>>,
    coverage: IndexMap<(String, String), OwnerCoverage>,
    entity_ordering: Option<EntityOrdering>,
    failed: bool,
}

fn canonical_path(value: &str) -> Result<Vec<String>, InstallError> {
    let path: Vec<String> = serde_json::from_str(value).map_err(|_| InstallError::RowIdentity)?;
    if json_record(&path).map_err(|_| InstallError::RowIdentity)? != value {
        return Err(InstallError::RowIdentity);
    }
    Ok(path)
}

impl RowImport {
    pub fn new(input: CurrentRecords, format: CurrentFormat<'_>) -> Result<Self, InstallError> {
        if input.database_schema != format.database_schema {
            return Err(InstallError::CurrentFormat);
        }
        if !is_safe_record_id(&input.world_id)
            || input.generation.is_empty()
            || input.durable_revision > MAX_SAFE_INTEGER
        {
            return Err(InstallError::Identity);
        }
        let mut coverage = IndexMap::new();
        for owner in input.coverage {
            canonical_path(&owner.owner)?;
            if owner.table.is_empty() || owner.next_ordinal > MAX_SAFE_INTEGER {
                return Err(InstallError::RowPlacement);
            }
            if coverage
                .insert((owner.table.clone(), owner.owner.clone()), owner)
                .is_some()
            {
                return Err(InstallError::DuplicateCoverage);
            }
        }
        let mut row_count = 0;
        let mut tables = IndexMap::new();
        for (table, rows) in input.tables {
            if table.is_empty() {
                return Err(InstallError::RowIdentity);
            }
            let mut identities = BTreeSet::new();
            let mut placements = BTreeSet::new();
            let mut owners: IndexMap<String, Vec<InstalledRow>> = IndexMap::new();
            for row in rows {
                let path = canonical_path(&row.id)?;
                if row.position > MAX_SAFE_INTEGER || !identities.insert(row.id.clone()) {
                    return Err(InstallError::DuplicateRow);
                }
                if path.is_empty() {
                    if !row.parent.is_empty() || !row.slot.is_empty() {
                        return Err(InstallError::RowPlacement);
                    }
                } else {
                    let parent = canonical_path(&row.parent)?;
                    // Keyed lists identify the semantic member in `id`, while
                    // `slot` is its storage-list position. Only the compiled
                    // schema owner can bind those two current-format meanings.
                    if parent.len() >= path.len() || !path.starts_with(&parent) {
                        return Err(InstallError::RowPlacement);
                    }
                }
                if !placements.insert((row.parent.clone(), row.slot.clone())) {
                    return Err(InstallError::DuplicateRow);
                }
                owners.entry(row.parent.clone()).or_default().push(row);
                row_count += 1;
            }
            // A table's owning schema decides whether positions are unique or
            // merely placement metadata. Stable sorting preserves actual input
            // order for the schema's explicitly unordered equal-position rows.
            for rows in owners.values_mut() {
                rows.sort_by_key(|row| row.position)
            }
            tables.insert(table, owners);
        }
        Ok(Self {
            world_id: input.world_id,
            generation: input.generation,
            durable_revision: input.durable_revision,
            row_count,
            tables,
            coverage,
            entity_ordering: Some(input.entity_ordering),
            failed: false,
        })
    }

    pub fn world_id(&self) -> &str {
        &self.world_id
    }
    pub fn generation(&self) -> &str {
        &self.generation
    }
    pub fn durable_revision(&self) -> u64 {
        self.durable_revision
    }
    /// Entity ordering has one compiled owner. SQL placement positions do not
    /// reconstruct the collection's insertion counter or relabeled keys.
    pub fn take_entity_ordering(&mut self) -> Result<EntityOrdering, InstallError> {
        self.entity_ordering
            .take()
            .ok_or(InstallError::UnclaimedOrdering)
    }

    /// Collections require explicit current coverage, including genuine empty
    /// or absent owners. Omitted coverage never becomes an empty collection.
    pub fn take_collection(
        &mut self,
        table: &str,
        owner: &str,
    ) -> Result<ImportedCollection, InstallError> {
        if self.failed {
            return Err(InstallError::CurrentFormat);
        };
        let key = (table.to_owned(), owner.to_owned());
        let Some(coverage) = self.coverage.shift_remove(&key) else {
            self.failed = true;
            return Err(InstallError::MissingCoverage);
        };
        let rows = self.take_owner_rows(table, owner);
        if !coverage.parent_present && !rows.is_empty() {
            self.failed = true;
            return Err(InstallError::ParentPresence);
        }
        Ok(ImportedCollection { rows, coverage })
    }

    /// Singleton/definition owners consume the current schema's own known table;
    /// only compiled owners call this, never an external generic write request.
    pub fn take_table(&mut self, table: &str) -> Vec<InstalledRow> {
        self.tables
            .shift_remove(table)
            .map(|owners| owners.into_values().flatten().collect())
            .unwrap_or_default()
    }

    pub fn take_owner_rows(&mut self, table: &str, owner: &str) -> Vec<InstalledRow> {
        let Some(owners) = self.tables.get_mut(table) else {
            return Vec::new();
        };
        let rows = owners.shift_remove(owner).unwrap_or_default();
        if owners.is_empty() {
            self.tables.shift_remove(table);
        }
        rows
    }

    /// No semantic success is returned here: this only proves that the supplied
    /// rows/coverage have an owner. The host needs the complete supported-family
    /// validation and actual consumer pipeline before accepting a runtime.
    pub fn finish(self) -> Result<ImportedCut, InstallError> {
        if self.failed {
            return Err(InstallError::CurrentFormat);
        };
        if !self.tables.is_empty() {
            return Err(InstallError::UnclaimedRows(
                self.tables.into_keys().collect(),
            ));
        }
        if !self.coverage.is_empty() {
            return Err(InstallError::UnclaimedCoverage);
        }
        if self.entity_ordering.is_some() {
            return Err(InstallError::UnclaimedOrdering);
        }
        Ok(ImportedCut {
            world_id: self.world_id,
            generation: self.generation,
            durable_revision: self.durable_revision,
            row_count: self.row_count,
        })
    }
}
