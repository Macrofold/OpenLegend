//! Read current preferences and any selected story banner for one account.

use super::{Store, StoreError, StoreResult};
use crate::player_view::profile::{PlayerProfile, Preferences, Reveal, narrator_voice};
use tokio_postgres::Transaction;

impl Store {
    /// Read the account settings and banner in the caller's fixed operational
    /// snapshot. Each returned product keeps its own custody outside the read.
    pub(super) async fn read_player_profile(
        &self,
        tx: &Transaction<'_>,
        account: String,
        world: &str,
        actor: &str,
    ) -> StoreResult<PlayerProfile> {
        // The size checks keep damaged records out of the transfer buffer.
        let custody = self
            .budget
            .reserve(8192 + 4 * (account.len() + world.len() + actor.len()))
            .map_err(|_| StoreError::Capacity)?;
        let row = tx
            .query_one(
                "SELECT COALESCE(p.revision,0), COALESCE(p.show_unavailable_actions,0), \
             COALESCE(p.pause_when_hidden,1), \
             CASE WHEN octet_length(r.value)<=512 THEN r.value END, \
             CASE WHEN octet_length(v.value)<=64 THEN v.value END, \
             COALESCE(octet_length(r.value)>512,false) OR COALESCE(octet_length(v.value)>64,false), \
             EXISTS(SELECT 1 FROM story_banners WHERE world_id=$2 AND owner_id=a.id), \
             EXISTS(SELECT 1 FROM ops_maintenance WHERE world_id=$2 AND payload::jsonb->>'status' IN ('scheduled','active')) \
             FROM (SELECT $1::text AS id) a LEFT JOIN player_profiles p ON p.id=a.id \
             LEFT JOIN meta r ON r.key=('integration:world-reveal:' || a.id) \
             LEFT JOIN meta v ON v.key=('integration:narrator-voice:' || a.id)",
                &[&account, &world],
            )
            .await?;
        if row.try_get::<_, bool>(7)? {
            return Err(StoreError::Maintenance);
        }
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
        let voice = narrator_voice(row.try_get(4)?)?;
        let narrator = if row.try_get::<_, bool>(6)? {
            self.latest_banner(tx, world, &account, actor).await?
        } else {
            None
        };
        let preferences = Preferences::new(
            reveal,
            row.try_get::<_, i64>(1)? == 1,
            row.try_get::<_, i64>(2)? == 1,
            voice,
        );
        Ok(PlayerProfile::new(
            account,
            revision,
            preferences,
            narrator,
            custody,
        ))
    }
}
