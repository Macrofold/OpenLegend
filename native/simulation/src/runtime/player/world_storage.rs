//! Bind a current public contact, then check only its exact physical world
//! container. The caller may encode the bounded result under this lease.
use super::*;
use crate::capture::PlayerObservedBody;
use crate::geometry::RoutePlan;
use crate::ground_items::inspection::WorldStorage;
use crate::state::{InventoryInspection, Named, SurfacePoint};
use crate::{reception::SensoryFacet, simulation::SimulationState};

pub struct RuntimeWorldStorage<'a> {
    pub name: &'a Named,
    pub placement_revision: u64,
    pub geometry_revision: u64,
    pub ready: bool,
    pub stance: Option<&'a SurfacePoint>,
    pub inspection: Option<&'a InventoryInspection>,
    state: &'a SimulationState,
}

pub struct InspectedItemRead<'a> {
    pub lot: crate::install::OwnedItem<'a>,
    pub category: &'static str,
    pub description: Option<&'a crate::text::JsText>,
    pub properties: &'a [crate::text::JsText],
    pub container: bool,
}

impl<'a> RuntimeWorldStorage<'a> {
    /// Return only an exact member of the captured page, with its retained
    /// description and live quantity at the same verified contents revision.
    pub fn item(&self, index: usize) -> Result<InspectedItemRead<'a>, RuntimeError> {
        let inspection = self
            .inspection
            .ok_or_else(|| failure("inspection unavailable"))?;
        let id = inspection
            .item_ids
            .get(index)
            .ok_or_else(|| failure("inspection item unavailable"))?;
        let body = self
            .state
            .physical
            .entities
            .get(id)
            .ok_or_else(|| failure("inspection item unavailable"))?;
        if crate::install::inventory_parent(body) != inspection.container_id.as_deref()
            || body.retirement.is_some()
        {
            return Err(failure("inspection custody changed"));
        }
        let pin = &body
            .item
            .as_ref()
            .ok_or_else(|| failure("inspection lot unavailable"))?
            .definition_pin;
        let definition = self
            .state
            .installed
            .retained
            .items
            .get(&pin.id)
            .ok_or_else(|| failure("inspection definition unavailable"))?;
        let mut lot = crate::install::project_owned(
            &self.state.installed.retained,
            "",
            body,
            false,
            self.state.physical.holds.quantity(id),
        )
        .map_err(failure)?;
        lot.named = inspection
            .item_names
            .get(index)
            .ok_or_else(|| failure("inspection name unavailable"))?;
        Ok(InspectedItemRead {
            lot,
            category: definition.category,
            description: definition.description.as_ref(),
            properties: &definition.properties,
            container: definition.is_container(),
        })
    }
}

impl NativeWorldSession {
    /// Perform at most a single reach check and an explicitly requested
    /// approach for the selected current storage contact. Neither check
    /// captures contents or grants an inspection.
    pub fn with_player_world_storage<T>(
        &self,
        account: &str,
        actor: &str,
        approach: bool,
        mut matching: impl FnMut(&PlayerObservedBody<'_>) -> bool,
        compute: impl Fn(&GeometryQueries) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
        respond: impl FnOnce(RuntimeWorldStorage<'_>, &ByteBudget) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _publication = self.session.fence().begin_publication().map_err(failure)?;
        let mut respond = Some(respond);
        let mut result = None;
        simulation
            .visit_accepted_player_contacts(account, actor, &self.budget, |contact| {
                if !matching(&contact) {
                    return false;
                }
                let Some(root) =
                    WorldStorage::selected(&simulation.state, actor, contact.source_id)
                else {
                    return true;
                };
                let Some(SensoryFacet::Body { body }) =
                    contact.body_facet().map(|facet| &facet.value)
                else {
                    return true;
                };
                let Some(storage) = body.storage.as_ref() else {
                    return true;
                };
                let Some((position, surface)) = root.root.world_support() else {
                    return true;
                };
                if storage.placement_revision != root.placement_revision
                    || body.position != position
                    || body.support_surface_id.as_deref() != Some(surface)
                {
                    return true;
                }
                let encode = respond.take().expect("one exact storage contact");
                result = Some((|| {
                    let binding = GeometryBinding::new(
                        CandidateKey {
                            id: 0,
                            base_cut: simulation.state.accepted_cut,
                            generation: self.session.operational_generation(),
                        },
                        root.geometry_revision,
                        0,
                    );
                    let _workspace = self.budget.reserve(
                        size_of::<GeometryQueries>() + size_of::<crate::geometry::SightRay>(),
                    )?;
                    let mut questions = GeometryQueries::new(binding);
                    if let Some(ray) = root.reach(&self.budget).map_err(failure)? {
                        questions.sight.push(ray);
                    }
                    let ready = if questions.sight.is_empty() {
                        false
                    } else {
                        let (answer, _custody) = compute(&questions)?;
                        questions.validate_answers(&answer).map_err(failure)?;
                        answer.sight.first().copied().unwrap_or(false)
                    };
                    let route_answers = if !ready && approach {
                        let (route, _query_custody) =
                            root.approach(&self.budget).map_err(failure)?;
                        let mut route_queries = GeometryQueries::new(binding);
                        route_queries.routes.push(route);
                        let (answer, custody) = compute(&route_queries)?;
                        route_queries.validate_answers(&answer).map_err(failure)?;
                        Some((answer, custody))
                    } else {
                        None
                    };
                    let stance = route_answers.as_ref().and_then(|(answer, _)| {
                        match answer.routes.first()? {
                            RoutePlan::Reached { path, .. } => path.last(),
                            _ => None,
                        }
                    });
                    encode(
                        RuntimeWorldStorage {
                            name: contact.name,
                            placement_revision: root.placement_revision,
                            geometry_revision: root.geometry_revision,
                            ready,
                            stance,
                            inspection: if ready {
                                root.inspection(&self.budget).map_err(failure)?
                            } else {
                                None
                            },
                            state: &simulation.state,
                        },
                        &self.budget,
                    )
                })());
                true
            })
            .map_err(failure)?;
        result.transpose()
    }
}
