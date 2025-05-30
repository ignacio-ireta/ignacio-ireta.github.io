INPUT_FILE = "matches_timeline.json"
PLAYERS_OUTPUT = "players_data.parquet"
MATCHES_OUTPUT = "matches_data.parquet"

# Collector configuration
API_KEY = "LoL-1234567890"  # Replace with your actual API key
THRESHOLD = 1
PAUSE_BETW = 0.25
CHECKPOINT_FREQ = 25
MAX_RETRIES = 5
BASE_TIMEOUT = 10

# File paths for collector
PLAYERS_FILE = "players_puuids.json"
GAMES_FILE = "latest_games.json"
TIMELINE_FILE = "matches_timeline.json"
FAILED_MATCHES_FILE = "failed_matches.json"
PROCESSED_DIVISIONS_FILE = "processed_divisions.json"
PROCESSED_PLAYERS_FILE = "processed_players.json"

# API configuration
QUEUES = ['RANKED_SOLO_5x5']
TIERS = ['GRANDMASTER', 'CHALLENGER']  #['MASTER', 'GRANDMASTER', 'CHALLENGER']
DIVISIONS = ['I', 'II', 'III', 'IV']

# Pagination configuration for league entries
MAX_PAGES_PER_DIVISION = 1  # Set to 1 for single page, increase for more pages
LEAGUE_ENTRIES_PER_PAGE = 205  # Typical number of entries per page (may vary)
FETCH_ALL_PAGES = False  # Set to True to fetch all available pages, False to respect MAX_PAGES_PER_DIVISION

# Resume configuration
RESUME_FROM_EXISTING = True  # Set to True to continue from existing data, False to start fresh
OVERWRITE_EXISTING_FILES = False  # Set to True to overwrite existing files, False to append/continue

# Duplicate checking configuration
ENABLE_DUPLICATE_CHECKING = True  # Set to False to disable duplicate checking (faster but may waste API calls)
LOG_DUPLICATE_DETAILS = False  # Set to True to log detailed duplicate information (verbose)
DUPLICATE_CHECK_FREQUENCY = 100  # Log duplicate stats every N items processed (0 to disable periodic logging)

UNWANTED_STATS = [
    'PlayerScore0', 'PlayerScore1', 'PlayerScore10', 'PlayerScore11', 'PlayerScore2', 
    'PlayerScore3', 'PlayerScore4', 'PlayerScore5', 'PlayerScore6', 'PlayerScore7', 
    'PlayerScore8', 'PlayerScore9', 'challenges', 'missions', 'playerAugment1', 
    'playerAugment2', 'playerAugment3', 'playerAugment4', 'playerAugment5', 
    'playerAugment6', 'perks'
]

MATCHES_COLUMNS = [
    'gameId', 'teamId', 'win', 'gameDuration', 'ban1', 'ban2', 'ban3', 'ban4', 'ban5', 
    'atakhanFirst', 'atakhanKills', 'baronFirst', 'baronKills', 'championFirst', 
    'championKills', 'dragonFirst', 'dragonKills', 'hordeFirst', 'hordeKills', 
    'inhibitorFirst', 'inhibitorKills', 'riftHeraldFirst', 'riftHeraldKills', 
    'towerFirst', 'towerKills'
]

PLAYERS_COLUMNS = [
    'gameId', 'allInPings', 'assistMePings', 'assists', 'baronKills', 'basicPings',
    'bountyLevel', 'champExperience', 'champLevel', 'championId', 'championName',
    'championTransform', 'commandPings', 'consumablesPurchased', 
    'damageDealtToBuildings', 'damageDealtToObjectives', 'damageDealtToTurrets',
    'damageSelfMitigated', 'dangerPings', 'deaths', 'detectorWardsPlaced', 
    'doubleKills', 'dragonKills', 'eligibleForProgression', 'enemyMissingPings',
    'enemyVisionPings', 'firstBloodAssist', 'firstBloodKill', 'firstTowerAssist',
    'firstTowerKill', 'gameEndedInEarlySurrender', 'gameEndedInSurrender',
    'getBackPings', 'goldEarned', 'goldSpent', 'holdPings', 'individualPosition',
    'inhibitorKills', 'inhibitorTakedowns', 'inhibitorsLost', 'item0', 'item1', 
    'item2', 'item3', 'item4', 'item5', 'item6', 'itemsPurchased', 'killingSprees',
    'kills', 'lane', 'largestCriticalStrike', 'largestKillingSpree',
    'largestMultiKill', 'longestTimeSpentLiving', 'magicDamageDealt',
    'magicDamageDealtToChampions', 'magicDamageTaken', 'needVisionPings',
    'neutralMinionsKilled', 'nexusKills', 'nexusLost', 'nexusTakedowns',
    'objectivesStolen', 'objectivesStolenAssists', 'onMyWayPings', 'participantId',
    'pentaKills', 'physicalDamageDealt', 'physicalDamageDealtToChampions', 
    'physicalDamageTaken', 'placement', 'playerSubteamId', 'profileIcon',
    'pushPings', 'puuid', 'quadraKills', 'retreatPings', 'riotIdGameName',
    'riotIdTagline', 'role', 'sightWardsBoughtInGame', 'spell1Casts', 'spell2Casts',
    'spell3Casts', 'spell4Casts', 'subteamPlacement', 'summoner1Casts',
    'summoner1Id', 'summoner2Casts', 'summoner2Id', 'summonerId', 'summonerLevel',
    'summonerName', 'teamEarlySurrendered', 'teamId', 'teamPosition',
    'timeCCingOthers', 'timePlayed', 'totalAllyJungleMinionsKilled',
    'totalDamageDealt', 'totalDamageDealtToChampions',
    'totalDamageShieldedOnTeammates', 'totalDamageTaken',
    'totalEnemyJungleMinionsKilled', 'totalHeal', 'totalHealsOnTeammates',
    'totalMinionsKilled', 'totalTimeCCDealt', 'totalTimeSpentDead',
    'totalUnitsHealed', 'tripleKills', 'trueDamageDealt',
    'trueDamageDealtToChampions', 'trueDamageTaken', 'turretKills', 'turretTakedowns', 
    'turretsLost', 'unrealKills', 'visionClearedPings', 'visionScore', 
    'visionWardsBoughtInGame', 'wardsKilled', 'wardsPlaced', 'win'
]

BATCH_SIZE = 100
LARGE_FILE_THRESHOLD = 100 * 1024 * 1024
CHUNK_SIZE = 10000

