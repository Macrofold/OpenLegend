//! Installed material laws for the ordinary elapsed exposure phase. Item
//! definitions in one family share its law, while each item owns its condition.
use crate::{
    host::{ByteBudget, ByteReservation, ResidentReservation, retained_size::map_storage},
    install::InstallError,
    status::{AttributeDefinitions, AttributeSchema},
    text::JsText,
    values::is_safe_record_id,
};
use indexmap::IndexMap;
use serde::Deserialize;
use std::sync::Arc;

mod stock;
pub(crate) use stock::{MaterialPresence, StockExposure};
mod slice;
pub(crate) use slice::{MaterialSlice, material_condition};

#[derive(Clone, Copy)]
pub(crate) enum ExposureRole {
    Cover,
    Fiber,
}

impl ExposureRole {
    pub(crate) fn from_role(role: &str) -> Option<Self> {
        match role {
            "cover" => Some(Self::Cover),
            "fiber" => Some(Self::Fiber),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Deserialize)]
pub(crate) struct MaterialForm {
    pub width: f64,
    pub length: f64,
    #[serde(default)]
    pub height: Option<f64>,
}

#[derive(Deserialize)]
struct Forms {
    folded: MaterialForm,
    fiber: MaterialForm,
    worn: MaterialForm,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoistureLabels {
    dry_maximum: f64,
    wet_minimum: f64,
    dry: JsText,
    damp: JsText,
    wet: JsText,
    saturated: JsText,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExposureLaw {
    pub moisture_attribute: String,
    pub wetting_seconds: f64,
    pub drying_seconds: f64,
    exposure: Forms,
    moisture_labels: MoistureLabels,
    #[serde(skip)]
    _storage: Option<ResidentReservation>,
}

impl ExposureLaw {
    /// Compile one approved family projection at installation. The returned
    /// immutable backing is shared by items and funded until its last owner.
    fn compile(
        payload: &str,
        maximum_extent: f64,
        attributes: &dyn AttributeDefinitions,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, InstallError> {
        let bytes = payload.len().checked_mul(2).ok_or(InstallError::Capacity)?;
        let _parse = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
        let mut law: Self =
            serde_json::from_str(payload).map_err(|_| InstallError::DefinitionBody)?;
        let labels = &law.moisture_labels;
        let words = [&labels.dry, &labels.damp, &labels.wet, &labels.saturated];
        let limit = |value: f64| value.is_finite() && value > 0.0 && value <= maximum_extent;
        let supported_attribute = attributes
            .get(&law.moisture_attribute)
            .is_some_and(|value| {
                value.implementation == "number-v1"
                    && value.reservoir.is_none()
                    && matches!(
                        value.schema,
                        AttributeSchema::Number {
                            min: 0.0,
                            max: 1.0,
                            ..
                        }
                    )
                    && value
                        .concern
                        .as_ref()
                        .is_none_or(|concern| concern.mode != "latched" || !concern.notify)
            });
        if !is_safe_record_id(&law.moisture_attribute)
            || !supported_attribute
            || !law.wetting_seconds.is_finite()
            || law.wetting_seconds <= 0.0
            || !law.drying_seconds.is_finite()
            || law.drying_seconds <= 0.0
            || [law.exposure.folded, law.exposure.fiber]
                .into_iter()
                .any(|form| {
                    !limit(form.width) || !limit(form.length) || !form.height.is_some_and(limit)
                })
            || !limit(law.exposure.worn.width)
            || !limit(law.exposure.worn.length)
            || !(0.0..labels.wet_minimum).contains(&labels.dry_maximum)
            || labels.wet_minimum > 1.0
            || words.iter().any(|label| label.is_empty())
        {
            return Err(InstallError::DefinitionBody);
        }
        let bytes = words
            .iter()
            .try_fold(
                size_of::<Self>() + 2 * size_of::<usize>() + law.moisture_attribute.capacity(),
                |bytes, label| bytes.checked_add(label.storage_bytes()),
            )
            .ok_or(InstallError::Capacity)?;
        law._storage = Some(
            budget
                .reserve_record(bytes)
                .map_err(|_| InstallError::Capacity)?,
        );
        Ok(Arc::new(law))
    }

    pub(crate) fn form(&self, role: ExposureRole, attached: bool) -> MaterialForm {
        match (role, attached) {
            (ExposureRole::Cover, true) => self.exposure.worn,
            (ExposureRole::Cover, false) => self.exposure.folded,
            (ExposureRole::Fiber, _) => self.exposure.fiber,
        }
    }

    pub(crate) fn label(&self, value: f64) -> &JsText {
        let labels = &self.moisture_labels;
        if value >= 1.0 {
            &labels.saturated
        } else if value >= labels.wet_minimum {
            &labels.wet
        } else if value > labels.dry_maximum {
            &labels.damp
        } else {
            &labels.dry
        }
    }
}

pub(crate) struct ExposedMaterial {
    pub role: ExposureRole,
    pub law: Arc<ExposureLaw>,
}

/// An installation-local index. Item definitions retain the laws and the
/// temporary index is released after the item catalogue is assembled.
pub(crate) struct ExposureLaws<'a> {
    maximum_extent: f64,
    attributes: &'a dyn AttributeDefinitions,
    by_family: IndexMap<String, Arc<ExposureLaw>>,
    _storage: ByteReservation,
}

impl<'a> ExposureLaws<'a> {
    pub(crate) fn new(
        families: usize,
        mut keys: impl Iterator<Item = &'a str>,
        maximum_extent: f64,
        attributes: &'a dyn AttributeDefinitions,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let bytes = keys.try_fold(
            map_storage::<String, Arc<ExposureLaw>>(families).ok_or(InstallError::Capacity)?,
            |total, key| total.checked_add(key.len()).ok_or(InstallError::Capacity),
        )?;
        let storage = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
        let mut by_family = IndexMap::new();
        by_family
            .try_reserve(families)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            maximum_extent,
            attributes,
            by_family,
            _storage: storage,
        })
    }

    pub(crate) fn material(
        &mut self,
        family: &str,
        payload: &str,
        role: ExposureRole,
        budget: &ByteBudget,
    ) -> Result<ExposedMaterial, InstallError> {
        let law = if let Some(law) = self.by_family.get(family) {
            Arc::clone(law)
        } else {
            let law = ExposureLaw::compile(payload, self.maximum_extent, self.attributes, budget)?;
            self.by_family.insert(family.to_owned(), Arc::clone(&law));
            law
        };
        Ok(ExposedMaterial { role, law })
    }
}
