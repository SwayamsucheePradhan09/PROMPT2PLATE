# Feature Roadmap, MVP Plan, & Cost Optimization

This document outlines the product features, MVP rollout schedule, cost optimization measures, and the design logic for our AI features.

---

## 1. 12-Week MVP Development Schedule

We focus on building a robust, high-fidelity core platform in 12 weeks.

```
Weeks 1-2   : Core Architecture, Database Schema, User Identity, Next.js Boilerplate.
Weeks 3-4   : FastAPI AI Pipeline, Layer 1-7 Implementation, Pydantic Schema Validation.
Weeks 5-6   : Vector Search integration (Qdrant), Inverted Index Pantry Search.
Weeks 7-8   : Core UI Views (Recipe, Pantry, Shopping List), Streaming/SSE Integration.
Weeks 9-10  : Background worker integration (Celery/Kafka), Nutrition Engine calibration.
Weeks 11-12 : End-to-End Testing (Playwright), Prometheus dashboards, Cloudflare WAF, Release.
```

---

## 2. Platform Feature Roadmap (Post-MVP Phases)

```
                       +---------------------------------------+
                       |          PHASE 1: FOUNDATION          |
                       | - Dynamic Recipe Generation           |
                       | - Standard Structured Outputs         |
                       | - Inverted Index Pantry Engine        |
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |        PHASE 2: INTELLIGENCE          |
                       | - Voice-Guided Hands-Free Cooking     |
                       | - Real-time Substitution Knowledge    |
                       | - Multi-Modal Image-to-Recipe Engine  |
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |          PHASE 3: ENTERPRISE          |
                       | - AI Nutrition Coach & Meal Planning  |
                       | - Hybrid Vector Search Recommendations|
                       | - Offline-first Cooking PWA           |
                       +---------------------------------------+
```

---

## 3. Real-World AI Features Breakdown & Design

Here is the architectural design for our core AI capabilities:

* **AI Recipe Generator & Recipe Remix:** Customizes and translates recipes. For example, remixing a lasagna recipe to be "vegan and high protein" parses the steps DAG, swaps meat for textured vegetable protein, and adjusts baking temperatures in the instructions.
* **Leftover Generator & Pantry Mode:** The UI takes photos of fridge contents, calls an image-to-recipe model (Gemini 1.5 Flash), extracts ingredients (Layer 2), filters the database for matching recipes, and generates instructions for cooking what's left.
* **Voice-Guided Cooking:** Uses Web Speech API on the client side coupled with a state tracker. The user says "Next step" or "Repeat that", prompting the app to read the corresponding step in the DAG.
* **Ingredient Substitution Engine:** Traverses a weighted knowledge graph to find alternatives based on properties (e.g., binding agents like egg can be replaced by flaxseed meal at a 1:3 ratio for vegan diets).
* **AI Taste Predictor:** Utilizes classification algorithms to score how well flavor compounds pair based on chemical similarity matrices (e.g., recommending pairing white chocolate with caviar due to shared amines).
* **Calorie Optimizer:** Re-computes ingredient portion sizes to match exact target calorie ranges.

---

## 4. Cost Optimization Strategy (LLM & Cloud Infrastructure)

Running a high-traffic AI platform can generate significant API and hosting costs. We mitigate this using a multi-layered optimization strategy:

### A. Semantic Caching via Redis
We cache generated recipes using a semantic vector approach. When a user requests a recipe (e.g., "Keto Italian pasta"), we query the vector cache first. If a highly similar request exists ($>95\%$ similarity threshold), we return the cached JSON, avoiding fresh LLM generation costs.

### B. Router Optimization (SLM vs. LLM)
Rather than routing all requests to expensive models (like GPT-4o or Claude 3.5 Sonnet), we deploy a routing model (Claude 3.5 Haiku):
* Simple tasks (ingredient parsing, unit conversion, formatting) are routed to local SLMs (Llama 3 8B or Mistral 7B hosted on vLLM/K8s).
* Only complex planning and validation steps are routed to frontier models.

```
                              +--------------------------+
                              |    User Request Input    |
                              +--------------------------+
                                           |
                                           v
                              +--------------------------+
                              |   Lightweight Classifier |
                              +--------------------------+
                               /                        \
                       Simple /                          \ Complex
                             v                            v
               +---------------------------+  +---------------------------+
               |  Local SLM (Llama 3 8B)   |  |   Frontier LLM (Sonnet)   |
               |  Cost: $0.15 / M tokens   |  |   Cost: $3.00 / M tokens  |
               +---------------------------+  +---------------------------+
```

### C. Prompt Caching
We structure our prompts to place static parts (system instructions, few-shot examples) at the beginning of the context. This allows providers (OpenAI, Anthropic, Gemini) to apply Prompt Caching discounts, saving up to 50% on input token costs.

### D. Serverless Worker Nodes
We host our ML inference pipelines (e.g., Triton Inference Server for local SLMs) on AWS EKS with GPU-enabled spot instances (e.g., `g5.xlarge`). Autoscale triggers scale down worker nodes to zero during off-peak hours (1 AM to 6 AM local times).
