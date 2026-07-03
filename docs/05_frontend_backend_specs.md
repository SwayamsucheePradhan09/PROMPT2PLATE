# Frontend, Backend, & Core Algorithms

This document outlines the software engineering patterns (Clean/Hexagonal Architecture), frontend rendering approaches, and detailed algorithms that drive our platform features.

---

## 1. Backend Clean & Hexagonal Architecture

We isolate our core domain logic from framework dependencies, database libraries, and external AI models. This prevents vendor lock-in and facilitates unit testing.

```
                  +-------------------------------------------------+
                  |                 OUTER INFRASTRUCTURE            |
                  |  [GraphQL] [REST API Controllers] [gRPC Adapters] |
                  +-------------------------------------------------+
                                           |
                                           v
                  +-------------------------------------------------+
                  |              APPLICATION PORTS (Interfaces)     |
                  |  [RecipeRepository] [AIService] [EventPublisher]  |
                  +-------------------------------------------------+
                                           |
                                           v
                  +-------------------------------------------------+
                  |              APPLICATION USE CASES              |
                  |  [GenerateRecipeUseCase] [ConsolidateListUseCase] |
                  +-------------------------------------------------+
                                           |
                                           v
                  +-------------------------------------------------+
                  |              DOMAIN MODEL & ENTITIES            |
                  |  [Recipe] [Ingredient] [DAG] [Nutrition]        |
                  +-------------------------------------------------+
```

### Architectural Components
* **Domain Model:** Pure entities containing only the business rules (e.g., a `Recipe` cannot contain allergens if flagged as safe; a `CookingStep` duration cannot be negative).
* **Ports (Interfaces):** Interface definitions specifying how the business logic communicates with external agents (e.g., `db.RecipeRepositoryPort`, `ai.LLMChefPort`).
* **Adapters (Implementation):** Core framework code linking our application to reality (e.g., `PostgresRecipeRepository` implementing the repository port, or `QdrantSearchAdapter` using the search port).
* **CQRS (Command Query Responsibility Segregation):** Separates actions that change state (Commands, handled via Event Sourcing or transactional PostgreSQL) from read operations (Queries, hitting read replicas or ElasticSearch).

---

## 2. Frontend Architecture (Next.js & React)

Our frontend balances rich graphics, responsive animations, and loading speeds.

```
                                  +-----------------------+
                                  |     Next.js Server    |
                                  +-----------------------+
                                    /                   \
                                   / RSC                 \ API Call
                                  v                       v
                      +-----------------------+       +-----------------------+
                      |   Recipe Details Page  |       |   Voice Guide Drawer  |
                      |   (Server Components) |       |   (Client Component)  |
                      +-----------------------+       +-----------------------+
                                  |                               |
                                  v (Static HTML / CSS)           v (Interactive)
                              Edge CDN                      Zustand state / WS
```

### Structural Features
* **React Server Components (RSC):** The recipe view page is a Server Component, pre-rendered at the edge. The page loads instantaneously with zero initial Javascript overhead.
* **Streaming and Suspense:** When generating a recipe, rather than showing a long-loading spinner, the UI streams portions of the data using Server-Sent Events (SSE). The user sees the ingredients, title, and initial steps render progressively.
* **Optimistic UI:** When checking off a shopping list item or editing a meal plan slot, the UI reflects the change instantly (via Zustand and React optimistic states) before the API server confirms.
* **Offline PWA Support:** Built using Workbox and Next-PWA, caching:
  - Global CSS/Javascript assets.
  - Active cooking session parameters (stored in IndexedDB via local state storage).
  - Saved recipes database.
  This allows users to cook in areas with poor internet connection (like kitchens or basements).
* **Accessibility (a11y) & SEO:**
  - Semantic HTML5 tags (`<article>`, `<section>`, `<nav>`, `<header>`).
  - Strict ARIA attributes for dynamic panels (e.g., voice drawer slider).
  - Schema.org markup (Structured JSON-LD Recipes) compiled dynamically on server render to optimize search engine performance.

---

## 3. Mathematical Specifications of Core Algorithms

### A. Meal Planning Optimization (Constraint Satisfaction Problem)
* **Goal:** Generate a 7-day meal plan matching exact calorie target $T$, macro targets $M = \{P, C, F\}$, and allergen exclusions $E$, while minimizing duplicate recipes.
* **Approach:** Depth-First Search with Forward Checking and Backtracking, optimized using Dynamic Programming to solve the subset sum constraints.
* **Complexity:**
  - **Time Complexity:** $O(D \cdot R)$ in typical execution where $D$ is days and $R$ is candidate recipes, thanks to pruning. Worst-case is NP-Complete $O(K^N)$.
  - **Space Complexity:** $O(R)$ for search space caching.

```python
def generate_meal_plan(recipes: List[Recipe], target_calories: int, margins: float = 0.05) -> List[Recipe]:
    # Dynamic Programming subset sum matching recipe calories to target
    dp = [False] * (target_calories + 1)
    dp[0] = True
    recipe_map = {}
    
    for r in recipes:
        for c in range(target_calories, r.calories - 1, -1):
            if dp[c - r.calories]:
                dp[c] = True
                recipe_map[c] = r
                
    # Backtrack to construct the meal set matching target within margin limits
    for target in range(int(target_calories * (1 - margins)), target_calories + 1):
        if dp[target]:
            # Reconstruct selection
            # ...
            return selected_recipes
```

### B. Pantry Optimization (Set Operations)
* **Goal:** Given a set of user ingredients $U$, find recipes where missing ingredients count $M \le K$.
* **Approach:** Inverted index lookup with Bitwise operations.
* **Complexity:**
  - **Time Complexity:** $O(U)$ to generate bitmask, $O(1)$ search lookups.
  - **Space Complexity:** $O(R \cdot I)$ for the index representation where $I$ is average ingredient count.

$$\text{Missing Ingredients } M = R_{\text{ingredients}} \setminus U_{\text{pantry}}$$
$$|M| = |R_{\text{ingredients}}| - |R_{\text{ingredients}} \cap U_{\text{pantry}}|$$

### C. Cooking Steps DAG Scheduler
* **Goal:** Sort steps by dependency constraints and compute critical paths (longest duration sequence) to display parallel cooking tasks.
* **Approach:** **Kahn’s Algorithm** for Topological Sorting, combined with the Critical Path Method (CPM) using dynamic programming.
* **Complexity:**
  - **Time Complexity:** $O(V + E)$ where $V$ is steps and $E$ is dependencies.
  - **Space Complexity:** $O(V)$ for adjacency matrix storage.

```
                 [Step 1: Prep Veggies (180s)] 
                     /                  \
                    /                    \
  [Step 2: Boil Water (600s)]      [Step 3: Sear Chicken (300s)]
                    \                    /
                     \                  /
               [Step 4: Combine & Serve (120s)]
```

* **Execution Order:** Step 1, then parallel Step 2 and Step 3, then Step 4 once both dependees resolve.
* **Critical Path Duration:** $\text{duration}(\text{Step 1}) + \max(\text{duration}(\text{Step 2}), \text{duration}(\text{Step 3})) + \text{duration}(\text{Step 4}) = 180 + 600 + 120 = 900\text{ seconds}$.
