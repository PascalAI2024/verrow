use std::collections::HashMap;

use bytes::Bytes;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct ParsedUpload {
    pub id: Uuid,
    pub filename: Option<String>,
    pub headers: Vec<String>,
    pub sample_rows: Vec<HashMap<String, String>>,
    pub sampled_rows: usize,
    pub total_rows_observed: usize,
    pub warnings: Vec<String>,
    pub suggestions: Vec<MappingSuggestion>,
    pub raw_csv: Bytes,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct CsvPreview {
    pub filename: Option<String>,
    pub headers: Vec<String>,
    pub sample_rows: Vec<HashMap<String, String>>,
    pub sampled_rows: usize,
    pub total_rows_observed: usize,
    pub warnings: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LeadField {
    FullName,
    FirstName,
    LastName,
    Email,
    Phone,
    Company,
    JobTitle,
    Website,
    Industry,
    Address,
    City,
    State,
    PostalCode,
    Country,
    LinkedinUrl,
    Source,
    Notes,
    LeadType,
}

impl LeadField {
    pub const fn all() -> &'static [Self] {
        &[
            Self::FullName,
            Self::FirstName,
            Self::LastName,
            Self::Email,
            Self::Phone,
            Self::Company,
            Self::JobTitle,
            Self::Website,
            Self::Industry,
            Self::Address,
            Self::City,
            Self::State,
            Self::PostalCode,
            Self::Country,
            Self::LinkedinUrl,
            Self::Source,
            Self::Notes,
            Self::LeadType,
        ]
    }

    pub const fn spacetimedb_column(self) -> &'static str {
        match self {
            Self::FullName => "contact_name",
            Self::FirstName => "first_name",
            Self::LastName => "last_name",
            Self::Email => "email",
            Self::Phone => "phone",
            Self::Company => "business_name",
            Self::JobTitle => "contact_title",
            Self::Website => "website",
            Self::Industry => "industry",
            Self::Address => "address",
            Self::City => "city",
            Self::State => "state",
            Self::PostalCode => "zip_code",
            Self::Country => "country",
            Self::LinkedinUrl => "additional_data_json",
            Self::Source => "additional_data_json",
            Self::Notes => "description",
            Self::LeadType => "lead_category",
        }
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct MappingSuggestion {
    pub source_column: String,
    pub suggested_field: Option<LeadField>,
    pub confidence: f32,
    pub reason: String,
    pub alternatives: Vec<MappingAlternative>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MappingAlternative {
    pub target_field: LeadField,
    pub confidence: f32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ConfirmedColumnMapping {
    pub source_column: String,
    pub target_field: LeadField,
}

#[derive(Debug, Deserialize)]
pub struct MappingSuggestionRequest {
    pub headers: Vec<String>,
    #[serde(default)]
    pub sample_rows: Vec<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct MappingSuggestionResponse {
    pub headers: Vec<String>,
    pub suggestions: Vec<MappingSuggestion>,
}

#[derive(Debug, Serialize)]
pub struct UploadCsvResponse {
    pub upload_id: Uuid,
    pub filename: Option<String>,
    pub headers: Vec<String>,
    pub sample_rows: Vec<HashMap<String, String>>,
    pub sampled_rows: usize,
    pub total_rows_observed: usize,
    pub suggestions: Vec<MappingSuggestion>,
    pub warnings: Vec<String>,
}

impl From<&ParsedUpload> for UploadCsvResponse {
    fn from(upload: &ParsedUpload) -> Self {
        Self {
            upload_id: upload.id,
            filename: upload.filename.clone(),
            headers: upload.headers.clone(),
            sample_rows: upload.sample_rows.clone(),
            sampled_rows: upload.sampled_rows,
            total_rows_observed: upload.total_rows_observed,
            suggestions: upload.suggestions.clone(),
            warnings: upload.warnings.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ConfirmUploadRequest {
    pub mapping: Vec<ConfirmedColumnMapping>,
    pub dataset_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConfirmUploadResponse {
    pub upload_id: Uuid,
    pub status: String,
    pub mapping_count: usize,
    pub staged_reducer_transport_receipt: ReducerCallReceipt,
}

#[derive(Debug, Serialize)]
pub struct ProcessUploadResponse {
    pub upload_id: Uuid,
    pub status: String,
    pub mapping_count: usize,
    pub process_reducer_transport_receipt: ReducerCallReceipt,
}

#[derive(Clone, Debug, Serialize)]
pub struct ReducerCallReceipt {
    pub call_id: Uuid,
    pub reducer: String,
    pub module: Option<String>,
    pub transport: String,
    pub accepted_by_sidecar: bool,
    pub delivered_to_spacetimedb: bool,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct ReducerTransportStatus {
    pub mode: String,
    pub ready: bool,
    pub settings_present: bool,
    pub detail: String,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub spacetime_settings_present: bool,
    pub reducer_transport: ReducerTransportStatus,
}
