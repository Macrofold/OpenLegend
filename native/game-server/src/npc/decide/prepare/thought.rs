use super::{PersonalSource, alias, prompt_text};
use openlegend_simulation::{
    capture::{NpcPersonalEvidence, NpcThoughtAlias, NpcThoughtOrdinal},
    experience::{LiteralReference, PersonalSourceRef},
    host::ByteReservation,
    runtime::RuntimeNpcRead,
    text::JsText,
};
use serde_json::{Value, json};
use std::{collections::HashMap, mem::size_of};

#[derive(Clone, Copy)]
pub(super) struct SpeechAttribution<'a> {
    at: f64,
    speaker: Option<&'a JsText>,
}

impl<'a> SpeechAttribution<'a> {
    fn from_source(entry: &'a PersonalSource) -> Option<Self> {
        let at = super::personal_time(entry);
        let speech = entry.value.speech.as_ref()?;
        at.is_finite().then_some(Self {
            at,
            speaker: speech.speaker.as_ref().map(|speaker| &speaker.name_at_time),
        })
    }

    fn speaker_bytes(self) -> usize {
        self.speaker.map_or(0, JsText::storage_bytes)
    }

    fn add_to(self, entry: &mut Value) {
        entry["heardAt"] = json!(self.at);
        entry["speaker"] = json!(self.speaker.map(prompt_text));
    }
}

pub(super) struct Offers<'a> {
    entries: Vec<Value>,
    selectors: Vec<NpcThoughtAlias>,
    custody: Option<&'a mut ByteReservation>,
}

impl<'a> Offers<'a> {
    pub(super) fn new(custody: Option<&'a mut ByteReservation>) -> Self {
        Self {
            entries: Vec::new(),
            selectors: Vec::new(),
            custody,
        }
    }

    pub(super) fn into_parts(self) -> (Vec<Value>, Vec<NpcThoughtAlias>) {
        (self.entries, self.selectors)
    }

    /// Index only already selected speech accounts. A cited revision supplies
    /// no speaker or time when that original is absent from this request.
    pub(super) fn heard_sources<'source>(
        &mut self,
        sources: &[(usize, &'source PersonalSource)],
    ) -> HashMap<&'source PersonalSourceRef, SpeechAttribution<'source>> {
        let bytes = sources
            .len()
            .saturating_mul(size_of::<(&PersonalSourceRef, SpeechAttribution<'_>)>());
        if !self.reserve(bytes) {
            return HashMap::new();
        }
        sources
            .iter()
            .filter_map(|&(_, entry)| {
                entry.thought_quotations().next()?;
                Some((&entry.reference, SpeechAttribution::from_source(entry)?))
            })
            .collect()
    }

    // Each optional offer owns an encoded-text projection and a native selector.
    // Charge only that offer's backing before cloning its text. An unfunded
    // offer leaves the required context and the plain thought option available.
    fn reserve(&mut self, text_bytes: usize) -> bool {
        let Some(custody) = self.custody.as_deref_mut() else {
            return false;
        };
        let bytes = text_bytes
            .checked_mul(8)
            .and_then(|bytes| bytes.checked_add(1024))
            .and_then(|bytes| bytes.checked_add(custody.bytes()));
        bytes.is_some_and(|bytes| custody.resize(bytes).is_ok())
    }

    fn add(&mut self, id: String, source: NpcThoughtOrdinal, mut entry: Value) {
        entry["reference"] = json!(&id);
        self.entries.push(entry);
        self.selectors.push(NpcThoughtAlias { alias: id, source });
    }

    pub(super) fn body(&mut self, read: &RuntimeNpcRead, key: &str, ordinal: usize) {
        let Some(object) = read.thought_object(ordinal) else {
            return;
        };
        if self.reserve(object.name.name.storage_bytes()) {
            self.add(
                alias(key, "thought-object", ordinal),
                NpcThoughtOrdinal::Object { ordinal },
                json!({"kind":"object","passage":prompt_text(&object.name.name)}),
            );
        }
        if let Some(category) = object.category
            && self.reserve(category.name.storage_bytes())
        {
            self.add(
                alias(key, "thought-category", ordinal),
                NpcThoughtOrdinal::Category { ordinal },
                json!({"kind":"category","passage":prompt_text(&category.name)}),
            );
        }
    }

    pub(super) fn personal(
        &mut self,
        read: &RuntimeNpcRead,
        key: &str,
        inventory: usize,
        ordinal: usize,
        entry: &PersonalSource,
    ) {
        if let Some(place) = entry.thought_place()
            && self.reserve(place.storage_bytes())
        {
            self.add(
                alias(key, "thought-place", ordinal),
                NpcThoughtOrdinal::Place { inventory, ordinal },
                json!({"kind":"place","passage":prompt_text(place)}),
            );
        }
        if let Some((object, category)) = read.thought_inspection(entry) {
            if self.reserve(object.storage_bytes()) {
                self.add(
                    alias(key, "thought-inspected-object", ordinal),
                    NpcThoughtOrdinal::InspectedObject { inventory, ordinal },
                    json!({"kind":"object","passage":prompt_text(object)}),
                );
            }
            if let Some(category) = category
                && self.reserve(category.name.storage_bytes())
            {
                self.add(
                    alias(key, "thought-inspected-category", ordinal),
                    NpcThoughtOrdinal::InspectedCategory { inventory, ordinal },
                    json!({"kind":"category","passage":prompt_text(&category.name)}),
                );
            }
        }
        let mut quotations = entry.thought_quotations().peekable();
        if quotations.peek().is_none() {
            return;
        }
        let Some(attribution) = SpeechAttribution::from_source(entry) else {
            return;
        };
        for (segment, words) in quotations {
            if !self.reserve(
                words
                    .storage_bytes()
                    .saturating_add(attribution.speaker_bytes()),
            ) {
                continue;
            }
            let mut displayed = json!({"kind":"exactQuotation","passage":prompt_text(words)});
            attribution.add_to(&mut displayed);
            self.add(
                alias(key, "thought-quote", self.entries.len()),
                NpcThoughtOrdinal::Quotation {
                    inventory,
                    ordinal,
                    segment,
                },
                displayed,
            );
        }
        self.next_day(
            read,
            key,
            attribution.at,
            Some(NpcPersonalEvidence { inventory, ordinal }),
        );
    }

    pub(super) fn next_day(
        &mut self,
        read: &RuntimeNpcRead,
        key: &str,
        at: f64,
        origin: Option<NpcPersonalEvidence>,
    ) {
        if let Some((from, through)) = read.thought_next_day(at)
            && self.reserve(0)
        {
            let passage = if origin.is_some() {
                "The next calendar day relative to the speech at this time"
            } else {
                "The next calendar day relative to this decision"
            };
            self.add(
                alias(key, "thought-time", self.entries.len()),
                NpcThoughtOrdinal::NextDay { origin },
                json!({"kind":"time","passage":passage,"relativeTo":at,
                    "gameSeconds":{"from":from,"through":through}}),
            );
        }
    }

    pub(super) fn inherited(
        &mut self,
        id: &str,
        inventory: usize,
        ordinal: usize,
        reference: usize,
        display: &Value,
        attribution: Option<SpeechAttribution<'_>>,
    ) {
        let bytes = display["passage"]
            .as_str()
            .map_or(0, str::len)
            .saturating_add(attribution.map_or(0, SpeechAttribution::speaker_bytes));
        if !self.reserve(bytes) {
            return;
        }
        let mut entry = display.clone();
        entry
            .as_object_mut()
            .expect("reference display")
            .shift_remove("offset");
        if let Some(attribution) = attribution {
            attribution.add_to(&mut entry);
        }
        self.add(
            id.into(),
            NpcThoughtOrdinal::Inherited {
                inventory,
                ordinal,
                reference,
            },
            entry,
        );
    }
}

pub(super) fn display(
    id: &str,
    reference: &LiteralReference,
    passage: &JsText,
    offset: usize,
) -> Value {
    let kind = match reference {
        LiteralReference::Subject { .. } => "subject",
        LiteralReference::Object { .. } => "object",
        LiteralReference::Place { .. } => "place",
        LiteralReference::Category { .. } => "category",
        LiteralReference::Time { .. } => "time",
        LiteralReference::Source { quote: Some(_), .. } => "exactQuotation",
        LiteralReference::Source { quote: None, .. } => "personalSource",
    };
    let mut rendered =
        json!({"passage":prompt_text(passage),"kind":kind,"reference":id,"offset":offset});
    if let LiteralReference::Time { from, through, .. } = reference {
        rendered["gameSeconds"] = json!({"from":from,"through":through});
    }
    rendered
}
