#!/usr/bin/env python3
"""
League of Legends Data Collector Configuration and Runner

This script helps you configure and run the data collector with different settings.
"""

import os
import sys
import json
from lol_data_collector.config import *

def show_current_config():
    """Display current configuration settings"""
    print("📋 Current Configuration:")
    print(f"   API Key: {'✓ Set' if API_KEY else '❌ Not set'}")
    print(f"   Queues: {QUEUES}")
    print(f"   Tiers: {TIERS}")
    print(f"   Divisions: {DIVISIONS}")
    print(f"   Max Pages per Division: {MAX_PAGES_PER_DIVISION}")
    print(f"   Fetch All Pages: {FETCH_ALL_PAGES}")
    print(f"   Resume from Existing: {RESUME_FROM_EXISTING}")
    print(f"   Overwrite Existing Files: {OVERWRITE_EXISTING_FILES}")
    print()

def estimate_data_collection():
    """Estimate the amount of data that will be collected"""
    total_divisions = len(QUEUES) * len(TIERS) * len(DIVISIONS)
    
    if FETCH_ALL_PAGES:
        estimated_entries = total_divisions * LEAGUE_ENTRIES_PER_PAGE * 3  # Rough estimate for all pages
        print(f"📊 Collection Estimate (ALL PAGES):")
    else:
        estimated_entries = total_divisions * LEAGUE_ENTRIES_PER_PAGE * MAX_PAGES_PER_DIVISION
        print(f"📊 Collection Estimate ({MAX_PAGES_PER_DIVISION} page(s) per division):")
    
    print(f"   Total divisions to process: {total_divisions}")
    print(f"   Estimated players: ~{estimated_entries:,}")
    print(f"   Estimated match IDs per player: ~20")
    print(f"   Estimated total matches: ~{estimated_entries * 20:,}")
    print(f"   Estimated data size: ~{(estimated_entries * 20 * 50) / 1024:.1f}MB")
    print()

def check_existing_files():
    """Check for existing data files"""
    print("📁 Existing Data Files:")
    files_to_check = [
        (PLAYERS_FILE, "Player PUUIDs"),
        (GAMES_FILE, "Match IDs"),
        (TIMELINE_FILE, "Match Data"),
        (FAILED_MATCHES_FILE, "Failed Matches"),
        (PROCESSED_DIVISIONS_FILE, "Processed Divisions"),
        (PROCESSED_PLAYERS_FILE, "Processed Players")
    ]
    
    for filename, description in files_to_check:
        if os.path.exists(filename):
            try:
                with open(filename, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        count = len(data)
                    elif isinstance(data, dict):
                        count = len(data)
                    else:
                        count = "Unknown"
                print(f"   ✓ {description}: {filename} ({count} items)")
            except:
                print(f"   ⚠️ {description}: {filename} (exists but unreadable)")
        else:
            print(f"   ❌ {description}: {filename} (not found)")
    print()

def main():
    print("🚀 League of Legends Data Collector")
    print("=" * 50)
    
    show_current_config()
    estimate_data_collection()
    check_existing_files()
    
    print("🔧 Configuration Options:")
    print("1. Run with current settings")
    print("2. Enable fetching ALL pages (may take very long!)")
    print("3. Set specific number of pages per division")
    print("4. Start fresh (ignore existing data)")
    print("5. Resume from existing data (default)")
    print("6. Exit")
    
    try:
        choice = input("\nSelect an option (1-6): ").strip()
        
        if choice == "1":
            print("\n🏃 Running collector with current settings...")
            from lol_data_collector import the_collector
            
        elif choice == "2":
            print("⚠️ WARNING: This will fetch ALL available pages and may take hours or days!")
            confirm = input("Are you sure? (yes/no): ").strip().lower()
            if confirm == "yes":
                # Temporarily modify config for this run
                from lol_data_collector import config
                config.FETCH_ALL_PAGES = True
                config.MAX_PAGES_PER_DIVISION = 999  # High number as fallback
                print("\n🏃 Running collector with ALL PAGES enabled...")
                from lol_data_collector import the_collector
            else:
                print("Cancelled.")
                
        elif choice == "3":
            try:
                pages = int(input("Enter number of pages per division (1-10): "))
                if 1 <= pages <= 10:
                    from lol_data_collector import config
                    config.MAX_PAGES_PER_DIVISION = pages
                    config.FETCH_ALL_PAGES = False
                    print(f"\n🏃 Running collector with {pages} page(s) per division...")
                    from lol_data_collector import the_collector
                else:
                    print("Invalid number. Please enter 1-10.")
            except ValueError:
                print("Invalid input. Please enter a number.")
                
        elif choice == "4":
            print("⚠️ This will ignore all existing data and start fresh!")
            confirm = input("Are you sure? (yes/no): ").strip().lower()
            if confirm == "yes":
                from lol_data_collector import config
                config.RESUME_FROM_EXISTING = False
                config.OVERWRITE_EXISTING_FILES = True
                print("\n🏃 Running collector with FRESH START...")
                from lol_data_collector import the_collector
            else:
                print("Cancelled.")
                
        elif choice == "5":
            from lol_data_collector import config
            config.RESUME_FROM_EXISTING = True
            config.OVERWRITE_EXISTING_FILES = False
            print("\n🏃 Running collector with RESUME mode...")
            from lol_data_collector import the_collector
            
        elif choice == "6":
            print("Goodbye! 👋")
            return
            
        else:
            print("Invalid choice. Please select 1-6.")
            
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user. Goodbye! 👋")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("Please check your configuration and try again.")

if __name__ == "__main__":
    main() 