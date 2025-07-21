---
id: task-14
title: Investigate why LinkAgent is not executing on hourly schedule
status: To Do
assignee: []
created_date: '2025-07-21'
labels:
  - 'type:bug'
  - 'priority:medium'
  - 'component:automation'
dependencies: []
---

## Description


## Progress Update - 2025-07-20 17:24
Root cause found: Dependency timing race condition. LinkAgent requires capture_inbox to have run within 1 hour, but timing can cause this to fail. Recommended fix: Remove unnecessary dependency from scheduler config.
