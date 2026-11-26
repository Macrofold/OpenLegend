use super::*;
use crate::install::rows::{take_collection, validate_map_row};
use crate::install::{InstallError, RowImport, WorldChildren};

/// Select this compiled finite owner only when the application supplied the
/// exact ActivityHost selected by the current authored world.
pub(crate) fn verify_travel_host(
    input: crate::install::CanonicalInput,
    manifest: &crate::install::AuthoredManifest,
    budget: &ByteBudget,
) -> Result<(), InstallError> {
    use crate::values::DefinitionPin;
    let _funding =
        crate::install::reserve_typed_parse::<DefinitionPin>(&input.canonical, 0, None, budget)?;
    let host: DefinitionPin =
        serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
    input.verify(&host)?;
    if !host.is_valid() || !manifest.activity_hosts.contains(&host) {
        return Err(InstallError::DefinitionBody);
    }
    Ok(())
}

impl OutingState {
    pub(crate) fn install(
        import: &mut RowImport,
        children: &mut WorldChildren,
        installed: &crate::simulation::InstalledWorld,
        physical: &crate::simulation::PhysicalState,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let present = match children.take("outings")? {
            None => false,
            Some(true) => true,
            _ => return Err(InstallError::ParentPresence),
        };
        let owner = take_collection(import, "activity_outings", "[\"world\"]", present, true)?;
        let mut state = Self {
            records: present.then(IndexMap::new),
            index: OutingIndex::default(),
            backing: budget
                .reserve_backing(0)
                .map_err(|_| InstallError::Capacity)?,
            key_bytes: 0,
        };
        let Some(records) = state.records.as_mut() else {
            return Ok(state);
        };
        if owner.rows.is_empty() {
            return Ok(state);
        }
        let next = owner.coverage.next_ordinal;
        let keys = owner
            .rows
            .iter()
            .try_fold(0usize, |n, row| n.checked_add(row.slot.capacity()))
            .ok_or(InstallError::Capacity)?;
        let map = |capacity| {
            map_storage::<String, OutingRecord>(capacity)
                .and_then(|bytes| bytes.checked_add(keys))
                .ok_or(InstallError::Capacity)
        };
        budget
            .resize_backing(
                &mut state.backing,
                map(owner
                    .rows
                    .len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(3))
                    .ok_or(InstallError::Capacity)?)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        records
            .try_reserve(owner.rows.len())
            .map_err(|_| InstallError::Capacity)?;
        for row in owner.rows {
            validate_map_row(&row, "[\"world\"]", "outings", &row.slot, next)?;
            if !row.extra.is_empty() {
                return Err(InstallError::CurrentFormat);
            }
            let bytes = crate::experience::encoded_body_bound(&row.payload)
                .map_err(|_| InstallError::Capacity)?;
            let funding = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
            let body: SqlCell =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            let record = OutingRecord::prepare(body, funding, installed, budget).map_err(
                |error| match error {
                    ExecutionError::Capacity => InstallError::Capacity,
                    _ => InstallError::CurrentFormat,
                },
            )?;
            let supported = match record.kind() {
                OutingKind::Travel => installed.travel,
                OutingKind::Cooperate => installed
                    .retained
                    .social_offer_read
                    .as_ref()
                    .and_then(|p| p.cooperation.as_ref())
                    .is_some(),
                OutingKind::CombatHelp => installed.travel,
            };
            if record.id() != row.slot
                || !supported
                || installed.retained.social_offer_read.is_none()
            {
                return Err(InstallError::UnsupportedFamily("outings"));
            }
            let [proposer, recipient] = record.participants();
            let existing = state
                .index
                .by_pair(proposer, recipient, budget)
                .map_err(|_| InstallError::Capacity)?
                .any(|id| {
                    records
                        .get(id)
                        .is_some_and(|other: &OutingRecord| other.kind() == record.kind())
                });
            if existing {
                return Err(InstallError::CurrentFormat);
            }
            for id in [proposer, recipient] {
                let actor = physical
                    .entities
                    .get(id)
                    .and_then(|e| e.actor.as_ref())
                    .ok_or(InstallError::CurrentFormat)?;
                if record.status() == OutingStatus::Traveling {
                    let body = record.body();
                    let plan_id = body
                        .get("plans")
                        .and_then(|plans| plans.get(id))
                        .and_then(SqlCell::as_str)
                        .ok_or(InstallError::CurrentFormat)?;
                    let destination = body
                        .get("destination")
                        .and_then(|site| site.get("point"))
                        .ok_or(InstallError::CurrentFormat)?;
                    let recipe = &installed.ordinary_actions.value().travel.activity;
                    if actor.agency.plan.as_ref().is_none_or(|plan| {
                        plan.id != plan_id
                            || !matches!(
                                plan.status,
                                crate::plans::PlanStatus::Active
                                    | crate::plans::PlanStatus::Completed
                            )
                            || plan
                                .activity
                                .as_ref()
                                .and_then(|work| work.bindings.get(&recipe.destination_role))
                                != Some(destination)
                    }) {
                        return Err(InstallError::CurrentFormat);
                    }
                }
            }
            state
                .index
                .check_replacement(&record)
                .map_err(|_| InstallError::CurrentFormat)?;
            state.index.insert(&record);
            records.insert(row.slot, record);
        }
        state.key_bytes = keys;
        state
            .backing
            .resize(map(records.capacity())?)
            .map_err(|_| InstallError::Capacity)?;
        Ok(state)
    }
}
