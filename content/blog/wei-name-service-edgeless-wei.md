---
slug: wei-name-service-edgeless-wei
title: What an On-Chain Name Can—and Can't—Do
description: A look at Wei Name Service, the records a name can hold, and the distinction between registering a name and deploying an identity system.
date: 2026-09-28
tags:
- Web3
- ENS
- Identity
- On-Chain
readTime: 4 min
---

# What an On-Chain Name Can—and Can't—Do

A name is easier to share than a long wallet address. That is the appeal of on-chain naming: publish a human-readable identifier and let software look up the record behind it. But registration alone doesn't guarantee that every application can resolve the name, that a website is configured, or that an organization has implemented a complete identity system.

[Wei Name Service](https://wei.domains/) is an Ethereum naming project for `.wei` names. Like the Ethereum Name Service (ENS), it associates names with records that compatible software can look up. A name can hold an address and other records, including text and website content references. Those records must be configured; their existence should not be assumed from the name alone.

## What we found

In a September 2026 check, `edgeless.wei` was registered and had an address record. It did not have a website content record configured at the time. That's a snapshot, not a guarantee about its current configuration.

A name can be a useful starting point for linking an address, a project and public information. But software support matters: a wallet or application needs an appropriate resolver or bridge to understand the name. Before sending funds, check that the application resolves the intended address and verify it independently. A recognizable name is not a substitute for transaction review.

## Registration is not deployment

Our initial exploration considered using subdomains or website records for projects. Those were possibilities to investigate, not proof that every project or agent already had a working identity. Setting records requires authorized transactions; hosting content also introduces availability and gateway considerations.

The lesson is simple: treat a name as an addressable record, not a magic guarantee of identity, permanence or universal compatibility. Inspect the actual records and the software resolving them before building a workflow around it.
