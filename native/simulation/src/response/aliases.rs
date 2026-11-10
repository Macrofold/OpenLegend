//! Resolve only the issued structured handles and explicit ID markers. Bare
//! names and quoted ordinary prose never discover a mechanical target.
use super::*;
use crate::{records::SqlCell, text::JsText};

pub(crate) struct ResponseAliases<'a> {
    pub entities: &'a IndexMap<String, String>,
    pub physical: &'a IndexMap<String, String>,
    pub intentions: &'a IndexMap<String, String>,
    pub knowledge: &'a IndexMap<String, crate::reception::ObserverSubject>,
    pub identities: &'a IndexMap<String, crate::reception::ObserverSubject>,
}
fn invalid() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
}
fn reserve(storage: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    storage.resize(
        storage
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
fn object(value: &mut SqlCell) -> Result<&mut IndexMap<String, SqlCell>, ExecutionError> {
    match value {
        SqlCell::Object(value) => Ok(value),
        _ => Err(invalid()),
    }
}
fn scalar(
    value: &mut SqlCell,
    map: &IndexMap<String, String>,
    storage: &mut ByteReservation,
) -> Result<(), ExecutionError> {
    if value.is_null() {
        return Ok(());
    }
    let target = value
        .as_str()
        .and_then(|key| map.get(key))
        .ok_or_else(invalid)?;
    reserve(storage, target.len())?;
    *value = target.as_str().into();
    Ok(())
}
fn marker(units: &[u16], mut at: usize) -> Option<(usize, usize, usize)> {
    while at + 4 < units.len() {
        if units[at..at + 4] != [40, 73, 68, 58] {
            at += 1;
            continue;
        }
        let start = at;
        at += 4;
        let key = at;
        while at < units.len()
            && units[at] != 40
            && units[at] != 41
            && !char::from_u32(u32::from(units[at])).is_some_and(crate::encoding::is_js_whitespace)
        {
            at += 1;
        }
        if at > key && units.get(at) == Some(&41) {
            return Some((start, key, at));
        }
        // A failed candidate stops at the next parenthesis or whitespace, just
        // as Source's [^()\s]+. It cannot repeatedly rescan a long suffix.
    }
    None
}
fn marker_target<'a>(
    units: &[u16],
    aliases: &'a ResponseAliases<'_>,
    intention: bool,
) -> Result<Option<&'a str>, ExecutionError> {
    let key = String::from_utf16(units).map_err(|_| invalid())?;
    if intention {
        if !aliases.entities.contains_key(&key) {
            return Err(invalid());
        }
        Ok(aliases.intentions.get(&key).map(String::as_str))
    } else {
        aliases
            .physical
            .get(&key)
            .map(|value| Some(value.as_str()))
            .ok_or_else(invalid)
    }
}
fn markers(
    text: &JsText,
    aliases: &ResponseAliases<'_>,
    intention: bool,
    budget: &ByteBudget,
) -> Result<Option<(JsText, ByteReservation)>, ExecutionError> {
    let count = text.units_len();
    let mut storage = budget.reserve(count.checked_mul(5).ok_or(ExecutionError::Capacity)?)?;
    let units: Vec<_> = text.units().collect();
    let mut at = 0;
    let mut length = count;
    let mut found = false;
    while let Some((start, key, end)) = marker(&units, at) {
        found = true;
        let target = marker_target(&units[key..end], aliases, intention)?;
        let replacement = target.map_or(14, |target| target.encode_utf16().count() + 5);
        length = length
            .checked_sub(end + 1 - start)
            .and_then(|n| n.checked_add(replacement))
            .ok_or(ExecutionError::Capacity)?;
        at = end + 1;
    }
    if !found {
        return Ok(None);
    }
    // from_units may temporarily hold UTF8 and exact quoted UTF16 encodings.
    storage.resize(
        count
            .checked_mul(5)
            .and_then(|n| n.checked_add(length.checked_mul(20)?))
            .and_then(|n| n.checked_add(64))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut result = Vec::with_capacity(length);
    let mut copied = 0;
    while let Some((start, key, end)) = marker(&units, copied) {
        result.extend_from_slice(&units[copied..start]);
        if let Some(target) = marker_target(&units[key..end], aliases, intention)? {
            result.extend("(ID:".encode_utf16());
            result.extend(target.encode_utf16());
            result.push(41);
        } else {
            result.extend("(unidentified)".encode_utf16());
        }
        copied = end + 1;
    }
    result.extend_from_slice(&units[copied..]);
    let result = JsText::from_units(result);
    drop(units);
    storage.resize(result.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(Some((result, storage)))
}
fn prose(
    value: &mut SqlCell,
    aliases: &ResponseAliases<'_>,
    intention: bool,
    budget: &ByteBudget,
    storage: &mut ByteReservation,
) -> Result<(), ExecutionError> {
    if value.is_null() {
        return Ok(());
    }
    let text = value.as_text().ok_or_else(invalid)?;
    if let Some((text, custody)) = markers(text, aliases, intention, budget)? {
        storage.merge(custody)?;
        *value = SqlCell::Text(text);
    }
    Ok(())
}

impl ActorResponse {
    /// Appraisal proposals select the ticket's captured policies, records and
    /// personally admitted causes before the ordinary response owner sees them.
    pub(crate) fn resolve_appraisals(
        &mut self,
        state: &crate::simulation::SimulationState,
        bindings: Option<&PreparedResponseAppraisals>,
        subjects: &IndexMap<String, String>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let root = object(&mut self.value)?;
        let SqlCell::Array(operations) = root.get_mut("operations").ok_or_else(invalid)? else {
            return Err(invalid());
        };
        for operation in operations {
            let operation = object(operation)?;
            let Some(value) = operation
                .get_mut("appraise")
                .filter(|value| !value.is_null())
            else {
                continue;
            };
            let bindings = bindings.ok_or_else(invalid)?;
            let (resolved, storage) = bindings.resolve(state, value, subjects, budget)?;
            self._reservation.merge(storage)?;
            *value = resolved;
        }
        self._reservation.resize(
            self.value
                .heap_bytes()
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }

    /// Source entity-references.ts::resolveResponseEntities, over a native
    /// ticket's maps. The input envelope has already passed its syntax owner.
    pub(crate) fn resolve_entities(
        &mut self,
        aliases: &ResponseAliases<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let root = object(&mut self.value)?;
        let SqlCell::Array(operations) = root.get_mut("operations").ok_or_else(invalid)? else {
            return Err(invalid());
        };
        let storage = &mut self._reservation;
        for operation in operations {
            let operation = object(operation)?;
            if let Some(talk) = operation.get_mut("talk").filter(|value| !value.is_null()) {
                let talk = object(talk)?;
                talk.shift_remove("addresseeRole");
                let target = talk.get_mut("addresseeEntityId").ok_or_else(invalid)?;
                if !target.is_null() {
                    let physical = target
                        .as_str()
                        .is_some_and(|key| aliases.physical.contains_key(key));
                    scalar(target, aliases.entities, storage)?;
                    let role = if physical { "body" } else { "remembered" };
                    reserve(
                        storage,
                        "addresseeRole".len()
                            + role.len()
                            + map_storage::<String, SqlCell>(1).ok_or(ExecutionError::Capacity)?,
                    )?;
                    talk.insert("addresseeRole".into(), role.into());
                }
            }
            if let Some(note) = operation.get_mut("note").filter(|value| !value.is_null()) {
                let note = object(note)?;
                let subject = note.get_mut("subjectId").ok_or_else(invalid)?;
                if !subject.is_null()
                    && !subject.as_str().is_some_and(|key| {
                        aliases.knowledge.contains_key(key) || aliases.identities.contains_key(key)
                    })
                {
                    scalar(subject, aliases.entities, storage)?;
                }
                prose(
                    note.get_mut("text").ok_or_else(invalid)?,
                    aliases,
                    true,
                    budget,
                    storage,
                )?;
            }
            if let Some(name) = operation.get_mut("name").filter(|value| !value.is_null()) {
                let subject = object(name)?.get_mut("subjectId").ok_or_else(invalid)?;
                if !subject
                    .as_str()
                    .is_some_and(|key| aliases.identities.contains_key(key))
                {
                    scalar(subject, aliases.entities, storage)?;
                }
            }
            if let Some(think) = operation.get_mut("think").filter(|value| !value.is_null()) {
                let think = object(think)?;
                prose(
                    think.get_mut("text").ok_or_else(invalid)?,
                    aliases,
                    true,
                    budget,
                    storage,
                )?;
                let SqlCell::Array(subjects) =
                    think.get_mut("aboutEntityIds").ok_or_else(invalid)?
                else {
                    return Err(invalid());
                };
                for subject in subjects {
                    scalar(subject, aliases.entities, storage)?;
                }
            }
            if let Some(goal) = operation.get_mut("goal").filter(|value| !value.is_null()) {
                prose(
                    object(goal)?.get_mut("objective").ok_or_else(invalid)?,
                    aliases,
                    true,
                    budget,
                    storage,
                )?;
            }
            if let Some(act) = operation.get_mut("act").filter(|value| !value.is_null()) {
                let act = object(act)?;
                if let Some(target) = act.get_mut("targetEntityId") {
                    scalar(target, aliases.physical, storage)?;
                }
                if let Some(description) = act.get_mut("description") {
                    prose(description, aliases, false, budget, storage)?;
                }
                if let Some(slots) = act.get_mut("slots").filter(|value| !value.is_null()) {
                    for (field, value) in object(slots)? {
                        if ["itemId", "instrumentId", "recipientId"].contains(&field.as_str()) {
                            scalar(value, aliases.physical, storage)?;
                        }
                    }
                }
                if let Some(invocation) = act.get_mut("invocation").filter(|value| !value.is_null())
                {
                    let invocation = object(invocation)?;
                    for field in ["targetEntityId", "itemId"] {
                        if let Some(value) = invocation.get_mut(field) {
                            scalar(value, aliases.physical, storage)?;
                        }
                    }
                    // Move is the selected invocation executor and accepts no
                    // parameters. Other invocation families remain opaque here
                    // and receive the action owner's explicit family refusal;
                    // their fields cannot become authority through a guessed
                    // activity schema or discard independent response parts.
                }
            }
        }
        storage.resize(
            self.value
                .heap_bytes()
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
}

fn reflection_subject_cell(
    subject: &crate::reception::ObserverSubject,
    storage: &mut ByteReservation,
) -> Result<SqlCell, ExecutionError> {
    let length = crate::encoding::json_record_len(subject).map_err(|_| invalid())?;
    reserve(
        storage,
        length
            .checked_mul(2)
            .map(|n| n.max(8))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let json = crate::encoding::json_record(subject).map_err(|_| invalid())?;
    reserve(storage, crate::experience::encoded_body_bound(&json)?)?;
    serde_json::from_str(&json).map_err(|_| invalid())
}
impl ResponseAliases<'_> {
    /// Reflection uses the same offered handles and marker grammar as ordinary
    /// response edits. Only the native ticket supplies these maps.
    pub(crate) fn resolve_interpretation_records(
        &self,
        value: &mut SqlCell,
        evidence: &IndexMap<String, String>,
        storage: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        let SqlCell::Array(records) = value else {
            return Err(invalid());
        };
        for record in records {
            let record = object(record)?;
            if record.get("operation").and_then(SqlCell::as_str) == Some("remove") {
                continue;
            }
            let subject = record.get_mut("subjectId").ok_or_else(invalid)?;
            if !subject.is_null() {
                let selected = subject
                    .as_str()
                    .and_then(|key| self.identities.get(key))
                    .ok_or_else(invalid)?;
                *subject = reflection_subject_cell(selected, storage)?;
            }
            let SqlCell::Array(links) = record.get_mut("evidence").ok_or_else(invalid)? else {
                return Err(invalid());
            };
            for link in links {
                scalar(
                    object(link)?.get_mut("id").ok_or_else(invalid)?,
                    evidence,
                    storage,
                )?;
            }
        }
        Ok(())
    }
    pub(crate) fn resolve_reflection_proposal(
        &self,
        publication: &mut SqlCell,
        evidence: &IndexMap<String, String>,
        appraisals: Option<&PreparedResponseAppraisals>,
        state: &crate::simulation::SimulationState,
        budget: &ByteBudget,
        storage: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        for field in ["nameChanges", "knowledgeChanges"] {
            let SqlCell::Array(changes) =
                object(publication)?.get_mut(field).ok_or_else(invalid)?
            else {
                return Err(invalid());
            };
            for change in changes {
                let change = object(change)?;
                let subject = change.get_mut("subjectId").ok_or_else(invalid)?;
                if !subject.is_null() {
                    if !subject.as_str().is_some_and(|key| {
                        self.identities.contains_key(key)
                            || (field == "knowledgeChanges" && self.knowledge.contains_key(key))
                    }) {
                        scalar(subject, self.entities, storage)?;
                    }
                    let key = subject.as_str().ok_or_else(invalid)?;
                    let selected = self.knowledge.get(key).or_else(|| self.identities.get(key));
                    let owned;
                    let selected = if let Some(selected) = selected {
                        selected
                    } else {
                        if !self.entities.values().any(|id| id == key) {
                            return Err(invalid());
                        }
                        reserve(storage, key.len())?;
                        owned = crate::reception::ObserverSubject::Entity {
                            entity_id: key.into(),
                        };
                        &owned
                    };
                    *subject = reflection_subject_cell(selected, storage)?;
                } else if field == "nameChanges" {
                    return Err(invalid());
                }
                if field == "knowledgeChanges" {
                    prose(
                        change.get_mut("text").ok_or_else(invalid)?,
                        self,
                        true,
                        budget,
                        storage,
                    )?;
                }
            }
        }
        let SqlCell::Array(goals) = object(publication)?
            .get_mut("goalChanges")
            .ok_or_else(invalid)?
        else {
            return Err(invalid());
        };
        for goal in goals {
            prose(
                object(goal)?.get_mut("objective").ok_or_else(invalid)?,
                self,
                true,
                budget,
                storage,
            )?;
        }
        let SqlCell::Array(thoughts) = object(publication)?
            .get_mut("thoughts")
            .ok_or_else(invalid)?
        else {
            return Err(invalid());
        };
        for thought in thoughts {
            prose(thought, self, true, budget, storage)?;
        }
        self.resolve_interpretation_records(
            object(publication)?
                .get_mut("recordChanges")
                .ok_or_else(invalid)?,
            evidence,
            storage,
        )?;
        let SqlCell::Array(changes) = object(publication)?
            .get_mut("appraisalChanges")
            .ok_or_else(invalid)?
        else {
            return Err(invalid());
        };
        for change in changes {
            let (resolved, custody) =
                appraisals
                    .ok_or_else(invalid)?
                    .resolve(state, change, self.entities, budget)?;
            storage.merge(custody)?;
            *change = resolved;
        }
        Ok(())
    }
}
