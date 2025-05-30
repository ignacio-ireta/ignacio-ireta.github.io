#!/usr/bin/env python3
"""
Website Data Manager - Clean interface for updating website with dynamic data

This module provides a clean interface for copying optimization results
to the website and ensuring dynamic content is properly updated.
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, Any, Optional

class WebsiteDataManager:
    """Manages data synchronization between optimization results and website"""
    
    def __init__(self, project_dir: str = ".", docs_dir: str = "../docs"):
        self.project_dir = Path(project_dir)
        self.docs_dir = Path(docs_dir)
        self.data_dir = self.docs_dir / "data"
        
        # Source files mapping
        self.source_files = {
            "champion_metadata.json": self.project_dir / "lol_data_collector" / "champion_metadata.json",
            "algorithm_comparison.json": self.project_dir / "lol_data_collector" / "algorithm_comparison.json",
            "eda_insights.json": self.project_dir / "eda_insights.json"
        }
    
    def setup_data_directory(self) -> bool:
        """Create data directory in docs if it doesn't exist"""
        try:
            self.data_dir.mkdir(exist_ok=True)
            return True
        except Exception as e:
            print(f"❌ Failed to create data directory: {e}")
            return False
    
    def copy_data_files(self) -> Dict[str, bool]:
        """Copy all data files to website directory"""
        results = {}
        
        if not self.setup_data_directory():
            return results
        
        print("📁 Copying optimization results to website...")
        
        for dest_name, source_path in self.source_files.items():
            try:
                if source_path.exists():
                    dest_path = self.data_dir / dest_name
                    shutil.copy2(source_path, dest_path)
                    file_size = dest_path.stat().st_size / 1024  # KB
                    print(f"   ✅ {dest_name} ({file_size:.1f}KB)")
                    results[dest_name] = True
                else:
                    print(f"   ❌ {dest_name} (source not found)")
                    results[dest_name] = False
            except Exception as e:
                print(f"   ❌ {dest_name} (error: {e})")
                results[dest_name] = False
        
        return results
    
    def load_optimization_summary(self) -> Optional[Dict[str, Any]]:
        """Load and return a summary of optimization results"""
        try:
            summary = {}
            
            # Load champion metadata
            metadata_path = self.data_dir / "champion_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    summary['metadata'] = json.load(f)
            
            # Load algorithm comparison
            algorithm_path = self.data_dir / "algorithm_comparison.json"
            if algorithm_path.exists():
                with open(algorithm_path, 'r') as f:
                    summary['algorithms'] = json.load(f)
            
            # Load EDA insights
            eda_path = self.data_dir / "eda_insights.json"
            if eda_path.exists():
                with open(eda_path, 'r') as f:
                    summary['insights'] = json.load(f)
            
            return summary if summary else None
            
        except Exception as e:
            print(f"⚠️ Error loading optimization summary: {e}")
            return None
    
    def display_summary(self) -> bool:
        """Display a summary of the copied data"""
        summary = self.load_optimization_summary()
        
        if not summary:
            print("⚠️ No optimization data found")
            return False
        
        print(f"\n📊 Website Data Summary:")
        
        # Champion info
        if 'metadata' in summary:
            meta = summary['metadata']
            print(f"   🏆 Champion: {meta['champion_id']}")
            print(f"   🎮 Games: {meta['total_games']}")
            print(f"   📈 Baseline: {meta['win_rate']:.1%}")
        
        # Algorithm results
        if 'algorithms' in summary:
            algo = summary['algorithms']
            ga_wr = algo['genetic_algorithm']['win_probability']
            de_wr = algo['differential_evolution']['win_probability']
            print(f"   🧬 GA: {ga_wr:.1%}")
            print(f"   🔄 DE: {de_wr:.1%}")
            print(f"   🏆 Winner: {algo['comparison']['winner']}")
        
        # EDA insights
        if 'insights' in summary:
            insights = summary['insights']
            print(f"   📊 Records: {insights['champion_info']['total_records']}")
            print(f"   🎯 Top Item: {insights['top_items'][0]['id']} ({insights['top_items'][0]['usage']:.1f}%)")
            print(f"   🔀 Diversity: {insights['build_diversity']['diversity_percentage']:.1f}%")
        
        return True
    
    def update_website(self) -> bool:
        """Complete website update process"""
        print("🌐 Updating website with optimization results...")
        
        # Check if docs directory exists
        if not self.docs_dir.exists():
            print(f"❌ Website directory not found: {self.docs_dir.absolute()}")
            return False
        
        # Copy data files
        copy_results = self.copy_data_files()
        
        # Check if any files were copied successfully
        success_count = sum(1 for success in copy_results.values() if success)
        total_count = len(copy_results)
        
        if success_count == 0:
            print("❌ No data files were copied successfully")
            return False
        
        # Display summary
        self.display_summary()
        
        print(f"\n✅ Website update complete! ({success_count}/{total_count} files)")
        print(f"🌐 Data accessible at: {self.data_dir}")
        print(f"💡 Website will load dynamic content on next visit")
        
        return True

def update_website_data(project_dir: str = ".") -> bool:
    """Convenience function to update website data"""
    manager = WebsiteDataManager(project_dir)
    return manager.update_website()

if __name__ == "__main__":
    # Run as standalone script
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("Website Data Manager")
        print("Usage: python website_manager.py")
        print("Copies optimization results to website data directory")
        sys.exit(0)
    
    success = update_website_data()
    sys.exit(0 if success else 1) 