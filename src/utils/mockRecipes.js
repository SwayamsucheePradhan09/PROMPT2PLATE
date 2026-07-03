export const mockRecipes = [
  {
    id: "tuscan-chicken-pasta",
    title: "Creamy Tuscan Chicken Pasta",
    description: "A rich, restaurant-style pasta dish featuring tender seared chicken breast, fresh wilted baby spinach, sun-dried tomatoes, and a creamy cashew cream sauce. High-protein, gluten-free, and customizable.",
    prepTimeMins: 10,
    cookTimeMins: 15,
    portions: 2,
    difficulty: "medium",
    cuisineType: "Italian-American",
    estimatedCostUsd: 12.50,
    nutrition: {
      calories: 620,
      protein: 42,
      carbs: 45,
      fat: 28,
      fiber: 4,
      sodium: 520
    },
    dietaryTags: ["gluten-free", "high-protein"],
    allergens: ["nuts"], // Cashew cream
    ingredients: [
      { name: "chicken breast", quantity: 300, unit: "g", displayText: "300g boneless skinless chicken breast, cubed", category: "meat" },
      { name: "gluten-free pasta", quantity: 150, unit: "g", displayText: "150g gluten-free penne pasta", category: "pantry" },
      { name: "cashew cream", quantity: 120, unit: "ml", displayText: "120ml unsweetened cashew cream (or heavy cream)", category: "dairy-alternative" },
      { name: "spinach", quantity: 100, unit: "g", displayText: "100g fresh baby spinach", category: "produce" },
      { name: "sun-dried tomatoes", quantity: 50, unit: "g", displayText: "50g chopped sun-dried tomatoes", category: "pantry" },
      { name: "garlic", quantity: 3, unit: "cloves", displayText: "3 cloves garlic, minced", category: "produce" },
      { name: "olive oil", quantity: 1, unit: "tbsp", displayText: "1 tbsp extra virgin olive oil", category: "pantry" }
    ],
    stepsDag: [
      {
        stepId: "step_1",
        stepNumber: 1,
        instruction: "Boil a large pot of salted water. Cook the gluten-free penne until al dente.",
        durationSeconds: 600,
        dependentStepIds: [],
        equipmentRequired: ["large pot", "strainer"]
      },
      {
        stepId: "step_2",
        stepNumber: 2,
        instruction: "Slice the chicken breast into 1-inch bite-sized cubes. Season with salt and black pepper.",
        durationSeconds: 180,
        dependentStepIds: [],
        equipmentRequired: ["chef knife", "cutting board"]
      },
      {
        stepId: "step_3",
        stepNumber: 3,
        instruction: "Mince the garlic and roughly chop the sun-dried tomatoes.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: ["chef knife", "cutting board"]
      },
      {
        stepId: "step_4",
        stepNumber: 4,
        instruction: "Heat olive oil in a large skillet over medium-high heat. Sear the chicken cubes until golden and cooked through.",
        durationSeconds: 300,
        dependentStepIds: ["step_2"],
        equipmentRequired: ["large skillet", "tongs"]
      },
      {
        stepId: "step_5",
        stepNumber: 5,
        instruction: "Reduce heat to medium. Add the minced garlic and chopped sun-dried tomatoes to the chicken skillet, sautéing until fragrant.",
        durationSeconds: 120,
        dependentStepIds: ["step_3", "step_4"],
        equipmentRequired: ["large skillet", "wooden spoon"]
      },
      {
        stepId: "step_6",
        stepNumber: 6,
        instruction: "Stir cashew cream (or heavy cream) into the skillet, bringing it to a simmer. Fold in baby spinach and cook until wilted.",
        durationSeconds: 180,
        dependentStepIds: ["step_5"],
        equipmentRequired: ["large skillet"]
      },
      {
        stepId: "step_7",
        stepNumber: 7,
        instruction: "Drain cooked pasta. Toss pasta directly into the chicken cream sauce skillet. Mix thoroughly and serve warm.",
        durationSeconds: 120,
        dependentStepIds: ["step_1", "step_6"],
        equipmentRequired: ["large skillet", "serving tongs"]
      }
    ]
  },
  {
    id: "keto-avocado-salmon-bowl",
    title: "Keto Avocado Salmon Bowl",
    description: "A superfood bowl loaded with heart-healthy omega-3s. Crispy pan-seared salmon served alongside rich sliced avocado, cooling cucumbers, and a savory sesame tamari drizzle. Perfect low-carb fuel.",
    prepTimeMins: 10,
    cookTimeMins: 10,
    portions: 1,
    difficulty: "easy",
    cuisineType: "Asian-Fusion",
    estimatedCostUsd: 15.00,
    nutrition: {
      calories: 550,
      protein: 38,
      carbs: 8,
      fat: 40,
      fiber: 5,
      sodium: 480
    },
    dietaryTags: ["low-carb", "keto", "gluten-free", "dairy-free"],
    allergens: [],
    ingredients: [
      { name: "salmon", quantity: 180, unit: "g", displayText: "180g fresh salmon fillet, skin-on", category: "meat" },
      { name: "avocado", quantity: 1, unit: "pc", displayText: "1 ripe Hass avocado, sliced", category: "produce" },
      { name: "cucumber", quantity: 0.5, unit: "pc", displayText: "1/2 English cucumber, sliced", category: "produce" },
      { name: "sesame seeds", quantity: 1, unit: "tsp", displayText: "1 tsp toasted sesame seeds", category: "pantry" },
      { name: "soy sauce", quantity: 1, unit: "tbsp", displayText: "1 tbsp gluten-free tamari (soy sauce)", category: "pantry" },
      { name: "olive oil", quantity: 1, unit: "tbsp", displayText: "1 tbsp olive oil", category: "pantry" }
    ],
    stepsDag: [
      {
        stepId: "step_1",
        stepNumber: 1,
        instruction: "Chop the English cucumber into thin half-moons and slice the ripe avocado lengthways.",
        durationSeconds: 180,
        dependentStepIds: [],
        equipmentRequired: ["chef knife", "cutting board"]
      },
      {
        stepId: "step_2",
        stepNumber: 2,
        instruction: "Pat salmon dry with a paper towel. Season both sides with a pinch of sea salt.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: ["paper towels"]
      },
      {
        stepId: "step_3",
        stepNumber: 3,
        instruction: "Heat olive oil in a non-stick skillet over medium-high heat. Sear salmon skin-side down until the skin is extra crispy.",
        durationSeconds: 300,
        dependentStepIds: ["step_2"],
        equipmentRequired: ["non-stick skillet", "fish spatula"]
      },
      {
        stepId: "step_4",
        stepNumber: 4,
        instruction: "Carefully flip the salmon and cook the flesh side until cooked to medium-rare.",
        durationSeconds: 120,
        dependentStepIds: ["step_3"],
        equipmentRequired: ["non-stick skillet", "fish spatula"]
      },
      {
        stepId: "step_5",
        stepNumber: 5,
        instruction: "Assemble the bowl by placing cucumber and avocado at the base. Top with the seared salmon fillet. Drizzle with gluten-free tamari and sprinkle with toasted sesame seeds.",
        durationSeconds: 120,
        dependentStepIds: ["step_1", "step_4"],
        equipmentRequired: ["serving bowl"]
      }
    ]
  },
  {
    id: "vegan-quinoa-buddha-bowl",
    title: "Vegan Quinoa Buddha Bowl",
    description: "An antioxidant-rich, colorful vegan bowl composed of cooked organic quinoa, roasted sweet potatoes, crispy spiced chickpeas, and raw baby spinach, all tied together by a creamy garlic-tahini-lemon dressing.",
    prepTimeMins: 10,
    cookTimeMins: 15,
    portions: 2,
    difficulty: "easy",
    cuisineType: "Mediterranean",
    estimatedCostUsd: 8.50,
    nutrition: {
      calories: 480,
      protein: 16,
      carbs: 65,
      fat: 18,
      fiber: 11,
      sodium: 390
    },
    dietaryTags: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    allergens: ["sesame"], // Tahini
    ingredients: [
      { name: "quinoa", quantity: 100, unit: "g", displayText: "100g organic white quinoa", category: "pantry" },
      { name: "chickpeas", quantity: 240, unit: "g", displayText: "1 can (240g drained) chickpeas", category: "pantry" },
      { name: "sweet potato", quantity: 1, unit: "large", displayText: "1 large sweet potato, cubed", category: "produce" },
      { name: "spinach", quantity: 80, unit: "g", displayText: "80g fresh baby spinach", category: "produce" },
      { name: "tahini", quantity: 2, unit: "tbsp", displayText: "2 tbsp organic tahini (sesame paste)", category: "pantry" },
      { name: "lemon juice", quantity: 1, unit: "tbsp", displayText: "1 tbsp fresh lemon juice", category: "produce" },
      { name: "olive oil", quantity: 2, unit: "tbsp", displayText: "2 tbsp olive oil", category: "pantry" }
    ],
    stepsDag: [
      {
        stepId: "step_1",
        stepNumber: 1,
        instruction: "Rinse quinoa in cold water. Bring quinoa and 200ml water to a boil in a pot. Simmer on low heat until fully cooked and water is absorbed.",
        durationSeconds: 720,
        dependentStepIds: [],
        equipmentRequired: ["saucepot", "fine mesh strainer"]
      },
      {
        stepId: "step_2",
        stepNumber: 2,
        instruction: "Dice the sweet potato into 1/2-inch cubes. Toss with 1 tbsp olive oil, salt, and smoked paprika.",
        durationSeconds: 180,
        dependentStepIds: [],
        equipmentRequired: ["chef knife", "cutting board", "mixing bowl"]
      },
      {
        stepId: "step_3",
        stepNumber: 3,
        instruction: "Preheat air fryer to 400°F (200°C) and air-fry the sweet potato cubes until crispy and tender.",
        durationSeconds: 900,
        dependentStepIds: ["step_2"],
        equipmentRequired: ["air fryer"]
      },
      {
        stepId: "step_4",
        stepNumber: 4,
        instruction: "Drain, rinse, and thoroughly dry the canned chickpeas. Toss with spices and 1 tbsp olive oil.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: ["strainer", "paper towels"]
      },
      {
        stepId: "step_5",
        stepNumber: 5,
        instruction: "Pan-fry chickpeas in a hot skillet until crispy and slightly browned.",
        durationSeconds: 300,
        dependentStepIds: ["step_4"],
        equipmentRequired: ["skillet", "spatula"]
      },
      {
        stepId: "step_6",
        stepNumber: 6,
        instruction: "Whisk the tahini, fresh lemon juice, a pinch of garlic powder, and 2 tbsp warm water together until smooth and creamy.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: ["small whisk", "prep bowl"]
      },
      {
        stepId: "step_7",
        stepNumber: 7,
        instruction: "Assemble the bowl: Scoop quinoa, roasted sweet potatoes, crispy chickpeas, and raw baby spinach side-by-side. Drizzle tahini dressing on top.",
        durationSeconds: 120,
        dependentStepIds: ["step_1", "step_3", "step_5", "step_6"],
        equipmentRequired: ["large serving bowls"]
      }
    ]
  },
  {
    id: "steak-garlic-asparagus",
    title: "High-Protein Steak & Asparagus",
    description: "Premium pan-seared Ribeye steak cooked with basted garlic butter, paired with fresh, crisp pan-fried green asparagus. Clean, pure nutrition optimized for keto and low-carb energy.",
    prepTimeMins: 5,
    cookTimeMins: 10,
    portions: 1,
    difficulty: "medium",
    cuisineType: "American",
    estimatedCostUsd: 22.00,
    nutrition: {
      calories: 680,
      protein: 52,
      carbs: 6,
      fat: 48,
      fiber: 2,
      sodium: 580
    },
    dietaryTags: ["low-carb", "keto", "gluten-free"],
    allergens: ["dairy"], // Butter
    ingredients: [
      { name: "ribeye steak", quantity: 250, unit: "g", displayText: "250g Grass-fed Ribeye steak, thick-cut", category: "meat" },
      { name: "asparagus", quantity: 150, unit: "g", displayText: "150g fresh green asparagus spears", category: "produce" },
      { name: "butter", quantity: 30, unit: "g", displayText: "30g unsalted grass-fed butter", category: "dairy" },
      { name: "garlic", quantity: 2, unit: "cloves", displayText: "2 cloves garlic, crushed", category: "produce" },
      { name: "olive oil", quantity: 1, unit: "tbsp", displayText: "1 tbsp high-heat cooking oil", category: "pantry" }
    ],
    stepsDag: [
      {
        stepId: "step_1",
        stepNumber: 1,
        instruction: "Wash asparagus and trim off the woody bottom ends. Peel and crush the garlic cloves.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: ["chef knife", "cutting board"]
      },
      {
        stepId: "step_2",
        stepNumber: 2,
        instruction: "Bring the steak to room temperature. Season aggressively with coarse sea salt and freshly cracked black pepper.",
        durationSeconds: 120,
        dependentStepIds: [],
        equipmentRequired: []
      },
      {
        stepId: "step_3",
        stepNumber: 3,
        instruction: "Heat a heavy cast-iron skillet on high heat until smoking. Add cooking oil, then sear the steak for 2 minutes on one side to build a dark crust.",
        durationSeconds: 120,
        dependentStepIds: ["step_2"],
        equipmentRequired: ["cast iron skillet", "tongs"]
      },
      {
        stepId: "step_4",
        stepNumber: 4,
        instruction: "Flip the steak. Add butter and crushed garlic. Spoon the melted, bubbling butter over the steak continuously to baste.",
        durationSeconds: 180,
        dependentStepIds: ["step_3"],
        equipmentRequired: ["cast iron skillet", "large spoon", "tongs"]
      },
      {
        stepId: "step_5",
        stepNumber: 5,
        instruction: "Remove the steak from the skillet and set it on a board to rest. Toss asparagus spears directly in the remaining steak-butter pan juices, frying until bright green.",
        durationSeconds: 240,
        dependentStepIds: ["step_1", "step_4"],
        equipmentRequired: ["cast iron skillet", "tongs"]
      },
      {
        stepId: "step_6",
        stepNumber: 6,
        instruction: "Slice the rested steak. Plate it next to the butter-sauteed asparagus and serve immediately.",
        durationSeconds: 120,
        dependentStepIds: ["step_5"],
        equipmentRequired: ["cutting board", "carving knife", "serving plate"]
      }
    ]
  }
];
