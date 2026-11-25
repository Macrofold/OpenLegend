//! Owned presentation of the selected personal accounts. Canonical source
//! IDs remain available for application only; the provider gets local handles.

use super::*;
use crate::experience::{LiteralReferences, PersonalSourceKind};
use crate::text::JsText;

pub struct RuntimeConsolidationReadings {
    pub readings: Vec<RuntimeConsolidationReading>,
    pub custody: ByteReservation,
}

pub struct RuntimeConsolidationReading {
    pub key: String,
    pub text: JsText,
    pub references: LiteralReferences,
    pub protected: bool,
    pub kind: PersonalSourceKind,
    pub at: f64,
    pub event_type: Option<String>,
    pub source: Option<String>,
}

impl RuntimeConsolidationTicket {
    /// Decode each selected source's reading once at its stored boundary.
    /// The owned facts outlive the PostgreSQL row decoder, independently of
    /// the published request and the ticket's source lease.
    pub fn consolidation_readings(
        &self,
        budget: &ByteBudget,
    ) -> Result<RuntimeConsolidationReadings, RuntimeError> {
        use crate::experience::consolidation::{
            consolidation_key, consolidation_reading, protected_source,
        };

        if !budget.owns(&self._storage) || !self.sources_ready() {
            return Err(failure("consolidation source preparation changed"));
        }
        let sources = self.sources.as_ref().expect("checked exact sources");
        let bytes = sources
            .personal
            .iter()
            .try_fold(size_of::<RuntimeConsolidationReadings>(), |n, captured| {
                let header = captured.record.header();
                n.checked_add(size_of::<RuntimeConsolidationReading>())?
                    .checked_add(header.reference.id.len().checked_mul(6)?)?
                    .checked_add(header.event_type.as_ref().map_or(0, String::len))?
                    .checked_add(header.source.as_ref().map_or(0, String::len))?
                    .checked_add(32)
            })
            .ok_or_else(|| failure("capacity"))?;
        let mut custody = budget.reserve(bytes)?;
        let mut readings = Vec::with_capacity(sources.personal.len());
        for (index, captured) in sources.personal.iter().enumerate() {
            let record = captured.current_record().expect("checked exact source");
            let header = record.header();
            if captured.selection != index {
                return Err(failure("consolidation sources are out of order"));
            }
            let protected = protected_source(header, self.limits.protected_importance);
            let (text, text_custody) = consolidation_reading(record, budget).map_err(failure)?;
            custody.merge(text_custody)?;
            let references = if protected {
                LiteralReferences::default()
            } else {
                let (references, held) = record.read_literal_references(budget).map_err(failure)?;
                custody.merge(held)?;
                references
            };
            let source = if header.reference.kind == PersonalSourceKind::Awareness {
                #[derive(Deserialize)]
                struct Awareness<'a> {
                    modality: &'a str,
                }
                let _decode = budget.reserve(
                    crate::experience::encoded_body_bound(record.payload()).map_err(failure)?,
                )?;
                let facts: Awareness<'_> =
                    serde_json::from_str(record.payload()).map_err(failure)?;
                Some(facts.modality.to_owned())
            } else {
                header.source.clone()
            };
            readings.push(RuntimeConsolidationReading {
                key: consolidation_key(&header.reference).map_err(failure)?,
                text,
                references,
                protected,
                kind: header.reference.kind,
                at: header.at,
                event_type: header.event_type.clone(),
                source,
            });
        }
        Ok(RuntimeConsolidationReadings { readings, custody })
    }
}
