# DevOps, Security, & Testing Protocols

This document details the CI/CD pipeline, Kubernetes deployment architecture, comprehensive security guidelines, and testing frameworks for the platform.

---

## 1. DevOps & Deployment Architecture

Our production system runs on a **Multi-Region Kubernetes (EKS / GKE) Cluster** backed by a **Global Content Delivery Network (CDN)**.

```
+---------------------------------------------------------------------------------+
|                                 CLOUDFLARE EDGE                                 |
|          DNS Routing -> CDN Caching -> WAF (Allergen Dictionaries, Rate Limits)  |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                       KUBERNETES INGRESS CONTROLLER (Kong)                      |
|                     SSL Termination & API Endpoint Dispatching                  |
+---------------------------------------------------------------------------------+
                         /               |               \
                        /                |                \
    +----------------------+  +----------------------+  +----------------------+
    |    us-east-1 Pods    |  |    eu-west-1 Pods    |  |    ap-southeast-1    |
    | (Web, Core, Search)  |  | (Web, Core, Search)  |  | (Web, Core, Search)  |
    +----------------------+  +----------------------+  +----------------------+
                        \                |                /
                         \               |               /
+---------------------------------------------------------------------------------+
|                            GLOBAL DATABASE STORAGE LAYER                        |
|   CockroachDB Multi-Region Active-Active / Qdrant Distributed Vector Cluster   |
+---------------------------------------------------------------------------------+
```

### Infrastructure as Code (IaC) Layout

```
/deploy/terraform
├── main.tf
├── variables.tf
├── modules
│   ├── eks (EKS Cluster config with autoscaling nodegroups)
│   ├── rds (PostgreSQL Multi-AZ Aurora DB)
│   ├── redis (AWS ElastiCache Redis Cluster)
│   ├── qdrant (Self-hosted Qdrant cluster on EC2/EBS gp3)
│   └── cloudflare (DNS records, caching configuration rules)
└── outputs.tf
```

---

## 2. Observability & Monitoring Strategy

We collect application metrics, traces, and system logs in real time using **OpenTelemetry** collectors.

### Metric KPI Dashboard Config

* **API Latency (p99 < 150ms):** Tracks response time for all HTTP and gRPC traffic.
* **Error Rate (SLA > 99.9%):** Percentage of requests resulting in `5xx` errors.
* **Prompt Cache Hit Rate (Target > 60%):** Ratio of requests resolved by Redis prompt caching instead of LLM generation.
* **LLM Call Costs & Token Usage:** Real-time billing trackers broken down by service and agent.
* **Semantic Search Precision:** Track user click-through rate (CTR) on vector search matches to monitor drift in embedding model quality.

---

## 3. Production Security Checklist (OWASP Top 10 & LLM Vulnerabilities)

| Vulnerability Class | Hazard Scenario | Production Defensive Control |
| :--- | :--- | :--- |
| **Authentication & Authorization** | Token theft or session interception. | **OAuth2 with PKCE** for PWAs; stateless **JWTs** signed with asymmetric keys (RS256) rotated every 24 hours. |
| **Prompt Injection** | User inputs bypass constraints to output toxic instructions. | **Dual-LLM Guardrail pattern**: Run a fast SLM classifier over raw input strings before sending queries to Layer 5. |
| **PII & Data Leakage** | Users paste personal addresses or health conditions. | **Presidio Analyzer** runs at Layer 2 to redact names, emails, and exact locations before LLM ingestion. |
| **API Abuse & DOS** | Attackers spam the generation API to exhaust LLM budget. | **Sliding Window Rate Limiting** in Kong API Gateway. Strict limits: 10 generations per minute per account. |
| **Dependency Vulnerabilities** | Outdated NPM/Python packages. | **Snyk & Dependabot** integration in CI/CD pipeline blocking builds with high-risk vulnerabilities. |
| **Database Encryption** | Hard drive theft or replica inspection. | **AWS KMS encryption at rest** (AES-256) for DB storage, vector payloads, and Redis backups. |

---

## 4. Platform Testing & Quality Assurance Strategy

### Testing Pyramid

1. **Unit Testing:** Focuses on business domain logic, DAG path validation, and metric conversions. Targets 90%+ coverage.
2. **Integration Testing:** Tests database adapter queries, Redis caching behaviors, and gRPC payload validation.
3. **End-to-End Testing (Playwright):** Runs fully simulated web clients performing user flows (Register $\rightarrow$ Search $\rightarrow$ Select Recipe $\rightarrow$ Cook with Voice $\rightarrow$ Add to Shopping List).

### LLM Evaluation Pipeline (CI/CD Quality Control)

To prevent regression when updating system prompts or switching models, we integrate **Ragas** and **G-Eval** into the release workflow:

```
[System Prompt Change] -> [Run Evals on 100 Golden Recipes] 
                                    |
                                    v
                 +--------------------------------------+
                 |     EVALUATION METRICS CHECK         |
                 | - Hallucination Rate (<2%)           |
                 | - Ingredient Adherence (100%)        |
                 | - JSON Schema Compliance (100%)       |
                 +--------------------------------------+
                                    |
                       +------------+------------+
                       | Pass                    | Fail
                       v                         v
              [Merge & Deploy]             [Block Build]
```

#### Monitored Evaluation Metrics
* **Faithfulness:** Does the generated recipe rely only on user constraints and standard culinary science?
* **Answer Relevance:** Do ingredients match the requested dietary restrictions?
* **DAG Resolvability:** Can a topological sort successfully map out the cooking steps without loops?
