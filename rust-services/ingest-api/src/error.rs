use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

use crate::spacetime::SpacetimeClientError;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    NotFound(String),
    #[error("SpacetimeDB client error: {0}")]
    Spacetime(#[from] SpacetimeClientError),
    #[error("CSV parse error: {0}")]
    Csv(#[from] csv::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, "bad_request", message),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, "not_found", message),
            Self::Csv(source) => (
                StatusCode::BAD_REQUEST,
                "invalid_csv",
                format!("CSV could not be parsed: {source}"),
            ),
            Self::Spacetime(source) => (
                StatusCode::BAD_GATEWAY,
                "spacetimedb_error",
                source.to_string(),
            ),
        };

        (status, Json(ErrorEnvelope::new(code, message))).into_response()
    }
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

impl ErrorEnvelope {
    fn new(code: &'static str, message: String) -> Self {
        Self {
            error: ErrorBody { code, message },
        }
    }
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}
