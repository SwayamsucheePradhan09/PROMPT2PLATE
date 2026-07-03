# API Design & JSON Schemas

This document contains standard specifications for the RESTful and gRPC API interfaces, along with production-ready JSON schemas for validation.

---

## 1. API Design (REST & gRPC Contracts)

All client-facing interfaces expose a RESTful HTTPS API. All microservice-to-microservice traffic goes through high-efficiency gRPC channels.

### gRPC Contract: AI Recipe Service (`recipe_generator.proto`)

```protobuf
syntax = "proto3";

package ai.recipe.v1;

option go_package = "prompt2plate/ai/recipe/v1;recipev1";

service RecipeService {
  rpc GenerateRecipe(GenerateRecipeRequest) returns (GenerateRecipeResponse);
  rpc RemixRecipe(RemixRecipeRequest) returns (GenerateRecipeResponse);
  rpc AnalyzeNutrition(AnalyzeNutritionRequest) returns (AnalyzeNutritionResponse);
}

message GenerateRecipeRequest {
  string prompt = 1;
  repeated string inclusions = 2;
  repeated string exclusions = 3;
  repeated string dietary_restrictions = 4;
  int32 max_prep_time_mins = 5;
  string calorie_target_level = 6;
  string user_id = 7;
}

message GenerateRecipeResponse {
  string recipe_id = 1;
  string title = 2;
  string description = 3;
  int32 prep_time_mins = 4;
  int32 cook_time_mins = 5;
  string difficulty = 6;
  repeated Ingredient ingredients = 7;
  Nutrition nutrition = 8;
  repeated CookingStep steps = 9;
  string raw_json = 10;
}

message Ingredient {
  string name = 1;
  double quantity = 2;
  string unit = 3;
  string display_text = 4;
  bool is_optional = 5;
}

message Nutrition {
  int32 calories = 1;
  double protein_g = 2;
  double carbs_g = 3;
  double fat_g = 4;
  double fiber_g = 5;
  double sodium_mg = 6;
  string micronutrients_json = 7;
}

message CookingStep {
  string step_id = 1;
  int32 step_number = 2;
  string instruction = 3;
  int32 duration_seconds = 4;
  repeated string dependent_step_ids = 5;
  repeated string equipment_required = 6;
}

message RemixRecipeRequest {
  string original_recipe_id = 1;
  string modification_prompt = 2; -- e.g. "make it vegan", "double the protein"
  string user_id = 3;
}

message AnalyzeNutritionRequest {
  repeated string raw_ingredients = 1;
  int32 portions = 2;
}

message AnalyzeNutritionResponse {
  Nutrition nutrition = 1;
}
```

---

### REST API Gateway Endpoint Specifications

#### `POST /api/v1/recipes/generate`
Generates an AI-driven customized recipe.
* **Authentication Required:** Yes (JWT Bearer Token)
* **Rate Limits:** 10 requests per minute per IP / User ID.
* **Headers:** `Content-Type: application/json`

##### Request Payload Example
```json
{
  "prompt": "Creamy Tuscan pasta dish",
  "inclusions": ["garlic", "spinach", "sun-dried tomatoes"],
  "exclusions": ["mushrooms"],
  "dietary_restrictions": ["gluten-free"],
  "max_prep_time_mins": 30,
  "calorie_target": 600
}
```

##### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "recipe_id": "c71a3962-d961-46ab-a0f5-4f40f09a15ad",
    "title": "Creamy Gluten-Free Tuscan Pasta",
    "description": "A delicious, dairy-free and gluten-free take on Tuscan pasta with spinach, tomatoes, and cashew cream.",
    "prep_time_mins": 10,
    "cook_time_mins": 15,
    "portions": 2,
    "difficulty": "medium",
    "cuisine_type": "Italian-American",
    "estimated_cost_usd": 12.50,
    "nutrition": {
      "calories": 580,
      "protein_g": 14.50,
      "carbs_g": 72.00,
      "fat_g": 26.00,
      "fiber_g": 6.20,
      "sodium_mg": 480.00
    },
    "ingredients": [
      {
        "name": "gluten-free pasta",
        "quantity": 200,
        "unit": "grams",
        "display_text": "200g gluten-free penne",
        "is_optional": false
      }
    ],
    "steps_dag": [
      {
        "step_id": "step_1",
        "instruction": "Boil salted water and cook gluten-free pasta until al dente.",
        "duration_seconds": 600,
        "dependent_step_ids": [],
        "equipment_required": ["large pot", "strainer"]
      }
    ]
  }
}
```

#### `POST /api/v1/recipes/{id}/remix`
Applies AI modifications to an existing recipe while keeping core steps.
* **Request Payload:** `{ "modification_prompt": "make it dairy free" }`
* **Response Status:** `201 Created` / Standard Recipe payload.

#### `POST /api/v1/pantry/optimize`
Processes user ingredients to return recipe options with minimal missing items.
* **Request Payload:** `{ "pantry_ingredients": ["chicken", "rice", "onions", "soy sauce"] }`
* **Response Status:** `200 OK` / Returns list of matching recipes from relational DB and Vector DB using subset operators.

---

## 2. JSON Validation Schemas

To ensure strict validation and execution, all LLM outputs must be validated against JSON Schema definitions at the gateway before reaching the application core or client.

### A. Core Recipe JSON Schema (`recipe.schema.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Recipe",
  "type": "object",
  "required": [
    "title",
    "description",
    "prep_time_mins",
    "cook_time_mins",
    "portions",
    "difficulty",
    "nutrition",
    "ingredients",
    "steps_dag"
  ],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 3,
      "maxLength": 100
    },
    "description": {
      "type": "string",
      "maxLength": 500
    },
    "prep_time_mins": {
      "type": "integer",
      "minimum": 0
    },
    "cook_time_mins": {
      "type": "integer",
      "minimum": 0
    },
    "portions": {
      "type": "integer",
      "minimum": 1
    },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard"]
    },
    "cuisine_type": {
      "type": "string"
    },
    "estimated_cost_usd": {
      "type": "number",
      "minimum": 0.0
    },
    "nutrition": {
      "$ref": "#/definitions/nutrition"
    },
    "ingredients": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ingredient"
      }
    },
    "steps_dag": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/cooking_step"
      }
    }
  },
  "definitions": {
    "nutrition": {
      "type": "object",
      "required": ["calories", "protein_g", "carbs_g", "fat_g"],
      "properties": {
        "calories": { "type": "integer", "minimum": 0 },
        "protein_g": { "type": "number", "minimum": 0.0 },
        "carbs_g": { "type": "number", "minimum": 0.0 },
        "fat_g": { "type": "number", "minimum": 0.0 },
        "fiber_g": { "type": "number", "minimum": 0.0 },
        "sodium_mg": { "type": "number", "minimum": 0.0 }
      }
    },
    "ingredient": {
      "type": "object",
      "required": ["name", "quantity", "unit", "display_text"],
      "properties": {
        "name": { "type": "string" },
        "quantity": { "type": "number", "minimum": 0.001 },
        "unit": { "type": "string" },
        "display_text": { "type": "string" },
        "is_optional": { "type": "boolean", "default": false }
      }
    },
    "cooking_step": {
      "type": "object",
      "required": ["step_id", "instruction", "duration_seconds", "dependent_step_ids"],
      "properties": {
        "step_id": { "type": "string" },
        "instruction": { "type": "string", "minLength": 10 },
        "duration_seconds": { "type": "integer", "minimum": 0 },
        "dependent_step_ids": {
          "type": "array",
          "items": { "type": "string" }
        },
        "equipment_required": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

---

### B. Substitutions Schema (`substitution.schema.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Substitutions",
  "type": "object",
  "required": ["original_ingredient", "substitutes"],
  "properties": {
    "original_ingredient": {
      "type": "string"
    },
    "substitutes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["ingredient_name", "ratio_multiplier", "cooking_note"],
        "properties": {
          "ingredient_name": { "type": "string" },
          "ratio_multiplier": { 
            "type": "number",
            "description": "Multiply original amount by this value for the substitute"
          },
          "cooking_note": { "type": "string" }
        }
      }
    }
  }
}
```
