//! Encode the already-admitted own attack state in the existing public
//! command receipt. The caller applies current authority before disclosure.
use super::*;
use openlegend_simulation::{commands::Outcome, runtime::RuntimePreparedProducts};

pub(super) fn encode(
    product: &RuntimePreparedProducts<'_>,
    actor: &str,
    scope: Option<&InputScope>,
    budget: &ByteBudget,
) -> Result<(String, Option<ByteReservation>), RuntimeError> {
    let Some(scope) = scope else {
        return Ok((json_record(product.outcome()).map_err(RuntimeError::application_refused)?, None));
    };
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Receipt<'a> {
        #[serde(flatten)]
        outcome: &'a Outcome,
        input_scope: &'a InputScope,
        #[serde(skip_serializing_if = "Option::is_none")]
        execution: Option<AttackExecutionView<'a>>,
    }
    let receipt = Receipt {
        outcome: product.outcome(),
        input_scope: scope,
        execution: product.attack_execution(actor),
    };
    let bytes = openlegend_simulation::encoding::json_record_len(&receipt)
        .map_err(RuntimeError::application_refused)?;
    let custody = budget.reserve(bytes)?;
    let encoded = json_record(&receipt).map_err(RuntimeError::application_refused)?;
    Ok((encoded, Some(custody)))
}

pub(super) struct AcceptedAttack {
    action: Option<String>,
    pending: bool,
    _custody: ByteReservation,
}

impl AcceptedAttack {
    pub(super) fn prepare(outcome: &Outcome, budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let action = outcome.action_id.as_ref().filter(|_| outcome.ok);
        let custody = budget.reserve(action.map_or(0, String::len))?;
        Ok(Self {
            action: action.cloned(),
            pending: outcome.ok && outcome.code == "release-requested",
            _custody: custody,
        })
    }

    pub(super) fn action(&self) -> Option<&str> {
        self.action.as_deref()
    }

    pub(super) fn pending(&self) -> bool {
        self.pending
    }
}
