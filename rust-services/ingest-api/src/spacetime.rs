use async_trait::async_trait;
use uuid::Uuid;

use crate::{
    config::Config,
    models::{ConfirmedColumnMapping, ParsedUpload, ReducerCallReceipt, ReducerTransportStatus},
};

#[async_trait]
pub trait SpacetimeClient: Send + Sync {
    fn transport_status(&self) -> ReducerTransportStatus;

    async fn stage_upload(
        &self,
        upload: &ParsedUpload,
        mapping: &[ConfirmedColumnMapping],
        dataset_name: Option<&str>,
    ) -> Result<ReducerCallReceipt, SpacetimeClientError>;

    async fn process_upload(
        &self,
        upload_id: Uuid,
    ) -> Result<ReducerCallReceipt, SpacetimeClientError>;
}

#[derive(Clone, Debug)]
pub struct NoopSpacetimeClient {
    endpoint: Option<String>,
    module: Option<String>,
}

impl NoopSpacetimeClient {
    pub fn from_config(config: &Config) -> Self {
        Self {
            endpoint: config.spacetime_url.clone(),
            module: config.spacetime_module.clone(),
        }
    }
}

#[async_trait]
impl SpacetimeClient for NoopSpacetimeClient {
    fn transport_status(&self) -> ReducerTransportStatus {
        let settings_present = self.endpoint.is_some() && self.module.is_some();

        ReducerTransportStatus {
            mode: "noop".to_string(),
            ready: false,
            settings_present,
            detail: if settings_present {
                "SpacetimeDB settings are present, but the Rust sidecar is using a no-op reducer transport; implement a real Rust SDK client before expecting reducer delivery.".to_string()
            } else {
                "SpacetimeDB settings are absent, and the Rust sidecar is using a no-op reducer transport.".to_string()
            },
        }
    }

    async fn stage_upload(
        &self,
        upload: &ParsedUpload,
        mapping: &[ConfirmedColumnMapping],
        dataset_name: Option<&str>,
    ) -> Result<ReducerCallReceipt, SpacetimeClientError> {
        let reducer = "stage_csv_upload";

        tracing::info!(
            reducer,
            module = ?self.module,
            endpoint = ?self.endpoint,
            upload_id = %upload.id,
            dataset_name,
            header_count = upload.headers.len(),
            mapping_count = mapping.len(),
            spacetime_mappings = ?to_spacetime_mappings(mapping),
            observed_rows = upload.total_rows_observed,
            raw_bytes = upload.raw_csv.len(),
            "recorded staged reducer intent with no-op transport"
        );

        Ok(ReducerCallReceipt {
            call_id: Uuid::new_v4(),
            reducer: reducer.to_string(),
            module: self.module.clone(),
            transport: "noop".to_string(),
            accepted_by_sidecar: true,
            delivered_to_spacetimedb: false,
            detail:
                "No-op transport recorded the reducer intent only; no SpacetimeDB reducer was called."
                    .to_string(),
        })
    }

    async fn process_upload(
        &self,
        upload_id: Uuid,
    ) -> Result<ReducerCallReceipt, SpacetimeClientError> {
        let reducer = "process_csv_upload";

        tracing::info!(
            reducer,
            module = ?self.module,
            endpoint = ?self.endpoint,
            upload_id = %upload_id,
            "recorded process reducer intent with no-op transport"
        );

        Ok(ReducerCallReceipt {
            call_id: Uuid::new_v4(),
            reducer: reducer.to_string(),
            module: self.module.clone(),
            transport: "noop".to_string(),
            accepted_by_sidecar: true,
            delivered_to_spacetimedb: false,
            detail:
                "No-op transport recorded the process request only; no rows were written to SpacetimeDB."
                    .to_string(),
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SpacetimeClientError {
    #[error("{0}")]
    ReducerCallFailed(String),
}

#[derive(Debug, PartialEq, Eq)]
struct SpacetimeColumnMapping {
    source_column: String,
    target_column: String,
    confidence_basis: &'static str,
}

fn to_spacetime_mappings(mapping: &[ConfirmedColumnMapping]) -> Vec<SpacetimeColumnMapping> {
    mapping
        .iter()
        .map(|entry| SpacetimeColumnMapping {
            source_column: entry.source_column.clone(),
            target_column: entry.target_field.spacetimedb_column().to_string(),
            confidence_basis: "human_confirmed",
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;
    use chrono::Utc;
    use std::collections::HashMap;
    use uuid::Uuid;

    use crate::{
        config::Config,
        models::{ConfirmedColumnMapping, LeadField, ParsedUpload},
    };

    use super::{to_spacetime_mappings, NoopSpacetimeClient, SpacetimeClient};

    #[test]
    fn translates_confirmed_mapping_to_module_columns() {
        let mappings = to_spacetime_mappings(&[
            ConfirmedColumnMapping {
                source_column: "Company".to_string(),
                target_field: LeadField::Company,
            },
            ConfirmedColumnMapping {
                source_column: "Title".to_string(),
                target_field: LeadField::JobTitle,
            },
        ]);

        assert_eq!(mappings[0].target_column, "business_name");
        assert_eq!(mappings[1].target_column, "contact_title");
    }

    #[test]
    fn noop_transport_status_is_not_ready_even_when_configured() {
        let config = Config {
            bind_addr: "127.0.0.1:3010".parse().unwrap(),
            max_upload_bytes: 1024,
            csv_sample_rows: 5,
            spacetime_url: Some("http://localhost:3001".to_string()),
            spacetime_module: Some("verrow".to_string()),
        };
        let client = NoopSpacetimeClient::from_config(&config);

        let status = client.transport_status();

        assert_eq!(status.mode, "noop");
        assert!(status.settings_present);
        assert!(!status.ready);
    }

    #[tokio::test]
    async fn noop_stage_receipt_is_not_delivered_to_spacetimedb() {
        let config = Config {
            bind_addr: "127.0.0.1:3010".parse().unwrap(),
            max_upload_bytes: 1024,
            csv_sample_rows: 5,
            spacetime_url: Some("http://localhost:3001".to_string()),
            spacetime_module: Some("verrow".to_string()),
        };
        let client = NoopSpacetimeClient::from_config(&config);
        let upload = ParsedUpload {
            id: Uuid::new_v4(),
            filename: Some("leads.csv".to_string()),
            headers: vec!["Company".to_string()],
            sample_rows: vec![HashMap::from([(
                "Company".to_string(),
                "Analytical Engines LLC".to_string(),
            )])],
            sampled_rows: 1,
            total_rows_observed: 1,
            warnings: vec![],
            suggestions: vec![],
            raw_csv: Bytes::from_static(b"Company\nAnalytical Engines LLC\n"),
            created_at: Utc::now(),
        };
        let mapping = vec![ConfirmedColumnMapping {
            source_column: "Company".to_string(),
            target_field: LeadField::Company,
        }];

        let receipt = client
            .stage_upload(&upload, &mapping, Some("vendor-leads"))
            .await
            .unwrap();

        assert_eq!(receipt.transport, "noop");
        assert!(receipt.accepted_by_sidecar);
        assert!(!receipt.delivered_to_spacetimedb);
    }
}
