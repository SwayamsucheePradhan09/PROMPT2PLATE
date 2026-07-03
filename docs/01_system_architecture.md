# System Architecture & Tech Stack Specifications

This document outlines the high-level architecture, tech stack decisions, and the scaling progression for **Prompt2Plate**—a production-grade, AI-powered Recipe Platform.

---

## 1. High-Level Enterprise Architecture Diagram

The system uses a **Hexagonal / Clean Architecture** approach, with an **Event-Driven & CQRS core** to separate read-heavy queries (search, recommendations) from write-heavy commands (recipe creation, session logs, meal planner updates).

```mermaid
graph TD
    %% Clients & CDN
    Client[Web/Mobile Client (PWA/Next.js)] -->|HTTPS / WSS| CDN[Cloudflare CDN / Edge WAF]
    CDN -->|Load Balanced Traffic| APIGW[API Gateway / Reverse Proxy: Kong / Envoy]

    %% API Gateway to Microservices
    APIGW -->|GraphQL / REST / gRPC| AuthService[Identity & Auth Service: OAuth2 / OIDC]
    APIGW -->|gRPC / Event Broker| CoreService[Core Recipe Service: NestJS / Go]
    APIGW -->|gRPC / REST| AIService[AI Chef Engine: FastAPI]
    APIGW -->|gRPC| SearchService[Hybrid Search Service: Go]

    %% Caching Layer
    CoreService -->|Cache Aside / Write Through| RedisCluster[(Redis Cluster: Sessions, Caching, Prompt Cache)]
    AIService -->|Cache Lookup| RedisCluster
    SearchService -->|Cache Lookup| RedisCluster

    %% Databases & Search Index
    CoreService -->|Write Core Data| PrimaryDB[(PostgreSQL Primary: Users, Plans, Recipes)]
    PrimaryDB -->|Change Data Capture: Debezium| Kafka[Apache Kafka Message Broker]
    
    %% Async Vector & Search Index Sync
    Kafka -->|Consumer: Index Sync| SearchService
    SearchService -->|Vector Search & Hybrid BM25| VectorDB[(Qdrant / Milvus Vector Database)]
    SearchService -->|Text / Facet Search| SearchDB[(ElasticSearch / OpenSearch)]

    %% Async Background Workers
    Kafka -->|Trigger Jobs| CeleryWorkers[Distributed Workers: Celery / Go Workers]
    CeleryWorkers -->|Nutrition Calculations| NutritionEngine[Nutrition & Ingredient intelligence Engine]
    CeleryWorkers -->|AI Agent Runs (Long Tasks)| AIService

    %% Analytics & Observability
    CoreService & AIService & SearchService -->|Logs & Traces| OpenTelemetry[OpenTelemetry Collector]
    OpenTelemetry -->|Metrics| Prometheus[(Prometheus)] --> Grafana[Grafana Dashboards]
    OpenTelemetry -->|Distributed Tracing| Jaeger[Jaeger / Tempo]
    OpenTelemetry -->|Structured Logs| Loki[Grafana Loki / ELK]
```

---

## 2. Platform Scaling Evolution (10 to 10M Users)

To achieve a production-grade infrastructure, we must avoid over-engineering at Day 1 while ensuring a clear, non-disruptive migration path as load increases.

| User Scale | Core Focus | Architecture Style | Database Strategy | Caching Strategy | AI/LLM Integration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **10 - 1,000** | Speed to market, low cost, simplicity | **Monolith** (FastAPI / NestJS single instance) | Single PostgreSQL instance (RDS db.t3.medium). | In-memory Cache / Single Redis instance for session state. | Direct synchronous calls to OpenAI/Claude API. |
| **1,000 - 100,000** | Redundancy, decoupling background jobs | **Decoupled Monolith** (Separation of HTTP handlers from background tasks via Celery/Redis) | Read/Write replica separation in PostgreSQL (RDS db.m5.large + Read Replica). | Redis Cluster for caching lookup tables, SQL queries, and serialized JSON outputs. | Semantic Prompt Caching in Redis; asynchronous LLM processing via job queue. |
| **100,000 - 1M** | Horizontal scaling, domain boundaries | **Service-Oriented Monolith or Microservices** (Core, AI, Search, Auth separated) | PgBouncer for connection pooling; Partitioning of SQL tables by `user_id`/`date`. Introduction of a dedicated Vector DB (Qdrant). | Redis Multi-AZ Cluster; CDN caching for static assets and public recipe queries. | Hybrid LLM router (LLM Gateway: LiteLLM or custom) targeting cheaper/faster SLMs vs frontier LLMs. |
| **1M - 10M+** | High availability, sub-millisecond search, geo-replication | **Global Distributed Microservices** (Event-driven with Kafka and gRPC communication) | Multi-Region PostgreSQL cluster (e.g., CockroachDB or AWS Aurora Global) + sharded Vector Database cluster. | Multi-tier Caching (L1 Local Memory + L2 Shared Redis Cluster + L3 Edge CDN Cache). | Local fine-tuned SLMs hosted on Kubernetes (vLLM / Triton Server) for ingredient parsing and safety checking; agent parallelization. |

---

## 3. Backend Stack Comparison & Recommendation

### Comparison Matrix

| Stack | Performance | Developer Velocity | Ecosystem (AI/ML) | Memory Footprint | Concurrency Model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FastAPI (Python)** | Moderate | **High** | **Excellent (Native)** | Moderate | Async/Await (Single-threaded event loop) |
| **NestJS (TypeScript)** | Moderate | High | Good (JS libraries) | High (V8 Engine) | Event Loop (Single-threaded event loop) |
| **Go** | **High** | Moderate | Poor (Requires Python/gRPC bindings) | **Low** | Goroutines (CSP-based concurrency) |
| **Rust** | **Extremely High** | Low | Poor (Immature ML bindings) | **Very Low** | Async/Await (M:N threading engine) |
| **Django (Python)** | Low | High | Excellent | High | Synchronous (Typically WSGI/ASGI) |

### Recommendation
* **Primary Core Platform Backend:** **Go** or **NestJS**. Go is selected for high-throughput, low latency, and highly concurrency-driven microservices (like the Gateway and Search Service).
* **AI & Inference Orchestration Service:** **FastAPI**. FastAPI is mandatory for any direct machine learning integrations, LangChain/LlamaIndex usage, vector formatting, and data parsing pipelines due to the native Python ML ecosystem.
* **Service Communication:** **gRPC** for internal service-to-service communication; **GraphQL/REST** at the API Gateway level for clients.

---

## 4. Infrastructure & Middleware Recommendation

* **API Gateway: Kong or Envoy**. Kong provides excellent plugin systems for OAuth2 token validation, rate-limiting, and request routing at low latencies.
* **Database: PostgreSQL (with pgvector)**. Provides relational integrity for users, plans, and recipes, and handles basic vector indexes before full scaling is needed.
* **Vector Database: Qdrant**. Qdrant provides extremely fast ANN search, supports payload filtering natively (e.g., filtering recipes by allergen tags *during* vector search), and has high memory efficiency.
* **Message Broker: Kafka**. Essential for Event-Driven Architecture (EDA). It ensures that when a recipe is added, updated, or rated, other components (Search Index, Nutrition Engine, Recommendation Engine) react asynchronously.
* **Caching Layer: Redis Enterprise / Redis Cluster**. Used for session state, API response caching, vector search metadata, and LLM prompt caching.

---

## 5. Frontend Stack Recommendation

### Architecture
We recommend a **Next.js (App Router) App** utilizing React Server Components (RSC) and React Server Actions for premium user experience.

### Key Technologies
* **React Server Components (RSC):** Render content on the server close to the database and CDN edge, producing instantaneous First Contentful Paint (FCP) and maximizing SEO value.
* **Client Components with Framer Motion (Motion):** Native-like micro-animations, layout transitions, and fluid interactions (e.g., drag-and-drop meal planning).
* **Styling: Vanilla CSS & CSS Modules (or CSS-in-JS like Vanilla Extract):** Provides strict control over performance and eliminates CSS bloating. Avoids runtime CSS overhead.
* **UI Components: Shadcn UI (Radix UI Primitives):** Unstyled components allowing full accessibility compliance (WCAG 2.1 AA) and custom visual treatments.
* **State Management: Zustand:** A lightweight, performance-focused client state manager for UI state (e.g., voice cooking drawer state, grocery lists).
* **Streaming & Suspense:** Stream recipe steps and nutritional breakdown to the frontend incrementally as they are processed by the backend.

---

## 6. Directory/Folder Structure

To support Clean Architecture, the project structure is split into frontend, backend core, backend AI engine, and infrastructure deployments.

```
/prompt2plate
├── apps
│   ├── web (Next.js PWA Client)
│   │   ├── src
│   │   │   ├── app (App Router paths: /recipe, /meal-plan, etc.)
│   │   │   ├── components (Reusable UI components)
│   │   │   ├── hooks (Client React hooks)
│   │   │   ├── store (Zustand client states)
│   │   │   └── styles (Global themes and component styling)
│   │   └── package.json
│   │
│   ├── core-api (Go / NestJS Business Logic)
│   │   ├── src
│   │   │   ├── domain (Entities, Value Objects, Domain Events)
│   │   │   ├── application (Use Cases, Commands, Queries, Ports)
│   │   │   ├── infrastructure (Adapters: DB, Kafka, REST/gRPC endpoints)
│   │   │   └── main.go
│   │   └── go.mod
│   │
│   └── ai-engine (FastAPI Agentic Service)
│       ├── app
│       │   ├── agents (Recipe Agent, Nutrition Agent, Planning Agent)
│       │   ├── core (Config, Safety filters, Vector utilities)
│       │   ├── schemas (Pydantic models for Structured Outputs)
│       │   └── main.py
│       └── requirements.txt
│
├── deploy (DevOps & Infrastructure)
│   ├── terraform (AWS / GCP Infra as Code)
│   ├── docker-compose.yml
│   └── k8s (Kubernetes manifests: deployments, services, ingress)
│
└── package.json
```
