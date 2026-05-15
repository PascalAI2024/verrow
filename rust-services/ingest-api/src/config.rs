use std::{env, net::SocketAddr};

#[derive(Clone, Debug)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub max_upload_bytes: usize,
    pub csv_sample_rows: usize,
    pub spacetime_url: Option<String>,
    pub spacetime_module: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let bind_addr: SocketAddr = env::var("INGEST_API_BIND_ADDR")
            .unwrap_or_else(|_| "0.0.0.0:3010".to_string())
            .parse()
            .map_err(|source| ConfigError::InvalidSocketAddr { source })?;

        Ok(Self {
            bind_addr,
            max_upload_bytes: parse_usize_env("INGEST_API_MAX_UPLOAD_BYTES", 10 * 1024 * 1024)?,
            csv_sample_rows: parse_usize_env("INGEST_API_CSV_SAMPLE_ROWS", 25)?,
            spacetime_url: optional_env("SPACETIMEDB_URL"),
            spacetime_module: optional_env("SPACETIMEDB_MODULE"),
        })
    }
}

fn optional_env(key: &str) -> Option<String> {
    env::var(key).ok().filter(|value| !value.trim().is_empty())
}

fn parse_usize_env(key: &'static str, default: usize) -> Result<usize, ConfigError> {
    match env::var(key) {
        Ok(value) => value
            .parse()
            .map_err(|source| ConfigError::InvalidUsize { key, value, source }),
        Err(_) => Ok(default),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("INGEST_API_BIND_ADDR is not a valid socket address")]
    InvalidSocketAddr {
        #[source]
        source: std::net::AddrParseError,
    },
    #[error("{key} must be a positive integer, got {value}")]
    InvalidUsize {
        key: &'static str,
        value: String,
        #[source]
        source: std::num::ParseIntError,
    },
}
