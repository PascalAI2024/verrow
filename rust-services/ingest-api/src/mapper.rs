use std::collections::HashMap;

use crate::models::{LeadField, MappingAlternative, MappingSuggestion};

pub fn suggest_mappings(
    headers: &[String],
    sample_rows: &[HashMap<String, String>],
) -> Vec<MappingSuggestion> {
    headers
        .iter()
        .map(|header| suggest_column(header, sample_rows))
        .collect()
}

fn suggest_column(header: &str, sample_rows: &[HashMap<String, String>]) -> MappingSuggestion {
    let mut candidates = Vec::new();
    let normalized = normalize_header(header);

    for &field in LeadField::all() {
        let mut score = header_score(&normalized, field);
        let mut reason = Vec::new();

        if score > 0.0 {
            reason.push("header label matches known Verrow lead fields".to_string());
        }

        let sample_score = sample_score(header, sample_rows, field);
        if sample_score > 0.0 {
            score = (score + sample_score).min(0.99);
            reason.push("sample values match expected data patterns".to_string());
        }

        if score > 0.0 {
            candidates.push((field, score, reason));
        }
    }

    candidates.sort_by(|left, right| right.1.total_cmp(&left.1));

    let alternatives = candidates
        .iter()
        .skip(1)
        .take(3)
        .map(|(field, confidence, _)| MappingAlternative {
            target_field: *field,
            confidence: round_confidence(*confidence),
        })
        .collect::<Vec<_>>();

    let (suggested_field, confidence, reason) =
        if let Some((field, confidence, reason_parts)) = candidates.first() {
            if *confidence >= 0.35 {
                (
                    Some(*field),
                    round_confidence(*confidence),
                    reason_parts.join("; "),
                )
            } else {
                (None, round_confidence(*confidence), "low-confidence match".to_string())
            }
        } else {
            (None, 0.0, "no heuristic match found".to_string())
        };

    MappingSuggestion {
        source_column: header.to_string(),
        suggested_field,
        confidence,
        reason,
        alternatives,
    }
}

fn header_score(normalized: &str, field: LeadField) -> f32 {
    let tokens = normalized
        .split_whitespace()
        .map(str::to_string)
        .collect::<Vec<_>>();

    match field {
        LeadField::FullName => {
            exact_or_contains(normalized, &["name", "full name", "contact name"], 0.88, 0.68)
        }
        LeadField::FirstName => exact_or_contains(
            normalized,
            &["first", "first name", "firstname", "given name"],
            0.92,
            0.72,
        ),
        LeadField::LastName => exact_or_contains(
            normalized,
            &["last", "last name", "lastname", "surname", "family name"],
            0.92,
            0.72,
        ),
        LeadField::Email => exact_or_contains(
            normalized,
            &["email", "e mail", "email address", "mail"],
            0.96,
            0.75,
        ),
        LeadField::Phone => exact_or_contains(
            normalized,
            &["phone", "mobile", "cell", "telephone", "tel"],
            0.93,
            0.72,
        ),
        LeadField::Company => exact_or_contains(
            normalized,
            &[
                "company",
                "business",
                "organization",
                "organisation",
                "account",
            ],
            0.91,
            0.7,
        ),
        LeadField::JobTitle => exact_or_contains(
            normalized,
            &["title", "job title", "role", "position", "occupation"],
            0.9,
            0.69,
        ),
        LeadField::Website => {
            exact_or_contains(normalized, &["website", "web site", "url", "domain"], 0.92, 0.7)
        }
        LeadField::Industry => {
            exact_or_contains(normalized, &["industry", "sector", "vertical"], 0.9, 0.7)
        }
        LeadField::Address => exact_or_contains(
            normalized,
            &["address", "street", "street address", "mailing address"],
            0.9,
            0.68,
        ),
        LeadField::City => exact_or_contains(normalized, &["city", "town"], 0.91, 0.68),
        LeadField::State => exact_or_contains(normalized, &["state", "province", "region"], 0.91, 0.68),
        LeadField::PostalCode => exact_or_contains(
            normalized,
            &["zip", "zipcode", "zip code", "postal", "postal code"],
            0.94,
            0.72,
        ),
        LeadField::Country => exact_or_contains(normalized, &["country", "nation"], 0.9, 0.68),
        LeadField::LinkedinUrl => exact_or_contains(
            normalized,
            &["linkedin", "linkedin url", "linked in"],
            0.95,
            0.78,
        ),
        LeadField::Source => exact_or_contains(normalized, &["source", "lead source", "origin", "campaign"], 0.88, 0.66),
        LeadField::Notes => exact_or_contains(normalized, &["notes", "note", "comments", "description"], 0.84, 0.62),
        LeadField::LeadType => exact_or_contains(
            normalized,
            &["lead type", "category", "type", "classification"],
            0.86,
            0.62,
        ),
    }
    .min(if tokens.iter().any(|token| token == "company") && field == LeadField::FullName {
        0.2
    } else {
        1.0
    })
}

fn exact_or_contains(normalized: &str, terms: &[&str], exact: f32, contains: f32) -> f32 {
    if terms.iter().any(|term| normalized == *term) {
        return exact;
    }

    if terms.iter().any(|term| normalized.contains(term)) {
        return contains;
    }

    0.0
}

fn sample_score(
    header: &str,
    sample_rows: &[HashMap<String, String>],
    field: LeadField,
) -> f32 {
    let values = sample_rows
        .iter()
        .filter_map(|row| row.get(header))
        .filter(|value| !value.trim().is_empty())
        .collect::<Vec<_>>();

    if values.is_empty() {
        return 0.0;
    }

    let matching = values
        .iter()
        .filter(|value| match field {
            LeadField::Email => looks_like_email(value),
            LeadField::Phone => looks_like_phone(value),
            LeadField::Website | LeadField::LinkedinUrl => looks_like_url(value),
            LeadField::PostalCode => looks_like_postal_code(value),
            LeadField::FullName => looks_like_person_name(value),
            _ => false,
        })
        .count();

    let ratio = matching as f32 / values.len() as f32;
    if ratio >= 0.8 {
        0.25
    } else if ratio >= 0.5 {
        0.15
    } else if ratio > 0.0 {
        0.05
    } else {
        0.0
    }
}

fn normalize_header(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());
    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            normalized.push(character.to_ascii_lowercase());
        } else {
            normalized.push(' ');
        }
    }

    normalized
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn looks_like_email(value: &str) -> bool {
    let value = value.trim();
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };

    !local.is_empty() && domain.contains('.') && !domain.ends_with('.')
}

fn looks_like_phone(value: &str) -> bool {
    let digits = value
        .chars()
        .filter(|character| character.is_ascii_digit())
        .count();
    (7..=15).contains(&digits)
}

fn looks_like_url(value: &str) -> bool {
    let lower = value.trim().to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("www.")
        || lower.contains("linkedin.com/")
}

fn looks_like_postal_code(value: &str) -> bool {
    let value = value.trim();
    let digit_count = value.chars().filter(|character| character.is_ascii_digit()).count();
    digit_count == 5 || digit_count == 9
}

fn looks_like_person_name(value: &str) -> bool {
    let parts = value
        .split_whitespace()
        .filter(|part| part.chars().any(|character| character.is_ascii_alphabetic()))
        .count();
    (2..=4).contains(&parts)
}

fn round_confidence(value: f32) -> f32 {
    (value * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::suggest_mappings;

    #[test]
    fn suggests_email_from_header_and_sample_values() {
        let headers = vec!["contact_email".to_string()];
        let rows = vec![std::collections::HashMap::from([(
            "contact_email".to_string(),
            "ada@example.com".to_string(),
        )])];

        let suggestions = suggest_mappings(&headers, &rows);

        assert_eq!(
            suggestions[0].suggested_field,
            Some(crate::models::LeadField::Email)
        );
        assert!(suggestions[0].confidence > 0.8);
    }
}
