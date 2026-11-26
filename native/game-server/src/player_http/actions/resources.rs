//! Finite resource rows shaped inside a permitted read. A batch funds its
//! owned labels and commands until the single scoped/global response encodes.
use super::*;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Choice {
    pub id: String,
    pub label: JsText,
    pub category: String,
    pub description: JsText,
    pub keywords: [JsText; 2],
    pub target_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pickup_limit: Option<u64>,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facts: Option<[(&'static str, JsText); 1]>,
    pub intent: Intent,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub(super) enum Intent {
    Command { command: Command },
    #[serde(rename="command")]
    Coaching {command:super::coaching::Command},
    Unavailable,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Command {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub target_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ammunition_id: Option<String>,
}

pub(super) struct Batch {
    pub category: String,
    pub choices: Vec<Choice>,
    _funding: ByteReservation,
}

impl Batch {
    pub fn prepare(
        category: &str,
        count: usize,
        text: usize,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        let bytes = count
            .checked_mul(size_of::<Choice>())
            .and_then(|bytes| bytes.checked_add(text))
            .and_then(|bytes| bytes.checked_add(category.len()))
            .ok_or(CapacityError)?;
        let funding = budget.reserve(bytes)?;
        let mut choices = Vec::new();
        choices
            .try_reserve_exact(count)
            .map_err(|_| CapacityError)?;
        Ok(Self {
            category: category.to_owned(),
            choices,
            _funding: funding,
        })
    }

    pub fn render(self, sequence: u64, budget: &ByteBudget) -> Result<Bytes, RuntimeError> {
        resource_menu(sequence, &self.choices, &self.category, budget)
    }
}

pub(super) struct CatalogueRows<'a> {
    batches: Vec<Batch>,
    budget: &'a ByteBudget,
    funding: ByteReservation,
}

impl<'a> CatalogueRows<'a> {
    pub fn new(budget: &'a ByteBudget) -> Result<Self, RuntimeError> {
        Ok(Self {
            batches: Vec::new(),
            budget,
            funding: budget.reserve(0)?,
        })
    }

    pub fn add(&mut self, batch: Batch) -> Result<(), RuntimeError> {
        if batch.choices.is_empty() {
            return Ok(());
        }
        if self.batches.len() == self.batches.capacity() {
            let next = self
                .batches
                .capacity()
                .checked_mul(2)
                .ok_or(CapacityError)?
                .max(4);
            let funding = self
                .budget
                .reserve(next.checked_mul(size_of::<Batch>()).ok_or(CapacityError)?)?;
            self.batches
                .try_reserve_exact(next - self.batches.len())
                .map_err(|_| CapacityError)?;
            self.funding = funding;
        }
        self.batches.push(batch);
        Ok(())
    }

    pub fn len(&self) -> usize {
        self.batches.iter().map(|batch| batch.choices.len()).sum()
    }

    pub fn rows(&self) -> impl Iterator<Item = &Choice> {
        self.batches.iter().flat_map(|batch| &batch.choices)
    }

    pub fn groups(&self) -> impl Iterator<Item = &str> {
        self.batches.iter().map(|batch| batch.category.as_str())
    }
}
