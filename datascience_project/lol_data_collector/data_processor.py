import json
import pandas as pd
import os
import sys
from typing import Dict, List, Any, Tuple, Optional
from collections import defaultdict

from .config import (
    INPUT_FILE, PLAYERS_OUTPUT, MATCHES_OUTPUT,
    UNWANTED_STATS, MATCHES_COLUMNS, PLAYERS_COLUMNS
)


class DataLoader:
    
    @staticmethod
    def load_match_data(file_path: str) -> List[Dict]:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(script_dir, file_path)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"The file {full_path} does not exist")
        
        with open(full_path) as f:
            matches_data = json.load(f)
        
        if not isinstance(matches_data, list):
            raise ValueError(f"Expected matches_data to be a list, got {type(matches_data)}")
        
        if len(matches_data) == 0:
            print("Warning: No matches found in the data file")
            
        print(f"Successfully loaded {len(matches_data)} matches from {full_path}")
        return matches_data


class ChampionAnalyzer:
    """Analyzes champions to find the one with the most data"""
    
    def __init__(self):
        self.champion_stats = defaultdict(lambda: {'games': 0, 'wins': 0, 'items': set()})
    
    def analyze_champions(self, matches_data: List[Dict]) -> Dict:
        """Analyze all champions in the dataset"""
        print("🔍 Analyzing champion data...")
        
        for game in matches_data:
            if 'info' not in game or 'participants' not in game['info']:
                continue
                
            for player in game['info']['participants']:
                if 'championId' not in player:
                    continue
                    
                champion_id = player['championId']
                
                # Count games
                self.champion_stats[champion_id]['games'] += 1
                
                # Count wins
                if player.get('win', False):
                    self.champion_stats[champion_id]['wins'] += 1
                
                # Collect items
                for i in range(7):
                    item_key = f'item{i}'
                    if item_key in player and player[item_key] not in [0, None]:
                        self.champion_stats[champion_id]['items'].add(player[item_key])
        
        # Convert to regular dict and calculate win rates
        champion_analysis = {}
        for champion_id, stats in self.champion_stats.items():
            champion_analysis[champion_id] = {
                'games': stats['games'],
                'wins': stats['wins'],
                'win_rate': stats['wins'] / stats['games'] if stats['games'] > 0 else 0,
                'unique_items': len(stats['items']),
                'items': list(stats['items'])
            }
        
        # Sort by number of games
        sorted_champions = sorted(
            champion_analysis.items(), 
            key=lambda x: x[1]['games'], 
            reverse=True
        )
        
        print(f"📊 Champion Analysis Results:")
        print(f"   • Total champions: {len(sorted_champions)}")
        print(f"   • Top 5 champions by game count:")
        
        for i, (champ_id, stats) in enumerate(sorted_champions[:5]):
            print(f"     {i+1}. Champion {champ_id}: {stats['games']} games, "
                  f"{stats['win_rate']:.1%} win rate, {stats['unique_items']} unique items")
        
        return dict(sorted_champions)
    
    def select_best_champion(self, champion_analysis: Dict) -> Tuple[int, Dict]:
        """Select the champion with the most data"""
        if not champion_analysis:
            raise ValueError("No champion data available")
        
        # Get champion with most games
        best_champion_id = max(champion_analysis.keys(), key=lambda x: champion_analysis[x]['games'])
        best_stats = champion_analysis[best_champion_id]
        
        print(f"🏆 Selected Champion {best_champion_id}:")
        print(f"   • Games: {best_stats['games']}")
        print(f"   • Win rate: {best_stats['win_rate']:.1%}")
        print(f"   • Unique items: {best_stats['unique_items']}")
        
        return best_champion_id, best_stats


class MatchProcessor:
    
    def __init__(self):
        self.processed_games = 0
        self.skipped_games = 0
    
    def extract_team_data(self, game_id: int, team: Dict, game_duration: int) -> Optional[List]:
        if 'teamId' not in team:
            print(f"Warning: Team in game {game_id} missing 'teamId' - skipping")
            return None
            
        team_id = team['teamId']

        if 'win' not in team:
            print(f"Warning: Team in game {game_id} missing 'win' - skipping")
            return None
            
        team_win = team['win']
        
        if 'bans' not in team or not isinstance(team['bans'], list):
            print(f"Warning: Team {team_id} in game {game_id} has invalid 'bans' data")
            bans = [None] * 5
        else:
            bans = []
            for ban in team['bans']:
                if isinstance(ban, dict) and 'championId' in ban:
                    bans.append(ban['championId'])
                else:
                    bans.append(None)
            
            bans = (bans + [None] * 5)[:5]
        
        objectives = []
        if 'objectives' not in team or not isinstance(team['objectives'], dict):
            print(f"Warning: Team {team_id} in game {game_id} has invalid 'objectives' data")
            objectives = [False, 0] * 7
        else:
            try:
                for objective in team['objectives']:
                    obj_data = team['objectives'][objective]
                    first = obj_data.get('first', False)
                    kills = obj_data.get('kills', 0)
                    objectives.extend([first, kills])
            except Exception as e:
                print(f"Error processing objectives for team {team_id} in game {game_id}: {e}")
                objectives = [False, 0] * 7
        
        return [game_id, team_id, team_win, game_duration] + bans + objectives
    
    def extract_player_data(self, game_id: int, player: Dict) -> List:
        player_data = [game_id]
        
        for key, value in player.items():
            if key not in UNWANTED_STATS:
                player_data.append(value)
                
        return player_data
    
    def process_matches(self, matches_data: List[Dict]) -> Tuple[List[List], List[List]]:
        aggregated_matches_data = []
        aggregated_players_data = []
        
        self.processed_games = 0
        self.skipped_games = 0
        
        for game_index, game in enumerate(matches_data):
            try:
                if 'info' not in game:
                    print(f"Warning: Game at index {game_index} missing 'info' key - skipping")
                    self.skipped_games += 1
                    continue
                    
                game_info = game['info']
                
                if 'gameId' not in game_info:
                    print(f"Warning: Game at index {game_index} missing 'gameId' - skipping")
                    self.skipped_games += 1
                    continue
                    
                if 'gameDuration' not in game_info:
                    print(f"Warning: Game ID {game_info.get('gameId', 'unknown')} missing 'gameDuration' - skipping")
                    self.skipped_games += 1
                    continue
                
                game_id = game_info['gameId']
                game_duration = game_info['gameDuration']
                
                match_data = []
                if 'teams' in game_info and isinstance(game_info['teams'], list):
                    for team in game_info['teams']:
                        team_data = self.extract_team_data(game_id, team, game_duration)
                        if team_data:
                            match_data.append(team_data)
                else:
                    print(f"Warning: Game ID {game_id} has invalid 'teams' data - skipping teams processing")
                
                players_data = []
                if 'participants' in game_info and isinstance(game_info['participants'], list):
                    for player in game_info['participants']:
                        try:
                            player_data = self.extract_player_data(game_id, player)
                            players_data.append(player_data)
                        except Exception as e:
                            print(f"Error processing player in game {game_id}: {e}")
                else:
                    print(f"Warning: Game ID {game_id} has invalid 'participants' data - skipping players processing")
                
                aggregated_matches_data.extend(match_data)
                aggregated_players_data.extend(players_data)
                
                self.processed_games += 1
                
            except Exception as e:
                print(f"Error processing game at index {game_index}: {e}")
                self.skipped_games += 1
        
        print(f"Processed {self.processed_games} games successfully, skipped {self.skipped_games} games")
        return aggregated_matches_data, aggregated_players_data


class DataWriter:
    
    @staticmethod
    def save_dataframe(data: List[List], columns: List[str], output_file: str) -> None:
        try:
            # Get the directory where this script is located
            script_dir = os.path.dirname(os.path.abspath(__file__))
            full_output_path = os.path.join(script_dir, output_file)
            
            if not data:
                print(f"Warning: No data to save to {full_output_path}")
                df = pd.DataFrame(columns=columns)
            else:
                # Create DataFrame
                df = pd.DataFrame(data, columns=columns)
            
                # Handle mixed data types by converting problematic columns to string
                for col in df.columns:
                    if col == 'gameId':
                        # Keep gameId as integer
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    elif df[col].dtype == 'object':
                        # Convert object columns with mixed types to string
                        try:
                            # Try to convert to numeric first
                            numeric_col = pd.to_numeric(df[col], errors='coerce')
                            if not numeric_col.isna().all():
                                df[col] = numeric_col
                            else:
                                # If not numeric, convert to string
                                df[col] = df[col].astype(str)
                        except:
                            # Fallback to string conversion
                            df[col] = df[col].astype(str)
            
            df.to_parquet(full_output_path)
            print(f"Successfully saved {len(df)} records to {full_output_path}")
        except Exception as e:
            print(f"Error saving data to {output_file}: {e}")
            # Fallback: convert all columns to string except gameId
            try:
                print("Attempting fallback with string conversion...")
                df_fallback = pd.DataFrame(data, columns=columns)
                for col in df_fallback.columns:
                    if col == 'gameId':
                        df_fallback[col] = pd.to_numeric(df_fallback[col], errors='coerce')
                    else:
                        df_fallback[col] = df_fallback[col].astype(str)
                df_fallback.to_parquet(full_output_path)
                print(f"Successfully saved {len(df_fallback)} records to {full_output_path} using fallback method")
            except Exception as fallback_error:
                print(f"Fallback also failed: {fallback_error}")
                # Last resort: save as CSV
                try:
                    csv_path = full_output_path.replace('.parquet', '.csv')
                    df_csv = pd.DataFrame(data, columns=columns)
                    df_csv.to_csv(csv_path, index=False)
                    print(f"Saved as CSV instead: {csv_path}")
                except Exception as csv_error:
                    print(f"CSV fallback also failed: {csv_error}")

    @staticmethod
    def save_analysis_metadata(players_data: pd.DataFrame, champion_analysis: Dict) -> Dict:
        """Save analysis metadata about all champions in the dataset"""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Count actual records in processed data for each champion
        processed_champion_counts = players_data['championId'].value_counts()
        
        print(f"📊 Dataset Analysis:")
        print(f"   • Total player records: {len(players_data)}")
        print(f"   • Unique champions: {len(processed_champion_counts)}")
        print(f"   • Top 5 champions by record count:")
        
        top_champions = []
        for i, (champ_id, count) in enumerate(processed_champion_counts.head().items()):
            win_rate = players_data[players_data['championId'] == champ_id]['win'].mean()
            print(f"     {i+1}. Champion {int(champ_id)}: {count} records, {win_rate:.1%} win rate")
            
            # Get champion items
            champion_data = players_data[players_data['championId'] == champ_id]
            items = set()
            for item_col in ['item0', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6']:
                if item_col in champion_data.columns:
                    unique_items = champion_data[item_col].dropna().unique()
                    for item in unique_items:
                        if item not in [0, None, '0', 'None']:
                            try:
                                items.add(int(float(item)))
                            except (ValueError, TypeError):
                                pass
            
            top_champions.append({
                'champion_id': int(champ_id),
                'total_records': int(count),
                'win_rate': float(win_rate),
                'unique_items': len(items),
                'items': sorted(list(items))
            })
        
        # Create comprehensive dataset metadata
        metadata = {
            'dataset_info': {
                'total_player_records': int(len(players_data)),
                'total_champions': int(len(processed_champion_counts)),
                'generated_at': pd.Timestamp.now().isoformat()
            },
            'top_champions': top_champions,
            'most_frequent_champion': {
                'champion_id': top_champions[0]['champion_id'],
                'records': top_champions[0]['total_records'],
                'win_rate': top_champions[0]['win_rate']
            },
            'item_analysis': {
                'all_unique_items': sorted(list(set([
                    int(float(item)) for col in ['item0', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6']
                    if col in players_data.columns
                    for item in players_data[col].dropna().unique()
                    if item not in [0, None, '0', 'None']
                    and not pd.isna(item)
                ]))),
                'item_slots': [f'item{i}' for i in range(7)]
            }
        }
        
        # Save comprehensive analysis metadata
        metadata_file = 'dataset_analysis.json'
        metadata_path = os.path.join(script_dir, metadata_file)
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✓ Saved dataset analysis to {metadata_file}")
        
        return metadata


def main():
    try:
        loader = DataLoader()
        matches_data = loader.load_match_data(INPUT_FILE)
        
        # Analyze champions
        analyzer = ChampionAnalyzer()
        champion_analysis = analyzer.analyze_champions(matches_data)
        
        processor = MatchProcessor()
        match_data, player_data = processor.process_matches(matches_data)
        
        writer = DataWriter()
        writer.save_dataframe(match_data, MATCHES_COLUMNS, MATCHES_OUTPUT)
        writer.save_dataframe(player_data, PLAYERS_COLUMNS, PLAYERS_OUTPUT)
        
        # Load the players data to create analysis metadata
        script_dir = os.path.dirname(os.path.abspath(__file__))
        players_df = pd.read_parquet(os.path.join(script_dir, PLAYERS_OUTPUT))
        
        # Save comprehensive analysis metadata
        metadata = writer.save_analysis_metadata(players_df, champion_analysis)
        
        print("\n🎉 Processing completed successfully!")
        print(f"📁 Generated files:")
        print(f"   • {MATCHES_OUTPUT} - All match data ({len(match_data)} records)")
        print(f"   • {PLAYERS_OUTPUT} - All player data ({len(player_data)} records)")
        print(f"   • dataset_analysis.json - Dataset analysis metadata")
        print(f"\n🏆 Most frequent champion: Champion {metadata['most_frequent_champion']['champion_id']}")
        print(f"   • {metadata['most_frequent_champion']['records']} records")
        print(f"   • {metadata['most_frequent_champion']['win_rate']:.1%} win rate")
        
    except Exception as e:
        print(f"Processing failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()