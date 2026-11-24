use std::sync::LazyLock;

use crate::text::JsText;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Copy {
    pub name: String,
    pub menu_yield_name: String,
    pub menu_time_name: String,
    pub menu_time_seconds: String,
    pub menu_time_minutes: String,
    pub started: String,
    pub gathered_event: String,
    pub gathered: String,
    pub depleted: String,
    pub unavailable: String,
    pub completed: String,
    pub out_of_reach: String,
    pub approach_name: String,
    pub approach: String,
    pub work_name: String,
    pub same_named_tool_suffix: String,
    pub work: String,
}

static WORDS: LazyLock<Copy> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../gathering-copy.json"))
        .expect("the bundled gathering wording is a build input")
});

pub(crate) fn copy() -> &'static Copy {
    &WORDS
}

pub(crate) fn gathered(units: u64, material: &JsText) -> JsText {
    let template = WORDS.gathered.replace("{quantity}", &units.to_string());
    let (before, after) = template
        .split_once("{material}")
        .expect("authored material slot");
    JsText::concat(&[&before.into(), &material.lowercase(), &after.into()])
}

pub(crate) fn tool_name(name: &JsText, ordinal: u64, count: u64) -> JsText {
    if count < 2 {
        return name.clone();
    }
    let suffix = WORDS
        .same_named_tool_suffix
        .replace("{ordinal}", &ordinal.to_string());
    JsText::concat(&[name, &suffix.into()])
}

pub fn catalogue_facts(
    work_seconds: f64,
    yield_units: u64,
    material: &JsText,
    target: &JsText,
) -> [(&'static str, JsText); 3] {
    let duration = if work_seconds < 60. {
        WORDS
            .menu_time_seconds
            .replace("{time}", &work_seconds.to_string())
    } else {
        let text = crate::worlds::activity_display::tenth(work_seconds / 60.);
        WORDS
            .menu_time_minutes
            .replace("{time}", text.strip_suffix(".0").unwrap_or(&text))
    };
    let amount = format!("{yield_units} ");
    [
        ("Target", target.clone()),
        (
            &WORDS.menu_yield_name,
            JsText::concat(&[&amount.into(), material]),
        ),
        (&WORDS.menu_time_name, duration.into()),
    ]
}
