//! Native names and remembered points are selected from their actual owners.
//! Node returns only lexical ordinals; it cannot supply a point, lease or ID.
use super::*;
use crate::narration::{NameArticle, name_phrase};
use crate::reception::CurrentBodyReadScope;
use crate::state::SurfacePoint;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Body {
    pub id: String,
    pub label: JsText,
    pub heat: bool,
    pub resource_names: Vec<JsText>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Place {
    pub subject_id: String,
    pub label: JsText,
    pub reference_current: bool,
    pub at: f64,
    #[serde(skip)]
    pub point: SurfacePoint,
    #[serde(skip)]
    pub still_seen: bool,
}
pub(super) struct Roster {
    pub bodies: Vec<Body>,
    pub places: Vec<Place>,
    pub labels: IndexMap<String, JsText>,
    pub item_names: Vec<Vec<JsText>>,
    _storage: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Read<'a> {
    pub actor_id: &'a str,
    pub target: Option<Target<'a>>,
    pub sequence: bool,
    pub visible: &'a [Body],
    pub places: &'a [Place],
    pub vocabulary: &'a crate::worlds::base_decision_offers::TypedNouns,
    pub item_names: &'a [Vec<JsText>],
}
#[derive(Serialize)]
pub(super) struct Target<'a> {
    pub id: &'a str,
    pub label: &'a JsText,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub(super) enum Selection {
    Body {
        ordinal: usize,
    },
    Place {
        ordinal: usize,
    },
    Unknown,
    Refused {
        category: String,
        reason: JsText,
        depends: Vec<Dependency>,
    },
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub(super) enum Dependency {
    Visible,
    Target,
    Body { ordinal: usize },
    Place { ordinal: usize },
}
impl Roster {
    pub fn capture(
        core: &CoreMutation<'_>,
        actor: &str,
        targets: &[&str],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let scope = CurrentBodyReadScope::prepare(
            &core.state.reception,
            &core.state.physical.entities,
            &core.state.installed,
            &core.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor,
        )?;
        let order = scope
            .as_ref()
            .map(|s| s.ordered_subjects(budget))
            .transpose()?;
        let count = order.as_ref().map_or(0, |o| o.ids().count());
        let places = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.places.as_ref());
        let bytes = count
            .checked_mul(size_of::<Body>())
            .and_then(|n| n.checked_add(places.map_or(Some(0), HeapBytes::heap_bytes)?))
            .and_then(|n| n.checked_add(map_storage::<String, JsText>(count + targets.len())?))
            .and_then(|n| n.checked_add((count + targets.len()).checked_mul(size_of::<&str>())?))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut ids = Vec::with_capacity(count + targets.len());
        if let (Some(scope), Some(order)) = (&scope, &order) {
            for id in order.ids() {
                if id != actor && scope.native_body(id)?.is_some() {
                    ids.push(id);
                }
            }
        }
        let body_count = ids.len();
        for id in targets {
            if !ids.contains(id) {
                ids.push(id);
            }
        }
        let reader = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            actor,
        )?;
        let captured = reader.capture_names(&ids, budget)?;
        let label_bound = ids
            .iter()
            .try_fold(0usize, |n, id| {
                n.checked_add(id.len())?
                    .checked_add(captured.get(id)?.heap_bytes()?.checked_mul(8)?)?
                    .checked_add(128)
            })
            .ok_or(ExecutionError::Capacity)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(label_bound)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let labels = ids
            .iter()
            .map(|id| {
                (
                    (*id).to_owned(),
                    name_phrase(
                        captured.get(id).expect("selected name"),
                        NameArticle::None,
                        false,
                    ),
                )
            })
            .collect::<IndexMap<_, _>>();
        let mut bodies = Vec::with_capacity(body_count);
        for id in &ids[..body_count] {
            let entity = core
                .state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::Invariant)?;
            let resource_names = if let Some(resource) = &entity.resource {
                item_names(core, &resource.definition_id, &mut storage, budget)?
            } else {
                Vec::new()
            };
            storage.resize(
                storage
                    .bytes()
                    .checked_add(id.len())
                    .and_then(|n| n.checked_add(labels.get(*id)?.heap_bytes()?))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            bodies.push(Body {
                id: (*id).to_owned(),
                label: labels[*id].clone(),
                heat: entity.heat.is_some(),
                resource_names,
            });
        }
        let mut remembered = Vec::with_capacity(places.map_or(0, Vec::len));
        for place in places.into_iter().flatten() {
            let reference_current = crate::worlds::base_knowledge::subject_reference_current(
                &core.state.reception,
                actor,
                &place.subject_id,
                Some(&place.episode),
            );
            remembered.push(Place {
                subject_id: place.subject_id.clone(),
                label: place.label.clone(),
                reference_current,
                at: place.at,
                point: place.point.clone(),
                still_seen: reference_current && bodies.iter().any(|b| b.id == place.subject_id),
            });
        }
        storage.resize(
            storage
                .bytes()
                .checked_add(
                    core.state
                        .installed
                        .retained
                        .item_definitions
                        .len()
                        .checked_mul(size_of::<Vec<JsText>>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut names = Vec::with_capacity(core.state.installed.retained.item_definitions.len());
        for (id, _) in core.state.installed.retained.item_definitions.entries() {
            names.push(item_names(core, id, &mut storage, budget)?);
        }
        Ok(Self {
            bodies,
            places: remembered,
            labels,
            item_names: names,
            _storage: storage,
        })
    }
    pub fn read<'a>(
        &'a self,
        core: &'a CoreMutation<'_>,
        actor: &'a str,
        target: Option<&'a str>,
    ) -> Result<Read<'a>, ExecutionError> {
        Ok(Read {
            actor_id: actor,
            target: target
                .map(|id| {
                    self.labels
                        .get(id)
                        .map(|label| Target { id, label })
                        .ok_or(ExecutionError::InvalidCheckpoint)
                })
                .transpose()?,
            sequence: false,
            visible: &self.bodies,
            places: &self.places,
            vocabulary: &core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .offers
                .typed_nouns,
            item_names: &self.item_names,
        })
    }
    pub fn dependencies(
        &self,
        selected: &[Dependency],
        target: Option<&str>,
        maximum: usize,
        budget: &ByteBudget,
    ) -> Result<(Vec<String>, ByteReservation), ExecutionError> {
        let id = |d: &Dependency| match *d {
            Dependency::Visible => Some("@visible"),
            Dependency::Target => target,
            Dependency::Body { ordinal } => self.bodies.get(ordinal).map(|b| b.id.as_str()),
            Dependency::Place { ordinal } => {
                self.places.get(ordinal).map(|p| p.subject_id.as_str())
            }
        };
        let bytes = selected
            .iter()
            .try_fold(0usize, |n, d| {
                n.checked_add(id(d)?.len() + size_of::<String>())
            })
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let storage = budget.reserve(bytes)?;
        let mut result = Vec::new();
        for d in selected {
            let id = id(d).ok_or(ExecutionError::InvalidCheckpoint)?;
            if !result.iter().any(|s| s == id) {
                if result.len() == maximum {
                    break;
                }
                result.push(id.to_owned());
            }
        }
        Ok((result, storage))
    }
}
fn item_names(
    core: &CoreMutation<'_>,
    id: &str,
    storage: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<Vec<JsText>, ExecutionError> {
    let raw = core.state.installed.retained.item_definitions.get(id);
    let mut names = Vec::with_capacity(2);
    let _decode = raw
        .map(|raw| {
            budget
                .reserve(
                    crate::experience::encoded_body_bound(raw)
                        .map_err(|_| ExecutionError::Capacity)?,
                )
                .map_err(ExecutionError::from)
        })
        .transpose()?;
    let body: Option<SqlCell> = raw
        .map(|raw| serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant))
        .transpose()?;
    let name = body
        .as_ref()
        .and_then(|b| b.get("name"))
        .and_then(SqlCell::as_text);
    storage.resize(
        storage
            .bytes()
            .checked_add(2 * size_of::<JsText>() + id.len())
            .and_then(|n| n.checked_add(name.map_or(Some(0), HeapBytes::heap_bytes)?))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    names.push(name.cloned().unwrap_or_default());
    names.push(JsText::from(id.replace('_', " ")));
    Ok(names)
}
impl TypedGroundingCursor {
    pub(super) fn prepare_name(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        if self.names.is_none() {
            let _list = self.budget.reserve(self.items.len() * size_of::<&str>())?;
            let targets = self
                .items
                .iter()
                .filter_map(|item| item.target.as_deref())
                .collect::<Vec<_>>();
            self.names = Some(Roster::capture(core, &self.actor, &targets, &self.budget)?);
        }
        #[derive(Serialize)]
        struct Syntax<'a> {
            kind: &'static str,
            name: &'a JsText,
        }
        #[derive(Serialize)]
        struct Input<'a> {
            syntax: Syntax<'a>,
            read: Read<'a>,
        }
        #[derive(Serialize)]
        struct Request<'a> {
            binding: GeometryBinding,
            phase: &'static str,
            input: Input<'a>,
        }
        let item = &self.items[self.index];
        let (kind, name) = match &item.syntax {
            FreeTypedActionSyntax::Approach { name } => ("approach", name),
            FreeTypedActionSyntax::LastSeen { name } => ("last-seen", name),
            _ => return Err(ExecutionError::Invariant),
        };
        let binding = self.binding(core)?;
        let read = self.names.as_ref().ok_or(ExecutionError::Invariant)?.read(
            core,
            &self.actor,
            item.target.as_deref(),
        )?;
        let input = Request {
            binding,
            phase: "name",
            input: Input {
                syntax: Syntax { kind, name },
                read,
            },
        };
        let len =
            crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
        let mut storage = self
            .budget
            .reserve(len.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let json = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
        storage.resize(json.capacity())?;
        self.name_request = Some(TypedActionRequest {
            binding,
            json,
            _storage: storage,
        });
        Ok(())
    }
    pub(super) fn finish_name(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: TypedActionAnswer,
    ) -> Result<(), ExecutionError> {
        if self
            .name_request
            .as_ref()
            .is_none_or(|q| q.binding != answer.binding)
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let TypedActionOutput::Name { selection } = answer.output else {
            return Err(ExecutionError::InvalidCheckpoint);
        };
        match selection {
            Selection::Unknown => {
                self.items[self.index].prepared = Some(Prepared::Unknown);
                self.index += 1;
            }
            Selection::Refused {
                category,
                reason,
                depends,
            } => {
                let (dependencies, storage) = self
                    .names
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .dependencies(
                        &depends,
                        self.items[self.index].target.as_deref(),
                        core.state
                            .installed
                            .actor_response_limits
                            .resolution
                            .depends,
                        &self.budget,
                    )?;
                self.merge(storage)?;
                self.grow(
                    category
                        .capacity()
                        .checked_add(reason.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                self.items[self.index].depends = dependencies;
                self.items[self.index].prepared = Some(Prepared::NamedRefused { category, reason });
                self.index += 1;
            }
            Selection::Body { ordinal } => {
                if !matches!(
                    self.items[self.index].syntax,
                    FreeTypedActionSyntax::Approach { .. }
                ) {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
                let id = &self
                    .names
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .bodies
                    .get(ordinal)
                    .ok_or(ExecutionError::InvalidCheckpoint)?
                    .id;
                let _scope = self.budget.reserve(id.len() + size_of::<String>())?;
                let dependency = id.clone();
                self.grow(dependency.len() + size_of::<String>())?;
                self.items[self.index].depends.push(dependency);
                self.items[self.index].selected = Some(Selection::Body { ordinal });
                self.invocation(core)?;
            }
            Selection::Place { ordinal } => {
                if !matches!(
                    self.items[self.index].syntax,
                    FreeTypedActionSyntax::LastSeen { .. }
                ) {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
                let place = self
                    .names
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .places
                    .get(ordinal)
                    .ok_or(ExecutionError::InvalidCheckpoint)?;
                let remembered = if place.still_seen {
                    None
                } else {
                    Some(crate::commands::movement_destination(
                        &self.actor,
                        &self.items[self.index].operation_id,
                        &place.point,
                        &self.budget,
                    )?)
                };
                self.items[self.index].selected = Some(Selection::Place { ordinal });
                if let Some((command, storage)) = remembered {
                    self.merge(storage)?;
                    self.begin_preview(core, command)?;
                } else {
                    self.invocation(core)?;
                }
            }
        }
        self.name_request = None;
        Ok(())
    }
    pub(super) fn begin_preview(
        &mut self,
        core: &mut CoreMutation<'_>,
        command: NativeCommand,
    ) -> Result<(), ExecutionError> {
        self.grow(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let preview = CommandChoiceCursor::new(
            command.clone(),
            crate::commands::WorkTransitionMode::Replace,
            self.binding(core)?,
            &self.budget,
        )?;
        self.items[self.index].command = Some(command);
        self.active = Some(Active::Preview(preview));
        Ok(())
    }
}
