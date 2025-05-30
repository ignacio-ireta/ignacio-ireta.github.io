#!/usr/bin/env python3
"""
League of Legends Build Optimization - Complete Pipeline

This script runs the complete optimization workflow:
1. Data Collection (if needed)
2. Process match data and analyze champions
3. Run Genetic Algorithm optimization
4. Run Differential Evolution optimization
5. Compare and analyze results
6. Generate EDA insights for website
7. Update website with dynamic content
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_step(step_name, command, required_files=None, optional=False, source_files=None):
    """Run a step in the optimization workflow"""
    print(f"\n{'='*60}")
    print(f"STEP: {step_name}")
    print(f"{'='*60}")
    
    # Check if required files exist (for skipping steps)
    if required_files:
        all_exist = True
        for file_path in required_files:
            if not os.path.exists(file_path):
                all_exist = False
                break
        
        if all_exist:
            # Check if source files are newer than result files (force reprocessing)
            if source_files:
                should_reprocess = False
                try:
                    # Get the oldest result file timestamp
                    result_times = [os.path.getmtime(f) for f in required_files if os.path.exists(f)]
                    oldest_result_time = min(result_times) if result_times else 0
                    
                    # Get the newest source file timestamp
                    source_times = [os.path.getmtime(f) for f in source_files if os.path.exists(f)]
                    newest_source_time = max(source_times) if source_times else 0
                    
                    if newest_source_time > oldest_result_time:
                        should_reprocess = True
                        print(f"🔄 Source data is newer than results, reprocessing {step_name}")
                        
                        # Show timestamp comparison
                        import datetime
                        source_date = datetime.datetime.fromtimestamp(newest_source_time).strftime('%Y-%m-%d %H:%M:%S')
                        result_date = datetime.datetime.fromtimestamp(oldest_result_time).strftime('%Y-%m-%d %H:%M:%S')
                        print(f"   📅 Newest source: {source_date}")
                        print(f"   📅 Oldest result: {result_date}")
                        
                except Exception as e:
                    print(f"⚠️ Could not check timestamps: {e}, proceeding with reprocessing")
                    should_reprocess = True
                
                if not should_reprocess:
                    print(f"✅ Required files exist and are up-to-date, skipping {step_name}")
                    return True
            else:
                print(f"✅ Required files exist, skipping {step_name}")
                return True
    
    # Set up environment for UTF-8 encoding
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    
    # Run the command
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            env=env
        )
        
        if result.returncode == 0:
            print(result.stdout)
            print(f"✅ SUCCESS: {step_name} completed successfully!")
            return True
        else:
            print(f"❌ ERROR: {step_name} failed:")
            print(result.stderr)
            if optional:
                print(f"⚠️ {step_name} is optional, continuing...")
                return True
            return False
            
    except Exception as e:
        print(f"❌ ERROR: Error running {step_name}: {e}")
        if optional:
            print(f"⚠️ {step_name} is optional, continuing...")
            return True
        return False

def check_data_files():
    """Check if input data files exist"""
    required_files = [
        "lol_data_collector/matches_timeline.json",
        "lol_data_collector/players_puuids.json",
        "lol_data_collector/latest_games.json"
    ]
    
    print("📁 Checking input data files:")
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
            print(f"   ✓ {file_path} ({file_size:.1f}MB)")
        else:
            print(f"   ❌ {file_path} (not found)")
            all_exist = False
    
    if not all_exist:
        print("\n⚠️ Missing input data files.")
        response = input("Would you like to run data collection first? (y/n): ").lower().strip()
        if response == 'y':
            return "collect_data"
        else:
            print("Please run the data collector first: uv run python run_collector.py")
            return False
    
    return True

def update_website_content():
    """Update website with latest optimization results"""
    print("\n🌐 Updating website with dynamic content...")
    
    try:
        from website_manager import WebsiteDataManager
        
        manager = WebsiteDataManager()
        success = manager.update_website()
        
        if success:
            print("✅ Website data updated successfully!")
        else:
            print("⚠️ Website update completed with some issues")
        
        return success
        
    except ImportError:
        print("⚠️ Website manager not available, skipping website update")
        return True
    except Exception as e:
        print(f"⚠️ Error updating website: {e}")
        return True

def display_final_summary():
    """Display comprehensive summary of all results"""
    print(f"\n{'='*70}")
    print("🎉 COMPLETE PIPELINE SUMMARY")
    print(f"{'='*70}")
    
    # Load and display key results
    try:
        # Champion metadata
        with open('lol_data_collector/champion_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        print(f"\n🏆 Champion Analysis:")
        print(f"   • Selected Champion: {metadata['champion_id']}")
        print(f"   • Total Games: {metadata['total_games']}")
        print(f"   • Baseline Win Rate: {metadata['win_rate']:.1%}")
        print(f"   • Available Items: {metadata['num_items']}")
        
        # Algorithm comparison
        with open('lol_data_collector/algorithm_comparison.json', 'r') as f:
            comparison = json.load(f)
        
        print(f"\n🧬 Optimization Results:")
        ga_wr = comparison['genetic_algorithm']['win_probability']
        de_wr = comparison['differential_evolution']['win_probability']
        baseline_wr = comparison['baseline_win_rate']
        
        print(f"   • Genetic Algorithm: {ga_wr:.1%} (+{((ga_wr/baseline_wr)-1)*100:.1f}%)")
        print(f"   • Differential Evolution: {de_wr:.1%} (+{((de_wr/baseline_wr)-1)*100:.1f}%)")
        print(f"   • Winner: {comparison['comparison']['winner']}")
        print(f"   • Best Improvement: +{comparison['comparison']['advantage']*100:.1f}%")
        
        # EDA insights
        if os.path.exists('eda_insights.json'):
            with open('eda_insights.json', 'r') as f:
                insights = json.load(f)
            
            print(f"\n📊 Data Insights:")
            if 'performance_stats' in insights:
                stats = insights['performance_stats']
                print(f"   • Average KDA: {stats['avg_kda']:.2f}")
                print(f"   • Average Gold: {stats['avg_gold']:,}")
                print(f"   • Game Duration: {stats['avg_duration']/60:.1f} min")
            
            if 'build_diversity' in insights:
                diversity = insights['build_diversity']
                print(f"   • Build Diversity: {diversity['diversity_percentage']:.1f}%")
                print(f"   • Unique Builds: {diversity['unique_builds']}")
        
    except Exception as e:
        print(f"⚠️ Could not load summary data: {e}")
    
    # File summary
    print(f"\n📁 Generated Files:")
    output_files = [
        ("lol_data_collector/players_data.parquet", "Player data"),
        ("lol_data_collector/matches_data.parquet", "Match data"),
        ("lol_data_collector/champion_metadata.json", "Champion metadata"),
        ("lol_data_collector/optimal_build_results.json", "GA results"),
        ("lol_data_collector/optimal_build_results_de.json", "DE results"),
        ("lol_data_collector/algorithm_comparison.json", "Algorithm comparison"),
        ("eda_insights.json", "EDA insights for website")
    ]
    
    for file_path, description in output_files:
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path) / (1024)  # KB
            if file_size > 1024:
                file_size_str = f"{file_size/1024:.1f}MB"
            else:
                file_size_str = f"{file_size:.1f}KB"
            print(f"   ✓ {description} ({file_size_str})")
        else:
            print(f"   ❌ {description} (not generated)")
    
    # Website update info
    print(f"\n🌐 Website Integration:")
    print(f"   • Dynamic content files ready")
    print(f"   • Visit your website to see live results")
    print(f"   • All charts and metrics will update automatically")
    print(f"   • No manual HTML editing required!")

def main():
    """Run the complete optimization workflow"""
    print("🎮 League of Legends Build Optimization - Complete Pipeline")
    print("=" * 70)
    print("This will run the entire pipeline from data collection to website updates")
    
    # Show usage if help requested
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("\n📖 Usage:")
        print("   python run_optimization.py              # Smart processing (checks timestamps)")
        print("   python run_optimization.py --force      # Force reprocess all steps")
        print("   python run_optimization.py --fresh      # Same as --force")
        print("   python run_optimization.py -f           # Same as --force")
        print("\n🔍 Smart Processing:")
        print("   • Automatically detects when source data is newer than results")
        print("   • Only reprocesses steps that need updating")
        print("   • Saves time by skipping up-to-date steps")
        print("\n🔄 Force Processing:")
        print("   • Removes all existing result files")
        print("   • Runs every step from scratch")
        print("   • Use when you want completely fresh results")
        sys.exit(0)
    
    # Check for force reprocessing flag
    force_reprocess = False
    if len(sys.argv) > 1 and sys.argv[1] in ['--force', '-f', '--fresh']:
        force_reprocess = True
        print("🔄 FORCE REPROCESSING MODE: All steps will run regardless of existing files")
    else:
        print("🧠 SMART PROCESSING MODE: Will check timestamps and only reprocess when needed")
    
    # Check if we're in the right directory
    if not os.path.exists("lol_data_collector"):
        print("❌ Please run this script from the datascience_project directory")
        sys.exit(1)
    
    # Check input data files
    data_check = check_data_files()
    if data_check == "collect_data":
        # Run data collection first
        success = run_step(
            "Data Collection",
            "uv run python run_collector.py",
            optional=False
        )
        if not success:
            print("❌ Data collection failed. Cannot continue.")
            sys.exit(1)
    elif not data_check:
        sys.exit(1)
    
    # If force reprocessing, remove existing result files
    if force_reprocess:
        print("\n🗑️ Removing existing result files for fresh processing...")
        files_to_remove = [
            "lol_data_collector/champion_metadata.json",
            "lol_data_collector/players_data.parquet", 
            "lol_data_collector/matches_data.parquet",
            "lol_data_collector/optimal_build_results.json",
            "lol_data_collector/optimal_build_results_de.json",
            "lol_data_collector/algorithm_comparison.json",
            "eda_insights.json"
        ]
        
        for file_path in files_to_remove:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"   🗑️ Removed: {file_path}")
                except Exception as e:
                    print(f"   ⚠️ Could not remove {file_path}: {e}")
        print("✅ Ready for fresh processing")
    
    # Step 1: Data Processing and Champion Analysis
    success = run_step(
        "Data Processing & Champion Analysis",
        "uv run python run_processor.py",
        required_files=[
            "lol_data_collector/champion_metadata.json",
            "lol_data_collector/players_data.parquet"
        ],
        source_files=[
            "lol_data_collector/matches_timeline.json",
            "lol_data_collector/players_puuids.json",
            "lol_data_collector/latest_games.json"
        ] if not force_reprocess else None
    )
    if not success:
        print("❌ Data processing failed. Cannot continue.")
        sys.exit(1)
    
    # Step 2: Genetic Algorithm Optimization
    success = run_step(
        "Genetic Algorithm Optimization",
        "uv run python lol_genetic_algorithm.py",
        required_files=["lol_data_collector/optimal_build_results.json"],
        source_files=[
            "lol_data_collector/champion_metadata.json",
            "lol_data_collector/players_data.parquet"
        ] if not force_reprocess else None
    )
    if not success:
        print("⚠️ Genetic Algorithm failed. Continuing with next step...")
    
    # Step 3: Differential Evolution Optimization
    success = run_step(
        "Differential Evolution Optimization", 
        "uv run python lol_differential_evolution.py",
        required_files=["lol_data_collector/optimal_build_results_de.json"],
        source_files=[
            "lol_data_collector/champion_metadata.json",
            "lol_data_collector/players_data.parquet"
        ] if not force_reprocess else None
    )
    if not success:
        print("⚠️ Differential Evolution failed. Continuing with next step...")
    
    # Step 4: Algorithm Comparison
    success = run_step(
        "Algorithm Comparison & Analysis",
        "uv run python compare_algorithms.py",
        required_files=["lol_data_collector/algorithm_comparison.json"],
        source_files=[
            "lol_data_collector/optimal_build_results.json",
            "lol_data_collector/optimal_build_results_de.json",
            "lol_data_collector/champion_metadata.json"
        ] if not force_reprocess else None
    )
    
    # Step 5: Generate EDA Insights for Website
    success = run_step(
        "Generate EDA Insights for Website",
        "uv run python generate_insights.py",
        required_files=["eda_insights.json"],
        source_files=[
            "lol_data_collector/champion_metadata.json",
            "lol_data_collector/algorithm_comparison.json",
            "lol_data_collector/players_data.parquet"
        ] if not force_reprocess else None,
        optional=True
    )
    
    # Step 6: Update Website Content
    update_website_content()
    
    # Final comprehensive summary
    display_final_summary()
    
    print(f"\n💡 Next Steps:")
    print(f"   • Visit your website to see the dynamic results")
    print(f"   • All metrics and charts will show your actual data")
    print(f"   • Collect more data and re-run for improved results")
    print(f"   • Experiment with different algorithm parameters")

if __name__ == "__main__":
    main() 