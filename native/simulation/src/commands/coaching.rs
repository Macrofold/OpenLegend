//! A selected practice law, two identified participants, and the exact lesson
//! are sufficient to express consent. Signed life binding is rechecked on use.
use super::*;
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CoachingOperation {
    Request,
    Accept,
    Decline,
    Withdraw,
    Feedback,
}
impl CoachingOperation {
    pub fn ends(self) -> bool {
        matches!(self, Self::Decline | Self::Withdraw)
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LessonSelection {
    pub target_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub target_life: u64,
    pub attribute_id: String,
    pub operation: CoachingOperation,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub episode_id: Option<String>,
}
impl LessonSelection {
    fn valid(&self) -> bool {
        self.target_life <= crate::identity::MAX_SAFE_INTEGER
            && [&self.target_id, &self.attribute_id]
                .into_iter()
                .all(|id| is_safe_record_id(id))
            && self.episode_id.as_deref().is_none_or(is_safe_record_id)
            && self.episode_id.is_none() == (self.operation == CoachingOperation::Request)
    }
}
pub(super) fn decode(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Input {
        #[serde(rename = "type")]
        kind: String,
        #[serde(flatten)]
        headers: CommandHeaders,
        target_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        target_life: u64,
        attribute_id: String,
        operation: CoachingOperation,
        #[serde(default, deserialize_with = "deserialize_present_option")]
        episode_id: Option<String>,
    }
    let input: Input = serde_json::from_str(raw)?;
    let selection = LessonSelection {
        target_id: input.target_id,
        target_life: input.target_life,
        attribute_id: input.attribute_id,
        operation: input.operation,
        episode_id: input.episode_id,
    };
    if input.kind != "coaching" || !input.headers.valid() || !selection.valid() {
        return Err(serde::de::Error::custom("Invalid coaching selection."));
    }
    Ok(NativeCommand::Coaching {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        selection,
    })
}
pub(super) fn player(
    id: &str,
    actor: &str,
    target: &str,
    life: u64,
    attribute: &str,
    op: CoachingOperation,
    episode: Option<&str>,
) -> Result<(NativeCommand, String), serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        actor_id: &'a str,
        attribute_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        episode_id: Option<&'a str>,
        human_initiated: bool,
        id: &'a str,
        operation: CoachingOperation,
        target_id: &'a str,
        target_life: u64,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let source = crate::encoding::json_record(&Input {
        actor_id: actor,
        attribute_id: attribute,
        episode_id: episode,
        human_initiated: true,
        id,
        operation: op,
        target_id: target,
        target_life: life,
        kind: "coaching",
    })?;
    Ok((decode(&source)?, source))
}
