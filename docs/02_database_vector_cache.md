# Database, Vector Search, & Caching Strategy

This document details the relational database design, vector database integration, caching mechanics, and computational data structures for the platform.

---

## 1. Relational Database Schema (PostgreSQL)

We use a normalized schema for core transactional integrity, while utilizing JSONB fields for highly unstructured, evolving metadata (such as micronutrient breakdowns and system logs).

```sql
-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Identity Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Preferences Table (Denormalized list-based data kept in Arrays/JSONB for speed)
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dietary_restrictions VARCHAR(50)[] DEFAULT '{}', -- vegan, keto, halal, etc.
    allergies VARCHAR(50)[] DEFAULT '{}', -- peanuts, gluten, etc.
    cooking_skill_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    preferred_cuisines VARCHAR(50)[] DEFAULT '{}',
    disliked_ingredients VARCHAR(100)[] DEFAULT '{}',
    daily_calorie_target INT,
    macro_split JSONB DEFAULT '{"carbs": 40, "protein": 30, "fat": 30}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Base Table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time_mins INT NOT NULL DEFAULT 0,
    cook_time_mins INT NOT NULL DEFAULT 0,
    portions INT NOT NULL DEFAULT 2,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine_type VARCHAR(50),
    estimated_cost_usd DECIMAL(10, 2),
    instructions_dag JSONB NOT NULL, -- Directed Acyclic Graph (DAG) for step dependencies
    storage_instructions TEXT,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients Taxonomy Table
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    normalized_name VARCHAR(255) NOT NULL, -- normalized by Entity Extractor layer
    category VARCHAR(100), -- produce, pantry, dairy, etc.
    is_common_allergen BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe-Ingredient Association Table (Many-to-Many with Quantities)
CREATE TABLE recipe_ingredients (
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- grams, ml, pcs, etc.
    display_text VARCHAR(255) NOT NULL, -- exact raw string from recipe
    is_optional BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Recipe Nutrition Table (1-to-1 with Recipes)
CREATE TABLE recipe_nutrition (
    recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    calories INT NOT NULL,
    protein_g DECIMAL(6, 2) NOT NULL,
    carbs_g DECIMAL(6, 2) NOT NULL,
    fat_g DECIMAL(6, 2) NOT NULL,
    fiber_g DECIMAL(6, 2) DEFAULT 0.0,
    sodium_mg DECIMAL(8, 2) DEFAULT 0.0,
    micronutrients JSONB DEFAULT '{}', -- Vitamin A, Iron, Calcium details
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Meal Plans Table
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    servings INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, plan_date, meal_type, recipe_id)
);

-- Shopping List Meta Table
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_start_date DATE,
    target_end_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shopping List Detailed Items (Allows manual overrides, cross-offs, etc.)
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL, -- keeps track of custom manual additions too
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    is_purchased BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Performance & Analytics Tables
CREATE TABLE recipe_ratings (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

-- Active Cooking Sessions (To track real-time voice guidance steps)
CREATE TABLE cooking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    current_step_id VARCHAR(50) NOT NULL,
    state JSONB DEFAULT '{}', -- tracks scaled timers, custom adjustments
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- LLM Semantic & Prompt Cache Table (Indexed for exact cache hits before fallback to Vector DB)
CREATE TABLE prompt_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of consolidated input params
    prompt_raw TEXT NOT NULL,
    response_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- LLM Call Auditing logs
CREATE TABLE llm_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_hash VARCHAR(64),
    tokens_prompt INT NOT NULL,
    tokens_completion INT NOT NULL,
    provider VARCHAR(50) NOT NULL, -- OpenAI, Anthropic, Gemini, DeepSeek, self-hosted
    model VARCHAR(100) NOT NULL,
    latency_ms INT NOT NULL,
    cost_usd DECIMAL(12, 8) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Essential Optimization Indexes
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date);
CREATE INDEX idx_prompt_cache_hash ON prompt_cache(prompt_hash);
```

---

## 2. Vector Database Strategy (Qdrant / Milvus)

To power high-precision semantic recipe search, recommendation engine (similarity queries), and leftover ingredient matching, we deploy a standalone Vector Database. **Qdrant** is our recommended production platform.

### Collection Definition: `recipes_embeddings`

```json
{
  "name": "recipes_embeddings",
  "vector_size": 1536, // Standard dimension for text-embedding-3-small or similar
  "distance": "Cosine",
  "optimizers_config": {
    "default_segment_number": 2
  },
  "hnsw_config": {
    "m": 16,
    "ef_construct": 100
  }
}
```

### Payload Schema (Metadata fields stored with vectors for Real-Time Payload Filtering)

```json
{
  "recipe_id": "uuid-v4-string",
  "difficulty": "medium",
  "cuisine": "Italian",
  "prep_time_mins": 30,
  "dietary_tags": ["vegetarian", "gluten-free"],
  "allergens": ["dairy"],
  "ingredients_list": ["tomato", "basil", "gluten-free pasta", "olive oil"]
}
```

### Filtering Execution Example
A typical issue in vector search is retrieving a highly relevant recipe that the user cannot eat due to allergies. Qdrant solves this by performing **Payload Filtering** during the vector traversal phase, avoiding post-filtering overhead.

```json
// Qdrant Search Query: Find Italian pasta dishes, max 30m prep, NO DAIRY, matching a query vector
{
  "vector": [0.0152, -0.0245, ..., 0.1084],
  "filter": {
    "must": [
      { "key": "cuisine", "match": { "value": "Italian" } },
      { "key": "prep_time_mins", "range": { "lte": 30 } }
    ],
    "must_not": [
      { "key": "allergens", "match": { "value": "dairy" } }
    ]
  },
  "limit": 10
}
```

---

## 3. Caching Strategy (Redis)

We utilize a **Multi-Tier Caching** implementation built on top of **Redis Cluster**.

```
                           +--------------------------------------+
                           |             Edge Request             |
                           +--------------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Edge CDN Cache (Cloudflare)| ===> Hit: Serve immediately (2ms)
                              +-------------------------------+
                                              | Miss
                                              v
                              +-------------------------------+
                              |  Semantic Redis Prompt Cache  | ===> Hit: Return structured JSON (10ms)
                              +-------------------------------+
                                              | Miss
                                              v
                              +-------------------------------+
                              |   Application Database Cache  | ===> Hit: Return raw records (5ms)
                              +-------------------------------+
                                              | Miss
                                              v
                              +-------------------------------+
                              |       LLM / Vector DB         | ===> Process & Write-Through (1.5s - 5s)
                              +-------------------------------+
```

### Cache Invalidation Policies
* **Cache-Aside Pattern:** Standard user profiles, preferences, and recipe details. Lifetime: 24 Hours (`TTL = 86400`). Invalidated immediately when a user updates their profile or a recipe is modified by an author.
* **Semantic Prompt Caching:** Hashed payload inputs mapping directly to structured JSON outputs. Lifetime: 7 Days (`TTL = 604800`). Since ingredient costs and seasonal recipes change slowly, caching structured recipes yields massive savings.
* **Write-Through Caching:** For active cooking sessions. When a step is marked complete, it writes to the Redis cache first, then asynchronously pushes to PostgreSQL via a background task to prevent DB lock queues.
* **Trending & Recommendation Cache:** Warm indexes updated every 2 hours via cron job, storing top recommendations globally or partitioned by dietary tags.

---

## 4. Feature Optimization & Core Data Structures

| Platform Feature | Ideal Data Structure | Time Complexity | Space Complexity | Rationale & Implementation Details |
| :--- | :--- | :--- | :--- | :--- |
| **Recipe Steps Execution** | **Directed Acyclic Graph (DAG)** | $O(V + E)$ topological sort | $O(V + E)$ | Enables parallel step execution (e.g., prep veggies while water boils) and dynamically adjusts timers. |
| **Search Autocomplete** | **Trie** | $O(L)$ where $L$ is query length | $O(\Sigma \cdot N \cdot L)$ | Fast prefix matching for ingredients or recipe titles as user types. |
| **Pantry Matching** | **Inverted Index / Hash Map** | $O(N)$ lookup | $O(M)$ where $M$ is total ingredients | Allows O(1) checks against target recipe requirements using Set Intersection (e.g., `user_ingredients.intersection(recipe_ingredients)`). |
| **Recommendations Engine** | **Similarity Graph / ANN Index** | $O(\log N)$ (HNSW search) | $O(N \cdot D)$ where $D$ is vector dimensions | Approximated Nearest Neighbor (ANN) search inside embedding space to find matching user tastes. |
| **Substitutions** | **Knowledge Graph** | $O(1)$ direct edge lookup | $O(E)$ where $E$ is connections | Traverses substitution classes (e.g., Butter $\xrightarrow{\text{sub:vegan}}$ Coconut Oil) based on weight constraints. |
| **Meal Planning** | **Constraint Satisfaction Problem (CSP)** | $O(d^n)$ worst case, heavily optimized | $O(n)$ | Assigns recipes to meal slots matching constraints: calorie targets, macro ratios, prep time limits. |
| **Grocery List Consolidation** | **Frequency Counter / Hash Map** | $O(I)$ where $I$ is total items | $O(U)$ where $U$ is unique ingredients | Merges similar items across days (e.g., 200g spinach + 100g spinach = 300g spinach under Produce section). |
| **Nutrition Analysis** | **Lookup Table / Matrix Multiplication** | $O(I \cdot C)$ where $C$ is component columns | $O(C)$ | Multiplying quantity vectors by ingredient nutritional profile matrices. |
