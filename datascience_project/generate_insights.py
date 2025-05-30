#!/usr/bin/env python3
"""
Generate EDA insights from actual champion data for dynamic website display
"""

import pandas as pd
import json
import os
from pathlib import Path

def get_champion_info(champion_id):
    """Get champion key and name from Dragon Tail data"""
    try:
        # Try to load champion data from dragontail
        script_dir = Path(__file__).parent
        champion_file = script_dir / '../docs/assets/dragontail_data/15.10.1/data/en_US/champion.json'
        
        if champion_file.exists():
            with open(champion_file, 'r') as f:
                champion_data = json.load(f)
            
            # Find champion by ID
            for champion_name, champion_info in champion_data['data'].items():
                if int(champion_info['key']) == int(champion_id):
                    return {
                        'name': champion_info['name'],
                        'key': champion_info['key'],
                        'id': champion_info['id'],
                        'title': champion_info['title']
                    }
    except Exception as e:
        print(f"Could not load champion info: {e}")
    
    # Fallback for known champions
    champion_mapping = {
        80: {'name': 'Pantheon', 'key': '80', 'id': 'Pantheon', 'title': 'the Unbreakable Spear'},
        # Add more as needed
    }
    
    return champion_mapping.get(int(champion_id), {
        'name': f'Champion {champion_id}',
        'key': str(champion_id),
        'id': f'Champion{champion_id}',
        'title': 'Unknown Champion'
    })

def generate_eda_insights():
    """Generate comprehensive EDA insights from champion data"""
    
    script_dir = Path(__file__).parent
    data_dir = script_dir / 'lol_data_collector'
    
    try:
        # Load champion metadata
        with open(data_dir / 'champion_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        champion_id = metadata['champion_id']
        
        # Get champion info
        champion_info = get_champion_info(champion_id)
        
        # Load champion data
        champion_data = pd.read_parquet(data_dir / f'champion_{champion_id}_data.parquet')
        
        print(f"Generating EDA insights for {champion_info['name']} (ID: {champion_id})...")
        
        # Performance statistics
        performance_stats = {
            'avg_kda': float(((champion_data['kills'] + champion_data['assists']) / (champion_data['deaths'] + 1)).mean()),
            'avg_kills': float(champion_data['kills'].mean()),
            'avg_deaths': float(champion_data['deaths'].mean()),
            'avg_assists': float(champion_data['assists'].mean()),
            'avg_gold': float(champion_data['goldEarned'].mean()),
            'avg_duration': float(champion_data['timePlayed'].mean()),
            'avg_damage': float(champion_data['totalDamageDealtToChampions'].mean())
        }
        
        # Item usage analysis
        item_counts = {}
        for i in range(7):
            item_col = f'item{i}'
            if item_col in champion_data.columns:
                items = champion_data[item_col].value_counts()
                for item_id, count in items.items():
                    if item_id != 0 and item_id != '0':
                        try:
                            item_id_int = int(float(item_id))
                            if item_id_int not in item_counts:
                                item_counts[item_id_int] = 0
                            item_counts[item_id_int] += count
                        except:
                            pass
        
        # Top 5 items by usage
        top_items = []
        sorted_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)
        for item_id, count in sorted_items[:5]:
            usage_percentage = (count / len(champion_data)) * 100
            top_items.append({
                'id': int(item_id),
                'name': f'Item {item_id}',
                'usage': float(usage_percentage),
                'count': int(count)
            })
        
        # Win rate correlations
        champion_data['kda'] = (champion_data['kills'] + champion_data['assists']) / (champion_data['deaths'] + 1)
        
        high_kda_threshold = 2.0
        high_kda = champion_data[champion_data['kda'] > high_kda_threshold]
        high_gold = champion_data[champion_data['goldEarned'] > champion_data['goldEarned'].median()]
        high_damage = champion_data[champion_data['totalDamageDealtToChampions'] > 
                                   champion_data['totalDamageDealtToChampions'].median()]
        
        win_rate_correlations = {
            'high_kda': {
                'threshold': high_kda_threshold,
                'win_rate': float(high_kda['win'].mean() if len(high_kda) > 0 else metadata['win_rate']),
                'games': len(high_kda)
            },
            'high_gold': {
                'win_rate': float(high_gold['win'].mean() if len(high_gold) > 0 else metadata['win_rate']),
                'games': len(high_gold)
            },
            'high_damage': {
                'win_rate': float(high_damage['win'].mean() if len(high_damage) > 0 else metadata['win_rate']),
                'games': len(high_damage)
            }
        }
        
        # Game duration analysis
        short_games = champion_data[champion_data['timePlayed'] < champion_data['timePlayed'].quantile(0.33)]
        medium_games = champion_data[(champion_data['timePlayed'] >= champion_data['timePlayed'].quantile(0.33)) & 
                                    (champion_data['timePlayed'] <= champion_data['timePlayed'].quantile(0.67))]
        long_games = champion_data[champion_data['timePlayed'] > champion_data['timePlayed'].quantile(0.67)]
        
        game_duration = {
            'short_games': {
                'win_rate': float(short_games['win'].mean() if len(short_games) > 0 else metadata['win_rate']),
                'avg_duration': float(short_games['timePlayed'].mean() / 60 if len(short_games) > 0 else 0),
                'games': len(short_games)
            },
            'medium_games': {
                'win_rate': float(medium_games['win'].mean() if len(medium_games) > 0 else metadata['win_rate']),
                'avg_duration': float(medium_games['timePlayed'].mean() / 60 if len(medium_games) > 0 else 0),
                'games': len(medium_games)
            },
            'long_games': {
                'win_rate': float(long_games['win'].mean() if len(long_games) > 0 else metadata['win_rate']),
                'avg_duration': float(long_games['timePlayed'].mean() / 60 if len(long_games) > 0 else 0),
                'games': len(long_games)
            }
        }
        
        # Build diversity analysis
        unique_builds = set()
        for _, row in champion_data.iterrows():
            build = []
            for i in range(7):
                item_col = f'item{i}'
                if item_col in row and row[item_col] not in [0, '0', None]:
                    try:
                        build.append(int(float(row[item_col])))
                    except:
                        pass
            build_str = ','.join(map(str, sorted(build)))
            unique_builds.add(build_str)
        
        build_diversity = {
            'unique_builds': len(unique_builds),
            'total_games': len(champion_data),
            'diversity_percentage': float((len(unique_builds) / len(champion_data)) * 100)
        }
        
        # Compile all insights
        insights = {
            'champion_info': {
                'champion_id': int(champion_id),
                'champion_key': champion_info['key'],
                'name': champion_info['name'],
                'title': champion_info['title'],
                'total_records': len(champion_data)
            },
            'generated_at': pd.Timestamp.now().isoformat(),
            'data_source': f'champion_{champion_id}_data.parquet',
            'performance_stats': performance_stats,
            'top_items': top_items,
            'win_rate_correlations': win_rate_correlations,
            'game_duration': game_duration,
            'build_diversity': build_diversity
        }
        
        # Save insights
        output_file = script_dir / 'eda_insights.json'
        with open(output_file, 'w') as f:
            json.dump(insights, f, indent=2)
        
        print(f"✅ EDA insights generated and saved to {output_file}")
        print(f"📊 Summary:")
        print(f"   • Champion: {champion_info['name']} ({champion_id})")
        print(f"   • Games analyzed: {len(champion_data)}")
        print(f"   • Top item: {top_items[0]['name']} ({top_items[0]['usage']:.1f}%)")
        print(f"   • High KDA win rate: {win_rate_correlations['high_kda']['win_rate']:.1%}")
        print(f"   • Build diversity: {build_diversity['diversity_percentage']:.1f}%")
        
        return insights
        
    except FileNotFoundError as e:
        print(f"❌ Error: Required data files not found - {e}")
        print("   Please run the data processor first:")
        print("   uv run python run_processor.py")
        return None
    except Exception as e:
        print(f"❌ Error generating insights: {e}")
        return None

if __name__ == "__main__":
    generate_eda_insights() 