//! A bounded command's actual Source property order is observable by activity
//! learning. Keep immutable encoding beside its complete typed meaning; it is
//! request/record transport, never an alternate writable gameplay object.
use crate::encoding::json_record;
use crate::host::retained_size::map_storage;
use crate::records::SqlCell;
use indexmap::IndexMap;
use serde_json::value::RawValue;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub(super) struct CommandEncoding {
    pub(super) json: Arc<RawValue>,
    fields: usize,
}
impl CommandEncoding {
    pub(super) fn decode(source: &str) -> Result<Self, serde_json::Error> {
        // This existing scalar/JSON codec preserves UTF16, number spelling under
        // JSON.stringify and JS property enumeration, including nested records.
        // The complete command schema is validated before this bounded encoding.
        let cell: SqlCell = serde_json::from_str(source)?;
        let fields = cell
            .as_object()
            .expect("A validated command is an object")
            .len();
        let json = Arc::from(RawValue::from_string(json_record(&cell)?)?);
        Ok(Self { json, fields })
    }
    pub(super) fn edit(
        &self,
        id: Option<&str>,
        remove: &[&str],
    ) -> Result<Self, serde_json::Error> {
        let mut fields: IndexMap<String, Box<RawValue>> = serde_json::from_str(self.json.get())?;
        if let Some(id) = id {
            *fields
                .get_mut("id")
                .expect("Validated command retains its required id") =
                RawValue::from_string(json_record(id)?)?;
        }
        for key in remove {
            fields.shift_remove(*key);
        }
        let count = fields.len();
        let json = Arc::from(RawValue::from_string(json_record(&fields)?)?);
        Ok(Self {
            json,
            fields: count,
        })
    }
    pub(super) fn heap_bytes(&self) -> usize {
        self.json.get().len() + std::mem::size_of::<Arc<RawValue>>()
    }
    pub(super) fn edit_heap_bound(&self, extra: usize) -> Option<usize> {
        // Fund the actual top-level map layout plus copies of its field names,
        // raw children, joined JSON buffer and replacement Arc while old/new
        // encodings coexist. This is a scratch allocation bound, not RSS or a
        // claim that encoded byte quotas measure resident memory.
        self.json
            .get()
            .len()
            .checked_add(extra)?
            .checked_mul(8)?
            .checked_add(map_storage::<String, Box<RawValue>>(
                self.fields.checked_mul(2)?.checked_add(8)?,
            )?)?
            .checked_add(4 * std::mem::size_of::<Self>())
    }
}
