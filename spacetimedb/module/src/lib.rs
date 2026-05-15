use spacetimedb::{reducer, table, Identity, ReducerContext, SpacetimeType, Table, Timestamp};

#[table(accessor = uploaded_files, public)]
pub struct UploadedFile {
    #[primary_key]
    pub id: String,
    pub filename: String,
    pub original_name: String,
    pub size: u64,
    #[index(btree)]
    pub status: String,
    pub headers: Vec<String>,
    pub record_count: Option<u64>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub quality_score: Option<f64>,
    pub dataset_id: Option<String>,
    pub uploaded_at: Timestamp,
    pub updated_at: Timestamp,
    pub uploaded_by: Identity,
}

#[table(accessor = mapping_suggestions, public)]
pub struct MappingSuggestion {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub file_id: String,
    pub source_column: String,
    pub suggested_target_column: Option<String>,
    pub confidence: f64,
    pub rationale: Option<String>,
    pub created_at: Timestamp,
    pub created_by: Identity,
}

#[table(accessor = column_mappings, public)]
pub struct ColumnMapping {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub file_id: String,
    pub source_column: String,
    pub target_column: String,
    pub confidence: f64,
    pub confirmed_at: Timestamp,
    pub confirmed_by: Identity,
}

#[table(accessor = processing_jobs, public)]
pub struct ProcessingJob {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub status: String,
    pub progress: u32,
    #[index(btree)]
    pub file_id: String,
    pub file_path: String,
    pub batch_id: Option<String>,
    pub processed_rows: Option<u64>,
    pub total_rows: Option<u64>,
    pub error: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[table(accessor = data_records, public)]
pub struct DataRecord {
    #[primary_key]
    pub id: String,
    pub business_name: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub additional_emails: Option<String>,
    pub additional_phones: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub employee_count: Option<u32>,
    pub annual_revenue: Option<f64>,
    pub founded_year: Option<u32>,
    pub description: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub additional_data_json: Option<String>,
    pub source_file: Option<String>,
    pub dataset_id: Option<String>,
    pub lead_category: Option<String>,
    pub batch_id: Option<String>,
    pub quality_score: Option<f64>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[table(accessor = activity_events, public)]
pub struct ActivityEvent {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub timestamp: Timestamp,
    #[index(btree)]
    pub action: String,
    #[index(btree)]
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub details_json: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub duration_ms: Option<u64>,
    pub emitted_by: Identity,
}

#[table(accessor = data_quality_reports, public)]
pub struct DataQualityReport {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub file_id: String,
    pub overall_score: f64,
    pub issues_json: String,
    pub duplicates_json: String,
    pub anomalies_json: String,
    pub suggestions: Vec<String>,
    pub created_at: Timestamp,
    pub created_by: Identity,
}

#[derive(SpacetimeType)]
pub struct UploadRegistration {
    pub id: String,
    pub filename: String,
    pub original_name: String,
    pub size: u64,
    pub status: Option<String>,
    pub headers: Vec<String>,
    pub record_count: Option<u64>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub quality_score: Option<f64>,
    pub dataset_id: Option<String>,
}

#[derive(SpacetimeType)]
pub struct MappingSuggestionInput {
    pub source_column: String,
    pub suggested_target_column: Option<String>,
    pub confidence: f64,
    pub rationale: Option<String>,
}

#[derive(SpacetimeType)]
pub struct ColumnMappingInput {
    pub source_column: String,
    pub target_column: String,
    pub confidence: f64,
}

#[derive(SpacetimeType)]
pub struct LeadRecordInput {
    pub id: String,
    pub business_name: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub additional_emails: Option<String>,
    pub additional_phones: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub employee_count: Option<u32>,
    pub annual_revenue: Option<f64>,
    pub founded_year: Option<u32>,
    pub description: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub additional_data_json: Option<String>,
    pub dataset_id: Option<String>,
    pub lead_category: Option<String>,
    pub quality_score: Option<f64>,
}

#[derive(SpacetimeType)]
pub struct ActivityEventInput {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub details_json: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub duration_ms: Option<u64>,
}

#[derive(SpacetimeType)]
pub struct DataQualityReportInput {
    pub file_id: String,
    pub overall_score: f64,
    pub issues_json: String,
    pub duplicates_json: String,
    pub anomalies_json: String,
    pub suggestions: Vec<String>,
}

#[reducer]
pub fn register_upload(ctx: &ReducerContext, upload: UploadRegistration) -> Result<(), String> {
    require_non_empty("upload.id", &upload.id)?;
    require_non_empty("upload.filename", &upload.filename)?;

    let now = ctx.timestamp;
    let uploaded_file = UploadedFile {
        id: upload.id,
        filename: upload.filename,
        original_name: upload.original_name,
        size: upload.size,
        status: upload.status.unwrap_or_else(|| "pending".to_string()),
        headers: upload.headers,
        record_count: upload.record_count,
        tags: upload.tags,
        category: upload.category,
        quality_score: upload.quality_score,
        dataset_id: upload.dataset_id,
        uploaded_at: now,
        updated_at: now,
        uploaded_by: ctx.sender(),
    };

    if ctx.db.uploaded_files().id().find(uploaded_file.id.clone()).is_some() {
        return Err("uploaded file already exists".to_string());
    }

    ctx.db.uploaded_files().insert(uploaded_file);
    Ok(())
}

#[reducer]
pub fn record_mapping_suggestions(
    ctx: &ReducerContext,
    file_id: String,
    suggestions: Vec<MappingSuggestionInput>,
) -> Result<(), String> {
    require_file(ctx, &file_id)?;

    let now = ctx.timestamp;
    let created_by = ctx.sender();
    for suggestion in suggestions {
        require_non_empty("suggestion.source_column", &suggestion.source_column)?;
        require_confidence(suggestion.confidence)?;
        ctx.db.mapping_suggestions().insert(MappingSuggestion {
            id: 0,
            file_id: file_id.clone(),
            source_column: suggestion.source_column,
            suggested_target_column: suggestion.suggested_target_column,
            confidence: suggestion.confidence,
            rationale: suggestion.rationale,
            created_at: now,
            created_by: created_by.clone(),
        });
    }

    append_system_event(
        ctx,
        "mapping_suggestions_recorded",
        "file",
        Some(file_id),
        Some("success"),
        None,
    );
    Ok(())
}

#[reducer]
pub fn confirm_mappings(
    ctx: &ReducerContext,
    file_id: String,
    mappings: Vec<ColumnMappingInput>,
    job_id: Option<String>,
    batch_id: Option<String>,
) -> Result<(), String> {
    let mut file = require_file(ctx, &file_id)?;
    let now = ctx.timestamp;
    let confirmed_by = ctx.sender();

    if mappings.is_empty() {
        return Err("at least one mapping is required".to_string());
    }

    for mapping in mappings {
        require_non_empty("mapping.source_column", &mapping.source_column)?;
        require_non_empty("mapping.target_column", &mapping.target_column)?;
        require_confidence(mapping.confidence)?;

        let id = mapping_id(&file_id, &mapping.source_column);
        let row = ColumnMapping {
            id: id.clone(),
            file_id: file_id.clone(),
            source_column: mapping.source_column,
            target_column: mapping.target_column,
            confidence: mapping.confidence,
            confirmed_at: now,
            confirmed_by: confirmed_by.clone(),
        };

        if ctx.db.column_mappings().id().find(id).is_some() {
            ctx.db.column_mappings().id().update(row);
        } else {
            ctx.db.column_mappings().insert(row);
        }
    }

    file.status = "mapped".to_string();
    file.updated_at = now;
    ctx.db.uploaded_files().id().update(file);

    if let Some(job_id) = job_id {
        require_non_empty("job_id", &job_id)?;
        if ctx.db.processing_jobs().id().find(job_id.clone()).is_none() {
            ctx.db.processing_jobs().insert(ProcessingJob {
                id: job_id,
                status: "queued".to_string(),
                progress: 0,
                file_id: file_id.clone(),
                file_path: String::new(),
                batch_id,
                processed_rows: Some(0),
                total_rows: None,
                error: None,
                created_at: now,
                updated_at: now,
            });
        }
    }

    append_system_event(
        ctx,
        "mapping_confirmed",
        "file",
        Some(file_id),
        Some("success"),
        None,
    );
    Ok(())
}

#[reducer]
pub fn stage_csv_upload(
    ctx: &ReducerContext,
    upload: UploadRegistration,
    mappings: Vec<ColumnMappingInput>,
    job_id: Option<String>,
    batch_id: Option<String>,
) -> Result<(), String> {
    let file_id = upload.id.clone();
    register_upload(ctx, upload)?;

    if !mappings.is_empty() {
        confirm_mappings(ctx, file_id, mappings, job_id, batch_id)?;
    }

    Ok(())
}

#[reducer]
pub fn update_job_progress(
    ctx: &ReducerContext,
    job_id: String,
    status: String,
    progress: u32,
    processed_rows: Option<u64>,
    total_rows: Option<u64>,
    error: Option<String>,
) -> Result<(), String> {
    require_non_empty("job_id", &job_id)?;
    require_non_empty("status", &status)?;
    if progress > 100 {
        return Err("progress must be between 0 and 100".to_string());
    }

    let Some(mut job) = ctx.db.processing_jobs().id().find(job_id.clone()) else {
        return Err("processing job not found".to_string());
    };

    job.status = status.clone();
    job.progress = progress;
    job.processed_rows = processed_rows;
    job.total_rows = total_rows;
    job.error = error.clone();
    job.updated_at = ctx.timestamp;
    let file_id = job.file_id.clone();
    ctx.db.processing_jobs().id().update(job);

    if let Some(mut file) = ctx.db.uploaded_files().id().find(file_id.clone()) {
        file.status = file_status_for_job(&status);
        file.updated_at = ctx.timestamp;
        ctx.db.uploaded_files().id().update(file);
    }

    append_system_event(
        ctx,
        "processing_progress_updated",
        "job",
        Some(job_id),
        if error.is_some() { Some("error") } else { Some("info") },
        None,
    );
    Ok(())
}

#[reducer]
pub fn process_csv_upload(
    ctx: &ReducerContext,
    file_id: String,
    job_id: Option<String>,
    batch_id: Option<String>,
) -> Result<(), String> {
    let mut file = require_file(ctx, &file_id)?;
    let now = ctx.timestamp;
    let job_id = job_id.unwrap_or_else(|| format!("{file_id}::process"));

    if let Some(mut job) = ctx.db.processing_jobs().id().find(job_id.clone()) {
        job.status = "processing".to_string();
        job.progress = job.progress.max(1);
        job.error = None;
        job.updated_at = now;
        ctx.db.processing_jobs().id().update(job);
    } else {
        ctx.db.processing_jobs().insert(ProcessingJob {
            id: job_id.clone(),
            status: "processing".to_string(),
            progress: 1,
            file_id: file_id.clone(),
            file_path: String::new(),
            batch_id,
            processed_rows: Some(0),
            total_rows: file.record_count,
            error: None,
            created_at: now,
            updated_at: now,
        });
    }

    file.status = "processing".to_string();
    file.updated_at = now;
    ctx.db.uploaded_files().id().update(file);

    append_system_event(
        ctx,
        "processing_requested",
        "file",
        Some(file_id),
        Some("success"),
        None,
    );
    Ok(())
}

#[reducer]
pub fn insert_lead_records(
    ctx: &ReducerContext,
    file_id: String,
    batch_id: Option<String>,
    records: Vec<LeadRecordInput>,
) -> Result<(), String> {
    let mut file = require_file(ctx, &file_id)?;
    if records.is_empty() {
        return Err("at least one record is required".to_string());
    }

    let now = ctx.timestamp;
    let mut inserted_count = 0_u64;
    for record in records {
        require_non_empty("record.id", &record.id)?;
        let row = DataRecord {
            id: record.id,
            business_name: record.business_name,
            first_name: record.first_name,
            last_name: record.last_name,
            address: record.address,
            city: record.city,
            state: record.state,
            zip_code: record.zip_code,
            country: record.country,
            phone: record.phone,
            email: record.email,
            additional_emails: record.additional_emails,
            additional_phones: record.additional_phones,
            website: record.website,
            industry: record.industry,
            employee_count: record.employee_count,
            annual_revenue: record.annual_revenue,
            founded_year: record.founded_year,
            description: record.description,
            contact_name: record.contact_name,
            contact_title: record.contact_title,
            additional_data_json: record.additional_data_json,
            source_file: Some(file_id.clone()),
            dataset_id: record.dataset_id,
            lead_category: record.lead_category,
            batch_id: batch_id.clone(),
            quality_score: record.quality_score,
            created_at: now,
            updated_at: now,
        };

        if ctx.db.data_records().id().find(row.id.clone()).is_some() {
            ctx.db.data_records().id().update(row);
        } else {
            ctx.db.data_records().insert(row);
        }
        inserted_count += 1;
    }

    file.record_count = Some(file.record_count.unwrap_or(0).saturating_add(inserted_count));
    file.status = "processing".to_string();
    file.updated_at = now;
    ctx.db.uploaded_files().id().update(file);

    append_system_event(
        ctx,
        "lead_records_inserted",
        "file",
        Some(file_id),
        Some("success"),
        None,
    );
    Ok(())
}

#[reducer]
pub fn delete_record(ctx: &ReducerContext, record_id: String) -> Result<(), String> {
    require_non_empty("record_id", &record_id)?;
    let Some(record) = ctx.db.data_records().id().find(record_id.clone()) else {
        return Err("data record not found".to_string());
    };

    let source_file = record.source_file.clone();
    ctx.db.data_records().id().delete(&record_id);

    if let Some(file_id) = source_file {
        if let Some(mut file) = ctx.db.uploaded_files().id().find(file_id) {
            file.record_count = Some(file.record_count.unwrap_or(1).saturating_sub(1));
            file.updated_at = ctx.timestamp;
            ctx.db.uploaded_files().id().update(file);
        }
    }

    append_system_event(
        ctx,
        "record_deleted",
        "record",
        Some(record_id),
        Some("success"),
        None,
    );
    Ok(())
}

#[reducer]
pub fn append_activity_event(ctx: &ReducerContext, event: ActivityEventInput) -> Result<(), String> {
    require_non_empty("event.action", &event.action)?;
    require_non_empty("event.entity_type", &event.entity_type)?;

    ctx.db.activity_events().insert(ActivityEvent {
        id: 0,
        timestamp: ctx.timestamp,
        action: event.action,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        details_json: event.details_json,
        user_id: event.user_id,
        status: event.status,
        duration_ms: event.duration_ms,
        emitted_by: ctx.sender(),
    });
    Ok(())
}

#[reducer]
pub fn record_data_quality_report(
    ctx: &ReducerContext,
    report: DataQualityReportInput,
) -> Result<(), String> {
    require_file(ctx, &report.file_id)?;
    require_score("report.overall_score", report.overall_score)?;

    let mut file = require_file(ctx, &report.file_id)?;
    file.quality_score = Some(report.overall_score);
    file.updated_at = ctx.timestamp;
    ctx.db.uploaded_files().id().update(file);

    ctx.db.data_quality_reports().insert(DataQualityReport {
        id: 0,
        file_id: report.file_id.clone(),
        overall_score: report.overall_score,
        issues_json: report.issues_json,
        duplicates_json: report.duplicates_json,
        anomalies_json: report.anomalies_json,
        suggestions: report.suggestions,
        created_at: ctx.timestamp,
        created_by: ctx.sender(),
    });

    append_system_event(
        ctx,
        "quality_analysis_completed",
        "file",
        Some(report.file_id),
        Some("success"),
        None,
    );
    Ok(())
}

fn require_file(ctx: &ReducerContext, file_id: &str) -> Result<UploadedFile, String> {
    require_non_empty("file_id", file_id)?;
    ctx.db
        .uploaded_files()
        .id()
        .find(file_id.to_string())
        .ok_or_else(|| "uploaded file not found".to_string())
}

fn require_non_empty(name: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{name} cannot be empty"))
    } else {
        Ok(())
    }
}

fn require_confidence(value: f64) -> Result<(), String> {
    require_score("confidence", value)
}

fn require_score(name: &str, value: f64) -> Result<(), String> {
    if (0.0..=1.0).contains(&value) {
        Ok(())
    } else {
        Err(format!("{name} must be between 0.0 and 1.0"))
    }
}

fn mapping_id(file_id: &str, source_column: &str) -> String {
    format!("{file_id}::{source_column}")
}

fn file_status_for_job(status: &str) -> String {
    match status {
        "queued" => "pending".to_string(),
        "active" | "processing" => "processing".to_string(),
        "completed" => "completed".to_string(),
        "failed" => "failed".to_string(),
        _ => status.to_string(),
    }
}

fn append_system_event(
    ctx: &ReducerContext,
    action: &str,
    entity_type: &str,
    entity_id: Option<String>,
    status: Option<&str>,
    details_json: Option<String>,
) {
    ctx.db.activity_events().insert(ActivityEvent {
        id: 0,
        timestamp: ctx.timestamp,
        action: action.to_string(),
        entity_type: entity_type.to_string(),
        entity_id,
        details_json,
        user_id: None,
        status: status.map(str::to_string),
        duration_ms: None,
        emitted_by: ctx.sender(),
    });
}
