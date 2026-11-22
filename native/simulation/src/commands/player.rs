//! The authorized browser handler passes its already-decoded movement input.

use super::{CommandEncoding, CommandHeaders, NativeCommand};
use crate::encoding::json_record;
use crate::state::SurfacePoint;
use serde::Serialize;

#[derive(Clone, Copy)]
pub enum RuntimePlayerCommand<'a> {
    Move(&'a SurfacePoint),
    Cancel(Option<&'a str>),
}

impl RuntimePlayerCommand<'_> {
    pub(crate) fn selected_text_bytes(self) -> usize {
        match self {
            Self::Move(point) => point.surface_id.len(),
            Self::Cancel(action) => action.map_or(0, str::len),
        }
    }

    pub(crate) fn bind(
        self,
        id: &str,
        actor: &str,
    ) -> Result<(NativeCommand, String), serde_json::Error> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Operation<'a> {
            id: &'a str,
            actor_id: &'a str,
            human_initiated: bool,
            #[serde(rename = "type")]
            kind: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<&'a SurfacePoint>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct SignaturePoint<'a> {
            surface_id: &'a str,
            x: f64,
            y: f64,
            z: f64,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Signature<'a> {
            actor_id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            destination: Option<SignaturePoint<'a>>,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_action_id: Option<&'a str>,
            human_initiated: bool,
            id: &'a str,
            #[serde(rename = "type")]
            kind: &'a str,
        }
        let (kind, destination, expected_action_id) = match self {
            Self::Move(point) => ("move", Some(point), None),
            Self::Cancel(action) => ("cancel", None, action),
        };
        let headers = CommandHeaders {
            id: id.to_owned(),
            actor_id: actor.to_owned(),
            cooperation: None,
            combat_help_id: None,
            human_initiated: Some(true),
            purpose: None,
            chosen_purpose: None,
        };
        if !headers.valid()
            || destination
                .is_some_and(|point| ![point.x, point.y, point.z].iter().all(|n| n.is_finite()))
        {
            return Err(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid selected player command binding.",
            )));
        }
        // Learning retains the original authored field order. Replay compares
        // the existing separate canonical signature. Neither string is parsed
        // to make an executable command in the stand-alone host.
        let encoding = CommandEncoding::from_ordered(
            &Operation {
                id,
                actor_id: actor,
                human_initiated: true,
                kind,
                destination,
                expected_action_id,
            },
            4 + usize::from(destination.is_some() || expected_action_id.is_some()),
        )?;
        let signature = json_record(&Signature {
            actor_id: actor,
            destination: destination.map(|point| SignaturePoint {
                surface_id: &point.surface_id,
                x: point.x,
                y: point.y,
                z: point.z,
            }),
            expected_action_id,
            human_initiated: true,
            id,
            kind,
        })?;
        let envelope = headers.envelope(encoding);
        let command = match self {
            Self::Move(point) => NativeCommand::Move {
                envelope,
                destination: point.clone().into(),
            },
            Self::Cancel(action) => NativeCommand::Cancel {
                envelope,
                expected_action_id: action.map(str::to_owned),
            },
        };
        Ok((command, signature))
    }
}
