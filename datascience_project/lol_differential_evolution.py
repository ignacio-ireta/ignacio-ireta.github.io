import numpy as np
import pandas as pd
import json
from copy import deepcopy
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import warnings
warnings.filterwarnings('ignore')

class LoLBuildOptimizerDE:
    """League of Legends Item Build Optimizer using Differential Evolution"""
    
    def __init__(self, champion_id=None):
        # Load champion ID from metadata if not provided
        if champion_id is None:
            champion_id = self.load_champion_id_from_metadata()
        
        self.champion_id = champion_id
        self.load_data()
        self.train_prediction_model()
        
    def load_champion_id_from_metadata(self):
        """Load the champion ID from the metadata file"""
        try:
            with open('lol_data_collector/champion_metadata.json', 'r') as f:
                metadata = json.load(f)
            return metadata['champion_id']
        except FileNotFoundError:
            raise FileNotFoundError(
                "Champion metadata not found. Please run the data processor first:\n"
                "  uv run python run_processor.py"
            )
        except KeyError:
            raise ValueError("Invalid metadata file format - missing champion_id")
        
    def load_data(self):
        """Load champion data and metadata"""
        print(f"Loading data for Champion {self.champion_id}")
        
        # Load metadata
        with open('lol_data_collector/champion_metadata.json', 'r') as f:
            self.metadata = json.load(f)
        
        # Verify champion ID matches
        if self.metadata['champion_id'] != self.champion_id:
            raise ValueError(f"Champion ID mismatch: expected {self.champion_id}, got {self.metadata['champion_id']}")
        
        # Load champion-specific data
        self.champion_data = pd.read_parquet(f'lol_data_collector/champion_{self.champion_id}_data.parquet')
        
        self.available_items = self.metadata['available_items']
        self.item_slots = self.metadata['item_slots']
        self.num_items = len(self.available_items)
        self.num_slots = len(self.item_slots)
        
        # Create item to index mapping for continuous representation
        self.item_to_idx = {item: i for i, item in enumerate(self.available_items)}
        self.idx_to_item = {i: item for i, item in enumerate(self.available_items)}
        
        print(f"   • Champion: {self.champion_id}")
        print(f"   • Games available: {len(self.champion_data)}")
        print(f"   • Available items: {self.num_items}")
        print(f"   • Item slots: {self.num_slots}")
        
    def train_prediction_model(self):
        """Train a machine learning model to predict win probability"""
        print("Training win prediction model...")
        
        # Prepare features
        feature_columns = self.item_slots + [
            'kills', 'deaths', 'assists', 'totalMinionsKilled', 'goldEarned',
            'totalDamageDealtToChampions', 'visionScore', 'champLevel',
            'timePlayed', 'damageDealtToTurrets'
        ]
        
        # Filter available columns
        available_features = [col for col in feature_columns if col in self.champion_data.columns]
        
        X = self.champion_data[available_features].fillna(0)
        y = self.champion_data['win'].astype(int)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
        
        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"   • Model accuracy: {accuracy:.3f}")
        print(f"   • Features used: {len(available_features)}")
        
        self.feature_columns = available_features
        
    def continuous_to_discrete(self, x):
        """Convert continuous representation to discrete item build"""
        build = []
        for i in range(self.num_slots):
            # Each slot has a continuous value [0, num_items]
            # 0 means empty slot, 1-num_items maps to items
            slot_value = x[i]
            if slot_value < 1.0:
                build.append(0)  # Empty slot
            else:
                item_idx = int(slot_value - 1) % self.num_items
                build.append(self.available_items[item_idx])
        return build
    
    def predict_win_probability(self, x, game_stats=None):
        """Predict win probability for a continuous representation"""
        build = self.continuous_to_discrete(x)
        
        # Create feature vector
        features = np.zeros(len(self.feature_columns))
        
        # Set item features
        for i, slot in enumerate(self.item_slots):
            if slot in self.feature_columns:
                slot_idx = self.feature_columns.index(slot)
                if i < len(build):
                    features[slot_idx] = build[i]
        
        # Set average game statistics if not provided
        if game_stats is None:
            for col in self.feature_columns:
                if col not in self.item_slots:
                    col_idx = self.feature_columns.index(col)
                    features[col_idx] = self.champion_data[col].mean()
        else:
            for col, value in game_stats.items():
                if col in self.feature_columns:
                    col_idx = self.feature_columns.index(col)
                    features[col_idx] = value
        
        # Predict probability
        prob = self.model.predict_proba([features])[0][1]
        return prob

class Individual:
    """Individual in the differential evolution algorithm"""
    
    def __init__(self, optimizer, x=None):
        self.optimizer = optimizer
        self.num_slots = optimizer.num_slots
        self.num_items = optimizer.num_items
        
        if x is None:
            # Random initialization: each slot can be 0 (empty) or 1-num_items (item index + 1)
            self.x = np.random.uniform(0, self.num_items + 1, self.num_slots)
        else:
            self.x = x.copy()
        
        self.f = self.calculate_fitness()
    
    def calculate_fitness(self):
        """Calculate fitness (negative because DE minimizes)"""
        # Get win probability
        win_prob = self.optimizer.predict_win_probability(self.x)
        
        # Convert to discrete build for bonuses
        build = self.optimizer.continuous_to_discrete(self.x)
        
        # Bonus for item diversity
        unique_items = len(set([item for item in build if item != 0]))
        diversity_bonus = unique_items / self.num_slots * 0.1
        
        # Completion bonus
        filled_slots = len([item for item in build if item != 0])
        completion_bonus = filled_slots / self.num_slots * 0.05
        
        fitness = win_prob + diversity_bonus + completion_bonus
        
        # Return negative for minimization
        return -fitness
    
    def deepcopy(self):
        return deepcopy(self)
    
    def __str__(self):
        build = self.optimizer.continuous_to_discrete(self.x)
        return f"x: {self.x}, build: {build}, f: {self.f:.3f}"

def mutation(r0, r1, r2, F_m):
    """Differential evolution mutation"""
    return r0 + F_m * (r1 - r2)

def crossover(x, v, pr_c):
    """Differential evolution crossover"""
    i_rand = np.random.randint(0, len(x))
    new_ind = []
    for i in range(len(x)):
        if i == i_rand or np.random.uniform(0, 1) < pr_c:
            new_ind.append(v[i])
        else:
            new_ind.append(x[i])
    return np.array(new_ind)

def differential_evolution(optimizer, G=200, size_pop=50, pr_c=0.9, F_m=0.5):
    """Differential Evolution algorithm for LoL build optimization"""
    
    print(f"Starting Differential Evolution optimization...")
    print(f"   • Population size: {size_pop}")
    print(f"   • Generations: {G}")
    print(f"   • Crossover probability: {pr_c}")
    print(f"   • Mutation factor: {F_m}")
    
    # Bounds for continuous representation
    inf = np.array([0] * optimizer.num_slots)
    sup = np.array([optimizer.num_items + 1] * optimizer.num_slots)
    
    # Initialize population
    pop = [Individual(optimizer) for _ in range(size_pop)]
    
    # Add some known good builds from training data
    champion_data = optimizer.champion_data
    winning_games = champion_data[champion_data['win'] == True]
    
    for i, (_, game) in enumerate(winning_games.head(min(10, len(winning_games))).iterrows()):
        if i < size_pop:
            build = [game[slot] if pd.notna(game[slot]) else 0 for slot in optimizer.item_slots]
            # Convert discrete build to continuous representation
            x = []
            for item in build:
                if item == 0:
                    x.append(np.random.uniform(0, 1))  # Empty slot
                elif item in optimizer.item_to_idx:
                    x.append(optimizer.item_to_idx[item] + 1 + np.random.uniform(0, 0.5))
                else:
                    x.append(np.random.uniform(1, optimizer.num_items + 1))
            pop[i] = Individual(optimizer, np.array(x))
    
    best_fitness_history = []
    
    for generation in range(G):
        new_pop = []
        for i in range(size_pop):
            # Select three random individuals different from current
            candidates = [j for j in range(size_pop) if j != i]
            r0_idx, r1_idx, r2_idx = np.random.choice(candidates, 3, replace=False)
            r0, r1, r2 = pop[r0_idx], pop[r1_idx], pop[r2_idx]
            
            # Mutation
            v = mutation(r0.x, r1.x, r2.x, F_m)
            v = np.clip(v, inf, sup)
            
            # Crossover
            new_x = crossover(pop[i].x, v, pr_c)
            new_individual = Individual(optimizer, new_x)
            new_pop.append(new_individual)
        
        # Selection (combine old and new populations, keep best)
        combined_pop = pop + new_pop
        combined_pop.sort(key=lambda x: x.f)  # Sort by fitness (ascending because we minimize)
        pop = combined_pop[:size_pop]
        
        # Track best fitness (remember we minimize negative fitness)
        best_fitness = -pop[0].f
        best_fitness_history.append(best_fitness)
        
        if generation % 40 == 0:
            avg_fitness = -np.mean([ind.f for ind in pop])
            print(f"   Generation {generation:3d}: Best={best_fitness:.3f}, Avg={avg_fitness:.3f}")
    
    best_individual = pop[0]
    print(f"\nOptimization complete!")
    print(f"   • Best fitness: {-best_individual.f:.3f}")
    print(f"   • Win probability: {optimizer.predict_win_probability(best_individual.x):.3f}")
    
    return best_individual, best_fitness_history

def main():
    """Main function to run differential evolution"""
    print("League of Legends Item Build Optimizer - Differential Evolution")
    print("=" * 65)
    
    # Initialize optimizer (automatically detects champion from metadata)
    optimizer = LoLBuildOptimizerDE()
    
    # Run differential evolution
    best_individual, fitness_history = differential_evolution(
        optimizer=optimizer,
        G=200,
        size_pop=50,
        pr_c=0.9,
        F_m=0.5
    )
    
    # Convert result to discrete build
    optimal_build = optimizer.continuous_to_discrete(best_individual.x)
    
    # Display results
    print(f"\nOptimal Item Build for Champion {optimizer.champion_id}:")
    item_mapping = {item: f"Item_{item}" for item in optimizer.available_items}
    
    for i, item_id in enumerate(optimal_build):
        slot_name = f"Slot {i+1}"
        item_name = item_mapping.get(item_id, "Empty") if item_id != 0 else "Empty"
        print(f"   • {slot_name}: {item_name} (ID: {item_id})")
    
    print(f"\nPerformance Metrics:")
    win_prob = optimizer.predict_win_probability(best_individual.x)
    print(f"   • Predicted win probability: {win_prob:.1%}")
    print(f"   • Fitness score: {-best_individual.f:.3f}")
    print(f"   • Unique items: {len(set([item for item in optimal_build if item != 0]))}")
    
    # Save results
    results = {
        'champion_id': int(optimizer.champion_id),
        'optimal_build': [int(item) for item in optimal_build],
        'continuous_representation': best_individual.x.tolist(),
        'fitness': float(-best_individual.f),
        'win_probability': float(win_prob),
        'algorithm': 'Differential Evolution',
        'generations': 200,
        'population_size': 50
    }
    
    with open('lol_data_collector/optimal_build_results_de.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"   • Results saved to: lol_data_collector/optimal_build_results_de.json")

if __name__ == "__main__":
    main() 