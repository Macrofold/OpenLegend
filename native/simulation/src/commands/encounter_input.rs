//! The admitted preference stores the exact native pair, not its public MAC.
use super::{CommandEncoding, CommandHeaders, NativeCommand};
use crate::capture::EncounterPreference;
use crate::combat_encounters::EncounterOperation;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Stored {
    #[serde(rename = "type")]
    _kind: String,
    #[serde(flatten)]
    headers: CommandHeaders,
    operation: EncounterOperation,
    binding: Box<EncounterPreference>,
}

pub(super) fn decode(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    let input: Stored = serde_json::from_str(raw)?;
    if !input.headers.valid() || !input.binding.valid() {
        return Err(serde::de::Error::custom(
            "Invalid encounter preference binding.",
        ));
    }
    Ok(NativeCommand::EncounterPreference {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        operation: input.operation,
        binding: input.binding,
    })
}

pub(super) fn bind(
    headers: CommandHeaders,
    operation: EncounterOperation,
    selected: &EncounterPreference,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        binding: &'a EncounterPreference,
        human_initiated: bool,
        id: &'a str,
        operation: EncounterOperation,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    if !headers.valid() || !selected.valid() {
        return Err(serde::ser::Error::custom(
            "Invalid encounter preference binding.",
        ));
    }
    let encoding = CommandEncoding::from_ordered(
        &Binding {
            actor_id: &headers.actor_id,
            binding: selected,
            human_initiated: true,
            id: &headers.id,
            operation,
            kind: "encounter-preference",
        },
        6,
    )?;
    let signature = encoding.json.get().to_owned();
    Ok((
        NativeCommand::EncounterPreference {
            envelope: headers.envelope(encoding),
            operation,
            binding: Box::new(selected.clone()),
        },
        signature,
    ))
}
