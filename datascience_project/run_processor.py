#!/usr/bin/env python3
"""
League of Legends Data Processor Runner

This script processes the collected match data and converts it to structured formats.
"""

import os
import sys

def main():
    print("🔄 League of Legends Data Processor")
    print("=" * 50)
    
    # Check if data files exist
    data_files = [
        "lol_data_collector/matches_timeline.json",
        "lol_data_collector/players_puuids.json",
        "lol_data_collector/latest_games.json"
    ]
    
    print("📁 Checking data files:")
    all_exist = True
    for file_path in data_files:
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
            print(f"   ✓ {file_path} ({file_size:.1f}MB)")
        else:
            print(f"   ❌ {file_path} (not found)")
            all_exist = False
    
    if not all_exist:
        print("\n⚠️ Missing data files. Please run the data collector first:")
        print("   uv run python run_collector.py")
        return
    
    print(f"\n🚀 Processing match data...")
    
    try:
        # Import and run the data processor
        from lol_data_collector.data_processor import main as process_data
        process_data()
        
        print("\n🎉 Data processing completed successfully!")
        print("📁 Output files created:")
        
        output_files = [
            "lol_data_collector/players_data.parquet",
            "lol_data_collector/matches_data.parquet",
            "lol_data_collector/dataset_analysis.json"
        ]
        
        for file_path in output_files:
            if os.path.exists(file_path):
                if file_path.endswith('.parquet'):
                    file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
                    print(f"   ✓ {file_path} ({file_size:.1f}MB)")
                else:
                    print(f"   ✓ {file_path}")
        
        # Show dataset summary
        try:
            import json
            with open("lol_data_collector/dataset_analysis.json", 'r') as f:
                analysis = json.load(f)
            print(f"\n📊 Dataset Summary:")
            print(f"   • Total player records: {analysis['dataset_info']['total_player_records']:,}")
            print(f"   • Unique champions: {analysis['dataset_info']['total_champions']}")
            print(f"   • Most frequent: Champion {analysis['most_frequent_champion']['champion_id']} "
                  f"({analysis['most_frequent_champion']['records']} records)")
        except Exception as e:
            print(f"⚠️ Could not load dataset summary: {e}")
        
    except Exception as e:
        print(f"\n❌ Processing failed: {e}")
        print("Please check the error details above and try again.")

if __name__ == "__main__":
    main() 