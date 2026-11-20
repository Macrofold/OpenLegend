//! Account preferences and live narrator eligibility have separate callers.

use super::{Store, StoreError, StoreResult};
use crate::{
    authority::RequestScope,
    player_view::profile::{PlayerProfile, Preferences, Reveal, narrator_voice},
};
use tokio_postgres::Transaction;

impl Store {
    /// Fetch a fresh scoped profile for login, reconnect or opening Settings.
    /// The result owns its retained storage after the transaction ends.
    pub(crate) async fn player_profile(&self, scope: &RequestScope) -> StoreResult<PlayerProfile> {
        let custody = self
            .budget
            .reserve(8192 + 4 * scope.account_id.len())
            .map_err(|_| StoreError::Capacity)?;
        let account = scope.account_id.clone();
        self.read_operational(move |tx| Box::pin(async move {
            // The size checks keep damaged records out of the transfer buffer.
            let row = tx.query_one(
                "SELECT COALESCE(p.revision,0), COALESCE(p.show_unavailable_actions,0), \
             COALESCE(p.pause_when_hidden,1), \
             CASE WHEN octet_length(r.value)<=512 THEN r.value END, \
             CASE WHEN octet_length(v.value)<=64 THEN v.value END, \
             COALESCE(octet_length(r.value)>512,false) OR COALESCE(octet_length(v.value)>64,false) \
             FROM (SELECT $1::text AS id) a LEFT JOIN player_profiles p ON p.id=a.id \
             LEFT JOIN meta r ON r.key=('integration:world-reveal:' || a.id) \
             LEFT JOIN meta v ON v.key=('integration:narrator-voice:' || a.id)",
                &[&account],
            )
            .await?;
            if row.try_get::<_, bool>(5)? {
                return Err(StoreError::InvalidRecord);
            }
            let revision = u64::try_from(row.try_get::<_, i64>(0)?)
                .ok()
                .filter(|counter| *counter <= openlegend_simulation::identity::MAX_SAFE_INTEGER)
                .ok_or(StoreError::InvalidRecord)?;
            let reveal = row
                .try_get::<_, Option<&str>>(3)?
                .map(serde_json::from_str::<Option<Reveal>>)
                .transpose()
                .map_err(|_| StoreError::InvalidRecord)?
                .flatten()
                .unwrap_or_default();
            let preferences = Preferences::new(
                reveal,
                row.try_get::<_, i64>(1)? == 1,
                row.try_get::<_, i64>(2)? == 1,
                narrator_voice(row.try_get(4)?)?,
            );
            Ok(PlayerProfile::new(account, revision, preferences, custody))
        })).await
    }

    /// Keep maintenance and the current narrator in the view's operational
    /// snapshot even when the player has no Settings panel open.
    pub(super) async fn read_view_narrator(
        &self,
        tx: &Transaction<'_>,
        account: &str,
        world: &str,
        actor: &str,
    ) -> StoreResult<Option<super::NarrationBanner>> {
        let _transfer = self.budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
        let row = tx.query_one(
            "SELECT EXISTS(SELECT 1 FROM ops_maintenance WHERE world_id=$1 AND payload::jsonb->>'status' IN ('scheduled','active')), \
             EXISTS(SELECT 1 FROM story_banners WHERE world_id=$1 AND owner_id=$2)",
            &[&world, &account],
        ).await?;
        if row.try_get::<_, bool>(0)? {
            return Err(StoreError::Maintenance);
        }
        if row.try_get(1)? {
            self.latest_banner(tx, world, account, actor).await
        } else {
            Ok(None)
        }
    }
}
