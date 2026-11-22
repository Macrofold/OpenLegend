use openlegend_game_server::boot::{
    CurrentServer, backup_world, initialize_storage, recover_checkpoint, restore_world,
};
use std::error::Error;
use std::ffi::OsString;
use std::io::{self, Write};
use std::path::PathBuf;

mod checkpoint_file;

const USAGE: &str = "Usage: openlegend-game-server serve|check-open|initialize-storage RELEASE_DIRECTORY
       openlegend-game-server backup-world RELEASE_DIRECTORY NEW_BACKUP_DIRECTORY
       openlegend-game-server restore-world RELEASE_DIRECTORY BACKUP_DIRECTORY
       openlegend-game-server recover-checkpoint RELEASE_DIRECTORY CHECKPOINT_DIRECTORY SLOT_ID OPERATION_ID [FLOOR_SLOT_ID]";

fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut arguments = std::env::args_os().skip(1);
    let mode = arguments.next();
    let release = arguments.next().map(PathBuf::from);
    let release = release.ok_or(USAGE)?;
    if mode.as_deref().and_then(std::ffi::OsStr::to_str) == Some("checkpoint-file") {
        let id = text(arguments.next())?;
        let nonce = text(arguments.next())?;
        if arguments.next().is_some() {
            return Err(USAGE.into());
        }
        return Ok(checkpoint_file::write(&release, &id, &nonce)?);
    }
    run(mode, release, arguments)
}

#[tokio::main]
async fn run(
    mode: Option<OsString>,
    release: PathBuf,
    mut arguments: impl Iterator<Item = OsString>,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let database = std::env::var("OPEN_LEGEND_DATABASE_URL")
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL is required")?
        .parse()
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL must name a PostgreSQL database")?;
    match mode.as_deref().and_then(std::ffi::OsStr::to_str) {
        Some("serve") if arguments.next().is_none() => {
            openlegend_game_server::launch::serve(&release, database).await
        }
        Some("initialize-storage") if arguments.next().is_none() => {
            let state = initialize_storage(&release, database).await?;
            write_report(&serde_json::json!({"installation": state}))
        }
        Some("check-open") if arguments.next().is_none() => {
            let server = CurrentServer::open(&release, database, 1).await?;
            let report = write_report(&server.verified);
            server.close().await?;
            report
        }
        Some("backup-world") => {
            let destination = arguments.next().map(PathBuf::from).ok_or(USAGE)?;
            if arguments.next().is_some() {
                return Err(USAGE.into());
            }
            let data = std::env::var_os("OPEN_LEGEND_DATA_DIR")
                .map_or_else(|| PathBuf::from(".data"), PathBuf::from);
            let retained = backup_world(&release, database, &data, &destination).await?;
            write_report(&serde_json::json!({"retainedCheckpoints": retained}))
        }
        Some("restore-world") => {
            let source = arguments.next().map(PathBuf::from).ok_or(USAGE)?;
            // Used by the authenticated asset recovery tool. This stages a
            // quarantined install and never authorizes artwork delivery.
            let artwork = match arguments.next() {
                None => None,
                Some(option) if option == "--artwork-operator" => Some(text(arguments.next())?),
                _ => return Err(USAGE.into()),
            };
            if arguments.next().is_some() {
                return Err(USAGE.into());
            }
            let data = std::env::var_os("OPEN_LEGEND_DATA_DIR")
                .map_or_else(|| PathBuf::from(".data"), PathBuf::from);
            let result = restore_world(&release, database, &data, &source, artwork).await?;
            write_report(&result)
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
            write_report(&result)
        }
        _ => Err(USAGE.into()),
    }
}

fn write_report(report: &impl serde::Serialize) -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut output = io::stdout().lock();
    serde_json::to_writer(&mut output, report)?;
    output.write_all(b"\n")?;
    output.flush()?;
    Ok(())
}

fn text(value: Option<OsString>) -> Result<String, &'static str> {
    value
        .and_then(|value| value.into_string().ok())
        .filter(|value| !value.is_empty())
        .ok_or(USAGE)
}
