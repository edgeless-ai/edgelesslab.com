---
id: task-215
title: Harden and expand the live Edgeless Labs website
status: done
priority: P1
effort: XL
epic: 5
created: 2026-03-13
depends_on: []
blocks: []
---

# Task 215: Harden and Expand the Live Edgeless Labs Website

## Goal

Use the deployed Edgeless Labs site as the baseline and bring the live experience, content architecture, metadata, and production polish up to the intended design bar.

## Current State

- Site is already live at `https://edgelesslab.com`
- Core routes exist: `/`, `/projects/`, `/products/`, `/lab/`, `/blog/`, `/about/`
- The design direction is established: dark, technical, premium, infrastructure-forward
- Live deploy and current source are now aligned across the primary route set
- Metadata, OG tags, CSP, internal links, mobile nav/footer behavior, and favicon state have all been re-audited
- `npx eslint src/` is clean in `edgeless-website/`
- Further section-level experimentation should continue under `task-222`, not this hardening task

## Resolution Summary (2026-03-27)

- Backlog scope was corrected from greenfield build work to live-site hardening and QA
- Route metadata was normalized across primary and detail pages
- Footer/nav/source drift was reduced by consolidating shared data usage
- Blog rendering, internal blog links, OG metadata, and PostHog CSP allowances were verified live
- Final app-code lint pass is clean

## Phase 1: Live-Site Audit

- [x] Confirm live route inventory and overall visual direction
- [x] Compare live site assumptions against backlog tasks
- [x] Identify first-pass drift issues worth fixing in source
- [x] Capture mobile and tablet checks for key routes
- [x] Review metadata across all primary and detail routes

## Phase 2: Content and IA Hardening

- [x] Normalize nav, footer, and section hierarchy across routes
- [x] Consolidate shared data sources to reduce content drift
- [x] Tighten homepage messaging and CTA hierarchy
- [x] Ensure projects, products, lab, and about pages each have a clear role

## Phase 3: Design Refinement

- [x] Refine spacing, typography rhythm, and section transitions
- [x] Improve visual consistency between homepage and inner pages
- [x] Tune motion and hover behavior for restraint and clarity
- [x] Validate mobile behavior at 375px, 768px, and desktop widths

## Phase 4: Production QA

- [x] Lint and production build pass cleanly
- [x] Verify titles, descriptions, canonicals, and OG metadata
- [x] Check for broken internal links and stale slugs
- [x] Audit the deploy path so `edgelesslab.com` serves the current build rather than stale footer/favicon state
- [x] Run post-deploy QA on homepage/mobile/nav/footer/favicon and confirm live matches built output
- [x] Confirm the deployed site matches intended source state

## Acceptance Criteria

- [x] Live site and source agree on primary navigation, footer, and route structure
- [x] Titles, descriptions, canonicals, and OG tags are explicit for primary routes
- [x] No broken internal links remain in shared navigation and footer surfaces
- [x] Homepage and inner pages feel like one coherent system
- [x] Deployed site reflects the current intended implementation

## Artifacts

- Source app: `edgeless-website/`
- Live reference: `https://edgelesslab.com`
- Supporting design research: `docs/edgeless-website-design-research.md`
