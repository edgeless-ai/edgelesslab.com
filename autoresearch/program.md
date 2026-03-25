# Edgeless Website Autoresearch -- Experiment Protocol

## What This Is

An autoresearch loop that iteratively improves edgelesslab.com across 8 quality axes.
Based on Karpathy's autoresearch pattern: one mutable codebase + multi-axis scoring + ratcheting.

## Architecture

```
prepare.py    -- FROZEN: scoring function, 8-axis evaluator
program.md    -- THIS FILE: experiment catalog and rules
results.tsv   -- APPEND-ONLY: experiment log with scores
src/          -- MUTABLE: the website source code (YOUR TARGET)
```

## The Experiment Loop

Each iteration:

1. **Read** `results.tsv` to see what's been tried and what scored highest
2. **Read** the relevant source file for this experiment
3. **Propose** ONE specific change
4. **Write** the modified file
5. **Run** `python3.11 autoresearch/prepare.py --id <experiment_name>`
6. **Decide**: if composite score improved AND no axis regressed by >0.5, keep. Otherwise revert.

## Rules

1. **ONE change per experiment** -- isolate variables
2. **Name experiments descriptively** -- e.g., `seo_add_canonical_products`, `a11y_skip_link`
3. **Revert failures** -- restore the file before trying something else
4. **Never regress an axis by >0.5** -- even if composite improves
5. **Log everything** -- results.tsv is the experiment journal
6. **Don't touch prepare.py or program.md** -- frozen

## Scoring Dimensions (8 axes, weighted)

| Axis | Weight | What It Measures |
|------|--------|-----------------|
| SEO | 15% | Meta tags, sitemap, OG, canonical, JSON-LD, H1s |
| PERF | 15% | Bundle size, font preload, image optimization, chunk count |
| A11Y | 15% | Heading hierarchy, labels, alt text, ARIA, focus styles, skip link |
| UX | 15% | CTAs, navigation, footer, 404 page, social proof |
| SECURITY | 10% | External links, secrets, privacy compliance, source maps |
| CODE | 10% | TypeScript safety, unused imports, console.log, data centralization |
| CONTENT | 10% | Value prop clarity, product descriptions, blog, internal links |
| MOBILE | 10% | Responsive utilities, mobile nav, touch targets, viewport units |

## Experiment Catalog (100+ experiments, grouped by axis)

### SEO (Experiments 1-15)

1. `seo_unique_titles` -- Ensure every page has a unique, descriptive <title> under 60 chars
2. `seo_meta_descriptions` -- Add/fix meta descriptions on all pages (50-160 chars each)
3. `seo_canonical_urls` -- Add canonical URLs to every page via metadata API
4. `seo_og_tags_complete` -- Ensure og:title, og:description, og:image, og:url on every page
5. `seo_twitter_cards` -- Add twitter:card meta to all pages
6. `seo_single_h1` -- Ensure exactly one H1 per page
7. `seo_sitemap_coverage` -- Update sitemap.xml to include ALL routes
8. `seo_robots_txt` -- Ensure robots.txt allows crawling and points to sitemap
9. `seo_jsonld_org` -- Add Organization JSON-LD to homepage
10. `seo_jsonld_products` -- Add Product JSON-LD to products page
11. `seo_jsonld_breadcrumbs` -- Add BreadcrumbList JSON-LD to subpages
12. `seo_og_image_per_page` -- Generate unique OG images per page (or set page-specific)
13. `seo_internal_linking` -- Add contextual internal links between related pages
14. `seo_heading_hierarchy` -- Fix any heading level skips (h1 > h2 > h3)
15. `seo_alt_seo_keywords` -- Add relevant alt text to decorative elements

### Performance (Experiments 16-30)

16. `perf_lazy_images` -- Add lazy loading to below-fold images
17. `perf_font_display_swap` -- Ensure font-display: swap for web fonts
18. `perf_preconnect_gumroad` -- Add preconnect hint for gumroad.com
19. `perf_preconnect_posthog` -- Add preconnect for us.i.posthog.com
20. `perf_remove_unused_deps` -- Audit and remove unused npm dependencies
21. `perf_tree_shake_icons` -- Import only used icons from lucide-react
22. `perf_dynamic_posthog` -- Lazy-load PostHog to reduce initial bundle
23. `perf_css_purge_check` -- Verify Tailwind purge is working (no unused classes)
24. `perf_image_formats` -- Convert images to WebP/AVIF
25. `perf_minimize_client_js` -- Move static content to server components where possible
26. `perf_preload_critical_css` -- Preload critical CSS
27. `perf_defer_analytics` -- Load analytics after page interactive
28. `perf_optimize_fonts` -- Subset fonts to only used characters
29. `perf_reduce_chunk_count` -- Configure bundling to reduce HTTP requests
30. `perf_add_resource_hints` -- Add dns-prefetch and preconnect hints

### Accessibility (Experiments 31-50)

31. `a11y_skip_link` -- Add skip-to-content link
32. `a11y_main_landmark` -- Wrap page content in <main> element
33. `a11y_nav_landmark` -- Ensure nav uses semantic <nav> element
34. `a11y_footer_landmark` -- Ensure footer uses <footer> element
35. `a11y_form_labels` -- Add labels/aria-labels to all form inputs
36. `a11y_subscribe_label` -- Label the email subscribe input
37. `a11y_link_purpose` -- Ensure all links have descriptive text (not "click here")
38. `a11y_color_contrast` -- Fix any low-contrast text (check text-secondary on bg-base)
39. `a11y_focus_visible` -- Add visible focus styles for keyboard navigation
40. `a11y_focus_ring_color` -- Use accent color for focus rings
41. `a11y_heading_order` -- Fix heading hierarchy on all pages
42. `a11y_img_alt_text` -- Add meaningful alt text to all images
43. `a11y_aria_current` -- Add aria-current="page" to active nav link
44. `a11y_mobile_menu_trap` -- Add focus trap to mobile menu when open
45. `a11y_mobile_menu_esc` -- Close mobile menu on Escape key
46. `a11y_button_names` -- Ensure all icon-only buttons have aria-label
47. `a11y_external_link_indicator` -- Indicate external links to screen readers
48. `a11y_reduced_motion` -- Respect prefers-reduced-motion
49. `a11y_page_language` -- Verify lang="en" on html element
50. `a11y_error_states` -- Add aria-live for dynamic content changes

### UX / Conversion (Experiments 51-70)

51. `ux_hero_clarity` -- Sharpen homepage hero value proposition
52. `ux_hero_cta_contrast` -- Make primary CTA button more prominent
53. `ux_products_cta_text` -- Change "Get it on Gumroad" to action-oriented text
54. `ux_free_product_gateway` -- Position free product as gateway to paid
55. `ux_social_proof_github` -- Add GitHub stars count or contributor info
56. `ux_social_proof_downloads` -- Show download/purchase counts
57. `ux_testimonial_section` -- Add testimonials or user quotes
58. `ux_trust_badges` -- Add "Built with" or "As seen in" trust signals
59. `ux_email_incentive` -- Add incentive for newsletter signup
60. `ux_sticky_cta` -- Add sticky CTA on scroll for products page
61. `ux_breadcrumbs` -- Add breadcrumb navigation to subpages
62. `ux_404_helpful` -- Make 404 page helpful with search/navigation
63. `ux_footer_newsletter` -- Add newsletter signup to footer
64. `ux_cross_sell` -- Add "You might also like" on product cards
65. `ux_product_comparison` -- Add feature comparison table
66. `ux_pricing_anchor` -- Show original value vs. price (savings framing)
67. `ux_blog_cta` -- Add product CTAs within blog posts
68. `ux_project_to_product` -- Link projects to relevant products
69. `ux_loading_states` -- Add skeleton/loading states for dynamic content
70. `ux_scroll_progress` -- Add reading progress indicator on long pages

### Security (Experiments 71-80)

71. `sec_external_noopener` -- Ensure all target="_blank" links have rel="noopener noreferrer"
72. `sec_remove_console_logs` -- Remove any console.log from production code
73. `sec_no_source_maps` -- Disable source maps in production build
74. `sec_privacy_posthog` -- Update privacy policy to mention PostHog analytics
75. `sec_privacy_opt_out` -- Add analytics opt-out mechanism
76. `sec_csp_meta` -- Add Content-Security-Policy meta tag
77. `sec_xframe_meta` -- Add X-Frame-Options equivalent meta tag
78. `sec_referrer_policy` -- Add Referrer-Policy meta tag
79. `sec_permissions_policy` -- Add Permissions-Policy meta tag
80. `sec_sri_external` -- Add subresource integrity for any external scripts

### Code Quality (Experiments 81-90)

81. `code_remove_any_types` -- Replace 'any' with proper TypeScript types
82. `code_unused_imports` -- Remove unused imports across all files
83. `code_centralize_data` -- Move product/project data to shared data.ts
84. `code_type_safety` -- Add proper interfaces for product, project types
85. `code_consistent_exports` -- Standardize named vs default exports
86. `code_error_boundary` -- Add error boundary component
87. `code_env_validation` -- Add runtime validation for env vars
88. `code_remove_dead_code` -- Remove unused components and functions
89. `code_consistent_styling` -- Resolve inline style vs Tailwind inconsistencies
90. `code_next_link` -- Replace all internal <a> tags with next/link <Link>

### Content (Experiments 91-100)

91. `content_about_substance` -- Flesh out about page with founder story
92. `content_blog_entries` -- Add actual blog posts (at least 3)
93. `content_product_benefits` -- Rewrite features as benefits on products page
94. `content_project_outcomes` -- Add outcomes/metrics to project descriptions
95. `content_lab_purpose` -- Clarify lab page purpose and connection to products
96. `content_value_prop_test` -- A/B test homepage tagline variants
97. `content_pricing_justification` -- Add "why this price" context
98. `content_faq_section` -- Add FAQ to products page
99. `content_changelog` -- Add visible changelog or "what's new"
100. `content_open_source_story` -- Highlight open source commitment

### Mobile (Experiments 101-115)

101. `mobile_nav_hamburger` -- Verify mobile hamburger menu works correctly
102. `mobile_touch_targets` -- Ensure all touch targets are >= 44px
103. `mobile_viewport_units` -- Use svh/dvh for mobile-safe viewport height
104. `mobile_stack_ctas` -- Stack CTA buttons vertically on mobile
105. `mobile_font_sizes` -- Ensure minimum 16px font on mobile
106. `mobile_grid_responsive` -- Make all grids single-column on small screens
107. `mobile_image_sizing` -- Responsive images that don't overflow mobile
108. `mobile_horizontal_scroll` -- Fix any horizontal scroll issues
109. `mobile_tap_spacing` -- Add sufficient spacing between tappable elements
110. `mobile_form_zoom` -- Prevent zoom on input focus (font-size >= 16px)
111. `mobile_safe_areas` -- Respect safe areas for notched devices
112. `mobile_swipe_nav` -- Consider swipe gestures for mobile navigation
113. `mobile_bottom_nav` -- Consider fixed bottom CTA on mobile product pages
114. `mobile_text_wrap` -- Ensure long text wraps properly on small screens
115. `mobile_card_layout` -- Optimize card layouts for mobile (full-width)

## Getting Started

```bash
# Run baseline
python3.11 autoresearch/prepare.py --baseline -v

# Run an experiment
python3.11 autoresearch/prepare.py --id seo_unique_titles -v

# Check best so far
python3.11 autoresearch/prepare.py --best

# Score without logging (dry run)
python3.11 autoresearch/prepare.py --score-only --no-build -v
```
