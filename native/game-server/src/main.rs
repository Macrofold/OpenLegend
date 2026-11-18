use openlegend_game_server::boot::{CurrentServer, recover_checkpoint};
use std::error::Error;
use std::ffi::OsString;
use std::path::PathBuf;

const USAGE: &str = "Usage: openlegend-game-server serve|check-open RELEASE_DIRECTORY
       openlegend-game-server recover-checkpoint RELEASE_DIRECTORY CHECKPOINT_DIRECTORY SLOT_ID OPERATION_ID [FLOOR_SLOT_ID]";

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut arguments = std::env::args_os().skip(1);
    let mode = arguments.next();
    let release = arguments.next().map(PathBuf::from);
    let release = release.ok_or(USAGE)?;
    let database = std::env::var("OPEN_LEGEND_DATABASE_URL")
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL is required")?
        .parse()
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL must name a PostgreSQL database")?;
    match mode.as_deref().and_then(std::ffi::OsStr::to_str) {
        Some("serve") if arguments.next().is_none() => {
            openlegend_game_server::launch::serve(&release, database).await
        }
        Some("check-open") if arguments.next().is_none() => {
            let server = CurrentServer::open(&release, database, 1).await?;
            println!("{}", serde_json::to_string(&server.verified)?);
            server.close().await
        }
        Some("recover-checkpoint") => {
            let directory = arguments.next().map(PathBuf::from).ok_or(USAGE)?;
            let slot = text(arguments.next())?;
            let operation = text(arguments.next())?;
            let floor = arguments
                .next()
                .map(|argument| text(Some(argument)))
                .transpose()?;
            if arguments.next().is_some() {
                return Err(USAGE.into());
            }
            let result = recover_checkpoint(
                &release,
                database,
                &directory,
                &slot,
                &operation,
                floor.as_deref(),
            )
            .await?;
            println!("{}", serde_json::to_string(&result)?);
            Ok(())
        }
        _ => Err(USAGE.into()),
    }
}

fn text(value: Option<OsString>) -> Result<String, &'static str> {
    value
        .and_then(|value| value.into_string().ok())
        .filter(|value| !value.is_empty())
        .ok_or(USAGE)
}
