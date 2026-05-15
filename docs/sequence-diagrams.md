# Verrow Sequence Diagrams

These diagrams describe the default Verrow architecture: React/Vite+ frontend, Rust Axum ingest API, and SpacetimeDB reducers/subscriptions.

## Upload And Mapping

```mermaid
sequenceDiagram
    participant User
    participant Frontend as React Frontend
    participant Rust as Rust Ingest API
    participant STDB as SpacetimeDB
    participant Module as Verrow Rust Module

    User->>Frontend: Drop CSV
    Frontend->>Rust: POST /v1/csv/uploads
    Rust->>Rust: Parse headers and sample rows
    Rust->>Rust: Suggest field mappings
    Rust-->>Frontend: upload_id, preview rows, mapping suggestions
    User->>Frontend: Confirm mappings
    Frontend->>Rust: POST /v1/uploads/{upload_id}/confirm
    Rust-->>Frontend: reducer receipt
    Frontend->>Rust: POST /v1/uploads/{upload_id}/process
    Rust-->>Frontend: processing receipt
    Rust-. reducer transport bridge .->STDB: stage/process upload
    STDB->>Module: Run reducers
    STDB-->>Frontend: Live table updates
```

## Live State Ownership

```mermaid
flowchart LR
    UI["React 19 + Vite+ UI"]
    Ingest["Rust Axum ingest API"]
    STDB["SpacetimeDB 2.2"]
    Module["Rust/Wasm module"]
    Bindings["Generated TypeScript bindings"]
    Charts["Recharts visualizations"]

    UI -->|"multipart CSV"| Ingest
    Ingest -->|"reducer intent"| STDB
    STDB --> Module
    STDB -->|"subscriptions"| Bindings
    Bindings --> UI
    UI --> Charts
```

## Tables And Reducers

```mermaid
flowchart TB
    subgraph Tables
        Files["uploaded_files"]
        Suggestions["mapping_suggestions"]
        Mappings["column_mappings"]
        Jobs["processing_jobs"]
        Records["data_records"]
        Activity["activity_events"]
        Reports["data_quality_reports"]
    end

    subgraph Reducers
        Register["register_upload"]
        Suggest["record_mapping_suggestions"]
        Confirm["confirm_mappings"]
        Stage["stage_csv_upload"]
        Process["process_csv_upload"]
        Progress["update_job_progress"]
        Insert["insert_lead_records"]
        Delete["delete_record"]
        Event["append_activity_event"]
        Quality["record_data_quality_report"]
    end

    Register --> Files
    Suggest --> Suggestions
    Confirm --> Mappings
    Stage --> Jobs
    Process --> Jobs
    Progress --> Jobs
    Insert --> Records
    Delete --> Records
    Event --> Activity
    Quality --> Reports
```
