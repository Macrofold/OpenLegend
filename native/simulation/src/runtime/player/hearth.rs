//! Purpose-bound read for the current player and the selected installation.
//! It has no read of events, other characters' inventory or private grant data.
use super::*;
use crate::geometry::SightRay;
use crate::state::{Bounds, Point, SurfacePoint};
use crate::values::DefinitionPin;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHearthCatalogue<'a> {
    revision: u64,
    authority_revision: &'a str,
    authorized: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    suggested: Option<SurfacePoint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    label: Option<&'a crate::text::JsText>,
    choices: Vec<HearthChoice<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HearthChoice<'a> {
    definition: &'a DefinitionPin,
    name: &'a crate::text::JsText,
    action_label: &'a crate::text::JsText,
    description: &'a crate::text::JsText,
    help: &'a crate::text::JsText,
    icon: &'a str,
    input_name: &'a crate::text::JsText,
    input_quantity: u64,
    work_seconds: f64,
}

#[derive(Serialize)]
pub struct RuntimeHearthShape {
    id: &'static str,
    role: &'static str,
    geometry: &'static str,
    #[serde(flatten)]
    bounds: Bounds,
}

impl NativeWorldSession {
    /// Read the single selected project catalogue. Publication must remain
    /// under the caller's synchronous control and view fence.
    pub fn with_hearth_catalogue<T>(
        &self,
        account: &str,
        actor: &str,
        grants: &crate::construction_gather::MaterialGrants,
        sight: impl FnOnce(&SightRay) -> Result<bool, RuntimeError>,
        publish: impl FnOnce(RuntimeHearthCatalogue<'_>) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_owner(account, actor)
            .map_err(failure)?;
        let state = &simulation.state;
        let installed = &state.installed;
        let actor_entity = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("Missing construction actor"))?;
        let host = installed.hearth_placement.as_ref().map(|p| &p.presentation);
        let definitions = &installed.retained.hearths;
        let _choices = self
            .budget
            .reserve(definitions.len() * size_of::<HearthChoice<'_>>())?;
        let mut choices = Vec::new();
        if let Some(host) = host {
            choices
                .try_reserve_exact(definitions.len())
                .map_err(|_| CapacityError)?;
            for definition in definitions.values() {
                let body = &definition.definition;
                let material = &installed
                    .retained
                    .items
                    .get(&body.input.definition.id)
                    .ok_or_else(|| failure("Missing installed hearth material"))?
                    .named;
                choices.push(HearthChoice {
                    definition: &definition.pin,
                    name: &body.name,
                    action_label: &body.action_label,
                    description: &body.description,
                    help: &body.help,
                    icon: &host.icon,
                    input_name: &material.name,
                    input_quantity: body.input.quantity,
                    work_seconds: body.work_seconds,
                });
            }
        }
        let authorization = state.physical.header.sim_time;
        let authorized = !choices.is_empty() && grants.hearth_available(actor, authorization);
        let selected_shape = if !choices.is_empty() {
            installed.retained.construction_profile.as_ref()
        } else {
            None
        };
        let _suggested = self
            .budget
            .reserve(selected_shape.map_or(0, |record| record.payload().len() * 2) + 512)?;
        #[derive(Deserialize)]
        struct Suggestion {
            suggested: SurfacePoint,
        }
        let suggested = selected_shape.and_then(|record| {
            serde_json::from_str::<Option<Suggestion>>(record.payload())
                .ok()
                .flatten()
        });
        let visible = if let Some(suggested) = &suggested {
            match crate::hearth::site::sight_to_site(
                installed,
                actor_entity,
                &suggested.suggested,
                &self.budget,
            )
            .map_err(failure)?
            {
                Some(ray) => sight(&ray)?,
                None => false,
            }
        } else {
            false
        };
        let suggested = if visible {
            suggested.map(|value| value.suggested)
        } else {
            actor_entity.supported_position()
        };
        let mut budget = self.budget.reserve(128)?;
        use sha2::{Digest, Sha256};
        let mut revision = Sha256::new();
        for (id, version, revoked) in grants.hearth_revision(actor) {
            budget.resize(budget.bytes() + id.len().checked_mul(6).ok_or(CapacityError)?)?;
            let record = crate::encoding::json_record(&(id, version, revoked)).map_err(failure)?;
            revision.update(record.as_bytes());
        }
        let revision = crate::encoding::hex_bytes(&revision.finalize());
        publish(RuntimeHearthCatalogue {
            revision: state.accepted_cut,
            authority_revision: &revision,
            authorized,
            reason: (!authorized && !choices.is_empty())
                .then(|| &crate::hearth::messages().missing_grant),
            suggested,
            label: host.map(|host| &host.label),
            choices,
        })
    }

    pub fn with_hearth_preview_shape<T>(
        &self,
        account: &str,
        actor: &str,
        pin: &DefinitionPin,
        site: &SurfacePoint,
        publish: impl FnOnce(Option<RuntimeHearthShape>) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_owner(account, actor)
            .map_err(failure)?;
        let shape = state
            .installed
            .hearth_placement
            .as_ref()
            .and_then(|_| state.installed.retained.hearths.get(&pin.id))
            .filter(|meaning| &meaning.pin == pin)
            .map(|meaning| {
                let radius = meaning.definition.radius_metres;
                RuntimeHearthShape {
                    id: "hearth-placement-footprint",
                    role: "hearth",
                    geometry: "cylinder",
                    bounds: Bounds {
                        min: Point {
                            x: site.x - radius,
                            y: site.y,
                            z: site.z - radius,
                        },
                        max: Point {
                            x: site.x + radius,
                            y: site.y + meaning.definition.height_metres,
                            z: site.z + radius,
                        },
                    },
                }
            });
        publish(shape)
    }
}
