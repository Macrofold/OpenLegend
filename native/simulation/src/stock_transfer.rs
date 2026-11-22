//! Common exact-transfer work bounds from the installed application contract.

use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StockTransferLimits {
    pub(crate) examined: usize,
    pub(crate) moved_lots: usize,
}
pub(crate) fn limits() -> &'static StockTransferLimits {
    static LIMITS: LazyLock<StockTransferLimits> = LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/stock-transfer-limits.json"
        ))
        .expect("shared stock transfer limits")
    });
    &LIMITS
}
