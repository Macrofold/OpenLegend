//! A finite interval follows one native job or the ordinary world clock.
//! Closing an interval fences future transfers and lets started calls settle.
use super::{ControlState, DecisionControl};
use crate::{authority::AccessError, lab::LabOperator};
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Duration};
use tokio::time::Instant;
use uuid::Uuid;

#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub(super) enum Mode {
    #[default]
    OneResponse,
    AdvanceTime,
    RunFor,
    UntilStopped,
}

#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Autonomy {
    #[default]
    Off,
    Focal,
    Selected,
    All,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Request {
    #[serde(default)]
    pub(super) mode: Mode,
    pub(super) focal_actor_id: Option<String>,
    pub(super) job_id: Option<String>,
    #[serde(default)]
    autonomy: Autonomy,
    simulated_seconds: Option<f64>,
    max_calls: Option<u32>,
    wall_seconds: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Interval {
    pub(super) id: Uuid,
    mode: Mode,
    pub(super) job_id: Option<String>,
    #[serde(skip)]
    focal_actor_id: Option<String>,
    #[serde(rename = "focalActorId")]
    focal_reference: Option<String>,
    autonomy: Autonomy,
    started_at_sim: f64,
    through_sim: f64,
    simulated_seconds: f64,
    max_calls: u32,
    calls: u32,
    wall_seconds: f64,
    #[serde(skip)]
    until: Instant,
    pub(super) reason: Option<&'static str>,
    #[serde(skip)]
    pub(super) clock_owned: bool,
}

impl Interval {
    pub(super) fn permits_calls(&self) -> bool { self.max_calls > 0 }
}

impl Request {
    pub(super) fn resume(prepared: bool) -> Self {
        Self {
            mode: if prepared {
                Mode::OneResponse
            } else {
                Mode::UntilStopped
            },
            ..Self::default()
        }
    }

    pub(super) fn bind(
        self,
        now_sim: f64,
        job: Option<(String, String)>,
        focal_reference: Option<String>,
    ) -> Result<Interval, &'static str> {
        let explicit_job = self.job_id.is_some();
        let job = job.filter(|(_, actor)| {
            explicit_job || self.focal_actor_id.as_ref().is_none_or(|f| f == actor)
        });
        if self.mode == Mode::OneResponse && job.is_none() && self.focal_actor_id.is_none() {
            return Err("Select the pending decision or send a signed stimulus first.");
        }
        if self.autonomy == Autonomy::Focal && self.focal_actor_id.is_none() && job.is_none() {
            return Err("Select a focal character for autonomy.");
        }
        if let (Some((_, actor)), Some(focal)) = (&job, &self.focal_actor_id)
            && actor != focal
        {
            return Err("The selected character does not own that decision.");
        }
        let simulated_seconds =
            self.simulated_seconds
                .unwrap_or(if self.mode == Mode::AdvanceTime {
                    5.
                } else {
                    60.
                });
        let wall_seconds = self.wall_seconds.unwrap_or(180.);
        let until = Duration::try_from_secs_f64(wall_seconds)
            .ok()
            .and_then(|v| Instant::now().checked_add(v));
        let max_calls = self.max_calls.unwrap_or(20);
        let Some(until) = until.filter(|_| {
            wall_seconds > 0.
                && simulated_seconds.is_finite()
                && simulated_seconds > 0.
                && (now_sim + simulated_seconds).is_finite()
                && (max_calls > 0 || self.mode == Mode::AdvanceTime && self.autonomy == Autonomy::Off)
        }) else {
            return Err("Use finite positive time and model-call limits.");
        };
        let (job_id, job_actor) = job.unzip();
        Ok(Interval {
            id: Uuid::new_v4(),
            mode: self.mode,
            job_id,
            focal_actor_id: self.focal_actor_id.or(job_actor),
            focal_reference,
            autonomy: self.autonomy,
            started_at_sim: now_sim,
            through_sim: now_sim,
            simulated_seconds,
            max_calls,
            calls: 0,
            wall_seconds,
            until,
            reason: None,
            clock_owned: true,
        })
    }
}

impl ControlState {
    pub(super) fn end(&mut self, reason: &'static str) {
        self.running = None;
        if let Some(interval) = &mut self.interval
            && interval.reason.is_none()
        {
            interval.reason = Some(reason);
        }
    }
}

pub(crate) struct DispatchGrant {
    pub(crate) operator: LabOperator,
    pub(super) interval: Option<Uuid>,
}

impl DispatchGrant {
    pub(crate) fn single(operator: LabOperator) -> Self { Self { operator, interval: None } }
}

impl DecisionControl {
    pub(super) fn lease(&self) -> Option<DispatchGrant> {
        let (operator, interval) = {
            let state = self.state.lock().ok()?;
            (state.running.clone()?, state.interval.as_ref()?.id)
        };
        if operator.present().unwrap_or(false)
            && operator
                .current(crate::authority::Capability::Create, || ())
                .is_ok()
        {
            return Some(DispatchGrant {
                operator,
                interval: Some(interval),
            });
        }
        let mut state = self.state.lock().ok()?;
        if state
            .running
            .as_ref()
            .is_some_and(|lease| Arc::ptr_eq(&operator.scope, &lease.scope))
        {
            state.end("operator-disconnected");
        }
        None
    }

    /// Called inside the native source-disclosure fence at the first HTTP poll.
    /// A concurrent transfer spends the last call only while holding this lock.
    pub(crate) fn transfer(&self, grant: &DispatchGrant, fields:Option<&crate::lab::fields::Context>, send: impl FnOnce()) -> bool {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if fields.is_some_and(|proof| !Arc::ptr_eq(&proof.epoch,&state.field_epoch) || !proof.belongs_to(&grant.operator.scope)){
            return false;
        }
        let Some(id) = grant.interval else {
            send();
            return true;
        };
        let Some(run) = state
            .interval
            .as_mut()
            .filter(|r| r.id == id && r.reason.is_none())
        else {
            return false;
        };
        if !run.permits_calls() { return false; }
        if Instant::now() >= run.until {
            state.end("active-wall-limit");
            return false;
        }
        run.calls += 1;
        let last = run.calls == run.max_calls;
        send();
        if last {
            state.end("model-call-limit");
        }
        true
    }

    pub(crate) fn follow_focal_job(&self, actor: &str, id: &str) {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(run) = state.interval.as_mut()
            && run.reason.is_none()
            && run.mode == Mode::OneResponse
            && run.job_id.is_none()
            && run.focal_actor_id.as_deref() == Some(actor)
        {
            run.job_id = Some(id.to_owned());
        }
    }

    pub(crate) fn terminal_job(&self, id: &str) {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if state
            .interval
            .as_ref()
            .is_some_and(|r| r.mode == Mode::OneResponse && r.job_id.as_deref() == Some(id))
        {
            state.end("one-response");
        }
    }

    pub(super) fn permits_background(&self, job: &str, actor: &str) -> bool {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.interval.as_ref().is_some_and(|r| {
            r.reason.is_none()
                && (r.job_id.as_deref() == Some(job)
                    || r.autonomy == Autonomy::All
                    || (r.autonomy == Autonomy::Selected && state.participants.allows(actor))
                    || (r.autonomy == Autonomy::Focal
                        && r.focal_actor_id.as_deref() == Some(actor)))
        })
    }

    pub(crate) fn autonomous_scope(&self) -> (Autonomy, Option<String>, Option<Arc<super::participants::Participants>>) {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let Some(run)=state.interval.as_ref().filter(|r|r.reason.is_none()) else {return (Autonomy::Off,None,None)};
        (run.autonomy,run.focal_actor_id.clone(),(run.autonomy==Autonomy::Selected).then(||state.participants.clone()))
    }

    /// Bound one ordinary world-clock offer to the remaining simulation time.
    /// A disabled run that previously started the clock still owns its stop.
    pub(crate) fn clock_offer(&self, at: f64) -> Option<f64> {
        // An absent or revoked controlling tab closes its live interval.
        self.lease();
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if state.starting || state.restore_pause {
            return Some(0.);
        }
        let run = state.interval.as_mut().filter(|r| r.clock_owned)?;
        run.through_sim = at;
        if run.reason.is_some() {
            return Some(0.);
        }
        let remaining = (run.started_at_sim + run.simulated_seconds - at).max(0.);
        if Instant::now() >= run.until {
            state.end("active-wall-limit");
            return Some(0.);
        }
        if remaining < 1e-6 {
            let reason = if matches!(run.mode, Mode::AdvanceTime | Mode::RunFor) {
                "duration-complete"
            } else {
                "simulation-limit"
            };
            state.end(reason);
            return Some(0.);
        }
        Some(remaining)
    }

    pub(crate) async fn pause_finished_clock(
        &self,
        clock: &crate::game_clock::GameClock,
    ) -> Result<(), crate::world::WorldError> {
        let _transition = self.transition.lock().await;
        let stop = {
            let state = self.state.lock().map_err(|_| AccessError::Availability)?;
            !state.starting
                && (state.restore_pause
                    || state
                        .interval
                        .as_ref()
                        .is_some_and(|r| r.clock_owned && r.reason.is_some()))
        };
        if stop {
            clock.hold_opened_lab().await?;
            let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
            state.restore_pause = false;
            if let Some(r) = &mut state.interval {
                r.clock_owned = false;
            }
        }
        Ok(())
    }
}
