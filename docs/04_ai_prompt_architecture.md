# AI Pipeline, LLMs, & Prompt Engineering

This document details the multi-agent AI pipeline, selection matrix for models, prompt architecture, and templates for recipe generation.

---

## 1. The 10-Layer AI Processing Pipeline

Rather than relying on a single large language model call (which suffers from hallucination, schema drift, and high latency), we route requests through a structured 10-layer system:

```
                  +----------------------------------------------+
                  |         Raw User Prompt / Ingredients        |
                  +----------------------------------------------+
                                         |
                                         v
   Layer 1: Intent Detection  =======================> Routes request (Generate, Remix, or Search)
                                         |
                                         v
   Layer 2: Entity Extraction =======================> Extracts ingredients, dietary tags, cook times
                                         |
                                         v
   Layer 3: Ingredient Normalization ==================> Standardizes (e.g., "spuds" -> "russet potato")
                                         |
                                         v
   Layer 4: Nutrition Retrieval =======================> Queries USDA/Nutrient DB for accurate base macros
                                         |
                                         v
   Layer 5: Recipe Planning ===========================> High-level recipe design (SLM / LLM Agent)
                                         |
                                         v
   Layer 6: Recipe Validation =========================> Verification agent (Checks cook times, step counts)
                                         |
                                         v
   Layer 7: Structured JSON Generation ================> Generates schema-valid JSON (Pydantic / Structured Output API)
                                         |
                                         v
   Layer 8: Safety Checking ===========================> Poisonous/Non-edible ingredient check, PII filter
                                         |
                                         v
   Layer 9: Formatting & Clean-up =====================> Removes system thoughts, normalizes units (Metric/Imperial)
                                         |
                                         v
   Layer 10: Streaming Response =======================> SSE (Server-Sent Events) to frontend React client
```

### Layer Details
1. **Intent Detection:** Uses a lightweight SLM (e.g., Llama 3 8B) to classify the user input into: `GenerateRecipe`, `RemixRecipe`, `PantrySearch`, or `Chitchat`.
2. **Entity Extraction:** Parses units, raw ingredient strings, user restrictions, and execution time requirements.
3. **Ingredient Normalization:** Maps arbitrary ingredient names to our canonical taxonomic database (PostgreSQL `ingredients` table) to maintain database cleanliness.
4. **Nutrition Retrieval:** Fetches actual nutritional values for recognized components. The LLM only estimates nutrition for unique culinary preparation steps.
5. **Recipe Planning:** Creates the recipe structure and execution timeline.
6. **Recipe Validation:** An independent agent inspects the plan. If steps do not resolve or if instructions contain logical anomalies (e.g., putting food in the oven before preheating), it returns the plan for adjustment.
7. **Structured JSON Generation:** Restructures the plan using OpenAI's JSON mode or Gemini's structured output schemas.
8. **Safety Checking:** Scans outputs for non-food items, hazardous combinations, or toxic content.
9. **Formatting:** Polishes grammar and formats units to match the user's regional preferences.
10. **Streaming Response:** Yields data incrementally to minimize perceived load times for users.

---

## 2. LLM Selection Matrix

| Layer / Workload | Primary Model | Alternative | Justification |
| :--- | :--- | :--- | :--- |
| **Intent & Entity Extraction** | **Claude 3.5 Haiku** | **Llama 3 8B (vLLM)** | Highly cost-efficient, low latency, and highly structured parsing capabilities. |
| **Recipe Planning & Remixing** | **Claude 3.5 Sonnet** | **GPT-4o** | Unmatched culinary reasoning, complex instruction-following, and natural phrasing. |
| **Recipe Validation & Safety** | **Gemini 1.5 Flash** | **Llama 3 70B** | Large context windows allow fast parallel checks, cross-referencing safety rules at very low costs. |
| **Structured Output Format** | **GPT-4o-mini** | **Mistral Nemo** | Strict JSON schema conformance, high reliability, and low completion cost. |
| **Vector Embeddings** | **text-embedding-3-small** | **Cohere v3 Embed** | High-density vector representations with adjustable output dimensions. |
| **Vector Reranking** | **Cohere Rerank v3** | **BGE Reranker** | Drastically improves retrieval precision for complex multi-ingredient query payloads. |

---

## 3. Prompt Engineering Design Patterns

To ensure consistent outputs, we combine:
* **System Prompts with Strict Personas:** Establishes the agent as an expert system.
* **Few-shot Examples:** Explains structural expectations (especially for the DAG step dependencies).
* **Reflection & Critique Loops:** Internal steps where the agent critiques its own recipe design prior to printing the final output.
* **Function/Tool Calling:** Standardizes calls to database check tools for ingredient verification.

### System Prompt Template (Layer 5: Recipe Planning & Generation)

```
You are an elite, Michelin-star AI Chef Agent. Your role is to generate precise, delicious, and chef-validated recipes based on user inputs.

CONSTRAINTS:
1. All culinary steps must be ordered logically.
2. The steps must be formatted as a Directed Acyclic Graph (DAG), specifying which steps can run in parallel and which have hard dependencies.
3. You must strict-filter for any allergen or exclusion requested by the user. If they request "Gluten-Free", do not include wheat flour, soy sauce (unless tamari), or normal breadcrumbs.
4. Do not include raw Markdown explanation. Output only the raw structured JSON matching the requested schema.

CRITIQUE LOOP (Internal step - do not include in final output):
- Check: Does this recipe contain the requested exclusions?
- Check: Are the cooking step durations realistic?
- Check: Are the equipment requirements aligned with the instructions?
```

### Prompt Input Template (Layer 5)

```json
{
  "user_input": {
    "prompt": "Healthy high-protein lunch under 25 minutes",
    "exclusions": ["peanuts", "shrimp"],
    "dietary_restrictions": ["dairy-free"],
    "available_equipment": ["air fryer", "skillet", "chef knife"]
  },
  "few_shot_examples": [
    {
      "input": "Quick air fryer chicken and broccoli",
      "output_dag_structure": {
        "steps": [
          { "step_id": "step_1", "instruction": "Dice chicken breast into 1-inch cubes.", "duration_seconds": 180, "dependent_step_ids": [] },
          { "step_id": "step_2", "instruction": "Toss chicken in olive oil and seasonings.", "duration_seconds": 120, "dependent_step_ids": ["step_1"] },
          { "step_id": "step_3", "instruction": "Cook chicken in air fryer at 400F.", "duration_seconds": 600, "dependent_step_ids": ["step_2"] }
        ]
      }
    }
  ]
}
```

---

## 4. Structured Output Enforcement (Pydantic Implementation)

By implementing Pydantic models in Python (FastAPI layer), we force the LLM runtime to parse inputs directly into standard schemas.

```python
from pydantic import BaseModel, Field, conlist
from typing import List, Optional

class IngredientSchema(BaseModel):
    name: str = Field(description="Canonical, lowercased name of the ingredient.")
    quantity: float = Field(gt=0, description="Numerical quantity.")
    unit: str = Field(description="Unit of measurement (g, ml, pcs, tbsp, etc.).")
    display_text: str = Field(description="Raw text format (e.g. '3 cloves of garlic, minced').")
    is_optional: bool = Field(default=False)

class NutritionSchema(BaseModel):
    calories: int = Field(ge=0)
    protein_g: float = Field(ge=0.0)
    carbs_g: float = Field(ge=0.0)
    fat_g: float = Field(ge=0.0)
    fiber_g: Optional[float] = Field(default=0.0)
    sodium_mg: Optional[float] = Field(default=0.0)

class CookingStepSchema(BaseModel):
    step_id: str = Field(description="Unique string identifier, e.g., step_1")
    instruction: str = Field(min_length=10)
    duration_seconds: int = Field(ge=0, description="Duration in seconds.")
    dependent_step_ids: List[str] = Field(default_factory=list, description="IDs of steps that must finish before this starts.")
    equipment_required: List[str] = Field(default_factory=list)

class RecipePayload(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(max_length=500)
    prep_time_mins: int = Field(ge=0)
    cook_time_mins: int = Field(ge=0)
    portions: int = Field(default=2, ge=1)
    difficulty: str = Field(regex="^(easy|medium|hard)$")
    cuisine_type: Optional[str] = None
    nutrition: NutritionSchema
    ingredients: List[IngredientSchema]
    steps_dag: List[CookingStepSchema]
```
