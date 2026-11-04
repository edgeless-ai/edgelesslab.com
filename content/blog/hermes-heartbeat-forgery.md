---
slug: hermes-heartbeat-forgery
title: The Heartbeat That Couldn't Prove an Agent Was Alive
description: A scheduled job wrote another agent's heartbeat while a corrective task was rate-limited. The incident showed why a fresh timestamp is not proof of liveness.
date: 2026-09-28
tags:
- Hermes
- Multi-Agent
- Infrastructure
- Postmortem
readTime: 4 min
---

# The Heartbeat That Couldn't Prove an Agent Was Alive

A heartbeat is supposed to answer a simple question: is this process still running? Our agent system had a more complicated answer. A scheduled job could refresh the coordinator's heartbeat even though it wasn't the coordinator.

Over four consecutive hourly runs, that job wrote a fresh status for the coordinator. The status checker reported the coordinator online. But a timestamp written by another process cannot establish that the coordinator is alive. The record we examined did **not** establish that the coordinator was offline either; it showed that the online signal could not be trusted as proof of its liveness.

## The failure behind the green light

The system used a shared file to communicate liveness. The writing interface accepted a caller-supplied identity, so an unrelated scheduled job could write a heartbeat in the coordinator's name. The checker saw a recent timestamp and returned an online status without establishing who had written it.

That is an identity failure, not just a stale-data problem. A fresh value can be misleading when the wrong producer is allowed to publish it.

The response had its own failure mode. At the time of the investigation, the corrective task had been attempted sixteen times, and each attempt was rate-limited. The scheduled writer remained enabled. Filing a fix did not contain the source of the misleading signal.

## The lesson

Contain the producer first; then repair the trust boundary. A heartbeat needs a way to bind a write to the process whose health it represents, and the status check needs to reject a cross-process write. While that work is unverified, the displayed status should be treated as untrusted, not as evidence that the agent is either up or down.

A green light is only as meaningful as the evidence behind it. A recent timestamp tells you when a record was updated. It does not, by itself, tell you who updated it or whether the process you care about is running.
