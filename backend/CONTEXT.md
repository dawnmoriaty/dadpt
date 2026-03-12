# Backend Context

## Purpose
Go backend for bus ticketing: REST API, auth, trips, bookings, and integration with AI agent.

## Entry Points
- `cmd/app/main.go`: application bootstrap.
- `internals/server/http/server.go`: HTTP router registration.
- `internals/aiagent/controller/http/handler.go`: `/api/v1/ai/chat` + `/api/v1/ai/sync`.

## Core Domains
- `internals/trip`: trip search + management.
- `internals/booking`: booking lifecycle + expiration worker.
- `internals/location`, `internals/provider`, `internals/bus`, `internals/bustype`.
- `internals/auth`: login/register, JWT.

## Packages (pkgs)
- `pkgs/aiagent`: gRPC client for AI service (Chat/SyncData).
- `pkgs/grpc`: shared gRPC connection wrapper.
- `pkgs/middlewares`: auth + request middlewares.
- `pkgs/response`: standard API response format.
- `pkgs/logger`: structured logging.
- `pkgs/rabbitmq`: message broker connection.

## AI Integration
- Backend calls AI service over gRPC (`/aiagent.AIAgentService/*`).
- `/api/v1/ai/chat` and `/api/v1/ai/sync` proxy to AI service.

## Data / SQL
- Schema: `sql/schema/001_initial_schema.sql`.
- Queries: `sql/queries/*.sql` (sqlc-generated in `sql/models`).
