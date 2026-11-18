//! The immediate Macrofold stream carries acceptance, deltas and the terminal
//! Run separately. A missing terminal result requires observing that same Run.
use super::*;
use axum::body::Bytes;
use serde_json::value::RawValue;
use std::borrow::Cow;

const FRAME_BYTES: usize = 1_000_000;

pub(crate) enum InferenceEvent {
    Accepted {
        run: String,
        data: FundedEventData,
    },
    Text {
        text: String,
        sequence: u64,
        _storage: ByteReservation,
    },
    Terminal {
        data: FundedEventData,
        preview_matches: bool,
    },
}

pub(crate) struct FundedEventData {
    pub(crate) value: Box<RawValue>,
    _storage: ByteReservation,
}

impl FundedEventData {
    pub(crate) fn into_reply(self) -> FundedReply {
        let value: Box<str> = self.value.into();
        FundedReply {
            bytes: value.into_string().into_bytes(),
            _storage: self._storage,
            observed: None,
        }
    }
}

pub(crate) struct InferenceEvents<'a> {
    exchange: ProviderExchange<'a>,
    decoder: Frames,
    text: BoundedBody,
    run: Option<(String, ByteReservation)>,
    sequence: u64,
    completed: bool,
}

impl<'a> InferenceEvents<'a> {
    pub(crate) fn new(
        exchange: ProviderExchange<'a>,
        budget: &ByteBudget,
    ) -> Result<Self, NetworkError> {
        if !exchange.stream_allowed || !exchange.streaming() {
            return Err(NetworkError::Transfer);
        }
        let text = BoundedBody::new(exchange.limit, budget)?;
        Ok(Self {
            exchange,
            decoder: Frames::new(budget)?,
            text,
            run: None,
            sequence: 0,
            completed: false,
        })
    }

    /// The caller persists `Accepted` before asking for another event. A
    /// transport failure can still expose that admitted identity for recovery.
    pub(crate) fn accepted_run(&self) -> Option<&str> {
        self.run.as_ref().map(|(run, _)| run.as_str())
    }

    /// Lend bytes already owned by the event reader. Callers may keep only
    /// independently admitted decoded speech, never this accumulated prefix.
    pub(crate) fn prefix(&self) -> &[u8] {
        &self.text.bytes
    }

    pub(crate) async fn next(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<Option<InferenceEvent>, NetworkError> {
        if self.completed {
            return Ok(None);
        }
        while let Some(frame) = self.decoder.next(&mut self.exchange.response).await? {
            if frame == b"[DONE]" {
                continue;
            }
            let packet: Packet<'_> =
                serde_json::from_slice(frame).map_err(|_| NetworkError::Transfer)?;
            if packet.schema_version != 1 || !valid_reference(packet.run_id, 256) {
                return Err(NetworkError::Transfer);
            }
            if packet.kind == "run.accepted" {
                if self.run.is_some() || identifier(packet.data)? != packet.run_id {
                    return Err(NetworkError::Transfer);
                }
                let mut data = captured(packet.data, budget)?;
                let detached = budget
                    .reserve(packet.run_id.len())
                    .map_err(|_| NetworkError::Capacity)?;
                let live = budget
                    .reserve(packet.run_id.len())
                    .map_err(|_| NetworkError::Capacity)?;
                data._storage
                    .merge(detached)
                    .map_err(|_| NetworkError::Capacity)?;
                let run = packet.run_id.to_owned();
                self.run = Some((run.clone(), live));
                return Ok(Some(InferenceEvent::Accepted { run, data }));
            }
            if self.run.as_ref().map(|(run, _)| run.as_str()) != Some(packet.run_id) {
                return Err(NetworkError::Transfer);
            }
            match packet.kind {
                "output.delta" => {
                    let parse = budget
                        .reserve(packet.data.get().len() * 2)
                        .map_err(|_| NetworkError::Capacity)?;
                    let delta: TextDelta<'_> = serde_json::from_str(packet.data.get())
                        .map_err(|_| NetworkError::Transfer)?;
                    if delta.choice_index != 0 {
                        return Err(NetworkError::Transfer);
                    }
                    self.text.extend(delta.text.as_bytes())?;
                    let text = delta.text.into_owned();
                    self.sequence += 1;
                    return Ok(Some(InferenceEvent::Text {
                        text,
                        sequence: self.sequence,
                        _storage: parse,
                    }));
                }
                "run.succeeded" | "run.failed" | "run.cancelled" | "run.timed_out" => {
                    if identifier(packet.data)? != packet.run_id {
                        return Err(NetworkError::Transfer);
                    }
                    let _comparison = budget
                        .reserve(packet.data.get().len() * 2)
                        .map_err(|_| NetworkError::Capacity)?;
                    let preview_matches = matches_preview(packet.data, &self.text.bytes)?;
                    let data = captured(packet.data, budget)?;
                    self.completed = true;
                    return Ok(Some(InferenceEvent::Terminal {
                        data,
                        preview_matches,
                    }));
                }
                "transport.error" => return Err(NetworkError::Transfer),
                _ => {}
            }
        }
        Err(NetworkError::Transfer)
    }
}

#[derive(Deserialize)]
struct Packet<'a> {
    schema_version: u8,
    run_id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    #[serde(borrow)]
    data: &'a RawValue,
}

#[derive(Deserialize)]
struct TextDelta<'a> {
    choice_index: u64,
    #[serde(borrow)]
    text: Cow<'a, str>,
}

fn identifier(value: &RawValue) -> Result<&str, NetworkError> {
    #[derive(Deserialize)]
    struct Run<'a> {
        run_id: &'a str,
    }
    serde_json::from_str::<Run<'_>>(value.get())
        .map(|run| run.run_id)
        .map_err(|_| NetworkError::Transfer)
}

fn captured(value: &RawValue, budget: &ByteBudget) -> Result<FundedEventData, NetworkError> {
    let storage = budget
        .reserve(value.get().len())
        .map_err(|_| NetworkError::Capacity)?;
    Ok(FundedEventData {
        value: value.to_owned(),
        _storage: storage,
    })
}

fn matches_preview(value: &RawValue, expected: &[u8]) -> Result<bool, NetworkError> {
    #[derive(Deserialize)]
    struct Run<'a> {
        #[serde(borrow)]
        result: ResultBody<'a>,
    }
    #[derive(Deserialize)]
    struct ResultBody<'a> {
        #[serde(borrow)]
        inference: Inference<'a>,
    }
    #[derive(Deserialize)]
    struct Inference<'a> {
        #[serde(borrow)]
        value: Option<&'a RawValue>,
    }
    #[derive(Deserialize)]
    struct Generation<'a> {
        #[serde(borrow)]
        choices: Option<&'a RawValue>,
    }
    #[derive(Deserialize)]
    struct Choice<'a> {
        #[serde(borrow)]
        message: Option<Message<'a>>,
    }
    #[derive(Deserialize)]
    struct Message<'a> {
        #[serde(borrow)]
        content: Option<Cow<'a, str>>,
    }
    // This check consumes only the first choice, like the established adapter.
    // It must not allocate a graph for every untrusted trailing choice.
    struct First;
    impl<'de> serde::de::Visitor<'de> for First {
        type Value = Option<Choice<'de>>;
        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("an inference choice array")
        }
        fn visit_seq<A: serde::de::SeqAccess<'de>>(
            self,
            mut items: A,
        ) -> Result<Self::Value, A::Error> {
            let first = items.next_element::<Option<Choice<'de>>>()?.flatten();
            while items.next_element::<serde::de::IgnoredAny>()?.is_some() {}
            Ok(first)
        }
    }
    use serde::Deserializer;
    let result: Run<'_> = serde_json::from_str(value.get()).map_err(|_| NetworkError::Transfer)?;
    let content = result
        .result
        .inference
        .value
        .and_then(|value| serde_json::from_str::<Generation<'_>>(value.get()).ok())
        .and_then(|value| {
            let choices = value.choices?;
            serde_json::Deserializer::from_str(choices.get())
                .deserialize_seq(First)
                .ok()??
                .message?
                .content
        });
    Ok(content.is_some_and(|text| text.as_bytes() == expected))
}

/// Incremental SSE over bounded chunks. A frame lives through the next
/// semantic consumer; lost or unterminated fragments never become results.
struct Frames {
    line: BoundedBody,
    data: BoundedBody,
    chunk: Bytes,
    next: usize,
    frame_bytes: usize,
    pending_cr: bool,
    first_line: bool,
    complete: bool,
    seen_data: bool,
}

impl Frames {
    fn new(budget: &ByteBudget) -> Result<Self, NetworkError> {
        Ok(Self {
            line: BoundedBody::new(FRAME_BYTES, budget)?,
            data: BoundedBody::new(FRAME_BYTES, budget)?,
            chunk: Bytes::new(),
            next: 0,
            frame_bytes: 0,
            pending_cr: false,
            first_line: true,
            complete: false,
            seen_data: false,
        })
    }

    async fn next(
        &mut self,
        response: &mut NetworkResponse<'_>,
    ) -> Result<Option<&[u8]>, NetworkError> {
        if self.complete {
            self.data.bytes.clear();
            self.seen_data = false;
            self.complete = false;
        }
        loop {
            if self.next == self.chunk.len() {
                self.chunk = Bytes::new();
                let Some(chunk) = response.next().await? else {
                    if std::mem::take(&mut self.pending_cr) && self.line_end()? {
                        return Ok(Some(&self.data.bytes));
                    }
                    return Ok(None);
                };
                self.chunk = chunk;
                self.next = 0;
            }
            let first = self.chunk[self.next];
            if self.pending_cr {
                self.pending_cr = false;
                if first == b'\n' {
                    self.next += 1;
                    self.charge(1)?;
                }
                if self.line_end()? {
                    return Ok(Some(&self.data.bytes));
                }
                if first == b'\n' {
                    continue;
                }
            }
            let remaining = &self.chunk[self.next..];
            let end = remaining
                .iter()
                .position(|value| matches!(value, b'\r' | b'\n'));
            let length = end.unwrap_or(remaining.len());
            self.line.extend(&remaining[..length])?;
            self.next += length;
            self.charge(length)?;
            let Some(_) = end else {
                continue;
            };
            let delimiter = self.chunk[self.next];
            self.next += 1;
            self.charge(1)?;
            if delimiter == b'\r' {
                self.pending_cr = true;
            } else if self.line_end()? {
                return Ok(Some(&self.data.bytes));
            }
        }
    }

    fn charge(&mut self, bytes: usize) -> Result<(), NetworkError> {
        self.frame_bytes += bytes;
        if self.frame_bytes > FRAME_BYTES {
            return Err(NetworkError::Capacity);
        }
        Ok(())
    }

    fn line_end(&mut self) -> Result<bool, NetworkError> {
        let mut line = std::str::from_utf8(&self.line.bytes).map_err(|_| NetworkError::Transfer)?;
        if self.first_line {
            self.first_line = false;
            line = line.strip_prefix('\u{feff}').unwrap_or(line);
        }
        if line.is_empty() {
            self.frame_bytes = 0;
            self.complete = self.seen_data;
        } else {
            let (field, value) = line.split_once(':').unwrap_or((line, ""));
            if field == "data" {
                if self.seen_data {
                    self.data.extend(b"\n")?;
                }
                self.data
                    .extend(value.strip_prefix(' ').unwrap_or(value).as_bytes())?;
                self.seen_data = true;
            }
        }
        self.line.bytes.clear();
        Ok(self.complete)
    }
}
