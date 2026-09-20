# U15 — billing interface and Macrofold usage queries

Recorded September 19, 2026. The user requests documentation of billing visibility in the interface and the supporting Macrofold query behavior. F61 and D50 track this direction. See [controls](../03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown) and the [technical contract](../07-technical-architecture/billing-and-usage-reporting.md). This update implements no runtime billing feature.

## User request

We should add a small billing UI element or menu where, when I click it, I should be able to see a pretty detailed breakdown of how much we've incurred in LLM costs and how much we've incurred in Jev costs for various time periods. This should include:

- current session (how long the server has been running)
- past 24 hours
- past 7 days
- past 30 days
- all time

There will be a billing point to Macrofold, should be able to get all of that data that I just mentioned. This should be an easy way for me to query Macrofold for all of that information: time period from beginning to end, any arbitrary time period. Give me all of that billing info.

Document this in the interface section too.
