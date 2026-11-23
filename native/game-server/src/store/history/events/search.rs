//! A bounded literal search over the same actor-scoped event bodies as a page.

use super::{
    EventEdge, EventFeed, EventWindow, MemorySearch, PageFilter, RetainedEventRow, Store,
    StoreError, StoreResult, event_rows_capacity, prepare_event_row,
};
use tokio_postgres::Transaction;

// docs/limits/hearing-and-speech.md#hr06--history-paging-and-growth
const CHUNK: usize = 250;
const WINDOW: usize = 2_000;

impl Store {
    pub(super) async fn search_event_feed(
        &self,
        tx: &Transaction<'_>,
        filter: &PageFilter<'_>,
        actor: &str,
        window: EventWindow,
        mut include_first: bool,
        search: &MemorySearch,
    ) -> StoreResult<EventFeed> {
        let mut owned = event_rows_capacity(window.limit + 1, &self.budget)?;
        let mut events: Vec<RetainedEventRow> = Vec::with_capacity(window.limit);
        let mut visited = window.before.clone();
        let mut remaining = WINDOW;
        let scanned_window = loop {
            let count = CHUNK.min(remaining);
            let final_chunk = count == remaining;
            let offered = count + usize::from(final_chunk);
            let (_transfer, rows) = self
                .event_chunk(
                    tx,
                    filter,
                    &window,
                    visited.as_ref(),
                    include_first,
                    offered as i64,
                )
                .await?;
            for row in rows.iter().take(count) {
                let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
                let event =
                    prepare_event_row(row, actor, &search.language, &self.budget, &mut custody)?;
                if search.matches(event.event.text(), &self.budget)? {
                    owned.merge(custody).map_err(|_| StoreError::Capacity)?;
                    if events.len() == window.limit {
                        let continuing = events.last().map(|row| row.edge.clone());
                        return Ok(window.finish(events, continuing, false, Some(event), owned));
                    }
                    events.push(event);
                }
            }
            if let Some(last) = rows.iter().take(count).next_back() {
                visited = Some(EventEdge::read(last)?);
            }
            if final_chunk || rows.len() < count {
                break final_chunk && rows.len() > count;
            }
            include_first = false;
            remaining -= count;
        };
        let continuing = if scanned_window { visited } else { None };
        Ok(window.finish(events, continuing, scanned_window, None, owned))
    }
}
