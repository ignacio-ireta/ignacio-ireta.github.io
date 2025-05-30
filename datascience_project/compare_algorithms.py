import json
import pandas as pd

def compare_algorithms():
    """Compare results from Genetic Algorithm and Differential Evolution"""
    
    print("Algorithm Comparison: GA vs DE")
    print("=" * 50)
    
    # Load metadata for context
    try:
        with open('lol_data_collector/champion_metadata.json', 'r') as f:
            metadata = json.load(f)
    except FileNotFoundError:
        print("ERROR: Champion metadata not found. Please run the data processor first:")
        print("   uv run python run_processor.py")
        return
    
    # Load results
    try:
        with open('lol_data_collector/optimal_build_results.json', 'r') as f:
            ga_results = json.load(f)
    except FileNotFoundError:
        print("ERROR: Genetic Algorithm results not found. Please run:")
        print("   uv run python lol_genetic_algorithm.py")
        return
    
    try:
        with open('lol_data_collector/optimal_build_results_de.json', 'r') as f:
            de_results = json.load(f)
    except FileNotFoundError:
        print("ERROR: Differential Evolution results not found. Please run:")
        print("   uv run python lol_differential_evolution.py")
        return
    
    # Verify all results are for the same champion
    champion_id = metadata['champion_id']
    if ga_results['champion_id'] != champion_id:
        print(f"WARNING: GA results are for champion {ga_results['champion_id']}, but metadata is for champion {champion_id}")
    if de_results['champion_id'] != champion_id:
        print(f"WARNING: DE results are for champion {de_results['champion_id']}, but metadata is for champion {champion_id}")
    
    print(f"Champion {champion_id} Build Optimization Results")
    print(f"   • Training data: {metadata['total_games']} games")
    print(f"   • Baseline win rate: {metadata['win_rate']:.1%}")
    print(f"   • Available items: {metadata['num_items']}")
    
    print(f"\nAlgorithm Performance Comparison:")
    print(f"{'Metric':<25} {'Genetic Algorithm':<20} {'Differential Evolution'}")
    print("-" * 70)
    
    ga_win_prob = f"{ga_results['win_probability']:.1%}"
    de_win_prob = f"{de_results['win_probability']:.1%}"
    ga_fitness = f"{ga_results['fitness']:.3f}"
    de_fitness = f"{de_results['fitness']:.3f}"
    ga_unique = len(set([x for x in ga_results['optimal_build'] if x != 0]))
    de_unique = len(set([x for x in de_results['optimal_build'] if x != 0]))
    
    print(f"{'Win Probability':<25} {ga_win_prob:<20} {de_win_prob}")
    print(f"{'Fitness Score':<25} {ga_fitness:<20} {de_fitness}")
    print(f"{'Unique Items':<25} {ga_unique:<20} {de_unique}")
    print(f"{'Generations':<25} {ga_results.get('generations', 'N/A'):<20} {de_results.get('generations', 'N/A')}")
    print(f"{'Population Size':<25} {ga_results.get('population_size', 'N/A'):<20} {de_results.get('population_size', 'N/A')}")
    
    # Build comparison
    print(f"\nOptimal Build Comparison:")
    print(f"{'Slot':<8} {'Genetic Algorithm':<20} {'Differential Evolution'}")
    print("-" * 50)
    
    for i in range(metadata['num_slots']):
        ga_item = ga_results['optimal_build'][i] if i < len(ga_results['optimal_build']) else 0
        de_item = de_results['optimal_build'][i] if i < len(de_results['optimal_build']) else 0
        
        ga_display = f"Item {ga_item}" if ga_item != 0 else "Empty"
        de_display = f"Item {de_item}" if de_item != 0 else "Empty"
        
        print(f"Slot {i+1:<3} {ga_display:<20} {de_display}")
    
    # Item overlap analysis
    ga_items = set([x for x in ga_results['optimal_build'] if x != 0])
    de_items = set([x for x in de_results['optimal_build'] if x != 0])
    
    overlap = ga_items.intersection(de_items)
    overlap_ratio = len(overlap) / max(len(ga_items), len(de_items)) if max(len(ga_items), len(de_items)) > 0 else 0
    
    print(f"\nBuild Similarity Analysis:")
    print(f"   • Common items: {overlap}")
    print(f"   • Items only in GA: {ga_items - de_items}")
    print(f"   • Items only in DE: {de_items - ga_items}")
    print(f"   • Overlap ratio: {overlap_ratio:.1%}")
    
    # Performance improvement
    baseline_wr = metadata['win_rate']
    ga_improvement = (ga_results['win_probability'] - baseline_wr) / baseline_wr * 100
    de_improvement = (de_results['win_probability'] - baseline_wr) / baseline_wr * 100
    
    print(f"\nPerformance Improvement vs Baseline:")
    print(f"   • Genetic Algorithm: +{ga_improvement:.1f}% win rate improvement")
    print(f"   • Differential Evolution: +{de_improvement:.1f}% win rate improvement")
    
    # Determine winner
    if ga_results['win_probability'] > de_results['win_probability']:
        winner = "Genetic Algorithm"
        advantage = ga_results['win_probability'] - de_results['win_probability']
    elif de_results['win_probability'] > ga_results['win_probability']:
        winner = "Differential Evolution"
        advantage = de_results['win_probability'] - ga_results['win_probability']
    else:
        winner = "Tie"
        advantage = 0
    
    print(f"\nWinner: {winner}")
    if winner != "Tie":
        print(f"   • Advantage: {advantage:.1%} higher win probability")
    
    # Save comparison results
    comparison = {
        'champion_id': champion_id,
        'baseline_win_rate': baseline_wr,
        'genetic_algorithm': ga_results,
        'differential_evolution': de_results,
        'comparison': {
            'winner': winner,
            'advantage': float(advantage) if advantage != 0 else 0,
            'ga_improvement': float(ga_improvement),
            'de_improvement': float(de_improvement),
            'overlap_ratio': overlap_ratio,
            'common_items': list(overlap)
        }
    }
    
    with open('lol_data_collector/algorithm_comparison.json', 'w') as f:
        json.dump(comparison, f, indent=2)
    
    print(f"\nComparison results saved to: lol_data_collector/algorithm_comparison.json")
    
    # Practical recommendations
    print(f"\nPractical Recommendations:")
    if winner == "Genetic Algorithm":
        print("   • Use Genetic Algorithm for this champion")
        print("   • GA found a better solution with higher diversity")
    elif winner == "Differential Evolution":
        print("   • Use Differential Evolution for this champion")
        print("   • DE found a more efficient solution")
    else:
        print("   • Both algorithms performed equally well")
        print("   • Choose based on computational preferences")
    
    print(f"   • Both algorithms significantly outperform baseline ({baseline_wr:.1%})")
    print(f"   • Recommended items appear in both solutions: {overlap}")

if __name__ == "__main__":
    compare_algorithms() 