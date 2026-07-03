import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, Sparkles, Calendar, Search, ShoppingCart, Play, Check, 
  RotateCcw, Plus, Clock, Coins, Flame, Trash2, Volume2, Mic, CheckSquare, 
  HelpCircle, User, Award, Shield, AlertTriangle, LogOut, Key, Mail, Edit3, ArrowRight
} from 'lucide-react';
import { mockRecipes, ingredientDatabase } from './utils/mockRecipes';

// Helper to calculate calories dynamically based on ingredient name, quantity, and unit
const getIngredientCalories = (name, quantity, unit) => {
  const normName = name.toLowerCase().trim();
  const dbItem = ingredientDatabase[normName];
  if (!dbItem) return 0;

  let multiplier = 1;
  const dbUnit = dbItem.unit.toLowerCase();
  const recipeUnit = (unit || "").toLowerCase();

  if (dbUnit === "g" || dbUnit === "ml") {
    if (recipeUnit.includes("tbsp") || recipeUnit.includes("tablespoon")) {
      multiplier = 15;
    } else if (recipeUnit.includes("tsp") || recipeUnit.includes("teaspoon")) {
      multiplier = 5;
    }
    const totalQty = quantity * multiplier;
    return Math.round((totalQty / 100) * dbItem.calories);
  } else {
    return Math.round(quantity * dbItem.calories);
  }
};

// Helper to calculate macros dynamically based on ingredient name, quantity, and unit
const getIngredientMacros = (name, quantity, unit) => {
  const normName = name.toLowerCase().trim();
  const dbItem = ingredientDatabase[normName];
  if (!dbItem) return { protein: 0, carbs: 0, fat: 0 };

  let multiplier = 1;
  const dbUnit = dbItem.unit.toLowerCase();
  const recipeUnit = (unit || "").toLowerCase();

  if (dbUnit === "g" || dbUnit === "ml") {
    if (recipeUnit.includes("tbsp") || recipeUnit.includes("tablespoon")) {
      multiplier = 15;
    } else if (recipeUnit.includes("tsp") || recipeUnit.includes("teaspoon")) {
      multiplier = 5;
    }
    const totalQty = quantity * multiplier;
    return {
      protein: (totalQty / 100) * dbItem.protein,
      carbs: (totalQty / 100) * dbItem.carbs,
      fat: (totalQty / 100) * dbItem.fat
    };
  } else {
    return {
      protein: quantity * dbItem.protein,
      carbs: quantity * dbItem.carbs,
      fat: quantity * dbItem.fat
    };
  }
};

const getCurrentMealSlot = () => {
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 11) return "breakfast";
  if (hr >= 11 && hr < 15) return "lunch";
  if (hr >= 17 && hr < 22) return "dinner";
  return "snack";
};

export default function App() {
  // Authentication State
  const [user, setUser] = useState(null); // Initial state is null (logged out)
  const [authMode, setAuthMode] = useState("login"); // login or register
  const [authEmail, setAuthEmail] = useState("chef@prompt2plate.com");
  const [authPassword, setAuthPassword] = useState("password123");
  const [authName, setAuthName] = useState("Aurélia Vasser");

  // Profiles for personalization
  const profiles = {
    "standard": { name: "Standard Diet", diet: [], targetCalories: 2000, targetProtein: 120, targetCarbs: 220, targetFat: 70 },
    "keto": { name: "Keto Athlete", diet: ["low-carb", "keto"], targetCalories: 2200, targetProtein: 140, targetCarbs: 30, targetFat: 170 },
    "vegan": { name: "Vegan Family", diet: ["vegan", "vegetarian"], targetCalories: 1800, targetProtein: 75, targetCarbs: 250, targetFat: 55 }
  };

  const [activeProfileKey, setActiveProfileKey] = useState("keto");
  const activeProfile = profiles[activeProfileKey];

  // Navigation (Moved to Sidebar)
  const [activeTab, setActiveTab] = useState("generator");

  // Recipe Database & Planner
  const [recipes, setRecipes] = useState(mockRecipes);
  const [mealPlan, setMealPlan] = useState({
    "Monday-breakfast": mockRecipes[1], // Keto Salmon Bowl
    "Monday-lunch": mockRecipes[0],      // Tuscan Pasta
    "Wednesday-dinner": mockRecipes[2],  // Vegan Buddha Bowl
    "Thursday-lunch": mockRecipes[3]     // Steak & Asparagus
  });

  // Manual Shopping List additions
  const [manualListItems, setManualListItems] = useState([]);

  // Calorie Calculator Search States
  const [calcSearchQuery, setCalcSearchQuery] = useState("");
  const [calcSuggestions, setCalcSuggestions] = useState([]);
  const [selectedCalcItem, setSelectedCalcItem] = useState(null);
  const [calcQuantity, setCalcQuantity] = useState(100);
  const [calcUnit, setCalcUnit] = useState("g");

  // UI state for generator modal
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [recipeToSchedule, setRecipeToSchedule] = useState(null);
  const [scheduleDay, setScheduleDay] = useState("Monday");
  const [scheduleSlot, setScheduleSlot] = useState("lunch");

  // Pantry State
  const allIngredients = Array.from(new Set(mockRecipes.flatMap(r => r.ingredients.map(i => i.name))));
  const [pantry, setPantry] = useState(["chicken breast", "spinach", "garlic", "olive oil", "avocado"]);
  const [pantrySearchText, setPantrySearchText] = useState("");
  const [substitutionModal, setSubstitutionModal] = useState(null);

  // Generator State
  const [prompt, setPrompt] = useState("");
  const [selectedDiet, setSelectedDiet] = useState(activeProfile.diet[0] || "");
  const [maxTime, setMaxTime] = useState(30);
  const [calorieLimit, setCalorieLimit] = useState(600);

  // AI Pipeline Simulator States
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  
  // AI Chef Assistant Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: "assistant", text: "Bonjour! I am Chef Aurélia, your AI Culinary Assistant. I can help you remix recipes, suggest ingredient substitutions, or scale portions. Ask me anything!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  // Active Cooking Session State
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [timers, setTimers] = useState({});
  const [timerIntervals, setTimerIntervals] = useState({});
  const [voiceLog, setVoiceLog] = useState(["AI Chef: Voice guidance initialized. Say 'Ready' to begin."]);
  const [isListening, setIsListening] = useState(false);

  // Sync profile dietary filters when user profile changes
  useEffect(() => {
    if (activeProfile.diet.length > 0) {
      setSelectedDiet(activeProfile.diet[0]);
    } else {
      setSelectedDiet("");
    }
  }, [activeProfileKey]);

  // Scroll chatbot to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerIntervals).forEach(clearInterval);
    };
  }, [timerIntervals]);

  // Handle Login & Registration Submit
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setUser({
      email: authEmail,
      name: authMode === "login" ? "Chef Aurélia" : authName,
      profilePic: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces"
    });
  };

  // AI Generation Pipeline execution simulator
  const runAIPipeline = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setPipelineStep(0);
    setGeneratedRecipe(null);
    setPipelineLogs([]);

    const layers = [
      { id: 1, text: "Detecting Intent... (Action: GenerateRecipe)" },
      { id: 2, text: "Extracting Entities... (Query parameters isolated)" },
      { id: 3, text: "Ingredient Normalization... (Aligning search terms to database)" },
      { id: 4, text: "Nutrition Retrieval... (USDA nutrient profiles integrated)" },
      { id: 5, text: "Recipe Planning... (LLM Chef generating cooking steps graph)" },
      { id: 6, text: "Recipe Validation... (Ensuring non-overlapping DAG steps)" },
      { id: 7, text: "Structured JSON Generation... (Validating against JSON schemas)" },
      { id: 8, text: "Safety Checking... (Exclusion filters scanned, poison controls clean)" },
      { id: 9, text: "Formatting... (Unit conversions, formatting text lists)" },
      { id: 10, text: "Streaming Response... (Rendering completed structure)" }
    ];

    layers.forEach((layer, index) => {
      setTimeout(() => {
        setPipelineStep(layer.id);
        setPipelineLogs(prev => [...prev, layer.text]);
        
        if (layer.id === 10) {
          let matchingRecipe = mockRecipes.find(r => 
            (selectedDiet ? r.dietaryTags.includes(selectedDiet) : true) &&
            r.nutrition.calories <= calorieLimit
          ) || mockRecipes[0];

          const customized = {
            ...matchingRecipe,
            id: `gen-${Date.now()}`,
            title: `AI custom ${prompt} (${matchingRecipe.title})`,
            description: `Generated dynamically for your prompt: "${prompt}". Fits your customized profile targets.`
          };

          setGeneratedRecipe(customized);
          setRecipes(prev => [customized, ...prev]);
          setIsGenerating(false);
        }
      }, (index + 1) * 800);
    });
  };

  // Helper: check if a DAG step can be run based on dependencies
  const isStepReady = (step, stepList) => {
    if (completedSteps.has(step.stepId)) return false;
    return step.dependentStepIds.every(depId => completedSteps.has(depId));
  };

  // Step timer logic
  const toggleTimer = (stepId, totalSeconds) => {
    if (timerIntervals[stepId]) {
      clearInterval(timerIntervals[stepId]);
      const newIntervals = { ...timerIntervals };
      delete newIntervals[stepId];
      setTimerIntervals(newIntervals);
    } else {
      const initialTime = timers[stepId] !== undefined ? timers[stepId] : totalSeconds;
      setTimers(prev => ({ ...prev, [stepId]: initialTime }));

      const interval = setInterval(() => {
        setTimers(prev => {
          if (prev[stepId] <= 1) {
            clearInterval(interval);
            setTimerIntervals(old => {
              const cleaned = { ...old };
              delete cleaned[stepId];
              return cleaned;
            });
            setVoiceLog(v => [...v, `AI Chef: Timer completed for step: ${stepId}`]);
            return { ...prev, [stepId]: 0 };
          }
          return { ...prev, [stepId]: prev[stepId] - 1 };
        });
      }, 1000);

      setTimerIntervals(prev => ({ ...prev, [stepId]: interval }));
    }
  };

  const completeStep = (stepId, instruction) => {
    setCompletedSteps(prev => {
      const updated = new Set(prev);
      updated.add(stepId);
      
      if (timerIntervals[stepId]) {
        clearInterval(timerIntervals[stepId]);
        setTimerIntervals(old => {
          const cleaned = { ...old };
          delete cleaned[stepId];
          return cleaned;
        });
      }

      const nextSteps = cookingRecipe.stepsDag.filter(step => 
        !updated.has(step.stepId) && 
        step.dependentStepIds.every(depId => updated.has(depId))
      );

      let speakText = `AI Chef: Step completed. `;
      if (nextSteps.length > 0) {
        speakText += `You can now start: ${nextSteps.map(s => `Step ${s.stepNumber}`).join(" and ")}.`;
      } else if (updated.size === cookingRecipe.stepsDag.length) {
        speakText += `Excellent! The recipe is completed. Enjoy your meal!`;
      }
      setVoiceLog(v => [...v, speakText]);

      return updated;
    });
  };

  // Weekly Meal Plan calculations
  const getWeeklyMacros = () => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    Object.values(mealPlan).forEach(recipe => {
      if (recipe) {
        calories += recipe.nutrition.calories;
        protein += recipe.nutrition.protein;
        carbs += recipe.nutrition.carbs;
        fat += recipe.nutrition.fat;
      }
    });

    // Append manual items
    manualListItems.forEach(item => {
      calories += item.calcNutrition.calories;
      protein += item.calcNutrition.protein;
      carbs += item.calcNutrition.carbs;
      fat += item.calcNutrition.fat;
    });

    return { calories, protein, carbs, fat };
  };

  // Auto-consolidate shopping lists across plan
  const getConsolidatedShoppingList = () => {
    const list = {};
    Object.values(mealPlan).forEach(recipe => {
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          const key = ing.name.toLowerCase();
          if (list[key]) {
            list[key].quantity += ing.quantity;
          } else {
            list[key] = { ...ing };
          }
        });
      }
    });

    // Merge manual selections
    manualListItems.forEach(item => {
      const key = item.name.toLowerCase();
      if (list[key]) {
        list[key].quantity += item.quantity;
      } else {
        list[key] = {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          displayText: `${item.quantity}${item.unit} of ${item.name} (Calculated)`
        };
      }
    });

    return Object.values(list);
  };

  // Calorie Calculator Search Input Handling
  const handleCalcSearchChange = (e) => {
    const query = e.target.value;
    setCalcSearchQuery(query);

    if (query.trim().length > 0) {
      const keys = Object.keys(ingredientDatabase);
      const matches = keys.filter(k => k.toLowerCase().includes(query.toLowerCase()));
      setCalcSuggestions(matches);
    } else {
      setCalcSuggestions([]);
    }
  };

  // Select Calorie Calculation Item
  const handleSelectCalcItem = (itemName) => {
    const item = ingredientDatabase[itemName];
    setSelectedCalcItem({
      name: itemName,
      ...item
    });
    setCalcSearchQuery(itemName);
    setCalcSuggestions([]);
    setCalcUnit(item.unit);
  };

  // Perform Dynamic Nutritional Math based on selected Quantity
  const calculateSelectedNutrition = () => {
    if (!selectedCalcItem) return null;
    const factor = selectedCalcItem.unit === "pc" || selectedCalcItem.unit === "cloves"
      ? calcQuantity // multiplication for pieces
      : calcQuantity / 100; // division for 100g weights

    return {
      calories: Math.round(selectedCalcItem.calories * factor),
      protein: Math.round(selectedCalcItem.protein * factor * 10) / 10,
      carbs: Math.round(selectedCalcItem.carbs * factor * 10) / 10,
      fat: Math.round(selectedCalcItem.fat * factor * 10) / 10
    };
  };

  // Add search item directly to shopping list & update calculations
  const addCalculatedItemToList = () => {
    if (!selectedCalcItem) return;
    const computedNutrition = calculateSelectedNutrition();
    const newItem = {
      id: `manual-${Date.now()}`,
      name: selectedCalcItem.name,
      quantity: calcQuantity,
      unit: calcUnit,
      category: selectedCalcItem.category,
      calcNutrition: computedNutrition
    };

    setManualListItems(prev => [...prev, newItem]);
    setSelectedCalcItem(null);
    setCalcSearchQuery("");
  };

  const handleIncrement = (itemId) => {
    setManualListItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const step = item.unit === "pc" || item.unit === "cloves" ? 1 : 50;
        const newQty = item.quantity + step;
        const dbItem = ingredientDatabase[item.name.toLowerCase()];
        const factor = item.unit === "pc" || item.unit === "cloves" ? newQty : newQty / 100;
        const newNutrition = {
          calories: Math.round(dbItem.calories * factor),
          protein: Math.round(dbItem.protein * factor * 10) / 10,
          carbs: Math.round(dbItem.carbs * factor * 10) / 10,
          fat: Math.round(dbItem.fat * factor * 10) / 10
        };
        return { ...item, quantity: newQty, calcNutrition: newNutrition };
      }
      return item;
    }));
  };

  const handleDecrement = (itemId) => {
    setManualListItems(prev => {
      const target = prev.find(item => item.id === itemId);
      if (!target) return prev;
      const step = target.unit === "pc" || target.unit === "cloves" ? 1 : 50;
      const newQty = target.quantity - step;
      if (newQty <= 0) {
        return prev.filter(item => item.id !== itemId);
      }
      return prev.map(item => {
        if (item.id === itemId) {
          const dbItem = ingredientDatabase[item.name.toLowerCase()];
          const factor = item.unit === "pc" || item.unit === "cloves" ? newQty : newQty / 100;
          const newNutrition = {
            calories: Math.round(dbItem.calories * factor),
            protein: Math.round(dbItem.protein * factor * 10) / 10,
            carbs: Math.round(dbItem.carbs * factor * 10) / 10,
            fat: Math.round(dbItem.fat * factor * 10) / 10
          };
          return { ...item, quantity: newQty, calcNutrition: newNutrition };
        }
        return item;
      });
    });
  };

  const scheduleCartItem = (item, day, slot) => {
    const customMeal = {
      id: `custom-food-${Date.now()}`,
      title: `${item.quantity}${item.unit} of ${item.name}`,
      description: `Logged custom food intake via Calorie Cart.`,
      prepTimeMins: 0,
      cookTimeMins: 0,
      portions: 1,
      difficulty: "easy",
      nutrition: {
        calories: item.calcNutrition.calories,
        protein: item.calcNutrition.protein,
        carbs: item.calcNutrition.carbs,
        fat: item.calcNutrition.fat
      },
      dietaryTags: [],
      ingredients: [
        { name: item.name, quantity: item.quantity, unit: item.unit, displayText: `${item.quantity}${item.unit} ${item.name}`, category: item.category }
      ],
      stepsDag: []
    };
    setMealPlan(prev => ({
      ...prev,
      [`${day}-${slot}`]: customMeal
    }));
    setVoiceLog(v => [...v, `AI Chef: Scheduled ${item.quantity}${item.unit} of ${item.name} into ${day}'s ${slot}.`]);
  };

  // Chat message submit
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      let reply = "";
      if (userMsg.toLowerCase().includes("remix") || userMsg.toLowerCase().includes("vegan")) {
        reply = "I've restructured the Tuscan Chicken Pasta recipe for you! I substituted the chicken breast with high-protein organic Tempeh cubes, maintaining the 1:1 prep/cook duration DAG profile. Let me know if you would like me to push this directly to your meal calendar!";
      } else if (userMsg.toLowerCase().includes("substitute") || userMsg.toLowerCase().includes("cashew")) {
        reply = "For Cashew Cream in the Tuscan Pasta, the best substitute is Heavy Cream (1:1 ratio, dairy) or Sunflower Seed Cream (1:1 ratio, nut-free vegan). Adjust baking time by -2 mins if using heavy dairy cream due to lower water evaporation rates.";
      } else {
        reply = `Understood. Analyzing your request with your current "${activeProfile.name}" profile. I can adjust ingredient ratios, analyze custom recipe links, or run vector matches. What is the next task?`;
      }
      setChatMessages(prev => [...prev, { sender: "assistant", text: reply }]);
    }, 1000);
  };

  // RENDER: LOGIN/REGISTRATION SCREEN
  if (!user) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card">
          <div className="auth-header">
            <h1 className="auth-title">
              <span className="logo-icon">🍳</span>
              <span className="gradient-text-orange"> Prompt2Plate</span>
            </h1>
            <p className="auth-subtitle">Enterprise AI Recipe & Culinary Dashboard</p>
          </div>

          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '100%', paddingLeft: '2.5rem' }} 
                    placeholder="Enter your name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                  <Edit3 size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ width: '100%', paddingLeft: '2.5rem' }} 
                  placeholder="chef@prompt2plate.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%', paddingLeft: '2.5rem' }} 
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Sign In to Dashboard' : 'Register & Enter Dashboard'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            💡 <strong>Quick Access Demo:</strong> Click "Sign In to Dashboard" to log in with our prefilled credential.
          </div>
        </div>
      </div>
    );
  }

  // RENDER: APPLICATION PORTAL WITH SIDEBAR LAYOUT
  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Brand Logo */}
          <div className="sidebar-brand">
            <a href="#" className="logo-container" style={{ padding: 0 }} onClick={() => setActiveTab("generator")}>
              <span className="logo-icon">🍳</span>
              <span className="gradient-text-orange" style={{ fontSize: '1.25rem' }}>Prompt2Plate</span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <button 
              className={`sidebar-item ${activeTab === 'generator' ? 'active' : ''}`} 
              onClick={() => setActiveTab("generator")}
            >
              <ChefHat size={18} />
              AI Chef Engine
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'planner' ? 'active' : ''}`} 
              onClick={() => setActiveTab("planner")}
            >
              <Calendar size={18} />
              Weekly Planner
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'pantry' ? 'active' : ''}`} 
              onClick={() => setActiveTab("pantry")}
            >
              <Search size={18} />
              Pantry Matcher
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'shopping' ? 'active' : ''}`} 
              onClick={() => setActiveTab("shopping")}
            >
              <ShoppingCart size={18} />
              Calorie Cart
            </button>
          </nav>
        </div>

        {/* Profile Pickers & Logout section */}
        <div className="sidebar-profile">
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <span className="user-profile-label" style={{ fontSize: '0.65rem' }}>Active Profile</span>
            <select 
              className="form-select-box" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-primary)' }}
              value={activeProfileKey} 
              onChange={(e) => setActiveProfileKey(e.target.value)}
            >
              <option value="standard">Standard Diet</option>
              <option value="keto">Keto Athlete</option>
              <option value="vegan">Vegan Family</option>
            </select>
          </div>

          <div className="sidebar-profile-info">
            <img 
              src={user.profilePic} 
              alt="User" 
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--accent-orange)' }}
            />
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {activeProfile.name}
              </div>
            </div>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setUser(null)}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Content */}
      <div className="main-content">
        
        {/* VIEW 1: AI CHEF ENGINE */}
        {activeTab === 'generator' && (
          <div style={{ display: 'grid', gridTemplateColumns: cookingRecipe ? '1fr' : '1fr 1.2fr', gap: '2rem' }}>
            {cookingRecipe ? (
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Volume2 size={24} style={{ color: 'var(--accent-orange)' }} />
                      Voice Cooking: {cookingRecipe.title}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Steps DAG topological scheduler running. Steps unlock as dependencies resolve.
                    </p>
                  </div>
                  <button className="btn-primary" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => { setCookingRecipe(null); setCompletedSteps(new Set()); }}>
                    Exit Session
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Topological Step Timeline</h3>
                    <div className="dag-nodes-container">
                      {cookingRecipe.stepsDag.map((step) => {
                        const ready = isStepReady(step, cookingRecipe.stepsDag);
                        const done = completedSteps.has(step.stepId);
                        const disabled = !ready && !done;
                        const timerVal = timers[step.stepId] !== undefined ? timers[step.stepId] : step.durationSeconds;
                        const timerRunning = !!timerIntervals[step.stepId];

                        const minutes = Math.floor(timerVal / 60);
                        const seconds = timerVal % 60;
                        const displayTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

                        return (
                          <div 
                            key={step.stepId} 
                            className={`glass-card dag-step-node ${disabled ? 'disabled' : ''}`}
                            style={{
                              borderLeft: done ? '4px solid var(--text-muted)' : ready ? '4px solid var(--accent-orange)' : '4px solid var(--glass-border)',
                              background: done ? 'rgba(255,255,255,0.01)' : ready ? 'var(--accent-orange-glow)' : 'transparent'
                            }}
                          >
                            <div className="dag-step-header">
                              <span className="dag-step-number">Step {step.stepNumber}</span>
                              {done ? (
                                <span className="dag-step-badge-done">Completed</span>
                              ) : ready ? (
                                <span className="dag-step-badge-ready">Ready to Start</span>
                              ) : (
                                <span className="dag-step-badge-done" style={{ color: 'var(--text-muted)' }}>
                                  Waiting on: {step.dependentStepIds.map(id => id.replace("step_", "Step ")).join(", ")}
                                </span>
                              )}
                            </div>

                            <p className="dag-step-instruction">{step.instruction}</p>

                            <div className="dag-step-footer">
                              <div className="step-meta-items">
                                <span>🔧 {step.equipmentRequired.join(", ") || "No special tools"}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {step.durationSeconds > 0 && !done && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className={`timer-box ${timerRunning ? 'running' : ''}`}>{displayTime}</span>
                                    <button 
                                      className="filter-btn" 
                                      style={{ padding: '0.4rem' }}
                                      onClick={() => toggleTimer(step.stepId, step.durationSeconds)}
                                    >
                                      {timerRunning ? "Pause" : "Start"}
                                    </button>
                                  </div>
                                )}

                                {!done && (
                                  <button 
                                    className="btn-primary" 
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--accent-green)' }}
                                    onClick={() => completeStep(step.stepId, step.instruction)}
                                    disabled={disabled}
                                  >
                                    <Check size={14} /> Done
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignContent: 'center' }}>
                      <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mic size={16} style={{ color: isListening ? 'var(--accent-orange)' : 'var(--text-muted)' }} />
                        Voice Assistant Log
                      </h4>
                      <button 
                        className={`filter-btn ${isListening ? 'active' : ''}`} 
                        onClick={() => setIsListening(!isListening)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        {isListening ? "Listening..." : "Enable Mic"}
                      </button>
                    </div>

                    <div style={{ height: '300px', overflowY: 'auto', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {voiceLog.map((log, index) => (
                        <div key={index} style={{ fontSize: '0.85rem', color: log.startsWith("AI") ? 'var(--accent-orange)' : 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                          {log}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      💡 <strong>Voice Commands:</strong> "Start Step 1", "Pause Step 3", "Complete Step 1", "How much garlic do I add?".
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Left Side: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.75rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ChefHat size={22} style={{ color: 'var(--accent-orange)' }} />
                      AI Chef Generator
                    </h2>

                    <div className="form-group">
                      <label className="form-label">What would you like to cook?</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Creamy garlic shrimp pasta, keto salad..." 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dietary Match Preference</label>
                      <div className="filter-grid">
                        <button className={`filter-btn ${selectedDiet === '' ? 'active' : ''}`} onClick={() => setSelectedDiet('')}>None</button>
                        <button className={`filter-btn ${selectedDiet === 'gluten-free' ? 'active' : ''}`} onClick={() => setSelectedDiet('gluten-free')}>Gluten-Free</button>
                        <button className={`filter-btn ${selectedDiet === 'keto' ? 'active' : ''}`} onClick={() => setSelectedDiet('keto')}>Keto</button>
                        <button className={`filter-btn ${selectedDiet === 'low-carb' ? 'active' : ''}`} onClick={() => setSelectedDiet('low-carb')}>Low-Carb</button>
                        <button className={`filter-btn ${selectedDiet === 'vegan' ? 'active' : ''}`} onClick={() => setSelectedDiet('vegan')}>Vegan</button>
                        <button className={`filter-btn ${selectedDiet === 'vegetarian' ? 'active' : ''}`} onClick={() => setSelectedDiet('vegetarian')}>Vegetarian</button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Max Cooking Duration (mins)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={maxTime} 
                          onChange={(e) => setMaxTime(parseInt(e.target.value))} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max Calorie Intake (kcal)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={calorieLimit} 
                          onChange={(e) => setCalorieLimit(parseInt(e.target.value))} 
                        />
                      </div>
                    </div>

                    <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={runAIPipeline} disabled={isGenerating}>
                      <Sparkles size={16} />
                      {isGenerating ? "Synthesizing AI Engine..." : "Generate Custom Recipe"}
                    </button>
                  </div>

                  {isGenerating && (
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span>10-Layer AI Synthesis pipeline</span>
                        <div className="pipeline-spinner"></div>
                      </h3>
                      <div className="pipeline-visualizer">
                        {[1,2,3,4,5,6,7,8,9,10].map(step => {
                          const labels = [
                            "Intent Classifier (Layer 1)",
                            "Entity Extractor (Layer 2)",
                            "Ingredient Standardizer (Layer 3)",
                            "Nutrition API Retrieval (Layer 4)",
                            "Culinary Plan Generator (Layer 5)",
                            "Topological Validation (Layer 6)",
                            "JSON Schema Enforcer (Layer 7)",
                            "Allergen Safety Guard (Layer 8)",
                            "Regional Formatter (Layer 9)",
                            "Streaming Response Render (Layer 10)"
                          ];
                          const isActive = pipelineStep === step;
                          const isDone = pipelineStep > step;
                          return (
                            <div 
                              key={step} 
                              className={`pipeline-step ${isActive ? 'active' : isDone ? 'completed' : 'pending'}`}
                            >
                              <span>{labels[step - 1]}</span>
                              <span>{isDone ? "✓ Valid" : isActive ? "Working" : "Queue"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Outputs */}
                <div>
                  {generatedRecipe ? (
                    <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h2 style={{ fontSize: '1.75rem', color: 'var(--accent-orange)' }}>{generatedRecipe.title}</h2>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {generatedRecipe.dietaryTags.map(tag => (
                              <span key={tag} className="nutrition-pill" style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                          {generatedRecipe.description}
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', padding: '1rem 0' }}>
                        <div style={{ textAlign: 'center' }}>
                          <Clock size={16} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PREP TIME</div>
                          <div style={{ fontSize: '1rem', fontWeight: '700' }}>{generatedRecipe.prepTimeMins} min</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <Clock size={16} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COOK TIME</div>
                          <div style={{ fontSize: '1rem', fontWeight: '700' }}>{generatedRecipe.cookTimeMins} min</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <Coins size={16} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EST. COST</div>
                          <div style={{ fontSize: '1rem', fontWeight: '700' }}>${generatedRecipe.estimatedCostUsd.toFixed(2)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <Flame size={16} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CALORIES</div>
                          <div style={{ fontSize: '1rem', fontWeight: '700' }}>{generatedRecipe.nutrition.calories} kcal</div>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Macronutrient Profile</h3>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                              <span>Protein</span>
                              <strong>{generatedRecipe.nutrition.protein}g</strong>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                              <div style={{ width: `${(generatedRecipe.nutrition.protein / 150) * 100}%`, height: '100%', background: 'var(--accent-orange)', borderRadius: '3px' }}></div>
                            </div>
                          </div>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                              <span>Carbohydrates</span>
                              <strong>{generatedRecipe.nutrition.carbs}g</strong>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                              <div style={{ width: `${(generatedRecipe.nutrition.carbs / 250) * 100}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '3px' }}></div>
                            </div>
                          </div>
                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                              <span>Fat</span>
                              <strong>{generatedRecipe.nutrition.fat}g</strong>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                              <div style={{ width: `${(generatedRecipe.nutrition.fat / 100) * 100}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '3px' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Ingredients Standardized</h3>
                        <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {generatedRecipe.ingredients.map((ing, index) => (
                            <li key={index} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--accent-green)' }}>•</span>
                              {ing.displayText}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-primary" style={{ flexGrow: 1 }} onClick={() => setCookingRecipe(generatedRecipe)}>
                          <Play size={16} /> Start Cooking (DAG Timeline)
                        </button>
                        <button className="btn-primary" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} onClick={() => { setRecipeToSchedule(generatedRecipe); setShowAddToPlanModal(true); }}>
                          Add to Meal Plan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <ChefHat size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--text-muted)' }} />
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>AI Cooking Environment Ready</h3>
                      <p style={{ fontSize: '0.9rem' }}>Submit culinary preferences on the left to activate the 10-layer generation pipeline.</p>
                    </div>
                  )}

                  <div className="glass-card chat-window" style={{ marginTop: '2rem', padding: '1rem' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
                      <h3 style={{ fontSize: '1.1rem' }}>AI Culinary Co-Pilot Chat</h3>
                    </div>

                    <div className="chat-messages">
                      {chatMessages.map((msg, index) => (
                        <div key={index} className={`chat-bubble ${msg.sender}`}>
                          {msg.text}
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={sendChatMessage} className="chat-input-area">
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flexGrow: 1, padding: '0.5rem 1rem' }} 
                        placeholder="Ask about substitutions, scaling, or cooking tips..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <button className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Ask</button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 2: WEEKLY PLANNER */}
        {activeTab === 'planner' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem' }} className="gradient-text-orange">Dynamic Weekly Planner</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Schedule and audit daily caloric intakes automatically according to target macro guidelines.</p>
              </div>
              
              <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WEEKLY CALORIES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-orange)' }}>
                    {getWeeklyMacros().calories} kcal
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Target: {activeProfile.targetCalories * 7}</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MACRO SPLIT (P / C / F)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    {getWeeklyMacros().protein}g / {getWeeklyMacros().carbs}g / {getWeeklyMacros().fat}g
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Target: {activeProfile.targetProtein * 7}g / {activeProfile.targetCarbs * 7}g / {activeProfile.targetFat * 7}g</div>
                </div>
              </div>
            </div>

            <div className="planner-grid">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                let dayCal = 0;
                ["breakfast", "lunch", "dinner", "snack"].forEach(slot => {
                  const recipe = mealPlan[`${day}-${slot}`];
                  if (recipe) dayCal += recipe.nutrition.calories;
                });

                return (
                  <div key={day} className="planner-day-col">
                    <div className="day-header">
                      {day}
                      <div style={{ fontSize: '0.75rem', color: dayCal > activeProfile.targetCalories ? 'var(--accent-orange)' : 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {dayCal} / {activeProfile.targetCalories} kcal
                      </div>
                    </div>

                    {["breakfast", "lunch", "dinner", "snack"].map(slot => {
                      const recipe = mealPlan[`${day}-${slot}`];

                      return (
                        <div key={slot} className="glass-card meal-slot">
                          <div>
                            <div className="meal-slot-label">{slot}</div>
                            {recipe ? (
                              <div className="meal-slot-title">{recipe.title}</div>
                            ) : (
                              <div className="meal-slot-empty" onClick={() => { setActiveTab("generator"); setPrompt(`Healthy option for ${slot}`); }}>
                                + Add Meal
                              </div>
                            )}
                          </div>

                          {recipe && (
                            <div>
                              <div className="nutrition-pills">
                                <span className="nutrition-pill">{recipe.nutrition.calories} kcal</span>
                                <span className="nutrition-pill">P: {recipe.nutrition.protein}g</span>
                              </div>
                              <button 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', cursor: 'pointer' }}
                                onClick={() => {
                                  const updatedPlan = { ...mealPlan };
                                  delete updatedPlan[`${day}-${slot}`];
                                  setMealPlan(updatedPlan);
                                }}
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: PANTRY MATCHER */}
        {activeTab === 'pantry' && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} className="gradient-text-green">Pantry Optimizer & Search</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Select available inventory components to trigger index set matches and optimize grocery spending.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Active Inventory</h3>
                
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', marginBottom: '1rem' }} 
                  placeholder="Add custom ingredient..." 
                  value={pantrySearchText}
                  onChange={(e) => setPantrySearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pantrySearchText.trim()) {
                      setPantry(prev => Array.from(new Set([...prev, pantrySearchText.trim().toLowerCase()])));
                      setPantrySearchText("");
                    }
                  }}
                />

                <div className="tag-container">
                  {allIngredients.map(ing => {
                    const isSelected = pantry.includes(ing);
                    return (
                      <span 
                        key={ing} 
                        className={`ingredient-tag ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setPantry(prev => prev.filter(i => i !== ing));
                          } else {
                            setPantry(prev => [...prev, ing]);
                          }
                        }}
                      >
                        {ing}
                        {isSelected ? "✓" : "+"}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Matching Recipes Index</h3>

                {recipes.map(recipe => {
                  const recipeIngs = recipe.ingredients.map(i => i.name.toLowerCase());
                  const hasIngs = recipeIngs.filter(i => pantry.includes(i));
                  const missingIngs = recipeIngs.filter(i => !pantry.includes(i));
                  const matchPercent = Math.round((hasIngs.length / recipeIngs.length) * 100);

                  return (
                    <div key={recipe.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <h4 style={{ fontSize: '1.25rem' }}>{recipe.title}</h4>
                          <span className="nutrition-pill" style={{ 
                            background: matchPercent === 100 ? 'var(--accent-green-glow)' : 'var(--accent-orange-glow)',
                            color: matchPercent === 100 ? 'var(--accent-green)' : 'var(--accent-orange)',
                            fontSize: '0.75rem' 
                          }}>
                            {matchPercent}% Match
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          {recipe.description}
                        </p>
                        
                        <div style={{ fontSize: '0.8rem', marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Have: {hasIngs.join(", ") || "None"}
                          </span>
                          {missingIngs.length > 0 && (
                            <span style={{ color: 'var(--accent-orange)' }}>
                              Missing: {missingIngs.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px', alignItems: 'flex-end' }}>
                        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { setActiveTab("generator"); setGeneratedRecipe(recipe); }}>
                          View Recipe
                        </button>
                        {missingIngs.length > 0 && (
                          <button 
                            className="filter-btn" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: '100%' }}
                            onClick={() => setSubstitutionModal({ recipeId: recipe.id, missing: missingIngs })}
                          >
                            Suggest Substitutes
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {pantry && substitutionModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass-card" style={{ padding: '2rem', maxWidth: '500px', width: '100%', background: 'var(--bg-secondary)' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-orange)' }}>Substitution Advisor</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Calculated optimal substitutions matching nutritional thresholds:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {substitutionModal.missing.map(item => {
                      let suggestion = "";
                      if (item.includes("chicken")) suggestion = "Firm Tofu or Tempeh (Ratio 1:1, cooking duration adjustment: sear for -2 mins)";
                      else if (item.includes("cashew")) suggestion = "Soy Cream or Sunflower Seed Butter (Ratio 1:1)";
                      else if (item.includes("steak")) suggestion = "Portobello Mushroom Caps (Ratio 1.2:1)";
                      else if (item.includes("salmon")) suggestion = "Marinated Firm Tofu (Season with Nori sheets for sea flavor)";
                      else suggestion = "Spinach or Green Kale (Ratio 1:1)";

                      return (
                        <div key={item} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                          <strong style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{item}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>Substitute: {suggestion}</div>
                        </div>
                      );
                    })}
                  </div>

                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => setSubstitutionModal(null)}>
                    Apply Substitutions & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* VIEW 4: CALORIE CART */}
        {activeTab === 'shopping' && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} className="gradient-text-purple">Calorie Cart & Intake Tracker</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Add foods you are having, adjust portions via e-commerce style controls, and schedule them directly to your logs based on real-time intake.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
              
              {/* Left Column: Cart items */}
              <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={20} style={{ color: 'var(--accent-purple)' }} />
                    Log Intake Cart
                  </h3>
                  <span className="nutrition-pill" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>
                    {manualListItems.length} Selected Items
                  </span>
                </div>

                {manualListItems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {manualListItems.map((item) => {
                      const suggestedSlot = getCurrentMealSlot();
                      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                      const currentDayName = daysOfWeek[new Date().getDay()];

                      return (
                        <div 
                          key={item.id} 
                          className="glass-card" 
                          style={{ 
                            padding: '1.25rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '1rem',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.01)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: '1.1rem', fontWeight: '700', textTransform: 'capitalize' }}>
                                {item.name}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', textTransform: 'uppercase' }}>
                                Category: {item.category}
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-orange)' }}>
                                {item.calcNutrition.calories} kcal
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                P: {item.calcNutrition.protein}g | C: {item.calcNutrition.carbs}g | F: {item.calcNutrition.fat}g
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                            {/* E-commerce controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <button 
                                className="filter-btn" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '1.1rem', fontWeight: '800', borderRadius: '4px' }}
                                onClick={() => handleDecrement(item.id)}
                              >
                                -
                              </button>
                              <strong style={{ fontSize: '1rem', minWidth: '60px', textAlign: 'center' }}>
                                {item.quantity} {item.unit}
                              </strong>
                              <button 
                                className="filter-btn" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '1.1rem', fontWeight: '800', borderRadius: '4px' }}
                                onClick={() => handleIncrement(item.id)}
                              >
                                +
                              </button>
                            </div>

                            {/* Scheduling Advice */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Real-Time Sug: <strong>{suggestedSlot.toUpperCase()}</strong>
                              </span>
                              <button 
                                className="btn-primary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--accent-green)' }}
                                onClick={() => scheduleCartItem(item, currentDayName, suggestedSlot)}
                              >
                                Add to {suggestedSlot.charAt(0).toUpperCase() + suggestedSlot.slice(1)}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-secondary)' }}>
                    <ShoppingCart size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                    <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Cart is currently empty</h4>
                    <p style={{ fontSize: '0.85rem' }}>Search for food items on the right side of the dashboard to begin logging.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Receipt Totals + Add items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-purple)' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', color: 'var(--text-primary)' }}>
                    Intake Summary Receipt
                  </h3>

                  {(() => {
                    const totalCals = manualListItems.reduce((sum, item) => sum + item.calcNutrition.calories, 0);
                    const totalProtein = Math.round(manualListItems.reduce((sum, item) => sum + item.calcNutrition.protein, 0));
                    const totalCarbs = Math.round(manualListItems.reduce((sum, item) => sum + item.calcNutrition.carbs, 0));
                    const totalFat = Math.round(manualListItems.reduce((sum, item) => sum + item.calcNutrition.fat, 0));

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Total Sum Calories:</span>
                          <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--accent-orange)' }}>
                            {totalCals} kcal
                          </span>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            <span>Progress to daily limit</span>
                            <span>{Math.round((totalCals / activeProfile.targetCalories) * 100)}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min((totalCals / activeProfile.targetCalories) * 100, 100)}%`, height: '100%', background: 'var(--accent-orange)', borderRadius: '3px' }}></div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '1rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Protein:</span>
                            <strong>{totalProtein}g / {activeProfile.targetProtein}g</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Carbohydrates:</span>
                            <strong>{totalCarbs}g / {activeProfile.targetCarbs}g</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Fats:</span>
                            <strong>{totalFat}g / {activeProfile.targetFat}g</strong>
                          </div>
                        </div>

                        {manualListItems.length > 0 && (
                          <button 
                            className="filter-btn" 
                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}
                            onClick={() => setManualListItems([])}
                          >
                            Clear Cart Items
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Flame size={18} style={{ color: 'var(--accent-orange)' }} />
                    Quick Search & Add
                  </h3>
                  
                  <div className="search-suggestions-container" style={{ marginBottom: '1.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: '100%', background: 'var(--bg-tertiary)' }}
                      placeholder="Search every item e.g. eggs, paneer, apple..."
                      value={calcSearchQuery}
                      onChange={handleCalcSearchChange}
                    />

                    {calcSuggestions.length > 0 && (
                      <div className="search-suggestions-list">
                        {calcSuggestions.map(suggestion => (
                          <div 
                            key={suggestion} 
                            className="search-suggestion-item"
                            onClick={() => handleSelectCalcItem(suggestion)}
                          >
                            <span style={{ textTransform: 'capitalize' }}>{suggestion}</span>
                            <span className="search-suggestion-item-category">
                              {ingredientDatabase[suggestion].category}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCalcItem ? (
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ textTransform: 'capitalize', fontSize: '1.05rem' }}>{selectedCalcItem.name}</strong>
                        <span className="nutrition-pill">Per {selectedCalcItem.unit === 'pc' || selectedCalcItem.unit === 'cloves' ? 'piece' : '100' + selectedCalcItem.unit}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                          <label className="form-label">Quantity</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={calcQuantity}
                            onChange={(e) => setCalcQuantity(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                          <label className="form-label">Unit</label>
                          <select className="form-select-box" value={calcUnit} onChange={(e) => setCalcUnit(e.target.value)}>
                            <option value={selectedCalcItem.unit}>{selectedCalcItem.unit}</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PREVIEW NUTRITION:</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '1.2,rem', fontWeight: '800', color: 'var(--accent-orange)' }}>
                            {calculateSelectedNutrition()?.calories} kcal
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            P: {calculateSelectedNutrition()?.protein}g | C: {calculateSelectedNutrition()?.carbs}g | F: {calculateSelectedNutrition()?.fat}g
                          </span>
                        </div>
                      </div>

                      <button className="btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={addCalculatedItemToList}>
                        Add to Intake Cart
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Search and select food items to populate calculation cards.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Global Add to Meal Plan Modal */}
      {showAddToPlanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Schedule Recipe</h3>
            
            <div className="form-group">
              <label className="form-label">Day of Week</label>
              <select className="form-select-box" value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)}>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Meal Slot</label>
              <select className="form-select-box" value={scheduleSlot} onChange={(e) => setScheduleSlot(e.target.value)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn-primary" 
                style={{ flexGrow: 1 }}
                onClick={() => {
                  setMealPlan(prev => ({
                    ...prev,
                    [`${scheduleDay}-${scheduleSlot}`]: recipeToSchedule
                  }));
                  setShowAddToPlanModal(false);
                }}
              >
                Confirm
              </button>
              <button 
                className="btn-primary" 
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', flexGrow: 1 }}
                onClick={() => setShowAddToPlanModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
