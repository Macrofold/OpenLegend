//! Decode only fields used by the native source header. The canonical record
//! stays encoded: an unrelated quoted text may contain exact UTF-16 code units
//! that serde_json::Value cannot represent and must never normalize or reject.

use super::ExperienceError;
use indexmap::IndexMap;
use serde_json::{Map, Value, value::RawValue};

enum Field {
    Scalar,
    Object(&'static [(&'static str, Field)]),
    Array(&'static [(&'static str, Field)]),
}
use Field::{Array, Object, Scalar};
const FACT: &[(&str, Field)] = &[("source", Scalar), ("ordinal", Scalar)];
const PROOF: &[(&str, Field)] = &[
    ("original", Scalar),
    ("confirmation", Scalar),
    ("aliases", Scalar),
];
const MOTION_SAMPLE: &[(&str, Field)] = &[
    ("original", Scalar),
    ("confirmation", Scalar),
    ("aliases", Scalar),
];
const FACET: &[(&str, Field)] = &[
    ("ordinal", Scalar),
    ("support", Object(PROOF)),
    (
        "value",
        Object(&[
            ("kind", Scalar),
            ("learningSupport", Scalar),
            ("support", Array(FACT)),
            ("subject", Scalar),
            ("speaker", Object(&[("kind", Scalar), ("subject", Scalar)])),
            ("supportAliases", Array(&[("id", Scalar)])),
            (
                "boundary",
                Object(&[
                    ("nearSurface", Object(&[("support", Object(FACT))])),
                    ("farSurface", Object(&[("support", Object(FACT))])),
                ]),
            ),
            ("earlier", Object(MOTION_SAMPLE)),
            ("later", Object(MOTION_SAMPLE)),
        ]),
    ),
];
const ORIGINAL: &[(&str, Field)] = &[
    ("id", Scalar),
    ("revision", Scalar),
    (
        "context",
        Object(&[("subjects", Array(&[("track", Scalar)]))]),
    ),
    ("origin", Object(&[("kind", Scalar), ("eventId", Scalar)])),
    ("facets", Array(FACET)),
];
const SPEECH: &[(&str, Field)] = &[
    ("perception", Scalar),
    ("segments", Array(&[("kind", Scalar)])),
];
const ROOT: &[(&str, Field)] = &[
    ("id", Scalar),
    ("actorId", Scalar),
    ("eventId", Scalar),
    ("at", Scalar),
    ("to", Scalar),
    ("sequence", Scalar),
    ("kind", Scalar),
    ("source", Scalar),
    ("importance", Scalar),
    ("entityIds", Scalar),
    ("eventType", Scalar),
    ("sourceId", Scalar),
    ("targetId", Scalar),
    ("activityId", Scalar),
    ("sourceReceipt", Scalar),
    ("retentionClass", Scalar),
    ("expiresAt", Scalar),
    ("resolved", Scalar),
    ("retention", Scalar),
    (
        "obligation",
        Object(&[
            ("revision", Scalar),
            ("evidenceId", Scalar),
            ("status", Scalar),
            ("dueAt", Scalar),
            ("completion", Object(&[("eventType", Scalar)])),
        ]),
    ),
    ("speech", Object(SPEECH)),
    ("recognition", Object(&[("learningSupport", Scalar)])),
    (
        "evidence",
        Object(&[
            ("actorId", Scalar),
            ("speech", Object(SPEECH)),
            ("sourceSubject", Scalar),
            (
                "recognition",
                Object(&[
                    ("subject", Scalar),
                    ("learnedSubject", Scalar),
                    ("candidates", Array(&[("individualId", Scalar)])),
                    ("learningSupport", Scalar),
                ]),
            ),
            ("observation", Object(ORIGINAL)),
            ("observations", Array(ORIGINAL)),
        ]),
    ),
    ("observation", Object(ORIGINAL)),
    ("observations", Array(ORIGINAL)),
    ("sources", Scalar),
    (
        "manifest",
        Object(&[
            ("coverage", Scalar),
            ("receipts", Scalar),
            ("observations", Array(ORIGINAL)),
            (
                "speech",
                Array(&[("sourceSubject", Scalar), ("sources", Scalar)]),
            ),
        ]),
    ),
    (
        "impression",
        Object(&[
            ("reason", Scalar),
            ("weakened", Scalar),
            ("weakenAt", Scalar),
            ("expiresAt", Scalar),
            (
                "dependencies",
                Array(&[("source", Scalar), ("aliases", Scalar), ("id", Scalar)]),
            ),
            ("claims", Array(&[("kind", Scalar), ("subject", Scalar)])),
        ]),
    ),
];
fn invalid() -> ExperienceError {
    ExperienceError::InvalidBody("personal source header")
}
fn object(raw: &RawValue, fields: &[(&str, Field)]) -> Result<Value, ExperienceError> {
    // Keep invalid scalar/null values for the existing header validator to
    // reject at its owning required/optional field, rather than erase presence.
    if !raw.get().trim_start().starts_with('{') {
        return serde_json::from_str(raw.get()).map_err(|_| invalid());
    }
    let input: IndexMap<String, &RawValue> =
        serde_json::from_str(raw.get()).map_err(|_| invalid())?;
    project_fields(|name| input.get(name).copied(), fields)
}
fn project_fields<'a>(
    get: impl Fn(&str) -> Option<&'a RawValue>,
    fields: &[(&str, Field)],
) -> Result<Value, ExperienceError> {
    let mut result = Map::new();
    for (name, field) in fields {
        let Some(raw) = get(name) else {
            continue;
        };
        let value = match field {
            Scalar => serde_json::from_str(raw.get()).map_err(|_| invalid())?,
            Object(fields) => object(raw, fields)?,
            Array(fields) => {
                if !raw.get().trim_start().starts_with('[') {
                    serde_json::from_str(raw.get()).map_err(|_| invalid())?
                } else {
                    let items: Vec<&RawValue> =
                        serde_json::from_str(raw.get()).map_err(|_| invalid())?;
                    Value::Array(
                        items
                            .into_iter()
                            .map(|raw| object(raw, fields))
                            .collect::<Result<_, _>>()?,
                    )
                }
            }
        };
        result.insert((*name).to_owned(), value);
    }
    Ok(Value::Object(result))
}
pub(super) fn header_fields(
    fields: &IndexMap<String, Box<RawValue>>,
) -> Result<Value, ExperienceError> {
    project_fields(|name| fields.get(name).map(Box::as_ref), ROOT)
}
pub(super) fn header_input(encoded: &str) -> Result<Value, ExperienceError> {
    let raw: &RawValue = serde_json::from_str(encoded).map_err(|_| invalid())?;
    object(raw, ROOT)
}
