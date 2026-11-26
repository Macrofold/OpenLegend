use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonInventoryEdit {
    pub definition_id: String,
    pub expected_revision: u64,
    pub quantity: u64,
}

impl<'a> PersonAttributes<'a> {
    pub fn inventory(
        &self,
        start: usize,
        budget: &ByteBudget,
    ) -> Result<crate::execution::CreatorInventory<'a>, RuntimeError> {
        crate::execution::creator_inventory(self.state, self.person, start, 24, budget)
            .map_err(failure)
    }
    pub(super) fn inventory_revision(&self) -> u64 {
        self.person.inventory_revision.unwrap_or_default()
    }
}
