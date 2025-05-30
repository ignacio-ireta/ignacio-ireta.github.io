# League of Legends Itemization Optimization via Evolutionary Algorithms

A sophisticated implementation of **Genetic Algorithm (GA)** and **Differential Evolution (DE)** for optimizing champion itemization in League of Legends, featuring novel encoding schemes and hybrid ML-evolutionary approaches.

## 🧬 **Core Innovation: Evolutionary Itemization Optimization**

This project tackles the **discrete combinatorial optimization problem** of League of Legends itemization using two distinct evolutionary approaches, each with carefully designed encoding schemes and fitness functions tailored to the game's mechanics.

### **Problem Formulation**

**Objective**: Maximize win probability through optimal item selection
- **Search Space**: ~74^7 ≈ 1.6×10^13 possible combinations per champion
- **Constraints**: 7 item slots, champion-specific item pools, game state dependencies
- **Fitness Function**: ML-predicted win probability + diversity bonuses + completion rewards

## 🎯 **Algorithm Design Philosophy**

### **Why Evolutionary Algorithms?**

1. **Discrete Combinatorial Nature**: Traditional gradient-based methods fail on discrete item spaces
2. **Multi-Modal Landscape**: Multiple viable build archetypes (tank, damage, hybrid)
3. **Constraint Handling**: Natural handling of item slot limitations and dependencies
4. **Exploration vs Exploitation**: Balance between proven builds and innovative combinations

### **Encoding Strategy: The Key Innovation**

We developed **two distinct encoding approaches** optimized for each algorithm's strengths:

#### **Genetic Algorithm: Direct Item Encoding**
```python
# Chromosome representation: [item_slot_0, item_slot_1, ..., item_slot_6]
chromosome = [3508, 3031, 3072, 0, 6675, 3153, 3364]
#             ^     ^     ^     ^  ^     ^     ^
#             |     |     |     |  |     |     └─ Oracle Lens
#             |     |     |     |  |     └─ Blade of Ruined King  
#             |     |     |     |  └─ Navori Quickblades
#             |     |     |     └─ Empty slot
#             |     |     └─ Bloodthirster
#             |     └─ Infinity Edge
#             └─ Essence Reaver
```

**Advantages**:
- **Intuitive representation** matching game mechanics
- **Natural crossover** preserving item synergies
- **Direct constraint handling** (empty slots = 0)

#### **Differential Evolution: Continuous Mapping**
```python
# Continuous vector: [0.0-1.0] mapped to item indices + probability thresholds
continuous = [0.73, 0.45, 0.89, 0.12, 0.67, 0.91, 0.34]
#             ↓     ↓     ↓     ↓     ↓     ↓     ↓
discrete   = [3508, 3031, 3072,  0,  6675, 3153, 3364]
```

**Mapping Function**:
```python
def continuous_to_discrete(self, x):
    build = []
    for i, val in enumerate(x):
        if val < 0.1:  # 10% chance for empty slot
            build.append(0)
        else:
            # Map [0.1, 1.0] to item indices
            item_idx = int((val - 0.1) / 0.9 * len(self.available_items))
            build.append(self.available_items[item_idx])
    return build
```

**Advantages**:
- **Smooth optimization landscape** for DE operations
- **Probabilistic empty slots** for build completion control
- **Continuous mutation/crossover** with discrete interpretation

## 🔬 **Algorithm Implementation Details**

### **Genetic Algorithm Architecture**

```python
class Individual:
    def __init__(self, optimizer, build=None):
        self.build = build or self.generate_random_build()
        self.fitness = self.calculate_fitness()
    
    def calculate_fitness(self):
        # Multi-component fitness function
        win_prob = self.optimizer.predict_win_probability(self.build)
        diversity_bonus = unique_items / total_slots * 0.1
        completion_bonus = filled_slots / total_slots * 0.05
        return win_prob + diversity_bonus + completion_bonus
```

**Key Design Decisions**:

1. **Fitness Function Components**:
   - **Primary**: ML-predicted win probability (Random Forest)
   - **Diversity Bonus**: Encourages item variety (anti-duplicate)
   - **Completion Bonus**: Rewards full builds over partial ones

2. **Genetic Operators**:
   - **Selection**: Tournament selection (pressure = 3)
   - **Crossover**: Single-point (preserves item synergies)
   - **Mutation**: Probabilistic item replacement/removal

3. **Population Management**:
   - **Elitism**: Top 10% preserved each generation
   - **Population Size**: 50 (balance between diversity and efficiency)
   - **Generations**: 100 (convergence analysis shows plateau ~80-90)

### **Differential Evolution Architecture**

```python
class DifferentialEvolution:
    def __init__(self, F=0.5, CR=0.9, population_size=50):
        self.F = F    # Mutation factor (exploration control)
        self.CR = CR  # Crossover probability (exploitation control)
```

**Key Design Decisions**:

1. **DE/rand/1/bin Strategy**:
   ```python
   # Mutation: v = x_r1 + F * (x_r2 - x_r3)
   # Crossover: u[i] = v[i] if rand() < CR else x[i]
   ```

2. **Parameter Tuning**:
   - **F = 0.5**: Moderate exploration (tested 0.3-0.8)
   - **CR = 0.9**: High crossover rate for discrete problems
   - **Population = 50**: Consistent with GA for fair comparison

3. **Boundary Handling**:
   ```python
   # Clip to [0,1] and re-map to valid item space
   mutant = np.clip(mutant, 0.0, 1.0)
   ```

## 🏗️ **Hybrid ML-Evolutionary Architecture**

### **Machine Learning Integration**

Both algorithms use a **Random Forest classifier** as the fitness evaluator:

```python
def train_prediction_model(self):
    # Features: 7 item slots + 10 game statistics
    feature_columns = self.item_slots + [
        'kills', 'deaths', 'assists', 'totalMinionsKilled', 
        'goldEarned', 'totalDamageDealtToChampions', 
        'visionScore', 'champLevel', 'timePlayed', 'damageDealtToTurrets'
    ]
    
    # Random Forest: handles non-linear item interactions
    self.model = RandomForestClassifier(n_estimators=100, random_state=42)
```

**Why Random Forest?**:
- **Non-linear interactions**: Captures item synergies (e.g., crit items)
- **Robustness**: Handles missing features gracefully
- **Interpretability**: Feature importance reveals key items
- **Speed**: Fast prediction for evolutionary fitness evaluation

### **Data Pipeline Integration**

```python
# Automatic champion selection based on data quality
def select_optimal_champion(match_data):
    champion_stats = analyze_champions(match_data)
    return champion_stats.sort_values(['game_count', 'item_diversity']).iloc[-1]
```

## 📊 **Performance Analysis & Results**

### **Algorithm Comparison (Champion 236 - Lucian)**

| Metric | Genetic Algorithm | Differential Evolution | Baseline |
|--------|------------------|----------------------|----------|
| **Win Rate** | 58.0% | 58.0% | 52.6% |
| **Improvement** | +10.3% | +10.3% | - |
| **Convergence** | ~80 generations | ~120 generations | - |
| **Diversity** | High (7 unique items) | High (7 unique items) | - |
| **Stability** | Consistent | Consistent | - |

### **Convergence Analysis**

Both algorithms show **similar convergence patterns**:
- **Phase 1** (0-40 gen): Rapid improvement (0.64 → 0.71 fitness)
- **Phase 2** (40-80 gen): Fine-tuning (0.71 → 0.73 fitness)  
- **Phase 3** (80+ gen): Plateau with minor fluctuations

### **Build Diversity Analysis**

```python
# GA vs DE optimal builds (Champion 236)
ga_build = [2055, 6699, 1018, 1029, 1001, 3171, 3110]
de_build = [1042, 2421, 1029, 6699, 3072, 2010, 3153]

# Overlap: {6699, 1029} - Core items identified by both
# Divergence: Different secondary items show exploration capability
```

## 🚀 **Quick Start for Algorithm Researchers**

### **Run Complete Pipeline**
```bash
cd datascience_project

# 1. Collect and process data
uv run python run_optimization.py

# 2. Run individual algorithms
uv run python lol_genetic_algorithm.py      # GA optimization
uv run python lol_differential_evolution.py # DE optimization
uv run python compare_algorithms.py         # Head-to-head comparison
```

### **Algorithm Customization**
```python
# Genetic Algorithm parameters
ga = GeneticAlgorithm(
    optimizer, 
    population_size=50,    # Population diversity
    generations=100,       # Evolution time
    crossover_rate=0.8,    # Exploitation vs exploration
    mutation_rate=0.15,    # Innovation rate
    elite_size=5          # Elitism strength
)

# Differential Evolution parameters  
de = DifferentialEvolution(
    optimizer,
    F=0.5,                # Mutation factor (exploration)
    CR=0.9,               # Crossover probability (exploitation)
    population_size=50,   # Search space coverage
    generations=200       # Extended search time
)
```

## 🔬 **Research Contributions**

1. **Novel Encoding Schemes**: Dual approach optimized for each algorithm's strengths
2. **Hybrid ML-Evolutionary**: Random Forest fitness evaluation with game statistics
3. **Domain-Specific Operators**: Item-aware crossover and mutation strategies
4. **Comparative Analysis**: Systematic GA vs DE evaluation on real game data
5. **Scalable Architecture**: Automatic champion selection and data processing

## 🛠️ **Technology Stack**

- **Core**: Python 3.13+ with `uv` package management
- **ML**: scikit-learn (Random Forest), pandas, numpy
- **Data**: Riot Games API, 2,809 high-tier matches
- **Optimization**: Custom GA/DE implementations
- **Visualization**: Web-based results dashboard

## 📈 **Current Status**

- ✅ **Data Collection**: 936 games for Champion 236 (Lucian)
- ✅ **Algorithm Implementation**: Both GA and DE fully functional
- ✅ **Performance Validation**: 10.3% win rate improvement achieved
- ✅ **Comparative Analysis**: Comprehensive GA vs DE evaluation
- ✅ **Web Dashboard**: Real-time results visualization
- 🔄 **Multi-Champion**: Expanding to additional champions
- 🔄 **Advanced Features**: Situational builds, enemy composition adaptation

## 🔗 **Links & Resources**

- **Live Demo**: [Project Showcase](https://ignacio-ireta.github.io)
- **GitHub**: [ignacio-ireta](https://github.com/ignacio-ireta)
- **LinkedIn**: [Ignacio Ireta](https://www.linkedin.com/in/ignacioireta/)
- **Documentation**: [Data Science Workflow](datascience_project/README.md)

---

*Evolutionary algorithms meet esports: Where Darwin meets the Rift* 🧬⚔️
