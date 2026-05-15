FROM rust:1.95-bookworm AS builder

WORKDIR /app

COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim

RUN useradd --create-home --shell /usr/sbin/nologin appuser

COPY --from=builder /app/target/release/verrow-ingest-api /usr/local/bin/verrow-ingest-api

ENV INGEST_API_BIND_ADDR=0.0.0.0:3010

EXPOSE 3010

USER appuser

CMD ["verrow-ingest-api"]
