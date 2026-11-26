use super::*;
use crate::{
    state::{Entity, SurfacePoint},
    text::JsText,
    values::is_safe_record_id,
};
use std::collections::BTreeMap;

/// An immutable template from the selected world's person constructor.
/// A creation decodes a fresh body, leaving every existing person's state private.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonCreationTemplate {
    pub(crate) entity: Box<serde_json::value::RawValue>,
    #[serde(skip)]
    standing_body: Option<crate::state::BodyProfile>,
    pub(crate) starting_stock: BTreeMap<String, u64>,
    pub(crate) voice: VoiceSampling,
    pub(crate) clearance: f64,
    pub(crate) random_traits: usize,
    pub(crate) appearance: Appearance,
}
#[derive(Debug, Deserialize)]
pub(crate) struct Appearance {
    pub event: String,
    pub text: String,
}
#[derive(Debug, Deserialize)]
pub(crate) struct VoiceSampling {
    pub count: u64,
    pub step: u64,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonCreation {
    pub name: JsText,
    pub personality: JsText,
    pub backstory: JsText,
    pub trait_ids: Vec<String>,
    pub initial_goals: Vec<String>,
    pub position: SurfacePoint,
}
impl PersonCreation {
    pub fn valid(&self) -> bool {
        !self.name.trim_is_empty()
            && self.name.units_len() <= 80
            && self.personality.units_len() <= 1000
            && self.backstory.units_len() <= 4000
            && self.initial_goals.len() <= 8
            && self
                .initial_goals
                .iter()
                .all(|v| !v.trim().is_empty() && v.encode_utf16().count() <= 500)
            && self.trait_ids.iter().all(|id| is_safe_record_id(id))
            && self.position.x.is_finite()
            && self.position.y.is_finite()
            && self.position.z.is_finite()
            && !self.position.surface_id.is_empty()
    }
}

impl PersonCreationTemplate {
    /// The selected release contributes one sterile constructor. Validate its
    /// saved child families and retain only the body footprint needed for site checks.
    pub(crate) fn install(
        &mut self,
        retained: &crate::install::RetainedDefinitions,
        budget: &ByteBudget,
    ) -> Result<(), crate::install::InstallError> {
        use crate::install::InstallError;
        let _decode = budget
            .reserve(
                self.entity
                    .get()
                    .len()
                    .checked_mul(8)
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let entity = self.fresh().map_err(|_| InstallError::DefinitionBody)?;
        let body = entity.actor.as_ref().ok_or(InstallError::DefinitionBody)?;
        if !body.alive
            || body.controller != "npc"
            || body.action.is_some()
            || !entity.has_memory()
            || entity.item.is_some()
            || entity.remains.is_some()
            || entity.retirement.is_some()
            || body.agency.plan.is_some()
            || !body.agency.history.is_empty()
            || !body.agency.attempts.is_empty()
            || self.voice.count == 0
            || (self.voice.count - 1)
                .checked_mul(self.voice.step)
                .is_none_or(|v| v > 1000)
            || !self.clearance.is_finite()
            || self.clearance <= 0.0
            || self.appearance.event.is_empty()
            || self.starting_stock.iter().any(|(id, qty)| {
                *qty == 0
                    || *qty > crate::identity::MAX_SAFE_INTEGER
                    || retained
                        .items
                        .get(id)
                        .is_none_or(|definition| !definition.portable || definition.is_container())
            })
        {
            return Err(InstallError::DefinitionBody);
        }
        self.standing_body = Some(entity.spatial.body);
        Ok(())
    }

    pub(crate) fn retained_bytes(&self) -> Option<usize> {
        use crate::host::retained_size::{heap_sum, tree_node_bound};
        heap_sum([
            size_of::<Self>(),
            self.entity.get().len(),
            self.standing_body.as_ref().map_or(0, |b| b.id.capacity()),
            self.appearance.event.capacity(),
            self.appearance.text.capacity(),
            self.starting_stock
                .len()
                .checked_mul(tree_node_bound::<String, u64>()?)?,
            self.starting_stock
                .keys()
                .try_fold(0usize, |n, k| n.checked_add(k.capacity()))?,
        ])
    }

    pub(crate) fn fresh(&self) -> Result<Entity, RuntimeError> {
        serde_json::from_str(self.entity.get()).map_err(failure)
    }
}

impl NativeWorldSession {
    /// A protected creator can add a person using the current world's geometry and
    /// actor constructor. A prior receipt is checked before inspecting the now occupied site.
    pub fn begin_person_creation(
        &mut self,
        account: &str,
        owner: &str,
        request: String,
        draft: PersonCreation,
        can_stand: impl FnOnce(&SurfacePoint, &crate::state::BodyProfile) -> bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if !draft.valid()
            || !is_safe_record_id(&request)
            || !self.private_history_permitted(account, owner, owner)?
        {
            return Err(failure("person creation unavailable"));
        }
        let digest =
            crate::encoding::json_record_digest(&("create-person", account, owner, &draft))
                .map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let template = state
            .installed
            .person_creation
            .as_ref()
            .ok_or_else(|| stale("person-creation-unavailable"))?;
        let mut person_id = None;
        if state.commands.get(&request).is_none() {
            let body = template
                .standing_body
                .as_ref()
                .ok_or_else(|| failure("uninstalled person constructor"))?;
            if !can_stand(&draft.position, body) {
                return Err(stale("person-creation-site"));
            }
            let mut preview = state.physical.identity;
            person_id = Some(
                preview
                    .allocate_entity("person", |id| state.physical.entities.get(id).is_some())
                    .map_err(failure)?
                    .id,
            );
        }
        let bytes = crate::encoding::json_record_len(&draft).map_err(failure)? * 8
            + request.len()
            + digest.len();
        let cursor = crate::knowledge::KnowledgeEditCursor::create_person(
            person_id,
            request,
            digest,
            draft,
            bytes,
            &self.budget,
        )
        .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }
}
