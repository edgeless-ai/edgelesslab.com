#!/usr/bin/env uv run
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "nba-api",
#     "numpy",
#     "pandas",
# ]
# ///
"""Fetch NBA player data and save as JSON for marimo notebooks."""

import json
import numpy as np
from nba_api.stats.endpoints import playergamelog, leaguedashplayerstats, playercareerstats
from nba_api.stats.static import players

# Target players
TARGETS = {
    "LeBron James": 2544,
    "Stephen Curry": 201939,
    "Giannis Antetokounmpo": 203507,
    "Nikola Jokic": 203999,
    "Luka Doncic": 1629029,
    "Shai Gilgeous-Alexander": 1628983,
    "Jayson Tatum": 1628369,
    "Anthony Edwards": 1630162,
    "Victor Wembanyama": 1641705,
    "Kevin Durant": 201142,
}

output = {}

for name, pid in TARGETS.items():
    try:
        log = playergamelog.PlayerGameLog(player_id=pid, season="2025-26")
        df = log.get_data_frames()[0]
        # Convert to list of dicts
        games = []
        for _, row in df.iterrows():
            games.append({
                "date": row["GAME_DATE"],
                "matchup": row["MATCHUP"],
                "wl": row["WL"],
                "pts": int(row["PTS"]),
                "fgm": int(row["FGM"]),
                "fga": int(row["FGA"]),
                "fg3m": int(row["FG3M"]),
                "fg3a": int(row["FG3A"]),
                "ftm": int(row["FTM"]),
                "fta": int(row["FTA"]),
                "reb": int(row["REB"]),
                "ast": int(row["AST"]),
                "stl": int(row["STL"]),
                "blk": int(row["BLK"]),
                "tov": int(row["TOV"]),
                "min": int(row["MIN"]),
                "plus_minus": int(row.get("PLUS_MINUS", 0)),
            })
        output[name] = {
            "player_id": pid,
            "games": games,
            "stats": {
                "games_played": len(games),
                "pts_avg": round(float(np.mean([g["pts"] for g in games])), 1),
                "pts_std": round(float(np.std([g["pts"] for g in games])), 1),
                "pts_min": min(g["pts"] for g in games),
                "pts_max": max(g["pts"] for g in games),
                "reb_avg": round(float(np.mean([g["reb"] for g in games])), 1),
                "ast_avg": round(float(np.mean([g["ast"] for g in games])), 1),
                "fg_pct": round(float(np.mean([g["fgm"]/g["fga"] for g in games if g["fga"] > 0])), 3),
            }
        }
        print(f"✓ {name}: {len(games)} games")
    except Exception as e:
        print(f"✗ {name}: {e}")

# Also get all players season stats
try:
    season_stats = leaguedashplayerstats.LeagueDashPlayerStats(season="2025-26", per_mode_detailed="PerGame")
    sdf = season_stats.get_data_frames()[0]
    all_players = []
    for _, row in sdf.iterrows():
        if row["GP"] >= 20:  # Only players who've played enough
            all_players.append({
                "name": row["PLAYER_NAME"],
                "team": row["TEAM_ABBREVIATION"],
                "gp": int(row["GP"]),
                "pts": round(float(row["PTS"]), 1),
                "reb": round(float(row["REB"]), 1),
                "ast": round(float(row["AST"]), 1),
                "fg_pct": round(float(row["FG_PCT"]), 3),
                "fg3_pct": round(float(row["FG3_PCT"]), 3),
                "ft_pct": round(float(row["FT_PCT"]), 3),
                "min": round(float(row["MIN"]), 1),
                "stl": round(float(row["STL"]), 1),
                "blk": round(float(row["BLK"]), 1),
                "tov": round(float(row["TOV"]), 1),
                "plus_minus": round(float(row.get("PLUS_MINUS", 0)), 1),
            })
    output["_all_players"] = all_players
    print(f"✓ All players: {len(all_players)} with 20+ games")
except Exception as e:
    print(f"✗ All players: {e}")

with open("/Users/djm/Codex-projects/github-repos/edgelesslab.com/public/marimo-sports-demos/nba_data.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nSaved {sum(len(v.get('games', [])) for k, v in output.items() if k != '_all_players')} games + {len(output.get('_all_players', []))} player season stats")