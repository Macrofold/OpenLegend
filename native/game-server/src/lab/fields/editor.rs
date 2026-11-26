use super::{Binding, Contact, Field, FieldRevision, store};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, Capability, assert_saved_grant},
    lab::{LabOperator, LabRuntime},
    store::{CommitError, StoreError},
    world::WorldError,
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

pub(crate) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/fields", post(page))
        .route("/fields/detail", post(detail))
        .route("/fields/edit", post(edit))
        .layer(DefaultBodyLimit::max(128 * 1024))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Page {
    actor: String,
    after: Option<Uuid>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Open {
    id: Uuid,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Edit {
    expected: FieldRevision,
    id: Uuid,
    field: Option<Field<Contact>>,
}
fn stale() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "field-changed",
        "The scenario or field changed. Reopen its current revision.",
    )
}
fn unavailable() -> Response {
    refusal(
        StatusCode::SERVICE_UNAVAILABLE,
        "fields-unavailable",
        "The Lab fields could not be opened.",
    )
}
fn invalid() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "invalid-field",
        "Check the field type, subject, recipients and value.",
    )
}

async fn page(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Page>,
) -> Response {
    let subject = match super::super::decisions::stimuli::npc_subject(&lab, &op, input.actor).await
    {
        Ok(subject) => subject,
        Err(_) => return access_failure(AccessError::Changed),
    };
    let Ok(owner) = super::super::library::scoped_owner(&op) else {
        return unavailable();
    };
    let data=lab.game.store.read_operational(move|tx|Box::pin(async move{
        let head=store::read_checkpoint_ref(tx).await?;
        let after=input.after.map(|id|id.to_string());
        // Page compact summaries. Opening a long text requires its own scoped read.
        let rows=tx.query("SELECT id::text,record::json->>'label',record::json->>'enabled'
            FROM cognition_lab.fields WHERE scenario=$1::text::uuid AND owner=$2 AND recipients @> ARRAY[$3::text]
            AND since<=$4 AND (until_revision IS NULL OR until_revision>$4)
            AND ($5::text IS NULL OR id>$5::text::uuid) ORDER BY id LIMIT 51",
            &[&head.scenario.to_string(),&owner,&subject,&head.number()?,&after]).await?;
        let more=rows.len()>50;
        let fields=rows.iter().take(50).map(|r|serde_json::json!({"id":r.get::<_,&str>(0),"label":r.get::<_,&str>(1),"enabled":r.get::<_,&str>(2)=="true"})).collect::<Vec<_>>();
        let next=if more {fields.last().map(|r|r["id"].clone())}else{None};
        Ok(serde_json::json!({"ok":true,"revision":head,"fields":fields,"next":next}))
    })).await;
    match data {
        Ok(page) => op
            .current(Capability::Inspect, || Json(page).into_response())
            .unwrap_or_else(access_failure),
        Err(_) => unavailable(),
    }
}

async fn stored(
    lab: &LabRuntime,
    op: &LabOperator,
    id: Uuid,
) -> Result<(FieldRevision, Option<Field<Binding>>), StoreError> {
    let owner = super::super::library::scoped_owner(op)?;
    lab.game.store.read_operational(move|tx|Box::pin(async move{
        let head=store::read_checkpoint_ref(tx).await?;
        let row=tx.query_opt("SELECT record FROM cognition_lab.fields WHERE scenario=$1::text::uuid AND owner=$2
            AND id=$3::text::uuid AND since<=$4 AND (until_revision IS NULL OR until_revision>$4)",
             &[&head.scenario.to_string(),&owner,&id.to_string(),&head.number()?]).await?;
        let field=row.map(|r|serde_json::from_str::<Field<Binding>>(r.get(0)).map_err(|_|StoreError::InvalidRecord)).transpose()?;
        Ok((head,field))
    })).await
}

// Reissue current contact handles for the same lives, including every previous
// recipient. A private field cannot shed an inaccessible recipient by editing it.
async fn open_bindings(
    lab: &LabRuntime,
    op: &LabOperator,
    field: Field<Binding>,
) -> Result<Field<Contact>, WorldError> {
    let authority = lab.authority.clone();
    let scope = op.scope.clone();
    let refs = lab.references.clone();
    lab.game
        .world
        .capture(move |session| {
            Ok(authority.current_recall_operator(&scope, true, |who| {
                use openlegend_simulation::runtime::RuntimeError;
                let issuer = refs
                    .scoped(who)
                    .map_err(RuntimeError::application_refused)?;
                field.try_map(|b, person| {
                    if person
                        && !b.life.is_some_and(|life| {
                            session
                                .intelligence_person_current(
                                    &who.account_id,
                                    &who.actor_id,
                                    &b.id,
                                    life,
                                )
                                .unwrap_or(false)
                        })
                    {
                        return Err(RuntimeError::application_refused(
                            "Field participant unavailable",
                        ));
                    }
                    let mut reference = None;
                    session.with_player_contacts(&who.account_id, &who.actor_id, |body| {
                        if body.source_id != b.id
                            || body.actor.then(|| body.physical_life.unwrap_or(0)) != b.life
                        {
                            return false;
                        }
                        reference = issuer
                            .contact(&b.id, b.life.unwrap_or(0), body.lease_id)
                            .ok();
                        true
                    })?;
                    Ok(Contact {
                        reference: reference.ok_or_else(|| {
                            RuntimeError::application_refused("Field subject unavailable")
                        })?,
                        label: b.label,
                    })
                })
            }))
        })
        .await??
        .map_err(WorldError::from)
}
async fn detail(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(open): Json<Open>,
) -> Response {
    if let Err(e) = op.current(Capability::Inspect, || ()) {
        return access_failure(e);
    }
    match stored(&lab, &op, open.id).await {
        Ok((head, Some(field))) => match open_bindings(&lab, &op, field).await {
            Ok(field) => op
                .current(Capability::Inspect, || {
                    Json(serde_json::json!({"ok":true,"revision":head,"field":field}))
                        .into_response()
                })
                .unwrap_or_else(access_failure),
            Err(_) => access_failure(AccessError::Changed),
        },
        Ok((_, None)) => stale(),
        Err(_) => unavailable(),
    }
}

async fn bind(
    lab: &LabRuntime,
    op: &LabOperator,
    field: Field<Contact>,
) -> Result<Field<Binding>, WorldError> {
    let authority = lab.authority.clone();
    let scope = op.scope.clone();
    let refs = lab.references.clone();
    let budget = lab.game.host.budget().clone();
    lab.game
        .world
        .capture(move |session| {
            Ok(authority.current_recall_operator(&scope, true, |who| {
                field.try_map(|contact, person| {
                    if contact.label.trim().is_empty() || contact.label.encode_utf16().count() > 200
                    {
                        return Ok::<_, openlegend_simulation::runtime::RuntimeError>(None);
                    }
                    let Some(selected) =
                        refs.resolve_contact(session, who, &contact.reference, &budget)?
                    else {
                        return Ok::<_, openlegend_simulation::runtime::RuntimeError>(None);
                    };
                    if person {
                        let Some(life) = selected.life else {
                            return Ok::<_, openlegend_simulation::runtime::RuntimeError>(None);
                        };
                        if !session.npc_schedule_enrolled(&selected.id)?
                            || !session.intelligence_person_current(
                                &who.account_id,
                                &who.actor_id,
                                &selected.id,
                                life,
                            )?
                        {
                            return Ok::<_, openlegend_simulation::runtime::RuntimeError>(None);
                        }
                    } else if selected.life.is_some() {
                        return Ok::<_, openlegend_simulation::runtime::RuntimeError>(None);
                    }
                    Ok(Some(Binding {
                        id: selected.id,
                        life: selected.life,
                        label: contact.label,
                    }))
                })
            }))
        })
        .await??
        .map_err(WorldError::from)?
        .try_map(|value, _| value.ok_or(WorldError::Access(AccessError::Changed)))
}

async fn edit(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Edit>,
) -> Response {
    if let Err(e) = op
        .authority
        .current(&op.scope, Capability::Create, true, |_, _| ())
    {
        return access_failure(e);
    }
    if let Err(e) = op.current(Capability::Inspect, || ()) {
        return access_failure(e);
    }
    let Some(control) = lab.decisions.lab_controls() else {
        return unavailable();
    };
    let _edit = control.field_edit_guard().await;
    if !control.hold_for_edit() {
        return stale();
    }
    let Ok(_barrier) = lab.saves.enter_protected().await else {
        return stale();
    };
    match stored(&lab, &op, input.id).await {
        Ok((current, _)) if current != input.expected => return stale(),
        Ok((_, Some(old))) => {
            if open_bindings(&lab, &op, old).await.is_err() {
                return access_failure(AccessError::Changed);
            }
        }
        Ok((_, None)) => {}
        Err(_) => return unavailable(),
    }
    let data = match input.field {
        None => None,
        Some(f) if f.valid() && f.id == input.id => match bind(&lab, &op, f).await {
            Ok(field) => Some(field),
            Err(_) => return access_failure(AccessError::Changed),
        },
        _ => return invalid(),
    };
    let Ok(owner) = super::super::library::scoped_owner(&op) else {
        return unavailable();
    };
    let writer = op.clone();
    let saved=lab.game.store.operational(move|tx|Box::pin(async move {
        assert_saved_grant(tx,&writer.scope.scope,"create").await?;
        assert_saved_grant(tx,&writer.scope.scope,"inspect").await?;
        let head=store::begin_edit(tx,&input.expected).await?;
        let scenario=head.scenario.to_string(); let id=input.id.to_string(); let revision=head.number()?;
        let old=tx.query_opt("UPDATE cognition_lab.fields SET until_revision=$3 WHERE scenario=$1::text::uuid
            AND id=$2::text::uuid AND until_revision IS NULL AND owner=$4 RETURNING id::text",
            &[&scenario,&id,&revision,&owner]).await?;
        if let Some(field)=data{
            if old.is_none() && tx.query_opt("SELECT 1 FROM cognition_lab.fields WHERE scenario=$1::text::uuid AND id=$2::text::uuid LIMIT 1",&[&scenario,&id]).await?.is_some(){return Err(StoreError::StaleCut)}
            let ids=field.recipients.iter().map(|r|r.id.as_str()).collect::<Vec<_>>();
            let record=serde_json::to_string(&field).map_err(|_|StoreError::InvalidRecord)?;
            tx.execute("INSERT INTO cognition_lab.fields(scenario,id,since,owner,recipients,record)
                VALUES($1::text::uuid,$2::text::uuid,$3,$4,$5,$6)",&[&scenario,&id,&revision,&owner,&ids,&record]).await?;
        }else if old.is_none(){return Err(StoreError::StaleCut)}
        writer.authority.current_recall_operator(&writer.scope,true,|_|()).map_err(|_|StoreError::StaleCut)?;
        Ok(head)
    })).await;
    match saved {
        Ok(head) => {
            control.set_fields_possible(true);
            control.invalidate_fields();
            op.current(Capability::Inspect, || {
                Json(serde_json::json!({"ok":true,"revision":head})).into_response()
            })
            .unwrap_or_else(access_failure)
        }
        Err(CommitError::RolledBack(StoreError::StaleCut)) => stale(),
        Err(_) => unavailable(),
    }
}
