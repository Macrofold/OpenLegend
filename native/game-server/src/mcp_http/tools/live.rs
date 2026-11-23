//! Signed live requests share one accepted-subject reader. The browser route
//! holds current application authority through this synchronous result.

use super::{
    Failure, InspectInput, Recipient, Snapshot, directory, graph, inspect_selection, result, valid,
};
use crate::{authority::RequestScope, language::LanguageProvider};
use axum::body::Bytes;
use openlegend_simulation::{
    host::ByteBudget,
    runtime::{RuntimeError, RuntimeLiveRead},
};
use serde::Deserialize;
use serde_json::{Map, Value};
use std::sync::Arc;

pub(crate) enum Request {
    Entity(InspectInput),
    Directory(directory::Input),
    Activity(ActivityInput),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityInput {
    actor_id: String,
}

impl Request {
    pub(crate) fn select(name: &str, arguments: Map<String, Value>) -> Result<Self, Failure> {
        match name {
            "ol_entities" => directory::Input::parse(arguments).map(Self::Directory),
            "ol_activity" => {
                let input: ActivityInput = serde_json::from_value(Value::Object(arguments))
                    .map_err(|_| Failure::Invalid)?;
                if !valid(&input.actor_id, 1, 200) {
                    return Err(Failure::Invalid);
                }
                Ok(Self::Activity(input))
            }
            "ol_inspect" => {
                let input = inspect_selection(arguments)?;
                if input.kind != "entity" {
                    return Err(Failure::Invalid);
                }
                Ok(Self::Entity(input))
            }
            _ => Err(Failure::Invalid),
        }
    }

    pub(crate) fn publish(
        &self,
        read: RuntimeLiveRead<'_>,
        selected: &RequestScope,
        language: Option<&LanguageProvider>,
        budget: &ByteBudget,
    ) -> Result<Bytes, Failure> {
        let recipient = Recipient::Signed(Arc::from(selected.account_id.as_str()));
        let snapshot = Snapshot {
            world_id: read.progress.world_id,
            generation: &selected.timeline_id,
            sequence: read.progress.sequence,
            sim_time: read.progress.at,
        };
        match self {
            Self::Entity(request) => {
                let entity = read
                    .select(&request.id)
                    .map_err(runtime_failure)?
                    .ok_or(Failure::Forbidden)?
                    .inspection()
                    .map_err(runtime_failure)?;
                graph::live_entity(request, entity, snapshot, budget, &recipient)
            }
            Self::Directory(input) => input.read(&read, selected, language, budget, &recipient),
            Self::Activity(input) => {
                let activity = read
                    .current_work(&input.actor_id)
                    .map_err(runtime_failure)?
                    .ok_or(Failure::Forbidden)?;
                result(snapshot, activity, budget, &recipient)
            }
        }?
        .signed()
    }
}

pub(super) fn runtime_failure(error: RuntimeError) -> Failure {
    if error.is_capacity() {
        Failure::Capacity
    } else {
        Failure::Unavailable
    }
}
