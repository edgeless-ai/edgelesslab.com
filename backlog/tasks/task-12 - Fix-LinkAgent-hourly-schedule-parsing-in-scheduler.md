---
id: task-12
title: Fix LinkAgent hourly schedule parsing in scheduler
status: To Do
assignee: []
created_date: '2025-07-21'
updated_date: '2025-07-21'
labels:
  - 'type:bug'
  - 'component:scheduler'
  - 'agent:linkagent'
dependencies: []
priority: high
---

## Description

## Problem
LinkAgent is configured to run hourly with cron pattern '0 * * * *' but the scheduler can't parse this pattern correctly.

## Root Cause
In scheduler.py lines 368-373, the parser expects specific hour values:
```python
if parts[0] == '0' and parts[1] \!= '*':
    hour = int(parts[1])  # Fails when parts[1] is '*'
```

## Solution
Update scheduler to handle wildcard in hour position for true hourly execution.

## Test
After fix, LinkAgent should run at :00 of every hour.

## Description
