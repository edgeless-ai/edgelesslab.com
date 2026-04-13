/**
 * GitHub Ecosystem Adapter
 * 
 * Visual: Repositories as containers, stars/forks/PRs as particles,
 *         dependencies as connections, activity as flow velocity
 * 
 * API: GitHub GraphQL or REST (no auth for public, rate limited)
 */

class GitHubAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super('github');
    this.apiUrl = config.apiUrl || 'https://api.github.com';
    this.token = config.token || null; // Optional, increases rate limit
    this.username = config.username || null;
    this.org = config.org || null;
    this.repos = config.repos || null; // Specific repo list
    this.maxRepos = config.maxRepos || 10;
    
    // Query strategies
    this.queryType = config.queryType || 'user'; // 'user' | 'org' | 'repos' | 'trending'
  }

  async fetch() {
    let repos = [];
    
    switch (this.queryType) {
      case 'user':
        repos = await this.fetchUserRepos(this.username);
        break;
      case 'org':
        repos = await this.fetchOrgRepos(this.org);
        break;
      case 'repos':
        repos = await this.fetchSpecificRepos(this.repos);
        break;
      case 'trending':
        repos = await this.fetchTrending();
        break;
      default:
        repos = await this.fetchUserRepos('qt_djm'); // Default to David
    }
    
    // Fetch additional metrics for each repo
    const enrichedRepos = await this.enrichRepos(repos.slice(0, this.maxRepos));
    
    return {
      repos: enrichedRepos,
      timestamp: Date.now()
    };
  }

  async fetchUserRepos(username) {
    if (!username) return [];
    
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.apiUrl}/users/${username}/repos?sort=updated&per_page=${this.maxRepos}`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Rate limited');
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.warn('GitHub fetch failed:', err);
      return this.generateMockRepos();
    }
  }

  async fetchOrgRepos(org) {
    if (!org) return [];
    
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.apiUrl}/orgs/${org}/repos?sort=updated&per_page=${this.maxRepos}`,
        { headers }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('GitHub org fetch failed:', err);
      return [];
    }
  }

  async fetchSpecificRepos(repoList) {
    const repos = [];
    
    for (const repo of repoList.slice(0, this.maxRepos)) {
      try {
        const [owner, name] = repo.split('/');
        const headers = this.getHeaders();
        const response = await fetch(
          `${this.apiUrl}/repos/${owner}/${name}`,
          { headers }
        );
        
        if (response.ok) {
          repos.push(await response.json());
        }
      } catch (err) {
        console.warn(`Failed to fetch ${repo}:`, err);
      }
    }
    
    return repos;
  }

  async fetchTrending() {
    // GitHub trending isn't in API, search for recently starred instead
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.apiUrl}/search/repositories?q=stars:>1000+created:>2024-01-01&sort=stars&order=desc&per_page=${this.maxRepos}`,
        { headers }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.items || [];
    } catch (err) {
      console.warn('Trending fetch failed:', err);
      return [];
    }
  }

  async enrichRepos(repos) {
    // Fetch recent activity for each repo
    const enriched = [];
    
    for (const repo of repos) {
      try {
        const [events, contributors] = await Promise.all([
          this.fetchRepoEvents(repo.full_name),
          this.fetchRepoContributors(repo.full_name)
        ]);
        
        enriched.push({
          ...repo,
          recentEvents: events,
          contributors: contributors,
          activityScore: events.length
        });
      } catch (err) {
        enriched.push({
          ...repo,
          recentEvents: [],
          contributors: [],
          activityScore: 0
        });
      }
    }
    
    return enriched;
  }

  async fetchRepoEvents(repoFullName) {
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.apiUrl}/repos/${repoFullName}/events?per_page=30`,
        { headers }
      );
      
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      return [];
    }
  }

  async fetchRepoContributors(repoFullName) {
    try {
      const headers = this.getHeaders();
      const response = await fetch(
        `${this.apiUrl}/repos/${repoFullName}/contributors?per_page=10`,
        { headers }
      );
      
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      return [];
    }
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PolymarketFlowViz/1.0'
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }

  generateMockRepos() {
    // Mock data for resilience/rate limits
    return [
      { id: 1, name: 'polymarket-flow-viz', full_name: 'qt_djm/polymarket-flow-viz', stargazers_count: 42, forks_count: 5, open_issues_count: 3, language: 'JavaScript', updated_at: new Date().toISOString() },
      { id: 2, name: 'hermes-agent', full_name: 'qt_djm/hermes-agent', stargazers_count: 156, forks_count: 23, open_issues_count: 12, language: 'Python', updated_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, name: 'pen-plotter-art', full_name: 'qt_djm/pen-plotter-art', stargazers_count: 89, forks_count: 7, open_issues_count: 0, language: 'TypeScript', updated_at: new Date(Date.now() - 172800000).toISOString() },
      { id: 4, name: 'obsidian-vault-tools', full_name: 'qt_djm/obsidian-vault-tools', stargazers_count: 234, forks_count: 45, open_issues_count: 8, language: 'Python', updated_at: new Date(Date.now() - 259200000).toISOString() },
      { id: 5, name: 'p5js-generative', full_name: 'qt_djm/p5js-generative', stargazers_count: 67, forks_count: 12, open_issues_count: 2, language: 'JavaScript', updated_at: new Date(Date.now() - 345600000).toISOString() }
    ];
  }

  normalize(raw) {
    const repos = raw.repos;
    
    const markets = repos.map(repo => {
      // Calculate activity metrics
      const starVelocity = this.calculateStarVelocity(repo);
      const prVelocity = (repo.recentEvents?.filter(e => e.type === 'PullRequestEvent').length || 0);
      const issueCount = repo.open_issues_count || 0;
      const forkRatio = repo.forks_count / Math.max(1, repo.stargazers_count);
      
      // "Volume" = total attention (stars + forks * 2 for network effect)
      const volume24h = (repo.stargazers_count + repo.forks_count * 2) * 1000;
      
      // "Price" = momentum/strength (0-1)
      // High star velocity, low issue count = strong momentum
      const momentum = Math.min(1, (starVelocity + prVelocity * 0.1) / 10);
      const health = Math.max(0, 1 - (issueCount / Math.max(100, repo.stargazers_count)));
      const yesPrice = (momentum + health) / 2;
      
      // Category by language
      const category = this.languageToCategory(repo.language);
      
      return {
        id: `github-${repo.id}`,
        question: repo.name,
        volume24h: volume24h,
        liquidity: repo.stargazers_count,
        yesPrice: yesPrice,
        category: category,
        resolutionTime: new Date(Date.now() + 30 * 86400000), // 30 days out
        numTraders: repo.contributors?.length || 1,
        trades24h: repo.recentEvents?.length || 0,
        flowRate: (repo.recentEvents?.length || 0) / 86400,
        activityScore: this.calculateActivityScore(repo),
        metadata: {
          fullName: repo.full_name,
          description: repo.description?.substring(0, 100),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          issues: issueCount,
          language: repo.language,
          url: repo.html_url,
          starsToday: starVelocity,
          prsThisWeek: prVelocity
        }
      };
    });

    return {
      markets,
      global: {
        totalRepos: repos.length,
        totalStars: repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0),
        totalForks: repos.reduce((sum, r) => sum + (r.forks_count || 0), 0),
        topLanguage: this.getTopLanguage(repos)
      },
      timestamp: raw.timestamp,
      source: this.name
    };
  }

  calculateStarVelocity(repo) {
    // Estimate recent star gain
    // GitHub doesn't give star timestamps, use update recency as proxy
    const updated = new Date(repo.updated_at);
    const daysSinceUpdate = (Date.now() - updated.getTime()) / 86400000;
    
    if (daysSinceUpdate < 1) return 10;
    if (daysSinceUpdate < 7) return 5;
    if (daysSinceUpdate < 30) return 2;
    return 0.5;
  }

  calculateActivityScore(repo) {
    const events = repo.recentEvents?.length || 0;
    const commits = repo.recentEvents?.filter(e => e.type === 'PushEvent').length || 0;
    const prs = repo.recentEvents?.filter(e => e.type === 'PullRequestEvent').length || 0;
    
    // Max score around 50 events
    return Math.min(1, (events + commits * 2 + prs * 3) / 100);
  }

  languageToCategory(language) {
    const mapping = {
      'JavaScript': 'tech',
      'TypeScript': 'tech',
      'Python': 'science',
      'Rust': 'crypto',
      'Go': 'crypto',
      'Java': 'finance',
      'C++': 'finance',
      'C': 'finance',
      'Ruby': 'entertainment',
      'Swift': 'sports',
      'Kotlin': 'sports'
    };
    
    return mapping[language] || 'other';
  }

  getTopLanguage(repos) {
    const languages = {};
    for (const repo of repos) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    }
    
    return Object.entries(languages)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  }
}

// Register for factory
if (typeof DataSourceFactory !== 'undefined') {
  DataSourceFactory.registerType('github', GitHubAdapter);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GitHubAdapter };
}
