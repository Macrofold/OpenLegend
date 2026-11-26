//! Load only this grant's enabled fields for this decision's recipient. A
//! running game never opens Lab tables. Dispatch rechecks bound private lives.
use super::{Binding, Field, Subject};
use crate::{
    authority::{Authority, AuthorizedScope, Capability},
    boot::CurrentServer,
    decision_dispatch::CallFailure,
    lab::decisions::DecisionControl,
    store::StoreError,
};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{NativeWorldSession, RuntimeError},
};
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
pub(crate) struct ModelValue {
    label: String,
    description: String,
    subject: Subject<String>,
    value: super::FieldValue,
}

pub(crate) struct Context {
    pub(crate) values: Vec<ModelValue>,
    pub(crate) epoch: Arc<()>,
    controller: Arc<DecisionControl>,
    audience: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    pub(crate) history: Option<History>,
    _custody: Option<ByteReservation>,
}

impl Context {
    pub(crate) fn belongs_to(&self, operator: &AuthorizedScope) -> bool {
        self.audience.as_ref().is_none_or(|(_, source)| {
            source.scope.recovery_fields() == operator.scope.recovery_fields()
        })
    }
    pub(crate) fn current(&self) -> bool {
        Arc::ptr_eq(&self.epoch, &self.controller.field_epoch())
            && self.audience.as_ref().is_none_or(|(authority, scope)| {
                authority
                    .current_recall_operator(scope, true, |_| ())
                    .is_ok()
            })
    }

    pub(crate) fn permits(&self, session: &NativeWorldSession) -> Result<bool, RuntimeError> {
        let Some((_, selected)) = &self.audience else {
            return Ok(true);
        };
        let scope = &selected.scope;
        if let Some(history) = &self.history {
            return history.permits(session, scope);
        }
        Ok(true)
    }

    pub(crate) async fn select(
        game: &Arc<CurrentServer>,
        control: &Arc<DecisionControl>,
        actor: &str,
        speaker: Option<&(Arc<Authority>, Arc<AuthorizedScope>)>,
    ) -> Result<Arc<Self>, CallFailure> {
        let epoch = control.field_epoch();
        let mut result = Self {
            values: Vec::new(),
            controller: control.clone(),
            epoch,
            audience: None,
            history: None,
            _custody: None,
        };
        if !control.fields_possible() {
            return Ok(Arc::new(result));
        }
        let audience = speaker.cloned().or_else(|| control.field_operator());
        let Some((authority, scope)) = audience else {
            return Ok(Arc::new(result));
        };
        authority
            .current(&scope, Capability::Inspect, false, |_, _| ())
            .map_err(CallFailure::Authority)?;
        let owner = super::super::library::grant_owner(&scope).map_err(|_| CallFailure::Invalid)?;
        let recipient = actor.to_owned();
        let field_owner = owner.clone();
        let budget = game.host.budget().clone();
        let records=game.store.read_operational(move|tx|Box::pin(async move{
            let head=super::read_checkpoint_ref(tx).await?;
            let scenario=head.scenario.to_string();
            let rev=head.number()?;
            let selection=" FROM cognition_lab.fields WHERE scenario=$1::text::uuid AND owner=$2
                AND recipients @> ARRAY[$3::text] AND since<=$4 AND (until_revision IS NULL OR until_revision>$4)
                AND (record::json->>'enabled')='true'";
            let args:&[&(dyn tokio_postgres::types::ToSql+Sync)]=&[&scenario,&owner,&recipient,&rev];
            let row=tx.query_one(&format!("SELECT COALESCE(sum(octet_length(record)),0)::bigint,count(*){selection}"),args).await?;
            let bytes=usize::try_from(row.try_get::<_,i64>(0)?).map_err(|_|StoreError::Capacity)?;
            let count=usize::try_from(row.try_get::<_,i64>(1)?).map_err(|_|StoreError::Capacity)?;
            if count==0{return Ok((Vec::new(),None))}
            let size=bytes.checked_mul(16).and_then(|b|b.checked_add(count.checked_mul(512)?)).ok_or(StoreError::Capacity)?;
            let custody=budget.reserve(size).map_err(|_|StoreError::Capacity)?;
            let rows=tx.query(&format!("SELECT record{selection} ORDER BY id"),args).await?;
            let records=rows.iter().map(|r|serde_json::from_str::<Field<Binding>>(r.get(0)).map_err(|_|StoreError::InvalidRecord)).collect::<Result<Vec<_>,_>>()?;
            Ok((records,Some(custody)))
        })).await.map_err(|e|CallFailure::World(e.into()))?;
        result._custody = records.1;
        let mut history = History {
            owner: field_owner,
            recipient: actor.to_owned(),
            ids: Vec::new(),
            sources: Vec::new(),
        };
        for record in records.0 {
            history.ids.push(record.id);
            let rendered = record
                .try_map(|b, _| {
                    let label = b.label;
                    history.sources.push((b.id, b.life));
                    Ok::<_, std::convert::Infallible>(label)
                })
                .expect("formatting a label is infallible");
            result.values.push(ModelValue {
                label: rendered.label,
                description: rendered.description,
                subject: rendered.subject,
                value: rendered.value,
            });
        }
        if !result.values.is_empty() {
            history.sources.sort_unstable();
            history.sources.dedup();
            result.history = Some(history);
            result.audience = Some((authority, scope));
        }
        let result = Arc::new(result);
        if !result.current() {
            return Err(CallFailure::Stale("lab-context-replaced"));
        }
        if !result.values.is_empty() {
            let proof = result.clone();
            if !game
                .world
                .capture(move |session| proof.permits(session))
                .await
                .map_err(CallFailure::World)?
            {
                return Err(CallFailure::Stale("lab-context-source-changed"));
            }
        }
        Ok(result)
    }
}

/// Private diagnostic storage gets references only. Scoped SQL rechecks that
/// the fields still exist for this same audience; the world rechecks each life.
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct History {
    owner: String,
    recipient: String,
    ids: Vec<uuid::Uuid>,
    sources: Vec<(String, Option<u64>)>,
}
impl History {
    pub(crate) async fn readable(
        &self,
        tx: &tokio_postgres::Transaction<'_>,
        access: &ReadStamp,
    ) -> Result<bool, StoreError> {
        if self.owner != access.owner || !access.valid() {
            return Ok(false);
        }
        let ids = self.ids.iter().map(|id| id.to_string()).collect::<Vec<_>>();
        let found:i64=tx.query_one("SELECT count(*) FROM cognition_lab.fields f JOIN cognition_lab.field_selection s ON s.scenario=f.scenario
            WHERE owner=$1 AND id=ANY($2::text[]::uuid[]) AND recipients @> ARRAY[$3::text] AND since<=s.revision AND (until_revision IS NULL OR until_revision>s.revision)",
            &[&self.owner,&ids,&self.recipient]).await?.get(0);
        Ok(found == ids.len() as i64)
    }
    pub(crate) fn permits(
        &self,
        session: &NativeWorldSession,
        scope: &crate::authority::RequestScope,
    ) -> Result<bool, RuntimeError> {
        for (id, life) in &self.sources {
            if !permitted_source(session, scope, id, *life)? {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
fn permitted_source(
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    id: &str,
    life: Option<u64>,
) -> Result<bool, RuntimeError> {
    match life {
        Some(life) => Ok(session.intelligence_person_current(
            &scope.account_id,
            &scope.actor_id,
            id,
            life,
        )? && session.npc_schedule_enrolled(id)?),
        None => session.with_player_contacts(&scope.account_id, &scope.actor_id, |body| {
            !body.actor && body.source_id == id
        }),
    }
}
#[derive(Clone)]
pub(crate) struct ReadStamp {
    owner: String,
    controller: std::sync::Weak<DecisionControl>,
    epoch: Arc<()>,
}
impl ReadStamp {
    pub(crate) fn new(control: &Arc<DecisionControl>, selected: &AuthorizedScope) -> Option<Self> {
        Some(Self {
            owner: super::super::library::grant_owner(selected).ok()?,
            controller: Arc::downgrade(control),
            epoch: control.field_epoch(),
        })
    }
    pub(crate) fn valid(&self) -> bool {
        self.controller
            .upgrade()
            .is_some_and(|c| Arc::ptr_eq(&self.epoch, &c.field_epoch()))
    }
}
