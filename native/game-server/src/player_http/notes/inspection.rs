//! Creator-only, actor-scoped continuity with exact durable experiences and
//! commitments. The final synchronous response still uses the native fence.
use super::*;
use openlegend_simulation::{
    activity::RuntimeInspectedSkill,
    encoding::json_tree_allocation_bound,
    experience::{PersonalSourceKind, PersonalSourceRef},
    narration::{NativeText, native_text},
    runtime::RuntimeCreatorMind,
};

pub(super) async fn inspect(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    actor: &str,
) -> Response {
    for _ in 0..2 {
        match read(state, scope, actor).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Changed | PlayerDisclosure::Busy)
            | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(_) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    refusal(
        StatusCode::CONFLICT,
        "mind-changed",
        "Private mind changed. Refresh to continue.",
    )
}

async fn read(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    actor: &str,
) -> Result<PlayerDisclosure, WorldError> {
    let language = state.game.language().ok_or(StoreError::InvalidRecord)?;
    let world = &state.game.world;
    let (history, cut) = world
        .capture_recollections(state.authority.clone(), scope.clone(), actor.to_owned())
        .await?;
    let product = state.game.store.inspect_mind_rows(cut).await?;
    let history = world
        .admit_recollections(state.game.clone(), history, product.memories)
        .await?;
    let key = scope.scope.key().map_err(|_| StoreError::InvalidRecord)?;
    world
        .disclose_private_notes(&state.authority, scope, actor, |session, budget, _| {
            session
                .with_creator_mind(
                    history.sources(),
                    &key,
                    |text| {
                        language
                            .maintenance_words(&[text], budget)
                            .map(|words| words <= 20)
                            .map_err(RuntimeError::application_refused)
                    },
                    |mind| {
                        history.sources().with_personal_sources(|sources| {
                            encode(
                                mind,
                                &product.recipes,
                                &product.sides,
                                sources,
                                language,
                                budget,
                            )
                        })?
                    },
                )?
                .ok_or(WorldError::ProjectionChanged)?
        })
        .await
}

#[derive(Serialize)]
struct Experience<'a> {
    id: &'a str,
    text: JsText,
    at: f64,
    kind: String,
    source: String,
    #[serde(skip)]
    resolved: bool,
}

#[derive(Serialize)]
struct Commitment<'a> {
    id: &'a str,
    text: &'a JsText,
    resolved: bool,
}

struct Skills<'a>(&'a [RuntimeInspectedSkill], &'a [RuntimeInspectedSkill]);
impl Serialize for Skills<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_seq(self.0.iter().chain(self.1))
    }
}

fn encode<'a>(
    mind: RuntimeCreatorMind<'a>,
    recipes: &[RuntimeInspectedSkill],
    sides: &[(bool, bool)],
    sources: &mut dyn Iterator<Item = (usize, &'a PersonalSourceRef, &'a str)>,
    language: &LanguageProvider,
    budget: &ByteBudget,
) -> Result<Bytes, WorldError> {
    let mut custody = budget
        .reserve(4096 + sides.len() * 256)
        .map_err(|_| StoreError::Capacity)?;
    let mut values = Vec::with_capacity(sides.len());
    let mut count = 0;
    for (index, source, payload) in sources {
        let kinds = sides.get(index).ok_or(StoreError::InvalidRecord)?;
        let bound = json_tree_allocation_bound(payload).ok_or(StoreError::Capacity)?;
        custody
            .resize(custody.bytes() + bound)
            .map_err(|_| StoreError::Capacity)?;
        values.push((kinds, experience(source, payload)?));
        count += 1;
    }
    if count != sides.len() {
        return Err(StoreError::StaleCut.into());
    }
    values.sort_by(|(_, a), (_, b)| a.at.total_cmp(&b.at));
    let experiences = values
        .iter()
        .filter(|(sides, _)| sides.0)
        .map(|(_, value)| value)
        .collect::<Vec<_>>();
    let commitments = values
        .iter()
        .filter(|(sides, _)| sides.1)
        .map(|(_, value)| Commitment {
            id: value.id,
            text: &value.text,
            resolved: value.resolved,
        })
        .collect::<Vec<_>>();
    let notes = mind.notes();
    let (accepted_text, _text) = accepted_text(&notes.files, Some(language), budget)?;
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Mind<'a> {
        #[serde(flatten)]
        native: &'a RuntimeCreatorMind<'a>,
        #[serde(skip_serializing_if = "Option::is_none")]
        accepted_text: Option<JsText>,
        experiences: Vec<&'a Experience<'a>>,
        commitments: Vec<Commitment<'a>>,
        skills: Skills<'a>,
        continuity: Continuity<'a>,
    }
    #[derive(Serialize)]
    struct Response<'a> {
        ok: bool,
        mind: Mind<'a>,
    }
    wire::encode(
        &Response {
            ok: true,
            mind: Mind {
                native: &mind,
                accepted_text,
                experiences,
                commitments,
                skills: Skills(&mind.skills, recipes),
                continuity: Continuity {
                    cursor: continuation(notes)?,
                    appraisals: &notes.appraisals,
                },
            },
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}

fn experience<'a>(
    source: &'a PersonalSourceRef,
    payload: &str,
) -> Result<Experience<'a>, StoreError> {
    #[derive(Deserialize)]
    struct Heard {
        at: f64,
        modality: String,
        text: NativeText,
    }
    #[derive(Deserialize)]
    struct Memory {
        at: f64,
        kind: String,
        source: String,
        summary: JsText,
        resolved: Option<bool>,
    }
    #[derive(Deserialize)]
    struct Summary {
        to: f64,
        text: JsText,
    }
    let invalid = |_| StoreError::InvalidRecord;
    let (at, kind, means, text, resolved) = match source.kind {
        PersonalSourceKind::Awareness => {
            let value: Heard = serde_json::from_str(payload).map_err(invalid)?;
            (
                value.at,
                "episode".into(),
                value.modality,
                native_text(&value.text),
                false,
            )
        }
        PersonalSourceKind::Memory => {
            let value: Memory = serde_json::from_str(payload).map_err(invalid)?;
            (
                value.at,
                value.kind,
                value.source,
                value.summary,
                value.resolved.unwrap_or(false),
            )
        }
        PersonalSourceKind::Summary => {
            let value: Summary = serde_json::from_str(payload).map_err(invalid)?;
            let mut text = JsText::from("Summary of remembered experience: ");
            text.push_text(&value.text);
            (
                value.to,
                "reflection".into(),
                "inferred".into(),
                text,
                false,
            )
        }
    };
    Ok(Experience {
        id: &source.id,
        text,
        at,
        kind,
        source: means,
        resolved,
    })
}
