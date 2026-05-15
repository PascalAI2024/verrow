mod config;
mod csv_preview;
mod error;
mod mapper;
mod models;
mod routes;
mod spacetime;

use std::{collections::HashMap, sync::Arc};

use tokio::{net::TcpListener, sync::RwLock};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use crate::{
    config::Config,
    models::{ConfirmedColumnMapping, ParsedUpload},
    spacetime::{NoopSpacetimeClient, SpacetimeClient},
};

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub uploads: Arc<RwLock<HashMap<Uuid, ParsedUpload>>>,
    pub confirmed_mappings: Arc<RwLock<HashMap<Uuid, Vec<ConfirmedColumnMapping>>>>,
    pub spacetime: Arc<dyn SpacetimeClient>,
}

impl AppState {
    fn new(config: Config) -> Self {
        let spacetime = Arc::new(NoopSpacetimeClient::from_config(&config));

        Self {
            config,
            uploads: Arc::new(RwLock::new(HashMap::new())),
            confirmed_mappings: Arc::new(RwLock::new(HashMap::new())),
            spacetime,
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    init_tracing();

    let config = Config::from_env()?;
    let bind_addr = config.bind_addr;
    let app = routes::router(AppState::new(config));

    let listener = TcpListener::bind(bind_addr).await?;
    tracing::info!(%bind_addr, "starting Verrow ingest API");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "verrow_ingest_api=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
