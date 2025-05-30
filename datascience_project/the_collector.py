import logging
import json
import requests
import time
import os
import random
from requests import Session, HTTPError, ConnectionError, Timeout, TooManyRedirects
from urllib3.exceptions import ProtocolError, ReadTimeoutError
from tqdm import tqdm

from config import (
    API_KEY, THRESHOLD, PAUSE_BETW, CHECKPOINT_FREQ, MAX_RETRIES, BASE_TIMEOUT,
    PLAYERS_FILE, GAMES_FILE, TIMELINE_FILE, FAILED_MATCHES_FILE, PROCESSED_DIVISIONS_FILE, PROCESSED_PLAYERS_FILE,
    QUEUES, TIERS, DIVISIONS, MAX_PAGES_PER_DIVISION, LEAGUE_ENTRIES_PER_PAGE,
    FETCH_ALL_PAGES, RESUME_FROM_EXISTING, OVERWRITE_EXISTING_FILES
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("riot_api.log"),
        logging.StreamHandler()
    ]
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
players_file   = os.path.join(BASE_DIR, PLAYERS_FILE)
games_file     = os.path.join(BASE_DIR, GAMES_FILE)
timeline_file  = os.path.join(BASE_DIR, TIMELINE_FILE)
failed_matches_file = os.path.join(BASE_DIR, FAILED_MATCHES_FILE)
processed_divisions_file = os.path.join(BASE_DIR, PROCESSED_DIVISIONS_FILE)
processed_players_file = os.path.join(BASE_DIR, PROCESSED_PLAYERS_FILE)

adapter = requests.adapters.HTTPAdapter(
    max_retries=0,
    pool_connections=10,
    pool_maxsize=20
)

session = Session()
session.mount('https://', adapter)
session.headers.update({
    "X-Riot-Token": API_KEY,
    "User-Agent": "MyLoLTool/1.0 (https://github.com/you/mytool; you@example.com)",
    "Accept-Encoding": "gzip",
})

def parse_header_pairs(header_val: str):
    pairs = []
    if not header_val:
        return pairs
    for chunk in header_val.split(","):
        limit, window = map(int, chunk.split(":"))
        pairs.append((limit, window))
    return pairs

def exponential_backoff(attempt, base=1, max_backoff=60):
    delay = min(max_backoff, base * (2 ** attempt))
    jitter = random.uniform(0, 0.1 * delay)
    return delay + jitter

def fetch_respecting_headers(url, params=None, max_retries=MAX_RETRIES):
    for attempt in range(max_retries):
        try:
            timeout = BASE_TIMEOUT * (1 + attempt * 0.5)
            
            resp = session.get(url, params=params, timeout=timeout)
            
            if resp.status_code == 429:
                app_limits = parse_header_pairs(resp.headers.get("X-App-Rate-Limit", ""))
                app_counts = parse_header_pairs(resp.headers.get("X-App-Rate-Limit-Count", ""))
                
                if "Retry-After" in resp.headers:
                    wait = int(resp.headers["Retry-After"])
                else:
                    violated = [w for (L, w), (c, _) in zip(app_limits, app_counts) if c >= L]
                    wait = max(violated) if violated else 1
                
                logging.warning(f"[429] Rate limited. Sleeping {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
                continue
                
            elif 500 <= resp.status_code < 600:
                wait = exponential_backoff(attempt)
                logging.warning(f"[{resp.status_code}] Server error for URL: {url}. Retrying in {wait:.2f}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
                continue
            
            resp.raise_for_status()
            return resp
            
        except (ConnectionError, ProtocolError, ReadTimeoutError) as e:
            wait = exponential_backoff(attempt)
            logging.warning(f"Connection error ({type(e).__name__}) for URL: {url}. Retrying in {wait:.2f}s (attempt {attempt+1}/{max_retries})")
            time.sleep(wait)
            
        except Timeout as e:
            wait = exponential_backoff(attempt, base=2)
            logging.warning(f"Timeout ({type(e).__name__}) for URL: {url}. Retrying in {wait:.2f}s (attempt {attempt+1}/{max_retries})")
            time.sleep(wait)
            
        except HTTPError as e:
            logging.error(f"HTTP error {getattr(e.response, 'status_code', 'unknown')} for URL: {url}")
            return None
            
        except Exception as e:
            logging.error(f"Unexpected error ({type(e).__name__}: {str(e)}) for URL: {url}")
            if attempt == max_retries - 1:
                return None
            
            wait = exponential_backoff(attempt, base=3)
            time.sleep(wait)
    
    logging.error(f"Max retries exceeded for URL: {url}")
    return None

def load_or_create_file(file_path, default=None):
    if default is None:
        default = []
    
    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    
    # Handle overwrite setting
    if OVERWRITE_EXISTING_FILES and os.path.exists(file_path):
        logging.info(f"Overwriting existing file: {file_path}")
        with open(file_path, "w") as f:
            json.dump(default, f)
        return default
    
    # Handle resume setting
    if not RESUME_FROM_EXISTING and os.path.exists(file_path):
        logging.info(f"Starting fresh (not resuming) for file: {file_path}")
        with open(file_path, "w") as f:
            json.dump(default, f)
        return default
    
    if not os.path.exists(file_path):
        logging.info(f"Creating new file: {file_path}")
        with open(file_path, "w") as f:
            json.dump(default, f)
        return default
    
    try:
        with open(file_path) as f:
            data = json.load(f)
            logging.info(f"Loaded existing file: {file_path} with {len(data) if isinstance(data, list) else 'N/A'} items")
            return data
    except json.JSONDecodeError:
        logging.warning(f"Couldn't parse JSON from {file_path}, creating new file")
        with open(file_path, "w") as f:
            json.dump(default, f)
        return default

def save_checkpoint(file_path, data):
    try:
        temp_path = file_path + ".tmp"
        with open(temp_path, "w") as f:
            json.dump(data, f)
        
        os.replace(temp_path, file_path)
        return True
    except Exception as e:
        logging.error(f"Failed to save checkpoint to {file_path}: {str(e)}")
        return False

def fetch_league_entries_with_pagination(queue, tier, division):
    """Fetch league entries with pagination support"""
    all_entries = []
    page = 1
    
    while True:
        url = f"https://kr.api.riotgames.com/lol/league-exp/v4/entries/{queue}/{tier}/{division}"
        resp = fetch_respecting_headers(url, params={"page": page})
        
        if not resp:
            logging.warning(f"Failed to fetch {tier} {division} page {page}")
            break
            
        try:
            entries = resp.json()
            if not entries:  # Empty response means no more pages
                logging.info(f"No more entries found for {tier} {division} at page {page}")
                break
                
            all_entries.extend(entries)
            logging.info(f"Fetched page {page} for {tier} {division}: {len(entries)} entries (total: {len(all_entries)})")
            
            # Check pagination limits
            if not FETCH_ALL_PAGES and page >= MAX_PAGES_PER_DIVISION:
                logging.info(f"Reached max pages limit ({MAX_PAGES_PER_DIVISION}) for {tier} {division}")
                break
                
            # If we got fewer entries than expected, we might be at the last page
            if len(entries) < LEAGUE_ENTRIES_PER_PAGE:
                logging.info(f"Got {len(entries)} entries (less than {LEAGUE_ENTRIES_PER_PAGE}), likely last page for {tier} {division}")
                break
                
            page += 1
            time.sleep(PAUSE_BETW)  # Rate limiting between pages
            
        except (ValueError, KeyError) as e:
            logging.error(f"Error parsing response for {tier} {division} page {page}: {str(e)}")
            break
    
    return all_entries

players_puuids = load_or_create_file(players_file)
failed_matches = load_or_create_file(failed_matches_file)
processed_divisions = load_or_create_file(processed_divisions_file, default=[])

# Convert to set for faster lookup if it's a list
if isinstance(processed_divisions, list):
    processed_divisions = set(processed_divisions)

combos = [(q, t, d) for q in QUEUES for t in TIERS for d in DIVISIONS]

# Filter out already processed divisions if resuming
if RESUME_FROM_EXISTING:
    initial_combo_count = len(combos)
    combos = [(q, t, d) for q, t, d in combos if f"{q}_{t}_{d}" not in processed_divisions]
    skipped_count = initial_combo_count - len(combos)
    if skipped_count > 0:
        logging.info(f"Resuming: Skipping {skipped_count} already processed divisions")

logging.info(f"Starting league entries collection for {len(combos)} divisions")

try:
    with tqdm(combos, desc="Fetching league entries", unit="req", 
              bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]") as pbar:
        for i, (queue, tier, division) in enumerate(pbar):
            pbar.set_description(f"Fetching {tier} {division}")
            division_key = f"{queue}_{tier}_{division}"
            
            entries = fetch_league_entries_with_pagination(queue, tier, division)
            new_puuids_count = 0
                for p in entries:
                    if "puuid" in p and p["puuid"] not in players_puuids:
                        players_puuids.append(p["puuid"])
                    new_puuids_count += 1
            
            # Mark this division as processed
            processed_divisions.add(division_key)
                
            pbar.set_postfix(
                players=len(players_puuids), 
                new_puuids=new_puuids_count,
                entries_fetched=len(entries)
            )
            
            if (i + 1) % CHECKPOINT_FREQ == 0 or i == len(combos) - 1:
                save_checkpoint(players_file, players_puuids)
                save_checkpoint(processed_divisions_file, list(processed_divisions))
                    
            time.sleep(PAUSE_BETW)
except KeyboardInterrupt:
    logging.info("Process interrupted by user during player fetching")
    save_checkpoint(players_file, players_puuids)
    save_checkpoint(processed_divisions_file, list(processed_divisions))
    raise

latest_games = load_or_create_file(games_file)
stored_puuids = load_or_create_file(players_file)
processed_players = load_or_create_file(processed_players_file, default=[])

# Convert to set for faster lookup if it's a list
if isinstance(processed_players, list):
    processed_players = set(processed_players)

# Filter out already processed players if resuming
if RESUME_FROM_EXISTING:
    initial_player_count = len(stored_puuids)
    unprocessed_puuids = [puuid for puuid in stored_puuids if puuid not in processed_players]
    skipped_player_count = initial_player_count - len(unprocessed_puuids)
    if skipped_player_count > 0:
        logging.info(f"Resuming: Skipping {skipped_player_count} already processed players")
    stored_puuids = unprocessed_puuids

logging.info(f"Starting match ID collection for {len(stored_puuids)} players")

try:
    with tqdm(stored_puuids, desc="Fetching match IDs", unit="player", 
              bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]") as pbar:
        for i, puuid in enumerate(pbar):
            url = f"https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
            resp = fetch_respecting_headers(url, params={"queue": 420, "type": "ranked", "start": 0, "count": 20})
            if not resp:
                # Even if request failed, mark as processed to avoid retrying indefinitely
                processed_players.add(puuid)
                continue
                
            try:
                match_list = resp.json()
                new_matches = [m for m in match_list if m not in latest_games]
                latest_games.extend(new_matches)
                
                # Mark this player as processed
                processed_players.add(puuid)
                
            except (ValueError, KeyError) as e:
                logging.error(f"Error parsing matches for puuid {puuid}: {str(e)}")
                processed_players.add(puuid)  # Mark as processed even on error
                continue
            
            pbar.set_postfix(
                total_matches=len(latest_games), 
                new_matches=len(new_matches),
                processed_players=len(processed_players)
            )
            
            if (i + 1) % CHECKPOINT_FREQ == 0 or i == len(stored_puuids) - 1:
                save_checkpoint(games_file, latest_games)
                save_checkpoint(processed_players_file, list(processed_players))
                    
            time.sleep(PAUSE_BETW)
except KeyboardInterrupt:
    logging.info("Process interrupted by user during match ID fetching")
    save_checkpoint(games_file, latest_games)
    save_checkpoint(processed_players_file, list(processed_players))
    raise

matches_info = load_or_create_file(timeline_file)
stored_games = load_or_create_file(games_file)

processed_matches = {m.get("metadata", {}).get("matchId") for m in matches_info if "metadata" in m}
unprocessed_games = [match_id for match_id in stored_games if match_id not in processed_matches and match_id not in failed_matches]

logging.info(f"Total stored games: {len(stored_games)}")
logging.info(f"Already processed matches: {len(processed_matches)}")
logging.info(f"Failed matches: {len(failed_matches)}")
logging.info(f"Unprocessed games to fetch: {len(unprocessed_games)}")

try:
    with tqdm(unprocessed_games, desc="Fetching match data", unit="match",
              bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]") as pbar:
        for i, match_id in enumerate(pbar):
            pbar.set_description(f"Match {match_id[:10]}...")
            url = f"https://asia.api.riotgames.com/lol/match/v5/matches/{match_id}"
            resp = fetch_respecting_headers(url)
            
            if not resp:
                logging.warning(f"Failed to fetch match {match_id}, adding to failed matches list")
                failed_matches.append(match_id)
                save_checkpoint(failed_matches_file, failed_matches)
                continue
                
            try:
                match_data = resp.json()
                matches_info.append(match_data)
                logging.debug(f"Successfully fetched match data for {match_id}")
            except (ValueError, KeyError) as e:
                logging.error(f"Error parsing match data for {match_id}: {str(e)}")
                failed_matches.append(match_id)
                save_checkpoint(failed_matches_file, failed_matches)
                continue
            
            approx_size_mb = sum(len(json.dumps(m)) for m in matches_info) / (1024 * 1024)
            pbar.set_postfix(
                matches=len(matches_info), 
                failed=len(failed_matches), 
                size_mb=f"{approx_size_mb:.1f}MB"
            )
            
            if (i + 1) % CHECKPOINT_FREQ == 0 or i == len(unprocessed_games) - 1:
                save_checkpoint(timeline_file, matches_info)
                save_checkpoint(failed_matches_file, failed_matches)
                    
            time.sleep(PAUSE_BETW)
except KeyboardInterrupt:
    logging.info("Process interrupted by user during match data fetching")
    save_checkpoint(timeline_file, matches_info)
    save_checkpoint(failed_matches_file, failed_matches)
    print("Process interrupted. Progress has been saved.")

# Final summary
logging.info("=== DATA COLLECTION SUMMARY ===")
logging.info(f"Total unique players collected: {len(players_puuids) if 'players_puuids' in locals() else 'N/A'}")
logging.info(f"Total match IDs collected: {len(latest_games) if 'latest_games' in locals() else 'N/A'}")
logging.info(f"Total match data fetched: {len(matches_info) if 'matches_info' in locals() else 'N/A'}")
logging.info(f"Failed matches: {len(failed_matches) if 'failed_matches' in locals() else 'N/A'}")

if 'matches_info' in locals():
    final_size_mb = sum(len(json.dumps(m)) for m in matches_info) / (1024 * 1024)
    logging.info(f"Total data size: {final_size_mb:.1f}MB")

logging.info("Data collection process completed!")
print("\n🎉 Data collection finished! Check the log files for detailed information.")
print(f"📁 Main data files created:")
print(f"   - Players: {players_file}")
print(f"   - Match IDs: {games_file}")  
print(f"   - Match Data: {timeline_file}")
print(f"   - Failed Matches: {failed_matches_file}")
print("\n✨ You can now proceed with data processing using data_processor.py")