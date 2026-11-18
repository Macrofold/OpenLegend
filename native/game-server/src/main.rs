use openlegend_game_server::boot::CurrentServer;
use std::error::Error;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut arguments = std::env::args_os().skip(1);
    let mode = arguments.next();
    let release = arguments.next().map(PathBuf::from);
    let Some(release) = release.filter(|_| mode.as_deref() == Some("check-open".as_ref())) else {
        return Err("Usage: openlegend-game-server check-open RELEASE_DIRECTORY".into());
    };
    if arguments.next().is_some() {
        return Err("Usage: openlegend-game-server check-open RELEASE_DIRECTORY".into());
    }
    let database = std::env::var("OPEN_LEGEND_DATABASE_URL")
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL is required")?
        .parse()
        .map_err(|_| "OPEN_LEGEND_DATABASE_URL must name a PostgreSQL database")?;
    let server = CurrentServer::open(&release, database, 1).await?;
    println!("{}", serde_json::to_string(&server.verified)?);
    server.close().await
}
