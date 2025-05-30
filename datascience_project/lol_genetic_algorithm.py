import numpy as np
import pandas as pd
import json
from copy import deepcopy
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

class LoLBuildOptimizer:
    """League of Legends Item Build Optimizer using Genetic Algorithm and Machine Learning"""
    
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
        
        print(f"   • Champion: {self.champion_id}")
        print(f"   • Games available: {len(self.champion_data)}")
        print(f"   • Available items: {self.num_items}")
        print(f"   • Item slots: {self.num_slots}")
        
    def train_prediction_model(self):
        """Train a machine learning model to predict win probability"""
        print("Training win prediction model...")
        
        # Prepare features (items + other game statistics)
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
        
    def predict_win_probability(self, build, game_stats=None):
        """Predict win probability for a given item build"""
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
        prob = self.model.predict_proba([features])[0][1]  # Probability of winning
        return prob

class Individual:
    """Individual in the genetic algorithm representing an item build"""
    
    def __init__(self, optimizer, build=None):
        self.optimizer = optimizer
        self.num_slots = optimizer.num_slots
        self.available_items = optimizer.available_items
        
        if build is None:
            # Random initialization
            self.build = self.generate_random_build()
        else:
            self.build = build.copy()
        
        self.fitness = self.calculate_fitness()
    
    def generate_random_build(self):
        """Generate a random item build"""
        build = [0] * self.num_slots  # Start with empty slots
        
        # Fill slots with random items (some can be empty)
        for i in range(self.num_slots):
            if np.random.random() < 0.8:  # 80% chance to place an item
                build[i] = np.random.choice(self.available_items)
        
        return build
    
    def calculate_fitness(self):
        """Calculate fitness based on predicted win probability"""
        # Basic win probability
        win_prob = self.optimizer.predict_win_probability(self.build)
        
        # Bonus for item diversity (avoid duplicate items)
        unique_items = len(set([item for item in self.build if item != 0]))
        diversity_bonus = unique_items / self.num_slots * 0.1
        
        # Penalty for empty slots in late game builds
        filled_slots = len([item for item in self.build if item != 0])
        completion_bonus = filled_slots / self.num_slots * 0.05
        
        return win_prob + diversity_bonus + completion_bonus
    
    def mutate(self, mutation_rate=0.1):
        """Mutate the build"""
        new_build = self.build.copy()
        
        for i in range(self.num_slots):
            if np.random.random() < mutation_rate:
                if np.random.random() < 0.5:
                    # Replace with random item
                    new_build[i] = np.random.choice(self.available_items)
                else:
                    # Remove item (set to 0)
                    new_build[i] = 0
        
        return Individual(self.optimizer, new_build)
    
    def crossover(self, other):
        """Create offspring through crossover"""
        # Single-point crossover
        crossover_point = np.random.randint(1, self.num_slots)
        
        child1_build = self.build[:crossover_point] + other.build[crossover_point:]
        child2_build = other.build[:crossover_point] + self.build[crossover_point:]
        
        return Individual(self.optimizer, child1_build), Individual(self.optimizer, child2_build)
    
    def __str__(self):
        item_names = [f"Item{item}" if item != 0 else "Empty" for item in self.build]
        return f"Build: {item_names}, Fitness: {self.fitness:.3f}"

class GeneticAlgorithm:
    """Genetic Algorithm for optimizing League of Legends item builds"""
    
    def __init__(self, optimizer, population_size=50, generations=100, 
                 crossover_rate=0.8, mutation_rate=0.1, elite_size=5):
        self.optimizer = optimizer
        self.population_size = population_size
        self.generations = generations
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate
        self.elite_size = elite_size
        
        self.population = []
        self.best_individual = None
        self.fitness_history = []
        
    def initialize_population(self):
        """Initialize random population"""
        print(f"Initializing population of {self.population_size} individuals...")
        
        self.population = []
        
        # Add some builds from the training data
        champion_data = self.optimizer.champion_data
        winning_games = champion_data[champion_data['win'] == True]
        
        for _, game in winning_games.head(min(10, len(winning_games))).iterrows():
            build = [game[slot] if pd.notna(game[slot]) else 0 for slot in self.optimizer.item_slots]
            build = [int(item) for item in build]
            self.population.append(Individual(self.optimizer, build))
        
        # Fill rest with random individuals
        while len(self.population) < self.population_size:
            self.population.append(Individual(self.optimizer))
        
        self.population.sort(key=lambda x: x.fitness, reverse=True)
        self.best_individual = self.population[0]
        
    def selection(self):
        """Tournament selection"""
        tournament_size = 5
        selected = []
        
        for _ in range(self.population_size):
            tournament = np.random.choice(self.population, tournament_size, replace=False)
            winner = max(tournament, key=lambda x: x.fitness)
            selected.append(winner)
        
        return selected
    
    def evolve_generation(self):
        """Evolve one generation"""
        # Selection
        selected = self.selection()
        
        # Create new population
        new_population = []
        
        # Keep elite individuals
        elite = sorted(self.population, key=lambda x: x.fitness, reverse=True)[:self.elite_size]
        new_population.extend(elite)
        
        # Generate offspring
        while len(new_population) < self.population_size:
            parent1, parent2 = np.random.choice(selected, 2, replace=False)
            
            if np.random.random() < self.crossover_rate:
                child1, child2 = parent1.crossover(parent2)
                new_population.extend([child1, child2])
            else:
                new_population.extend([parent1, parent2])
        
        # Mutation
        for i in range(self.elite_size, len(new_population)):
            if np.random.random() < self.mutation_rate:
                new_population[i] = new_population[i].mutate(self.mutation_rate)
        
        # Update population
        self.population = new_population[:self.population_size]
        self.population.sort(key=lambda x: x.fitness, reverse=True)
        
        # Update best individual
        if self.population[0].fitness > self.best_individual.fitness:
            self.best_individual = self.population[0]
    
    def run(self):
        """Run the genetic algorithm"""
        print(f"Starting Genetic Algorithm optimization...")
        print(f"   • Population size: {self.population_size}")
        print(f"   • Generations: {self.generations}")
        print(f"   • Crossover rate: {self.crossover_rate}")
        print(f"   • Mutation rate: {self.mutation_rate}")
        
        self.initialize_population()
        
        for generation in range(self.generations):
            self.evolve_generation()
            
            # Track fitness
            best_fitness = self.best_individual.fitness
            avg_fitness = np.mean([ind.fitness for ind in self.population])
            self.fitness_history.append((best_fitness, avg_fitness))
            
            if generation % 20 == 0:
                print(f"   Generation {generation:3d}: Best={best_fitness:.3f}, Avg={avg_fitness:.3f}")
        
        print(f"\nOptimization complete!")
        print(f"   • Best fitness: {self.best_individual.fitness:.3f}")
        print(f"   • Win probability: {self.optimizer.predict_win_probability(self.best_individual.build):.3f}")
        
        return self.best_individual

def main():
    """Main function to run the genetic algorithm"""
    print("League of Legends Item Build Optimizer")
    print("=" * 50)
    
    # Initialize optimizer (automatically detects champion from metadata)
    optimizer = LoLBuildOptimizer()
    
    # Run genetic algorithm
    ga = GeneticAlgorithm(
        optimizer=optimizer,
        population_size=50,
        generations=100,
        crossover_rate=0.8,
        mutation_rate=0.15,
        elite_size=5
    )
    
    best_individual = ga.run()
    
    # Display results
    print(f"\nOptimal Item Build for Champion {optimizer.champion_id}:")
    item_mapping = {item: f"Item_{item}" for item in optimizer.available_items}
    
    for i, item_id in enumerate(best_individual.build):
        slot_name = f"Slot {i+1}"
        item_name = item_mapping.get(item_id, "Empty") if item_id != 0 else "Empty"
        print(f"   • {slot_name}: {item_name} (ID: {item_id})")
    
    print(f"\nPerformance Metrics:")
    print(f"   • Predicted win probability: {optimizer.predict_win_probability(best_individual.build):.1%}")
    print(f"   • Fitness score: {best_individual.fitness:.3f}")
    print(f"   • Unique items: {len(set([item for item in best_individual.build if item != 0]))}")
    
    # Save results
    results = {
        'champion_id': int(optimizer.champion_id),
        'optimal_build': [int(item) for item in best_individual.build],
        'fitness': float(best_individual.fitness),
        'win_probability': float(optimizer.predict_win_probability(best_individual.build)),
        'generations': ga.generations,
        'population_size': ga.population_size
    }
    
    with open('lol_data_collector/optimal_build_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"   • Results saved to: lol_data_collector/optimal_build_results.json")

if __name__ == "__main__":
    main() 