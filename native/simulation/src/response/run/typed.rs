//! Free lexical forms bind through the real invocation/command preparation
//! owners before one pure formatting batch. Returned words grant no commands.
use super::*;
use crate::language::FreeTypedActionSyntax;
mod names;

#[derive(Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
enum Prepared {
    Unknown,
    Unsupported {
        family: String,
    },
    NamedRefused {
        category: String,
        reason: JsText,
    },
    Approach {
        label: JsText,
        destination: crate::state::SurfacePoint,
    },
    LastSeen {
        label: JsText,
        at: f64,
        still_seen: bool,
        sim_time: f64,
        destination: crate::state::SurfacePoint,
    },
    Stop,
    Point {
        destination: crate::state::SurfacePoint,
    },
    Offset {
        x: f64,
        z: f64,
        destination: crate::state::SurfacePoint,
    },
    NotStopping {
        activity: String,
    },
    DistanceNeeded,
    InvocationRefused {
        outcome: Outcome,
    },
    PreviewRefused {
        outcome: Outcome,
    },
}
impl HeapBytes for Prepared {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Point { destination } | Self::Offset { destination, .. } => {
                destination.heap_bytes()
            }
            Self::NotStopping { activity } => activity.heap_bytes(),
            Self::Unsupported { family } => family.heap_bytes(),
            Self::NamedRefused { category, reason } => {
                category.heap_bytes()?.checked_add(reason.heap_bytes()?)
            }
            Self::Approach { label, destination }
            | Self::LastSeen {
                label, destination, ..
            } => label.heap_bytes()?.checked_add(destination.heap_bytes()?),
            Self::InvocationRefused { outcome } | Self::PreviewRefused { outcome } => {
                outcome.heap_bytes()
            }
            _ => Some(0),
        }
    }
}
struct Item {
    operation: usize,
    position: usize,
    duplicate: Option<usize>,
    operation_id: String,
    target: Option<String>,
    depends: Vec<String>,
    selected: Option<names::Selection>,
    description: JsText,
    syntax: FreeTypedActionSyntax,
    slots: Option<SqlCell>,
    command: Option<NativeCommand>,
    prepared: Option<Prepared>,
    unmet: Vec<JsText>,
}
pub(crate) struct TypedActionRequest {
    pub binding: GeometryBinding,
    json: String,
    _storage: ByteReservation,
}
impl Serialize for TypedActionRequest {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(&self.json).map_err(serde::ser::Error::custom)?;
        raw.serialize(serializer)
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct TypedActionAnswer {
    pub binding: GeometryBinding,
    output: TypedActionOutput,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum TypedActionOutput {
    Name { selection: names::Selection },
    Format { results: Vec<Rendered> },
}
impl TypedActionAnswer {
    pub(crate) fn array_element_bytes() -> usize {
        size_of::<Rendered>().max(size_of::<SqlCell>())
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Rendered {
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    fulfillment: Option<SqlCell>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    resolution: Option<ResolutionWords>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ResolutionWords {
    category: String,
    reason: JsText,
}
pub(super) enum TypedAnswer {
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
    Render(TypedActionAnswer),
}
pub(super) enum TypedStep<'a> {
    Geometry(&'a GeometryQueries),
    Display(&'a mut crate::commands::ActivityDisplayCursor),
    Render(&'a TypedActionRequest),
    Complete(Vec<ResponseAttemptBinding>, ByteReservation),
}
enum Active {
    Invocation(InvocationCursor),
    Preview(CommandChoiceCursor),
}
pub(super) struct TypedGroundingCursor {
    actor: String,
    candidate: CandidateKey,
    at: f64,
    items: Vec<Item>,
    index: usize,
    active: Option<Active>,
    request: Option<TypedActionRequest>,
    name_request: Option<TypedActionRequest>,
    names: Option<names::Roster>,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}
impl TypedGroundingCursor {
    pub(super) fn prepare(
        response: &ActorResponse,
        normalized: &NormalizedAttemptFacts,
        bindings: &ResponseBindings,
        grounded: &[ResponseAttemptBinding],
        operations: &[(usize, usize)],
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let mut storage = budget.reserve(
            operations
                .len()
                .checked_mul(size_of::<Item>())
                .and_then(|n| n.checked_add(bindings.actor_id().len() + size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut items = Vec::with_capacity(operations.len());
        for &(operation, position) in operations {
            let op = response
                .operation(operation)
                .ok_or(ExecutionError::Invariant)?;
            if grounded
                .iter()
                .any(|binding| binding.operation_id.as_deref() == Some(op.local_id))
            {
                continue;
            }
            if op
                .data
                .get("targetEntityId")
                .filter(|v| !v.is_null())
                .is_some_and(|v| {
                    v.as_str()
                        .is_none_or(|id| !bindings.input.entity_ids.iter().any(|known| known == id))
                })
            {
                // The actual component target gate reports this refusal later.
                // An unpermitted model token is never a personal-name lookup.
                continue;
            }
            let language = normalized.get(position).ok_or(ExecutionError::Invariant)?;
            let Some(syntax) = language.syntax() else {
                continue;
            };
            let description = op.text("description").ok_or(ExecutionError::Invariant)?;
            let slots = op.data.get("slots").filter(|slots| !slots.is_null());
            storage.resize(
                storage
                    .bytes()
                    .checked_add(op.local_id.len())
                    .and_then(|n| n.checked_add(description.heap_bytes()?))
                    .and_then(|n| n.checked_add(syntax.heap_bytes()?))
                    .and_then(|n| n.checked_add(slots.map_or(Some(0), HeapBytes::heap_bytes)?))
                    .and_then(|n| {
                        n.checked_add(
                            op.text("targetEntityId")
                                .map_or(Some(0), HeapBytes::heap_bytes)?,
                        )
                    })
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let duplicate = items.iter().position(|prior: &Item| {
                let previous = response
                    .operation(prior.operation)
                    .expect("Earlier actual operation");
                normalized
                    .get(prior.position)
                    .is_some_and(|prior| prior.normalized() == language.normalized())
                    && previous.data.get("targetEntityId") == op.data.get("targetEntityId")
                    && previous.data.get("mode") == op.data.get("mode")
                    && super::grounding::same_slots(previous.data, op.data)
            });
            items.push(Item {
                operation,
                position,
                duplicate,
                operation_id: op.local_id.into(),
                target: op
                    .text("targetEntityId")
                    .and_then(JsText::as_unicode)
                    .map(str::to_owned),
                depends: Vec::new(),
                selected: None,
                description: description.clone(),
                syntax: syntax.clone(),
                slots: slots.cloned(),
                command: None,
                prepared: None,
                unmet: Vec::new(),
            });
        }
        if items.is_empty() {
            return Ok(None);
        }
        Ok(Some(Self {
            actor: bindings.actor_id().into(),
            candidate,
            at: 0.0,
            items,
            index: 0,
            active: None,
            request: None,
            name_request: None,
            names: None,
            budget: budget.clone(),
            storage: Some(storage),
        }))
    }
    fn grow(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self
            .storage
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn merge(&mut self, storage: ByteReservation) -> Result<(), ExecutionError> {
        self.storage
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .merge(storage)?;
        Ok(())
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        match self.active.as_ref()? {
            Active::Invocation(cursor) => cursor.geometry_request(),
            Active::Preview(cursor) => cursor.geometry_request(),
        }
    }
    pub(super) fn display_cursor(&mut self) -> Option<&mut crate::commands::ActivityDisplayCursor> {
        match self.active.as_mut()? {
            Active::Preview(cursor) => cursor.display_cursor(),
            _ => None,
        }
    }
    pub(super) fn request(&self) -> Option<&TypedActionRequest> {
        self.name_request.as_ref().or(self.request.as_ref())
    }
    pub(super) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(Active::Preview(cursor)) = self.active.as_mut() {
            cursor.abort(core)?;
        }
        self.active = None;
        self.request = None;
        self.name_request = None;
        self.names = None;
        self.storage = None;
        Ok(())
    }
    fn invocation(&mut self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        self.grow(
            map_storage::<String, SqlCell>(14)
                .and_then(|n| n.checked_add(self.items[self.index].syntax.heap_bytes()?))
                .and_then(|n| n.checked_add(512))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let item = &self.items[self.index];
        let mut fields = IndexMap::with_capacity(14);
        fields.insert("family".into(), "move".into());
        for key in [
            "x",
            "z",
            "surfaceId",
            "frame",
            "place",
            "targetEntityId",
            "distance",
            "relation",
            "onLost",
            "until",
            "itemId",
            "quantity",
        ] {
            fields.insert(key.into(), SqlCell::Null);
        }
        match &item.syntax {
            FreeTypedActionSyntax::Point { x, z, surface_id } => {
                fields.insert("x".into(), x.map_or(SqlCell::Null, SqlCell::from));
                fields.insert("z".into(), z.map_or(SqlCell::Null, SqlCell::from));
                if let Some(surface) = surface_id {
                    fields.insert("surfaceId".into(), surface.clone().into());
                }
            }
            FreeTypedActionSyntax::Offset { x, z } => {
                fields.insert("x".into(), x.map_or(SqlCell::Null, SqlCell::from));
                fields.insert("z".into(), z.map_or(SqlCell::Null, SqlCell::from));
                fields.insert("frame".into(), "actor".into());
            }
            FreeTypedActionSyntax::Approach { .. } | FreeTypedActionSyntax::LastSeen { .. } => {
                let roster = self.names.as_ref().ok_or(ExecutionError::Invariant)?;
                let target = match item.selected.as_ref().ok_or(ExecutionError::Invariant)? {
                    names::Selection::Body { ordinal } => {
                        &roster
                            .bodies
                            .get(*ordinal)
                            .ok_or(ExecutionError::InvalidCheckpoint)?
                            .id
                    }
                    names::Selection::Place { ordinal } => {
                        &roster
                            .places
                            .get(*ordinal)
                            .ok_or(ExecutionError::InvalidCheckpoint)?
                            .subject_id
                    }
                    _ => return Err(ExecutionError::Invariant),
                };
                fields.insert("place".into(), "target".into());
                fields.insert("targetEntityId".into(), target.as_str().into());
            }
            _ => return Err(ExecutionError::Invariant),
        }
        self.active = Some(Active::Invocation(InvocationCursor::new(
            core,
            &self.actor,
            &item.operation_id,
            &SqlCell::Object(fields),
            self.candidate,
            &self.budget,
        )?));
        Ok(())
    }
    fn finish_command(&mut self) -> Result<(), ExecutionError> {
        let item = &self.items[self.index];
        let destination = match item.command.as_ref().ok_or(ExecutionError::Invariant)? {
            NativeCommand::Move { destination, .. } => destination,
            _ => return Err(ExecutionError::Invariant),
        };
        let label_bytes = match self.items[self.index].selected.as_ref() {
            Some(names::Selection::Body { ordinal }) => self
                .names
                .as_ref()
                .and_then(|r| r.bodies.get(*ordinal))
                .map_or(Some(0), |b| b.label.heap_bytes()),
            Some(names::Selection::Place { ordinal }) => self
                .names
                .as_ref()
                .and_then(|r| r.places.get(*ordinal))
                .map_or(Some(0), |p| p.label.heap_bytes()),
            _ => Some(0),
        }
        .ok_or(ExecutionError::Capacity)?;
        let bytes = destination
            .heap_bytes()
            .and_then(|n| n.checked_add(label_bytes))
            .ok_or(ExecutionError::Capacity)?;
        self.grow(bytes)?;
        let item = &mut self.items[self.index];
        let destination = match item.command.as_ref().ok_or(ExecutionError::Invariant)? {
            NativeCommand::Move { destination, .. } => destination.clone(),
            _ => return Err(ExecutionError::Invariant),
        };
        item.prepared = Some(match item.syntax {
            FreeTypedActionSyntax::Point { .. } => Prepared::Point { destination },
            FreeTypedActionSyntax::Offset {
                x: Some(x),
                z: Some(z),
            } => Prepared::Offset { x, z, destination },
            FreeTypedActionSyntax::Approach { .. } => {
                let Some(names::Selection::Body { ordinal }) = item.selected.as_ref() else {
                    return Err(ExecutionError::Invariant);
                };
                Prepared::Approach {
                    label: self.names.as_ref().ok_or(ExecutionError::Invariant)?.bodies[*ordinal]
                        .label
                        .clone(),
                    destination,
                }
            }
            FreeTypedActionSyntax::LastSeen { .. } => {
                let Some(names::Selection::Place { ordinal }) = item.selected.as_ref() else {
                    return Err(ExecutionError::Invariant);
                };
                let place = &self.names.as_ref().ok_or(ExecutionError::Invariant)?.places[*ordinal];
                Prepared::LastSeen {
                    label: place.label.clone(),
                    at: place.at,
                    still_seen: place.still_seen,
                    sim_time: self.at,
                    destination,
                }
            }
            _ => return Err(ExecutionError::Invariant),
        });
        self.index += 1;
        Ok(())
    }
    fn prepare_request(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        for index in 0..self.items.len() {
            let bound = self.items[index]
                .slots
                .as_ref()
                .map_or(Some(1024), |slots| {
                    slots.heap_bytes()?.checked_mul(2)?.checked_add(1024)
                })
                .ok_or(ExecutionError::Capacity)?;
            self.grow(bound)?;
            let item = &mut self.items[index];
            let commands = item
                .command
                .as_ref()
                .map(|command| command.source_encoding());
            let _decode = commands
                .map(|json| -> Result<ByteReservation, ExecutionError> {
                    Ok(self
                        .budget
                        .reserve(crate::experience::encoded_body_bound(json)?)?)
                })
                .transpose()?;
            let raw: Option<SqlCell> = commands
                .map(|json| serde_json::from_str(json).map_err(|_| ExecutionError::Invariant))
                .transpose()?;
            for missing in super::super::slots::unmet_slots(
                &core.state.installed,
                raw.as_ref().map_or(&[][..], std::slice::from_ref),
                item.slots.as_ref(),
            )
            .iter()
            .flatten()
            {
                let mut text = JsText::default();
                missing.append_to(&mut text);
                item.unmet.push(text);
            }
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Limits {
            minimum_distance: f64,
            maximum_distance: f64,
            offset: f64,
        }
        #[derive(Serialize)]
        struct Request<'a> {
            requested: &'a JsText,
            prepared: &'a Prepared,
            unmet: &'a [JsText],
        }
        #[derive(Serialize)]
        struct Input<'a> {
            phase: &'static str,
            binding: GeometryBinding,
            limits: Limits,
            requests: Vec<Request<'a>>,
        }
        let _list = self.budget.reserve(
            self.items
                .len()
                .checked_mul(size_of::<Request>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let binding = self.binding(core)?;
        let follow = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .follow;
        let mut requests = Vec::with_capacity(self.items.len());
        for item in &self.items {
            requests.push(Request {
                requested: &item.description,
                prepared: item.prepared.as_ref().ok_or(ExecutionError::Invariant)?,
                unmet: &item.unmet,
            });
        }
        let input = Input {
            phase: "format",
            binding,
            limits: Limits {
                minimum_distance: follow.minimum_distance,
                maximum_distance: follow.maximum_distance,
                offset: core.state.installed.actor_response_limits.invocation.offset,
            },
            requests,
        };
        let length =
            crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
        let mut storage = self
            .budget
            .reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let json = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
        storage.resize(json.capacity())?;
        self.request = Some(TypedActionRequest {
            binding,
            json,
            _storage: storage,
        });
        Ok(())
    }
    fn complete(
        &mut self,
        core: &CoreMutation<'_>,
        answer: TypedActionAnswer,
    ) -> Result<(Vec<ResponseAttemptBinding>, ByteReservation), ExecutionError> {
        let TypedActionOutput::Format { results } = answer.output else {
            return Err(ExecutionError::InvalidCheckpoint);
        };
        if answer.binding
            != self
                .request
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .binding
            || results.len() != self.items.len()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.grow(
            self.items
                .len()
                .checked_mul(size_of::<ResponseAttemptBinding>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut bindings = Vec::with_capacity(self.items.len());
        for (index, rendered) in results.into_iter().enumerate() {
            let successful = matches!(
                self.items[index].prepared,
                Some(
                    Prepared::Stop
                        | Prepared::Point { .. }
                        | Prepared::Offset { .. }
                        | Prepared::Approach { .. }
                        | Prepared::LastSeen { .. }
                )
            );
            if matches!(self.items[index].prepared, Some(Prepared::Unknown)) {
                if rendered.fulfillment.is_some() || rendered.resolution.is_some() {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
                continue;
            }
            if successful != rendered.fulfillment.is_some()
                || successful == rendered.resolution.is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let mut resolution = None;
            if let Some(words) = rendered.resolution {
                let (signature, guard) = crate::plans::resolution_signature(
                    core.state,
                    &self.actor,
                    &self.items[index].depends,
                    &self.budget,
                )?;
                self.merge(guard)?;
                self.grow(
                    self.items[index]
                        .depends
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                self.grow(
                    map_storage::<String, SqlCell>(4)
                        .and_then(|n| n.checked_add(words.category.heap_bytes()?))
                        .and_then(|n| n.checked_add(words.reason.heap_bytes()?))
                        .and_then(|n| n.checked_add(signature.capacity()))
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let mut fields = IndexMap::with_capacity(4);
                fields.insert("category".into(), words.category.into());
                fields.insert("reason".into(), words.reason.into());
                fields.insert(
                    "depends".into(),
                    SqlCell::Array(
                        self.items[index]
                            .depends
                            .iter()
                            .map(|id| id.as_str().into())
                            .collect(),
                    ),
                );
                fields.insert("signature".into(), signature.clone().into());
                let length = crate::encoding::json_record_len(&fields)
                    .map_err(|_| ExecutionError::Invariant)?;
                let _encode = self
                    .budget
                    .reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
                let value = crate::plans::ActionResolution::from_cell(SqlCell::Object(fields))
                    .map_err(|_| ExecutionError::InvalidCheckpoint)?;
                self.grow(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                resolution = Some(value);
            }
            if let Some(fulfillment) = &rendered.fulfillment {
                self.grow(fulfillment.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            }
            let mut commands = Vec::new();
            if let Some(command) = self.items[index].command.take() {
                self.grow(
                    crate::experience::encoded_body_bound(command.source_encoding())?
                        .checked_add(size_of::<SqlCell>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                commands = vec![
                    serde_json::from_str(command.source_encoding())
                        .map_err(|_| ExecutionError::Invariant)?,
                ];
            }
            let item = &mut self.items[index];
            bindings.push(ResponseAttemptBinding {
                operation_id: Some(std::mem::take(&mut item.operation_id)),
                manifest_revision: Some(core.state.installed.manifest.revision),
                target_episodes: None,
                fulfillment: rendered.fulfillment,
                resolution,
                keep: None,
                description: std::mem::take(&mut item.description),
                commands,
            });
        }
        self.items = Vec::new();
        self.request = None;
        let mut storage = self
            .storage
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage.resize(bindings.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok((bindings, storage))
    }
    pub(super) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<TypedAnswer>,
    ) -> Result<TypedStep<'a>, ExecutionError> {
        if self.storage.is_none() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.at = core.state.physical.header.sim_time;
        if self.name_request.is_some() {
            match answer.take() {
                Some(TypedAnswer::Render(value)) => self.finish_name(core, value)?,
                Some(_) => return Err(ExecutionError::InvalidCheckpoint),
                None => {
                    return Ok(TypedStep::Render(
                        self.name_request
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?,
                    ));
                }
            }
        }
        if self.request.is_some() {
            return match answer.take() {
                Some(TypedAnswer::Render(value)) => {
                    let (bindings, storage) = self.complete(core, value)?;
                    Ok(TypedStep::Complete(bindings, storage))
                }
                Some(_) => Err(ExecutionError::InvalidCheckpoint),
                None => Ok(TypedStep::Render(
                    self.request.as_ref().ok_or(ExecutionError::Invariant)?,
                )),
            };
        }
        loop {
            if let Some(mut active) = self.active.take() {
                match &mut active {
                    Active::Invocation(cursor) => {
                        let reply = match answer.take() {
                            Some(TypedAnswer::Geometry(answer)) => Some(answer),
                            Some(_) => return Err(ExecutionError::InvalidCheckpoint),
                            None => None,
                        };
                        let result = match cursor.step(core, reply)? {
                            InvocationStep::Geometry(_) => None,
                            InvocationStep::Complete(value) => Some(value.into_parts()),
                        };
                        let Some((result, storage)) = result else {
                            self.active = Some(active);
                            return Ok(TypedStep::Geometry(
                                self.geometry_request().ok_or(ExecutionError::Invariant)?,
                            ));
                        };
                        self.merge(storage)?;
                        match result {
                            Err(outcome) => {
                                self.items[self.index].prepared =
                                    Some(Prepared::InvocationRefused { outcome });
                                self.index += 1;
                            }
                            Ok(command) => {
                                self.begin_preview(core, command)?;
                            }
                        }
                    }
                    Active::Preview(cursor) => {
                        let reply = match answer.take() {
                            Some(TypedAnswer::Geometry(answer)) => {
                                Some(CommandChoiceAnswer::Geometry(answer))
                            }
                            Some(TypedAnswer::Display(answer)) => {
                                Some(CommandChoiceAnswer::Display(answer))
                            }
                            Some(_) => return Err(ExecutionError::InvalidCheckpoint),
                            None => None,
                        };
                        let result = match cursor.step(core, reply)? {
                            CommandChoiceStep::Geometry(_) => None,
                            CommandChoiceStep::Display(_) => {
                                self.active = Some(active);
                                return Ok(TypedStep::Display(
                                    self.display_cursor().ok_or(ExecutionError::Invariant)?,
                                ));
                            }
                            CommandChoiceStep::Complete(value) => Some(value.into_parts()),
                        };
                        let Some((outcome, storage)) = result else {
                            self.active = Some(active);
                            return Ok(TypedStep::Geometry(
                                self.geometry_request().ok_or(ExecutionError::Invariant)?,
                            ));
                        };
                        self.merge(storage)?;
                        if outcome.ok {
                            self.finish_command()?;
                        } else {
                            self.items[self.index].command = None;
                            self.items[self.index].depends.clear();
                            self.items[self.index].prepared =
                                Some(Prepared::PreviewRefused { outcome });
                            self.index += 1;
                        }
                    }
                }
                continue;
            }
            if answer.is_some() {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            if self.index == self.items.len() {
                self.prepare_request(core)?;
                return Ok(TypedStep::Render(
                    self.request.as_ref().ok_or(ExecutionError::Invariant)?,
                ));
            }
            if let Some(prior) = self.items[self.index].duplicate {
                let bound = self.items[prior]
                    .command
                    .heap_bytes()
                    .and_then(|n| n.checked_add(self.items[prior].prepared.heap_bytes()?))
                    .and_then(|n| n.checked_add(self.items[prior].depends.heap_bytes()?))
                    .ok_or(ExecutionError::Capacity)?;
                self.grow(bound)?;
                self.items[self.index].command = self.items[prior].command.clone();
                self.items[self.index].prepared = self.items[prior].prepared.clone();
                self.items[self.index].depends = self.items[prior].depends.clone();
                self.index += 1;
                continue;
            }
            match &self.items[self.index].syntax {
                FreeTypedActionSyntax::Stop { activity } => {
                    let current = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .and_then(|entity| entity.actor.as_ref())
                        .and_then(|actor| actor.action.as_ref())
                        .map(|action| action.kind.as_str());
                    let expected = match activity.as_deref() {
                        None => None,
                        Some("following") => Some("follow"),
                        Some("gathering") => Some("gather"),
                        Some("moving" | "walking") => Some("move"),
                        _ => return Err(ExecutionError::InvalidCheckpoint),
                    };
                    if expected.is_some() && expected != current {
                        let name = activity.as_ref().ok_or(ExecutionError::Invariant)?;
                        let bytes = name.len();
                        self.grow(bytes)?;
                        self.items[self.index].prepared = Some(Prepared::NotStopping {
                            activity: self.items[self.index].syntax_activity()?.into(),
                        });
                    } else {
                        self.grow(
                            map_storage::<String, SqlCell>(3)
                                .and_then(|n| {
                                    n.checked_add(
                                        self.actor.len()
                                            + self.items[self.index].operation_id.len()
                                            + 128,
                                    )
                                })
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let mut fields = IndexMap::with_capacity(3);
                        fields.insert(
                            "id".into(),
                            self.items[self.index].operation_id.as_str().into(),
                        );
                        fields.insert("actorId".into(), self.actor.as_str().into());
                        fields.insert("type".into(), "cancel".into());
                        self.items[self.index].command = actions::command(
                            &SqlCell::Object(fields),
                            &self.actor,
                            &self.items[self.index].operation_id,
                            &self.budget,
                        )?;
                        self.items[self.index].prepared = Some(Prepared::Stop);
                    }
                    self.index += 1;
                }
                FreeTypedActionSyntax::DistanceNeeded => {
                    self.items[self.index].prepared = Some(Prepared::DistanceNeeded);
                    self.index += 1;
                }
                FreeTypedActionSyntax::Approach { .. } | FreeTypedActionSyntax::LastSeen { .. } => {
                    if self.items[self.index]
                        .slots
                        .as_ref()
                        .and_then(|s| s.get("until"))
                        .is_some_and(|v| !v.is_null())
                    {
                        self.items[self.index].prepared = Some(Prepared::Unsupported {
                            family: "movement-wait".into(),
                        });
                        self.index += 1;
                    } else {
                        self.prepare_name(core)?;
                        return Ok(TypedStep::Render(
                            self.name_request
                                .as_ref()
                                .ok_or(ExecutionError::Invariant)?,
                        ));
                    }
                }
                FreeTypedActionSyntax::Unsupported { family } => {
                    let bytes = family.len();
                    self.grow(bytes)?;
                    self.items[self.index].prepared = Some(Prepared::Unsupported {
                        family: match &self.items[self.index].syntax {
                            FreeTypedActionSyntax::Unsupported { family } => family.clone(),
                            _ => return Err(ExecutionError::Invariant),
                        },
                    });
                    self.index += 1;
                }
                _ => self.invocation(core)?,
            }
        }
    }
}
impl Item {
    fn syntax_activity(&self) -> Result<&str, ExecutionError> {
        match &self.syntax {
            FreeTypedActionSyntax::Stop {
                activity: Some(activity),
            } => Ok(activity),
            _ => Err(ExecutionError::Invariant),
        }
    }
}
