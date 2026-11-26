//! An explicit reply's optional, uncommitted first spoken operation. The
//! owning socket rechecks this real native exposure cut at disclosure.

use crate::{
    authority::{Authority, AuthorizedScope},
    boot::CurrentServer,
    decision_dispatch::CallFailure,
    decision_render::BoundSchema,
    store::AdmittedJob,
    world::WorldError,
};
use openlegend_simulation::{
    encoding::json_tree_allocation_bound,
    host::{ByteBudget, ByteReservation, CapacityError},
    narration::{NameArticle, name_phrase},
    runtime::RuntimeError,
    speech::{GENERATED_SPEECH_UTF16_LIMIT, SpeechText},
    text::JsText,
    worlds::base_observed::SpeechVolume,
};
use serde_json::{Value, value::RawValue};
use std::{borrow::Cow, sync::Arc};
use tokio::sync::watch;

pub(crate) struct PreviewAttempt {
    pub(crate) authority: Arc<Authority>,
    pub(crate) scope: Arc<AuthorizedScope>,
    pub(crate) job: Arc<AdmittedJob>,
    pub(crate) stopped: watch::Receiver<bool>,
    schema: Arc<BoundSchema>,
    player_alias: String,
    prefix: Prefix,
    _custody: ByteReservation,
}

pub(crate) struct PreviewSpeech {
    pub(crate) text: JsText,
    pub(crate) volume: SpeechVolume,
    pub(crate) local_id: String,
    _custody: ByteReservation,
}

pub(crate) struct PreviewDisclosure {
    pub(crate) cut: u64,
    pub(crate) speaker: JsText,
    _custody: ByteReservation,
}

impl PreviewAttempt {
    pub(super) fn new(
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        job: Arc<AdmittedJob>,
        stopped: watch::Receiver<bool>,
        schema: Arc<BoundSchema>,
        player_alias: &str,
        budget: &ByteBudget,
    ) -> Option<Self> {
        let custody = budget
            .reserve(std::mem::size_of::<Self>() + player_alias.len())
            .ok()?;
        Some(Self {
            authority,
            scope,
            job,
            stopped,
            schema,
            player_alias: player_alias.to_owned(),
            prefix: Prefix::default(),
            _custody: custody,
        })
    }

    /// Consume the first complete operation from the transport's already
    /// funded accumulated bytes. Only the independently funded words escape.
    pub(crate) fn inspect(
        &mut self,
        prefix: &[u8],
        budget: &ByteBudget,
    ) -> Result<Option<PreviewSpeech>, CallFailure> {
        if *self.stopped.borrow() {
            self.prefix.step = Step::Ended;
            return Ok(None);
        }
        let raw = match self
            .prefix
            .operation(prefix, self.schema.preview_root_fields())
        {
            Ok(Some(raw)) => raw,
            Ok(None) => return Ok(None),
            Err(error) => {
                self.prefix.step = Step::Ended;
                return Err(error);
            }
        };
        let bytes = json_tree_allocation_bound(raw.get()).ok_or(CallFailure::Invalid)?;
        let Ok(_decoded) = budget.reserve(bytes) else {
            return Ok(None);
        };
        let operation: Value = serde_json::from_str(raw.get()).map_err(|_| CallFailure::Invalid)?;
        let Some(talk) = self.schema.preview_talk(&operation, &self.player_alias) else {
            return Ok(None);
        };
        let part = talk["text"].as_str().ok_or(CallFailure::Invalid)?;
        let Ok(mut speech) = SpeechText::new(GENERATED_SPEECH_UTF16_LIMIT, budget) else {
            return Ok(None);
        };
        if speech.append(part).is_err() || speech.canonical().is_empty() {
            return Ok(None);
        }
        let (text, mut custody) = speech.into_canonical();
        let local_id = operation["localId"].as_str().ok_or(CallFailure::Invalid)?;
        let volume =
            serde_json::from_value(talk["volume"].clone()).map_err(|_| CallFailure::Invalid)?;
        let Ok(extra) = budget.reserve(std::mem::size_of::<PreviewSpeech>() + local_id.len())
        else {
            return Ok(None);
        };
        if custody.merge(extra).is_err() {
            return Ok(None);
        }
        Ok(Some(PreviewSpeech {
            text,
            local_id: local_id.to_owned(),
            volume,
            _custody: custody,
        }))
    }

    pub(crate) fn prefix_ended(&self) -> bool {
        self.prefix.step == Step::Ended
    }

    /// Capture the exact authorized pair, calculate hearing and sight off
    /// the world turn, then resolve it through the original native cut.
    pub(crate) async fn disclosure(
        &self,
        game: &Arc<CurrentServer>,
        volume: SpeechVolume,
    ) -> Result<Option<PreviewDisclosure>, WorldError> {
        if *self.stopped.borrow() {
            return Ok(None);
        }
        let disclosure = read_disclosure(
            game,
            self.authority.clone(),
            self.scope.clone(),
            &self.job.job.request.npc_id,
            volume,
        )
        .await?;
        Ok(disclosure.filter(|_| !*self.stopped.borrow()))
    }
}

pub(crate) async fn read_disclosure(
    game: &Arc<CurrentServer>,
    authority: Arc<Authority>,
    scope: Arc<AuthorizedScope>,
    npc: &str,
    volume: SpeechVolume,
) -> Result<Option<PreviewDisclosure>, WorldError> {
    let budget = game.host.budget();
    let _inputs = budget
        .reserve(1024 + npc.len())
        .map_err(RuntimeError::from)?;
    let read = game
        .world
        .capture_reply_preview(authority, scope, npc.to_owned(), volume)
        .await?;
    let (read, answer) = if read.geometry().is_some() {
        let geometry = game.spatial.clone();
        let budget = budget.clone();
        game.host
            .compute(move || -> Result<_, WorldError> {
                let result = read
                    .geometry()
                    .map(|query| geometry.compute(query, &budget))
                    .transpose()
                    .map_err(WorldError::Geometry)?;
                Ok((read, result))
            })
            .await??
    } else {
        (read, None)
    };
    let facts = game
        .world
        .capture(move |session| {
            if let Some(answer) = answer {
                let (body, _custody) = answer.into_parts();
                session.finish_reply_preview_direct(read, Some(body))
            } else {
                session.finish_reply_preview_direct(read, None)
            }
        })
        .await?;
    if !facts.eligible || !facts.clear {
        return Ok(None);
    }
    let named = facts.speaker_name().ok_or(WorldError::ProviderKind)?;
    let bytes = named
        .name
        .units_len()
        .checked_mul(8)
        .and_then(|n| n.checked_add(std::mem::size_of::<PreviewDisclosure>()))
        .ok_or(CapacityError)
        .map_err(RuntimeError::from)?;
    let custody = budget.reserve(bytes).map_err(RuntimeError::from)?;
    let speaker = name_phrase(named, NameArticle::None, false);
    Ok(Some(PreviewDisclosure {
        cut: facts.accepted_cut,
        speaker,
        _custody: custody,
    }))
}

#[derive(Default, Clone, Copy, PartialEq, Eq)]
enum Step {
    #[default]
    Object,
    Key,
    Colon(RootValue),
    Value(RootValue),
    Comma,
    FirstOperation,
    Ended,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum RootValue {
    Operations,
    Queries,
    Other,
}

#[derive(Default)]
struct Prefix {
    step: Step,
    at: usize,
    fields_seen: u64,
    decision_confirmed: bool,
}

impl Prefix {
    fn operation<'a>(
        &mut self,
        prefix: &'a [u8],
        fields: &serde_json::Map<String, Value>,
    ) -> Result<Option<&'a RawValue>, CallFailure> {
        while let Some(rest) = prefix.get(self.at..) {
            let after_space = rest
                .iter()
                .position(|byte| !matches!(*byte, b' ' | b'\t' | b'\n' | b'\r'));
            let Some(after_space) = after_space else {
                return Ok(None);
            };
            self.at += after_space;
            let rest = &rest[after_space..];
            let byte = rest[0];
            self.step = match self.step {
                Step::Object if byte == b'{' => {
                    self.at += 1;
                    Step::Key
                }
                Step::Object => return Err(CallFailure::Invalid),
                Step::Key if byte == b'}' => Step::Ended,
                Step::Key if byte == b'"' => {
                    let Some((raw, consumed)) = json_prefix(rest)? else {
                        return Ok(None);
                    };
                    self.at += consumed;
                    // Match the actual materialized schema, including a
                    // query or invention slot only when this request offers it.
                    // Ordinary keys use borrowed text. An escaped key cannot
                    // outgrow its longest allowed representation.
                    let key = &raw.get()[1..raw.get().len() - 1];
                    let decoded = if key.contains('\\') {
                        let maximum = fields.keys().map(String::len).max().unwrap_or(0) * 6;
                        if key.len() > maximum {
                            return Err(CallFailure::Invalid);
                        }
                        Cow::Owned(
                            serde_json::from_str::<String>(raw.get())
                                .map_err(|_| CallFailure::Invalid)?,
                        )
                    } else {
                        Cow::Borrowed(key)
                    };
                    let ordinal = fields
                        .keys()
                        .position(|field| field == decoded.as_ref())
                        .ok_or(CallFailure::Invalid)?;
                    let bit = 1u64
                        .checked_shl(ordinal as u32)
                        .ok_or(CallFailure::Invalid)?;
                    if self.fields_seen & bit != 0 {
                        return Err(CallFailure::Invalid);
                    }
                    self.fields_seen |= bit;
                    Step::Colon(match decoded.as_ref() {
                        "operations" => RootValue::Operations,
                        "queries" => RootValue::Queries,
                        _ => RootValue::Other,
                    })
                }
                Step::Key => return Err(CallFailure::Invalid),
                Step::Colon(field) if byte == b':' => {
                    self.at += 1;
                    Step::Value(field)
                }
                Step::Colon(_) => return Err(CallFailure::Invalid),
                Step::Value(RootValue::Operations)
                    if fields.contains_key("queries") && !self.decision_confirmed =>
                {
                    // Reordered provider output must settle before disclosure.
                    // Only an explicit no-query answer permits an early quote.
                    Step::Ended
                }
                Step::Value(RootValue::Operations) if byte == b'[' => {
                    self.at += 1;
                    Step::FirstOperation
                }
                Step::Value(RootValue::Operations) => return Err(CallFailure::Invalid),
                Step::Value(field) => {
                    let Some((raw, consumed)) = json_prefix(rest)? else {
                        return Ok(None);
                    };
                    self.at += consumed;
                    if field == RootValue::Queries {
                        self.decision_confirmed = raw.get() == "null"
                            || raw.get().starts_with('[')
                                && raw.get()[1..raw.get().len() - 1].trim().is_empty();
                        if !self.decision_confirmed {
                            Step::Ended
                        } else {
                            Step::Comma
                        }
                    } else {
                        Step::Comma
                    }
                }
                Step::Comma if byte == b',' => {
                    self.at += 1;
                    Step::Key
                }
                Step::Comma if byte == b'}' => Step::Ended,
                Step::Comma => return Err(CallFailure::Invalid),
                Step::FirstOperation if byte == b']' => Step::Ended,
                Step::FirstOperation => {
                    let Some((operation, _)) = json_prefix(rest)? else {
                        return Ok(None);
                    };
                    self.step = Step::Ended;
                    return Ok(Some(operation));
                }
                Step::Ended => return Ok(None),
            };
        }
        Err(CallFailure::Invalid)
    }
}

fn json_prefix(input: &[u8]) -> Result<Option<(&RawValue, usize)>, CallFailure> {
    let mut stream = serde_json::Deserializer::from_slice(input).into_iter::<&RawValue>();
    match stream.next() {
        Some(Ok(raw)) => Ok(Some((raw, stream.byte_offset()))),
        Some(Err(error)) if !error.is_eof() => Err(CallFailure::Invalid),
        _ => Ok(None),
    }
}
