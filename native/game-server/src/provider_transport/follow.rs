//! A provider acceptance can be followed only by observing its original Run.
//! The same network operation owns the deadline and never resubmits inference.

use super::{
    FundedReply, HttpEvidence, NetworkError, NetworkOperation, ProviderDestination,
    ProviderExchange, ProviderReply, ProviderRoute, macrofold::MacrofoldAdmission, valid_reference,
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::Deserialize;
use std::{sync::Arc, time::Duration};
use tokio::time::Instant;

pub(crate) struct ActiveRun {
    pub(crate) id: String,
    pub(crate) inference_id: Option<uuid::Uuid>,
    status_url: String,
    result_url: String,
    _custody: ByteReservation,
}

pub(crate) struct ObservedRun {
    pub(crate) run: Arc<ActiveRun>,
    pub(crate) status: Vec<u8>,
    _status_storage: ByteReservation,
}

impl ProviderDestination {
    /// Extract one admitted Run before the standalone decision waits for its
    /// result. Its status/result requests remain bound to the same origin.
    pub(crate) fn admitted_run(
        &self,
        body: &[u8],
        budget: &ByteBudget,
    ) -> Result<ActiveRun, NetworkError> {
        if self.route != ProviderRoute::Macrofold {
            return Err(NetworkError::Destination);
        }
        let admission = MacrofoldAdmission::read(body).map_err(|_| NetworkError::Transfer)?;
        let id = admission.run_id;
        if !valid_reference(id, 256) {
            return Err(NetworkError::Transfer);
        }
        // These are Source's existing status/result routes. Form a URL by
        // extending its trusted path, never by interpolating a new origin.
        let mut status = self.url.clone();
        status.set_query(None);
        status
            .path_segments_mut()
            .map_err(|_| NetworkError::Destination)?
            .clear()
            .extend(["v1", "runs", id]);
        let mut result = status.clone();
        result
            .path_segments_mut()
            .map_err(|_| NetworkError::Destination)?
            .push("result");
        let status_url = admission
            .urls
            .as_ref()
            .map_or(status.as_str(), |urls| urls.status);
        let result_url = admission
            .urls
            .as_ref()
            .map_or(result.as_str(), |urls| urls.result);
        if status_url.len() > 2_048 || result_url.len() > 2_048 {
            return Err(NetworkError::Capacity);
        }
        self.observe(status_url)?;
        self.observe(result_url)?;
        let _custody = budget
            .reserve(256 + id.len() + status_url.len() + result_url.len())
            .map_err(|_| NetworkError::Capacity)?;
        Ok(ActiveRun {
            id: id.to_owned(),
            inference_id: admission.inference_id(),
            status_url: status_url.to_owned(),
            result_url: result_url.to_owned(),
            _custody,
        })
    }

    pub(crate) async fn follow_run(
        &self,
        operation: &NetworkOperation<'_>,
        run: Arc<ActiveRun>,
        deadline: Instant,
        budget: &ByteBudget,
    ) -> Result<FundedReply, NetworkError> {
        let terminal_status = loop {
            let (body, evidence) = self
                .read_run(operation, &run.status_url, deadline, budget)
                .await?;
            #[derive(Deserialize)]
            struct Status<'a> {
                id: &'a str,
                kind: &'a str,
                status: &'a str,
            }
            let status: Status<'_> =
                serde_json::from_slice(&body.bytes).map_err(|_| NetworkError::Transfer)?;
            if status.id != run.id || status.kind != "inference" {
                return Err(NetworkError::Transfer);
            }
            match status.status {
                "succeeded" | "failed" | "cancelled" | "timed_out" => break body,
                _ => {}
            }
            wait(deadline, evidence.retry_after_ms.unwrap_or(250).max(250)).await?;
        };
        let mut terminal_result = loop {
            let (body, evidence) = self
                .read_run(operation, &run.result_url, deadline, budget)
                .await?;
            #[derive(Deserialize)]
            struct ResultHead<'a> {
                run_id: &'a str,
                #[serde(rename = "final")]
                final_result: bool,
            }
            let result: ResultHead<'_> =
                serde_json::from_slice(&body.bytes).map_err(|_| NetworkError::Transfer)?;
            if result.run_id != run.id {
                return Err(NetworkError::Transfer);
            }
            if result.final_result {
                break body;
            }
            wait(deadline, evidence.retry_after_ms.unwrap_or(250).max(250)).await?;
        };
        terminal_result.observed = Some(ObservedRun {
            run,
            status: terminal_status.bytes,
            _status_storage: terminal_status._storage,
        });
        Ok(terminal_result)
    }

    async fn read_run(
        &self,
        operation: &NetworkOperation<'_>,
        path: &str,
        deadline: Instant,
        budget: &ByteBudget,
    ) -> Result<(FundedReply, HttpEvidence), NetworkError> {
        loop {
            let timeout = deadline.saturating_duration_since(Instant::now());
            let exchange =
                ProviderExchange::observe(operation, self.observe(path)?, timeout).await?;
            match exchange.json(budget).await? {
                ProviderReply::Json { evidence, body } => return Ok((body, evidence)),
                ProviderReply::Refused(evidence) if evidence.status == 429 => {
                    wait(
                        deadline,
                        evidence.retry_after_ms.unwrap_or(60_000).max(1_000),
                    )
                    .await?;
                }
                ProviderReply::Refused(_) => return Err(NetworkError::Transfer),
            }
        }
    }
}

async fn wait(deadline: Instant, delay_ms: u64) -> Result<(), NetworkError> {
    tokio::time::timeout_at(
        deadline,
        tokio::time::sleep(Duration::from_millis(delay_ms)),
    )
    .await
    .map_err(|_| NetworkError::Deadline)
}
