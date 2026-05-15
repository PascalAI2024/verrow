use std::collections::HashSet;

use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use bytes::Bytes;
use chrono::Utc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use uuid::Uuid;

use crate::{
    csv_preview::parse_csv_preview,
    error::AppError,
    mapper::suggest_mappings,
    models::{
        ConfirmUploadRequest, ConfirmUploadResponse, ConfirmedColumnMapping, HealthResponse,
        MappingSuggestionRequest, MappingSuggestionResponse, ParsedUpload, ProcessUploadResponse,
        UploadCsvResponse,
    },
    AppState,
};

pub fn router(state: AppState) -> Router {
    let max_upload_bytes = state.config.max_upload_bytes;

    Router::new()
        .route("/health", get(health))
        .route("/v1/csv/uploads", post(upload_csv))
        .route("/v1/mapping/suggestions", post(suggest_mapping))
        .route("/v1/uploads/{upload_id}/confirm", post(confirm_upload))
        .route("/v1/uploads/{upload_id}/process", post(process_upload))
        .layer(DefaultBodyLimit::max(max_upload_bytes))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    let reducer_transport = state.spacetime.transport_status();

    Json(HealthResponse {
        status: "ok",
        service: "verrow-ingest-api",
        version: env!("CARGO_PKG_VERSION"),
        spacetime_settings_present: reducer_transport.settings_present,
        reducer_transport,
    })
}

async fn upload_csv(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<UploadCsvResponse>), AppError> {
    let (filename, bytes) = read_multipart_csv(&mut multipart).await?;
    let preview = parse_csv_preview(&bytes, filename.clone(), state.config.csv_sample_rows)?;
    let suggestions = suggest_mappings(&preview.headers, &preview.sample_rows);

    let upload = ParsedUpload {
        id: Uuid::new_v4(),
        filename: preview.filename,
        headers: preview.headers,
        sample_rows: preview.sample_rows,
        sampled_rows: preview.sampled_rows,
        total_rows_observed: preview.total_rows_observed,
        warnings: preview.warnings,
        suggestions,
        raw_csv: bytes,
        created_at: Utc::now(),
    };

    let response = UploadCsvResponse::from(&upload);
    state.uploads.write().await.insert(upload.id, upload);

    Ok((StatusCode::CREATED, Json(response)))
}

async fn suggest_mapping(
    Json(payload): Json<MappingSuggestionRequest>,
) -> Result<Json<MappingSuggestionResponse>, AppError> {
    if payload.headers.is_empty() {
        return Err(AppError::BadRequest(
            "headers must contain at least one source column".to_string(),
        ));
    }

    let suggestions = suggest_mappings(&payload.headers, &payload.sample_rows);

    Ok(Json(MappingSuggestionResponse {
        headers: payload.headers,
        suggestions,
    }))
}

async fn confirm_upload(
    State(state): State<AppState>,
    Path(upload_id): Path<Uuid>,
    Json(payload): Json<ConfirmUploadRequest>,
) -> Result<Json<ConfirmUploadResponse>, AppError> {
    let upload = load_upload(&state, upload_id).await?;
    validate_mapping(&upload, &payload.mapping)?;

    let staged_reducer_transport_receipt = state
        .spacetime
        .stage_upload(&upload, &payload.mapping, payload.dataset_name.as_deref())
        .await?;

    state
        .confirmed_mappings
        .write()
        .await
        .insert(upload_id, payload.mapping.clone());

    Ok(Json(ConfirmUploadResponse {
        upload_id,
        status: "confirmed".to_string(),
        mapping_count: payload.mapping.len(),
        staged_reducer_transport_receipt,
    }))
}

async fn process_upload(
    State(state): State<AppState>,
    Path(upload_id): Path<Uuid>,
) -> Result<Json<ProcessUploadResponse>, AppError> {
    load_upload(&state, upload_id).await?;
    let mapping = state
        .confirmed_mappings
        .read()
        .await
        .get(&upload_id)
        .cloned()
        .ok_or_else(|| {
            AppError::BadRequest(
                "upload must be confirmed before it can be processed".to_string(),
            )
        })?;

    let process_reducer_transport_receipt = state.spacetime.process_upload(upload_id).await?;

    Ok(Json(ProcessUploadResponse {
        upload_id,
        status: "processing_requested".to_string(),
        mapping_count: mapping.len(),
        process_reducer_transport_receipt,
    }))
}

async fn read_multipart_csv(
    multipart: &mut Multipart,
) -> Result<(Option<String>, Bytes), AppError> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|source| AppError::BadRequest(format!("invalid multipart upload: {source}")))?
    {
        let field_name = field.name().map(str::to_string);
        let filename = field.file_name().map(str::to_string);

        if field_name.as_deref() != Some("file") && filename.is_none() {
            continue;
        }

        let bytes = field
            .bytes()
            .await
            .map_err(|source| {
                AppError::BadRequest(format!("could not read upload field: {source}"))
            })?;

        return Ok((filename, bytes));
    }

    Err(AppError::BadRequest(
        "multipart upload must include a CSV file field named 'file'".to_string(),
    ))
}

async fn load_upload(state: &AppState, upload_id: Uuid) -> Result<ParsedUpload, AppError> {
    state
        .uploads
        .read()
        .await
        .get(&upload_id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("upload {upload_id} was not found")))
}

fn validate_mapping(
    upload: &ParsedUpload,
    mapping: &[ConfirmedColumnMapping],
) -> Result<(), AppError> {
    if mapping.is_empty() {
        return Err(AppError::BadRequest(
            "mapping must contain at least one confirmed column".to_string(),
        ));
    }

    let source_columns = upload
        .headers
        .iter()
        .map(String::as_str)
        .collect::<HashSet<_>>();
    let mut target_fields = HashSet::new();

    for entry in mapping {
        if !source_columns.contains(entry.source_column.as_str()) {
            return Err(AppError::BadRequest(format!(
                "source column '{}' is not present in upload {}",
                entry.source_column, upload.id
            )));
        }

        if !target_fields.insert(entry.target_field) {
            return Err(AppError::BadRequest(format!(
                "target field '{:?}' is mapped more than once",
                entry.target_field
            )));
        }
    }

    Ok(())
}
