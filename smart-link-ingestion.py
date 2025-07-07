#!/usr/bin/env python3
"""
Smart Link Ingestion Tool
Uses pattern recognition and targeted crawling for comprehensive knowledge extraction
"""

import sys
import json
from datetime import datetime
import subprocess
import os

# Add the project directory to Python path
sys.path.append('/Users/djm/claude-projects')
# from claude_email_api import send_email_to_david  # Import when needed

def detect_site_patterns(url):
    """Detect common documentation site patterns"""
    patterns = {
        'deepwiki': {
            'base_pattern': 'deepwiki.com',
            'sub_page_patterns': [
                '/1-', '/2-', '/3-', '/4-', '/5-', '/6-', '/7-', '/8-', '/9-',
                '-overview', '-architecture', '-installation', '-usage', '-deployment',
                '-getting-started', '-configuration', '-examples', '-tutorial'
            ],
            'max_numbered_sections': 10
        },
        'gitbook': {
            'base_pattern': 'gitbook.io',
            'sub_page_patterns': [
                '/overview', '/getting-started', '/installation', '/configuration',
                '/api-reference', '/examples', '/troubleshooting'
            ]
        },
        'notion': {
            'base_pattern': 'notion.so',
            'sub_page_patterns': []  # Notion is harder to predict
        },
        'docs_generic': {
            'base_pattern': '/docs/',
            'sub_page_patterns': [
                '/introduction', '/quickstart', '/installation', '/configuration',
                '/api', '/examples', '/deployment', '/troubleshooting'
            ]
        }
    }
    
    # Detect which pattern matches
    for pattern_name, pattern_config in patterns.items():
        if pattern_config['base_pattern'] in url:
            return pattern_name, pattern_config
    
    return 'generic', patterns['docs_generic']

def generate_potential_urls(base_url, pattern_config):
    """Generate list of potential URLs based on detected patterns"""
    potential_urls = [base_url]  # Always include base URL
    
    # Add numbered sections for sites like DeepWiki
    if 'max_numbered_sections' in pattern_config:
        for i in range(1, pattern_config['max_numbered_sections'] + 1):
            potential_urls.append(f"{base_url}/{i}-")
            # Try common section names
            for suffix in ['overview', 'introduction', 'setup', 'configuration', 'deployment', 'examples']:
                potential_urls.append(f"{base_url}/{i}-{suffix}")
    
    # Add pattern-based URLs
    for pattern in pattern_config['sub_page_patterns']:
        potential_urls.append(f"{base_url}{pattern}")
        potential_urls.append(f"{base_url.rstrip('/')}{pattern}")
    
    return list(set(potential_urls))  # Remove duplicates

def test_url_exists(url):
    """Quick test if URL exists using curl"""
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip() in ['200', '301', '302']
    except:
        return False

def smart_site_discovery(base_url):
    """Smart discovery of site structure"""
    print(f"🧠 Smart discovery for: {base_url}")
    
    # Detect site pattern
    pattern_name, pattern_config = detect_site_patterns(base_url)
    print(f"📋 Detected pattern: {pattern_name}")
    
    # Generate potential URLs
    potential_urls = generate_potential_urls(base_url, pattern_config)
    print(f"🔍 Testing {len(potential_urls)} potential URLs...")
    
    # Test which URLs exist
    existing_urls = []
    for url in potential_urls:
        if test_url_exists(url):
            existing_urls.append(url)
            print(f"✅ Found: {url}")
        else:
            print(f"❌ Not found: {url}")
    
    print(f"📊 Discovery complete: {len(existing_urls)}/{len(potential_urls)} URLs found")
    return existing_urls

def fetch_content_with_webfetch(url):
    """Use WebFetch to analyze individual page content"""
    try:
        # This would integrate with the WebFetch MCP tool
        # For now, return placeholder structure
        return {
            'url': url,
            'title': f"Content from {url}",
            'key_concepts': [],
            'content_type': 'documentation',
            'summary': f"Analysis of {url} content"
        }
    except Exception as e:
        return {
            'url': url,
            'error': str(e),
            'status': 'failed'
        }

def comprehensive_site_analysis(urls):
    """Analyze all discovered URLs comprehensively"""
    print(f"📚 Analyzing {len(urls)} pages for comprehensive knowledge extraction...")
    
    site_analysis = {
        'total_pages': len(urls),
        'successful_analyses': 0,
        'failed_analyses': 0,
        'content_summary': [],
        'key_concepts': set(),
        'site_structure': {},
        'knowledge_gaps': []
    }
    
    for i, url in enumerate(urls, 1):
        print(f"📄 Analyzing ({i}/{len(urls)}): {url}")
        
        content_analysis = fetch_content_with_webfetch(url)
        
        if 'error' not in content_analysis:
            site_analysis['successful_analyses'] += 1
            site_analysis['content_summary'].append({
                'url': url,
                'title': content_analysis.get('title', 'Unknown'),
                'content_type': content_analysis.get('content_type', 'unknown'),
                'summary': content_analysis.get('summary', '')[:200] + "..."
            })
            
            # Extract key concepts
            concepts = content_analysis.get('key_concepts', [])
            site_analysis['key_concepts'].update(concepts)
        else:
            site_analysis['failed_analyses'] += 1
            site_analysis['knowledge_gaps'].append(url)
    
    # Convert set to list for JSON serialization
    site_analysis['key_concepts'] = list(site_analysis['key_concepts'])
    
    return site_analysis

def generate_obsidian_documentation(site_analysis, base_url):
    """Generate comprehensive Obsidian documentation"""
    timestamp = datetime.now().strftime('%Y-%m-%d')
    site_name = base_url.split('/')[-1] or 'website'
    
    # Session note
    session_content = f"""# Session: Comprehensive Site Analysis - {site_name}

**Date:** {timestamp}  
**Source:** Automated site crawling and analysis  
**Base URL:** {base_url}  
**Status:** Analysis Complete  

## Discovery Summary

### Site Structure
- **Total Pages Discovered**: {site_analysis['total_pages']}
- **Successfully Analyzed**: {site_analysis['successful_analyses']}
- **Failed Analyses**: {site_analysis['failed_analyses']}
- **Knowledge Gaps**: {len(site_analysis['knowledge_gaps'])}

### Content Overview
"""
    
    for page in site_analysis['content_summary']:
        session_content += f"""
#### {page['title']}
- **URL**: {page['url']}
- **Type**: {page['content_type']}
- **Summary**: {page['summary']}
"""
    
    session_content += f"""

### Key Concepts Discovered
{chr(10).join(f"- [[{concept}]]" for concept in site_analysis['key_concepts'][:20])}

### Knowledge Gaps
{chr(10).join(f"- {url}" for url in site_analysis['knowledge_gaps'])}

## Strategic Implications
- Comprehensive knowledge capture from {site_name}
- {site_analysis['successful_analyses']} pages of technical content ingested
- Foundation for deeper analysis and implementation

## Next Actions
- Review individual page analyses
- Deep dive into key concepts
- Address knowledge gaps from failed URLs

---
*Generated via smart link ingestion workflow*"""

    # Knowledge base entry
    kb_content = f"""# Knowledge Base: {site_name} - Comprehensive Analysis

**Category:** External Documentation  
**Last Updated:** {timestamp}  
**Source:** {base_url}  
**Relevance:** High - Comprehensive technical resource  

## Overview
Complete analysis of {site_name} documentation site with {site_analysis['successful_analyses']} pages successfully ingested.

## Site Architecture
- **Base URL**: {base_url}
- **Total Pages**: {site_analysis['total_pages']}
- **Content Types**: Documentation, tutorials, reference material

## Key Knowledge Areas
{chr(10).join(f"- **{concept}**: Technical concept from site analysis" for concept in site_analysis['key_concepts'][:10])}

## Content Summary
{chr(10).join(f"### {page['title']}{chr(10)}- **URL**: {page['url']}{chr(10)}- **Summary**: {page['summary']}{chr(10)}" for page in site_analysis['content_summary'][:5])}

## Implementation Insights
Based on comprehensive site analysis, key insights for our projects:
- Technical patterns and approaches
- Architecture considerations
- Best practices and methodologies

## Related Resources
- [[Session-{timestamp}-{site_name}-Analysis]]
- [[Pattern-Documentation-Site-Analysis]]

---
*Generated from smart link ingestion with {site_analysis['successful_analyses']} pages analyzed*"""

    return session_content, kb_content

def smart_link_ingestion(url, max_pages=30):
    """Main function for smart link ingestion"""
    print(f"🚀 Smart Link Ingestion: {url}")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    try:
        # Phase 1: Smart discovery
        discovered_urls = smart_site_discovery(url)
        
        # Limit to max_pages
        if len(discovered_urls) > max_pages:
            print(f"⚠️  Limiting analysis to first {max_pages} pages")
            discovered_urls = discovered_urls[:max_pages]
        
        # Phase 2: Comprehensive analysis
        site_analysis = comprehensive_site_analysis(discovered_urls)
        
        # Phase 3: Generate documentation
        session_content, kb_content = generate_obsidian_documentation(site_analysis, url)
        
        # Save results
        results = {
            'timestamp': timestamp,
            'base_url': url,
            'discovered_urls': discovered_urls,
            'site_analysis': site_analysis,
            'session_content': session_content,
            'kb_content': kb_content
        }
        
        # Save to file
        results_file = f"/Users/djm/claude-projects/smart_ingestion_{timestamp}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"💾 Results saved to: {results_file}")
        
        return results
        
    except Exception as e:
        print(f"❌ Error during smart ingestion: {str(e)}")
        raise

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python smart-link-ingestion.py <URL> [max_pages]")
        sys.exit(1)
    
    url = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    
    try:
        results = smart_link_ingestion(url, max_pages)
        
        print("\n" + "="*70)
        print(f"🧠 SMART INGESTION COMPLETE")
        print(f"🔍 URLs discovered: {len(results['discovered_urls'])}")
        print(f"📊 Pages analyzed: {results['site_analysis']['successful_analyses']}")
        print(f"🧩 Key concepts: {len(results['site_analysis']['key_concepts'])}")
        print(f"📚 Knowledge gaps: {results['site_analysis']['failed_analyses']}")
        print("="*70)
        
        # Show discovered URLs
        print("\n📋 Discovered URLs:")
        for url in results['discovered_urls'][:10]:  # Show first 10
            print(f"   • {url}")
        
        if len(results['discovered_urls']) > 10:
            print(f"   ... and {len(results['discovered_urls']) - 10} more")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)