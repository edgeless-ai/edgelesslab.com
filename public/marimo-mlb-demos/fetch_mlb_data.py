#!/usr/bin/env python3
"""Fetch MLB data for the 4 marimo demos."""
import json, os

from pybaseball import (statcast_batter_exitvelo_barrels, batting_stats_bref,
                         statcast_pitcher_arsenal_stats, schedule_and_record,
                         statcast)

BASE = "/Users/djm/Codex-projects/github-repos/edgelesslab.com/public/marimo-mlb-demos"
os.makedirs(BASE, exist_ok=True)

# ── Demo 1: Barrel Zone Explorer ──────────────────────────────────
print("Fetching barrel data...")
barrels = statcast_batter_exitvelo_barrels(2025)
barrels = barrels.rename(columns={'last_name, first_name': 'last_name_first_name'})
barrels['last_name'] = barrels['last_name_first_name'].apply(lambda x: x.split(',')[0].strip())
barrels['first_name'] = barrels['last_name_first_name'].apply(lambda x: x.split(',')[1].strip() if ',' in x else '')
barrels['full_name'] = barrels['first_name'] + ' ' + barrels['last_name']

bref = batting_stats_bref(2025)
merged = barrels.merge(
    bref[['Name', 'G', 'PA', 'HR', 'R', 'RBI', 'BA', 'OBP', 'SLG', 'OPS']],
    left_on='full_name', right_on='Name', how='left'
)
qualified = merged[merged['attempts'] >= 200].copy().sort_values('brl_pa', ascending=False)
cols = ['full_name', 'attempts', 'avg_hit_angle', 'max_hit_speed', 'avg_hit_speed',
        'barrels', 'brl_percent', 'brl_pa', 'G', 'PA', 'HR', 'BA', 'OBP', 'SLG', 'OPS']
with open(os.path.join(BASE, 'barrel_data.json'), 'w') as f:
    json.dump(qualified[cols].fillna(0).to_dict(orient='records'), f, indent=2)
print(f"  Barrel data: {len(qualified)} batters")

# ── Demo 2: Pitch Tunnel Visualizer ───────────────────────────────
print("Fetching pitcher arsenal data...")
arsenal = statcast_pitcher_arsenal_stats(2025)
arsenal = arsenal.rename(columns={'last_name, first_name': 'last_name_first_name'})
total = arsenal.groupby('player_id')['pitches'].sum().reset_index(name='total_pitches')
arsenal = arsenal.merge(total, on='player_id')
primary = arsenal[arsenal['pitch_usage'] == arsenal.groupby('player_id')['pitch_usage'].transform('max')]
primary = primary[primary['total_pitches'] >= 500].sort_values('pitches', ascending=False).head(100)
top_ids = primary['player_id'].tolist()
pitcher_data = arsenal[arsenal['player_id'].isin(top_ids)].to_dict(orient='records')
with open(os.path.join(BASE, 'pitch_arsenal_data.json'), 'w') as f:
    json.dump(pitcher_data, f, indent=2)
print(f"  Pitch arsenal: {len(pitcher_data)} rows")

# ── Demo 3: Hot Streak Simulator ──────────────────────────────────
print("Fetching team schedules...")
all_schedules = {}
for team in ['LAD', 'NYY', 'ATL']:
    try:
        sched = schedule_and_record(2025, team).dropna(subset=['R', 'RA'])
        sched['Game'] = range(1, len(sched) + 1)
        all_schedules[team] = sched[['Date', 'Tm', 'Opp', 'W/L', 'R', 'RA', 'Streak', 'Game']].to_dict(orient='records')
        print(f"  {team}: {len(all_schedules[team])} games")
    except Exception as e:
        print(f"  {team}: Error - {e}")
with open(os.path.join(BASE, 'schedule_data.json'), 'w') as f:
    json.dump(all_schedules, f, indent=2)

# ── Demo 4: Spray Chart Explorer ──────────────────────────────────
print("Fetching Statcast hits for spray chart...")
sc = statcast('2025-06-01', '2025-06-15')
hits = sc[sc['events'].notna() & sc['launch_speed'].notna() & sc['launch_angle'].notna() & sc['hc_x'].notna() & sc['hc_y'].notna()]
hits = hits[['game_date', 'player_name', 'events', 'launch_speed', 'launch_angle', 'hc_x', 'hc_y',
             'pitch_type', 'pitch_name', 'release_speed', 'description']].copy()
hits['game_date'] = hits['game_date'].astype(str)
hits = hits.dropna()
with open(os.path.join(BASE, 'spray_data.json'), 'w') as f:
    json.dump(hits.to_dict(orient='records'), f, indent=2)
print(f"  Spray chart: {len(hits)} hit events")

print("\nDONE - All data fetched!")