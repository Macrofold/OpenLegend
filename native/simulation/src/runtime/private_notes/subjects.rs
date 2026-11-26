//! Notes resolve only the owner's current or retained person references.
//! The browser's pagination stays within that exact synchronous read.
use super::*;
use crate::simulation::SimulationState;
use crate::state::Point;

pub enum RuntimePersonRead<'a> {
    Search {
        words: &'a [&'a [u16]],
        after: Option<&'a RuntimePersonPosition>,
    },
    Subject(&'a ObserverSubject),
    Contact(&'a str),
}

#[derive(Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RuntimePersonPosition {
    group: u8,
    key: JsText,
    id: String,
}
impl PartialOrd for RuntimePersonPosition {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for RuntimePersonPosition {
    fn cmp(&self, other: &Self) -> Ordering {
        self.group
            .cmp(&other.group)
            .then_with(|| self.key.units().cmp(other.key.units()))
            .then_with(|| js_string_cmp(&self.id, &other.id))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MindSubject<'a> {
    id: String,
    subject: &'a ObserverSubject,
    label: TextRef<'a>,
    status: &'static str,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Selected<'a> {
    subject: MindSubject<'a>,
    notepad: Option<Notepad<'a>>,
    identity: Option<PublicIdentity<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicIdentity<'a> {
    given_name: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<&'a JsText>,
    revision: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePersonPage<'a> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    subjects: Vec<MindSubject<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    selected: Option<Option<Selected<'a>>>,
}

struct Match<'a> {
    key: RuntimePersonPosition,
    subject: MindSubject<'a>,
    _normalization: ByteReservation,
    _storage: ByteReservation,
}
impl PartialEq for Match<'_> {
    fn eq(&self, other: &Self) -> bool {
        self.key == other.key
    }
}
impl Eq for Match<'_> {}
impl PartialOrd for Match<'_> {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Match<'_> {
    fn cmp(&self, other: &Self) -> Ordering {
        self.key.cmp(&other.key)
    }
}

pub(in crate::runtime) fn person_note_subject(value: ObserverSubject) -> KnowledgeSubject {
    match value {
        ObserverSubject::Entity { entity_id } => KnowledgeSubject::Entity { entity_id },
        ObserverSubject::Individual { individual_id } => {
            KnowledgeSubject::Individual { individual_id }
        }
    }
}

pub(in crate::runtime) fn person_notepad<'a>(
    state: &'a SimulationState,
    actor: &str,
    subject: &ObserverSubject,
    budget: &ByteBudget,
) -> Result<Option<&'a KnowledgeDocument>, RuntimeError> {
    let documents = state
        .reception
        .actor_knowledge
        .as_ref()
        .and_then(|owners| owners.get(actor));
    let Some(documents) = documents else {
        return Ok(None);
    };
    let (kind, id) = subject_parts(subject);
    let _key = budget.reserve(512 + id.len() * 6)?;
    let key = crate::encoding::json_record(&(kind, id)).map_err(failure)?;
    Ok(documents
        .get(&format!("subject:{key}"))
        .map(|value| &**value))
}

fn subject_parts(subject: &ObserverSubject) -> (&'static str, &str) {
    match subject {
        ObserverSubject::Entity { entity_id } => ("entity", entity_id),
        ObserverSubject::Individual { individual_id } => ("individual", individual_id),
    }
}

struct Candidates {
    values: IndexMap<ObserverSubject, (Option<Point>, bool)>,
    _storage: ByteReservation,
}
impl Candidates {
    fn include(
        &mut self,
        subject: ObserverSubject,
        position: Option<Point>,
        list: bool,
    ) -> Result<(), RuntimeError> {
        if let Some(current) = self.values.get_mut(&subject) {
            if position.is_some() {
                current.0 = position;
            }
            current.1 |= list;
            return Ok(());
        }
        self._storage
            .resize(self._storage.bytes() + 192 + subject_parts(&subject).1.len())?;
        self.values.insert(subject, (position, list));
        Ok(())
    }
}

impl NativeWorldSession {
    /// Acquires the exact observer's current body facts and retained person
    /// keys once for this request. No database fetch or presentation geometry
    /// occurs. Returns a borrowed page during the caller's disclosure lease.
    pub fn with_private_people<T>(
        &self,
        actor: &str,
        scope: &str,
        read: RuntimePersonRead<'_>,
        expected_fence: Option<&str>,
        normalize: impl Fn(TextRef<'_>) -> Result<(Vec<u16>, ByteReservation), RuntimeError>,
        consume: impl FnOnce(RuntimePersonPage<'_>, Option<&RuntimePersonPosition>, &str) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("missing notes owner"))?;
        let life = entity
            .actor
            .as_ref()
            .ok_or_else(|| failure("missing notes owner"))?
            .physical_life
            .unwrap_or(0);
        let revision = state
            .reception
            .knowledge_revisions
            .as_ref()
            .and_then(|owners| owners.get(actor))
            .copied()
            .unwrap_or(0);
        let privacy = state
            .experience
            .actor(actor)
            .map_or(0, |owner| owner.privacy.revision());
        let _workspace = self.budget.reserve(8192)?;
        let fence = crate::encoding::json_record(&(
            scope,
            &state.generation,
            actor,
            life,
            revision,
            privacy,
        ))
        .map_err(failure)?;
        let fence = crate::encoding::sha256_hex(fence.as_bytes());
        if expected_fence.is_some_and(|expected| expected != fence) {
            return Ok(None);
        }
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let names = InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )
        .map_err(failure)?;
        let mut candidates = Candidates {
            values: IndexMap::new(),
            _storage: self.budget.reserve(256)?,
        };
        for body in names.current_body_sources() {
            let Some(position) = names.current_body_position(body).map_err(failure)? else {
                continue;
            };
            let (subjects, _custody) = names
                .capture_current_body_subjects(body, &self.budget)
                .map_err(failure)?;
            if subjects.iter().all(Option::is_none)
                && state
                    .physical
                    .entities
                    .get(body)
                    .is_some_and(|entity| entity.actor.is_none())
            {
                candidates.include(
                    ObserverSubject::Entity {
                        entity_id: body.into(),
                    },
                    Some(position),
                    true,
                )?;
            }
            for subject in subjects.into_iter().flatten() {
                candidates.include(subject, Some(position), true)?;
            }
            if let Some(id) = names
                .current_body_association(body)
                .map_err(failure)?
                .and_then(|subject| names.observer_individual(subject))
                .and_then(|identity| identity.canonical_id.as_deref())
            {
                candidates.include(
                    ObserverSubject::Entity {
                        entity_id: id.into(),
                    },
                    Some(position),
                    false,
                )?;
            }
        }
        let selected_contact;
        let (mut page, exact) = (
            RuntimePersonPage {
                ok: true,
                world_id: &state.physical.header.id,
                generation: &state.generation,
                subjects: Vec::new(),
                selected: None,
            },
            match read {
                RuntimePersonRead::Subject(subject) => Some(Some(subject)),
                RuntimePersonRead::Contact(id) => {
                    selected_contact = names.current_body_subject(id).map_err(failure)?;
                    Some(selected_contact.as_ref())
                }
                RuntimePersonRead::Search { .. } => None,
            },
        );
        let limits = state
            .installed
            .retained
            .knowledge_limits
            .as_ref()
            .map(|policy| Limits {
                general: policy.max_characters.general,
                subject: policy.max_characters.subject,
            });
        let project = |subject, position| {
            row(
                state,
                actor,
                &names,
                subject,
                position,
                entity.world_position(),
                &self.budget,
            )
        };
        if let Some(exact) = exact {
            page.selected = Some(if let Some(subject) = exact {
                let position = candidates.values.get(subject).and_then(|value| value.0);
                if let Some((_, selected, note)) = project(subject, position)? {
                    let notepad = note
                        .map(|note| project_notepad(note, limits, &names, None))
                        .transpose()?;
                    Some(Selected {
                        subject: selected,
                        notepad,
                        identity: names.observer_individual(subject).map(|identity| {
                            PublicIdentity {
                                given_name: &identity.given_name,
                                nickname: identity
                                    .nickname
                                    .as_ref()
                                    .filter(|value| !value.is_empty()),
                                revision: identity.revision,
                            }
                        }),
                    })
                } else {
                    None
                }
            } else {
                None
            });
            return Ok(Some(consume(page, None, &fence)));
        }
        let RuntimePersonRead::Search { words, after } = read else {
            unreachable!("exact requests already returned");
        };
        if let Some(documents) = state
            .reception
            .actor_knowledge
            .as_ref()
            .and_then(|owners| owners.get(actor))
        {
            for doc in documents.values() {
                let subject = match &doc.subject_id {
                    Some(KnowledgeSubject::Entity { entity_id }) => ObserverSubject::Entity {
                        entity_id: entity_id.clone(),
                    },
                    Some(KnowledgeSubject::Individual { individual_id }) => {
                        ObserverSubject::Individual {
                            individual_id: individual_id.clone(),
                        }
                    }
                    _ => continue,
                };
                candidates.include(subject, None, true)?;
            }
        }
        for individual_id in names.retained_note_people() {
            candidates.include(
                ObserverSubject::Individual {
                    individual_id: individual_id.into(),
                },
                None,
                true,
            )?;
        }
        let _page = self
            .budget
            .reserve((NOTE_PAGE + 1) * (size_of::<Match<'_>>() + size_of::<MindSubject<'_>>()))?;
        let mut matching = BinaryHeap::with_capacity(NOTE_PAGE + 1);
        let mut more = false;
        for (subject, (position, list)) in &candidates.values {
            if !list {
                continue;
            }
            let _storage = self
                .budget
                .reserve(512 + subject_parts(subject).1.len() * 12)?;
            let Some((group, subject, _)) = project(subject, *position)? else {
                continue;
            };
            let (key, _normalization) = normalize(subject.label)?;
            if !words
                .iter()
                .all(|word| key.windows(word.len()).any(|part| part == *word))
            {
                continue;
            }
            let key = RuntimePersonPosition {
                group,
                key: JsText::from_units(key),
                id: subject.id.clone(),
            };
            if after.is_some_and(|after| key <= *after) {
                continue;
            }
            matching.push(Match {
                key,
                subject,
                _normalization,
                _storage,
            });
            if matching.len() > NOTE_PAGE {
                matching.pop();
                more = true;
            }
        }
        let mut matching = matching.into_sorted_vec();
        // Retain each row's funding through final wire serialization.
        page.subjects
            .extend(matching.iter_mut().map(|row| MindSubject {
                id: std::mem::take(&mut row.subject.id),
                subject: row.subject.subject,
                label: row.subject.label,
                status: row.subject.status,
                detail: std::mem::take(&mut row.subject.detail),
            }));
        let next = matching.last().filter(|_| more).map(|row| &row.key);
        Ok(Some(consume(page, next, &fence)))
    }
}

fn row<'a>(
    state: &'a SimulationState,
    actor: &str,
    names: &'a InstalledPersonalNameReader<'a>,
    subject: &'a ObserverSubject,
    position: Option<Point>,
    observer: Option<Point>,
    budget: &ByteBudget,
) -> Result<Option<(u8, MindSubject<'a>, Option<&'a KnowledgeDocument>)>, RuntimeError> {
    let recognized = names
        .note_subject_recognized(subject, position.is_some())
        .map_err(failure)?;
    let note = person_notepad(state, actor, subject, budget)?;
    if !recognized && note.is_none() {
        return Ok(None);
    }
    let (status, group, mut detail) = match position.zip(observer).filter(|_| recognized) {
        Some((point, observer)) => (
            "in-view",
            0,
            format!(
                "In view · {} m away",
                crate::spatial::distance(observer, point).round()
            ),
        ),
        None if recognized => ("known", 1, "Recognized".into()),
        None => (
            "notes-only",
            2,
            "Notes only · not currently recognized".into(),
        ),
    };
    if note.is_some() && recognized {
        detail.push_str(" · has notes");
    }
    let id = crate::encoding::json_record(&subject_parts(subject)).map_err(failure)?;
    Ok(Some((
        group,
        MindSubject {
            id,
            subject,
            label: names.subject_label(subject).map_err(failure)?,
            status,
            detail,
        },
        note,
    )))
}
