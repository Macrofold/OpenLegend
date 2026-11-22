//! Owned presentation of the selected personal accounts. Canonical source
//! IDs remain available for application only; the provider gets local handles.

use super::*;
use crate::experience::PersonalSourceKind;
use crate::text::JsText;

pub struct RuntimeConsolidationReadings {
    pub readings: Vec<RuntimeConsolidationReading>,
    pub custody: ByteReservation,
}

pub struct RuntimeConsolidationReading {
    pub key: String,
    pub text: JsText,
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
        use crate::experience::consolidation::{consolidation_key, consolidation_reading};

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
            let protected = header.importance >= self.limits.protected_importance;
            let (mut text, mut text_custody) =
                consolidation_reading(record, budget).map_err(failure)?;
            if !protected {
                let (redacted, redaction) = without_routing_annotations(&text, budget)?;
                if let Some(redacted) = redacted {
                    text = redacted;
                    text_custody = redaction;
                }
            }
            custody.merge(text_custody)?;
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

// Matches Source's historicalAccountText projection without replacing isolated
// UTF-16 units. Stored protected text never passes through this projection.
fn without_routing_annotations(
    text: &JsText,
    budget: &ByteBudget,
) -> Result<(Option<JsText>, ByteReservation), RuntimeError> {
    const PREFIX: [u16; 4] = [40, 73, 68, 58];
    if !text.units().any(|unit| unit == PREFIX[0]) {
        return Ok((None, budget.reserve(0)?));
    }
    let bytes = text
        .units_len()
        .checked_mul(20)
        .ok_or_else(|| failure("capacity"))?;
    let mut custody = budget.reserve(bytes)?;
    let units: Vec<_> = text.units().collect();
    let mut retained = Vec::with_capacity(units.len());
    let mut i = 0;
    while i < units.len() {
        if units[i..].starts_with(&PREFIX) {
            let rest = &units[i + PREFIX.len()..];
            let end = rest.iter().position(|&unit| {
                matches!(unit, 40 | 41)
                    || char::from_u32(unit.into()).is_some_and(crate::encoding::is_js_whitespace)
            });
            if let Some(end) = end.filter(|&end| end != 0 && rest[end] == 41) {
                while matches!(retained.last(), Some(9 | 32)) {
                    retained.pop();
                }
                i += PREFIX.len() + end + 1;
                continue;
            }
        }
        retained.push(units[i]);
        i += 1;
    }
    let result = (retained.len() != units.len()).then(|| JsText::from_units(retained));
    custody.resize(result.as_ref().map_or(0, JsText::storage_bytes))?;
    Ok((result, custody))
}
