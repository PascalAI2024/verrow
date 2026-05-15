use std::{collections::HashMap, io::Cursor};

use csv::{ReaderBuilder, Trim};

use crate::{error::AppError, models::CsvPreview};

pub fn parse_csv_preview(
    bytes: &[u8],
    filename: Option<String>,
    sample_limit: usize,
) -> Result<CsvPreview, AppError> {
    if bytes.is_empty() {
        return Err(AppError::BadRequest("uploaded CSV file is empty".to_string()));
    }

    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .trim(Trim::All)
        .from_reader(Cursor::new(bytes));

    let raw_headers = reader.headers()?.clone();
    let mut warnings = Vec::new();
    let mut seen_headers = HashMap::<String, usize>::new();

    let headers = raw_headers
        .iter()
        .enumerate()
        .map(|(index, header)| {
            let trimmed = header.trim();
            let normalized = if trimmed.is_empty() {
                warnings.push(format!(
                    "Header {} was blank and was renamed to column_{}.",
                    index + 1,
                    index + 1
                ));
                format!("column_{}", index + 1)
            } else {
                trimmed.to_string()
            };

            let duplicate_count = seen_headers.entry(normalized.to_lowercase()).or_default();
            *duplicate_count += 1;
            if *duplicate_count > 1 {
                warnings.push(format!(
                    "Header '{}' appears more than once; mappings should choose the intended source column carefully.",
                    normalized
                ));
            }

            normalized
        })
        .collect::<Vec<_>>();

    if headers.is_empty() {
        return Err(AppError::BadRequest(
            "CSV file must include a header row".to_string(),
        ));
    }

    let mut sample_rows = Vec::new();
    let mut total_rows = 0usize;

    for record in reader.records() {
        let record = record?;
        total_rows += 1;

        if sample_rows.len() < sample_limit {
            let mut row = HashMap::with_capacity(headers.len());
            for (index, header) in headers.iter().enumerate() {
                row.insert(
                    header.clone(),
                    record.get(index).unwrap_or_default().trim().to_string(),
                );
            }
            sample_rows.push(row);
        }
    }

    if total_rows == 0 {
        warnings.push("CSV file contains headers but no data rows.".to_string());
    }

    Ok(CsvPreview {
        filename,
        headers,
        sample_rows,
        sampled_rows: total_rows.min(sample_limit),
        total_rows_observed: total_rows,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_csv_preview;

    #[test]
    fn parses_headers_and_sample_rows() {
        let csv = b"Name,Email\nAda Lovelace,ada@example.com\nGrace Hopper,grace@example.com\n";

        let preview = parse_csv_preview(csv, Some("leads.csv".to_string()), 1).unwrap();

        assert_eq!(preview.headers, vec!["Name", "Email"]);
        assert_eq!(preview.sample_rows.len(), 1);
        assert_eq!(preview.total_rows_observed, 2);
    }
}
