//! Verify the checked family result against the same rules as its Source
//! compiler. A generic recipe or item description grants no native effect.
use crate::install::ItemDefinitionRead;
use crate::manufacturing::Input;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Rules {
    family_id: String,
    kind: String,
    work_seconds: f64,
    packing_load: u64,
    roles: Vec<Role>,
}
#[derive(Deserialize)]
struct Role {
    id: String,
    properties: Vec<String>,
    quantity: u64,
}

static RULES: LazyLock<Rules> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../river-line-rules.json"))
        .expect("base line manufacture rules are a build input")
});

pub(crate) fn selected(profile: (&str, u64), family: &str) -> Option<&'static Rules> {
    (profile == ("grounded-wilderness", 1) && family == RULES.family_id).then_some(&RULES)
}

impl Rules {
    pub(crate) fn validates<'a>(
        &self,
        work: f64,
        inputs: &[Input],
        definition: impl Fn(&str) -> Option<&'a ItemDefinitionRead>,
        output: &ItemDefinitionRead,
    ) -> bool {
        work == self.work_seconds
            && inputs.len() == self.roles.len()
            && self.roles.iter().all(|role| {
                inputs
                    .iter()
                    .find(|input| input.role == role.id)
                    .is_some_and(|input| {
                        input.quantity == role.quantity
                            && definition(&input.definition_id).is_some_and(|item| {
                                role.properties.iter().all(|property| {
                                    item.properties
                                        .iter()
                                        .any(|actual| actual == property.as_str())
                                })
                            })
                    })
            })
            && output.portable
            && !output.is_container()
            && output.fishing_kind() == Some(self.kind.as_str())
            && output.packing_load() == Some(self.packing_load)
            && output.properties.is_empty()
            && output.material.is_none()
    }
}
