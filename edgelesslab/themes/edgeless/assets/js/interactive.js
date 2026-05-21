/**
 * Edgeless Lab Interactive Features
 * EDGA-1769: Add compelling interactive features and animations
 *
 * Features:
 * - Scroll-triggered reveal animations
 * - Interactive project cards with hover effects
 * - Live agent status indicator
 * - Dark/light mode toggle
 * - Keyboard navigation shortcuts
 * - Easter egg interactions
 * - Reduced motion support
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    animationThreshold: 0.1,
    animationRootMargin: '0px 0px -50px 0px',
    agentStatusInterval: 30000, // 30s
    typingSpeed: 100,
    easterEggSequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  };

  // State
  let agentStatus = 'online';
  let konamiIndex = 0;
  let theme = localStorage.getItem('edgeless-theme') || 'light';

  // ==========================================
  // Initialize on DOM ready
  // ==========================================
  function init() {
    initScrollAnimations();
    initAgentStatus();
    initThemeToggle();
    initKeyboardShortcuts();
    initEasterEggs();
    initHeroAnimation();
    initCardInteractions();
    initReducedMotionCheck();

    // Apply saved theme
    applyTheme(theme);

    console.log('[Edgeless] Interactive features initialized');
  }

  // ==========================================
  // 1. Hero Section Animation
  // ==========================================
  function initHeroAnimation() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Add floating particles
    const particles = document.createElement('div');
    particles.className = 'hero-particles';
    particles.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.animationDuration = `${5 + Math.random() * 5}s`;
      particles.appendChild(particle);
    }

    hero.insertBefore(particles, hero.firstChild);

    // Staggered text reveal
    const heading = hero.querySelector('h1');
    if (heading && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const text = heading.textContent;
      heading.innerHTML = '';
      heading.classList.add('typing-text');

      // Wrap each word in a span
      text.split(' ').forEach((word, i) => {
        const span = document.createElement('span');
        span.textContent = word + ' ';
        span.style.animationDelay = `${i * 0.1}s`;
        span.classList.add('word-reveal');
        heading.appendChild(span);
      });
    }
  }

  // ==========================================
  // 2. Scroll-Triggered Reveal Animations
  // ==========================================
  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all elements
      document.querySelectorAll('.reveal, .work-card, .note-teaser').forEach(el => {
        el.classList.add('revealed');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');

          // Stagger children if it's a container
          const children = entry.target.querySelectorAll('.stagger-child');
          children.forEach((child, i) => {
            child.style.animationDelay = `${i * 0.1}s`;
            child.classList.add('revealed');
          });

          // Unobserve after animation
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: CONFIG.animationThreshold,
      rootMargin: CONFIG.animationRootMargin
    });

    // Observe sections and cards
    const selectors = [
      '.featured-work',
      '.lab-notes',
      '.work-card',
      '.note-teaser',
      '.product-card',
      '[data-reveal]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
      });
    });
  }

  // ==========================================
  // 3. Interactive Project Cards
  // ==========================================
  function initCardInteractions() {
    document.querySelectorAll('.work-card').forEach(card => {
      // 3D tilt effect on hover (desktop only)
      if (!window.matchMedia('(pointer: coarse)').matches) {
        card.addEventListener('mousemove', handleCardTilt);
        card.addEventListener('mouseleave', resetCardTilt);
      }

      // Magnetic button effect for CTAs inside cards
      const cta = card.querySelector('.cta, .buy-button');
      if (cta && !window.matchMedia('(pointer: coarse)').matches) {
        card.addEventListener('mousemove', (e) => handleMagnetic(e, cta));
        card.addEventListener('mouseleave', () => resetMagnetic(cta));
      }
    });

    // Glare effect on product cards
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('mousemove', handleGlare);
      card.addEventListener('mouseleave', resetGlare);
    });
  }

  function handleCardTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function resetCardTilt(e) {
    e.currentTarget.style.transform = '';
  }

  function handleMagnetic(e, element) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    element.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  }

  function resetMagnetic(element) {
    element.style.transform = '';
    element.style.transition = 'transform 0.3s ease';
    setTimeout(() => {
      element.style.transition = '';
    }, 300);
  }

  function handleGlare(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    card.style.setProperty('--glare-x', `${x}%`);
    card.style.setProperty('--glare-y', `${y}%`);
    card.classList.add('glare-active');
  }

  function resetGlare(e) {
    e.currentTarget.classList.remove('glare-active');
  }

  // ==========================================
  // 4. Live Agent Status Indicator
  // ==========================================
  function initAgentStatus() {
    const header = document.querySelector('.main-nav');
    if (!header) return;

    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'agent-status';
    statusIndicator.innerHTML = `
      <span class="status-dot" aria-hidden="true"></span>
      <span class="status-text">Agents active</span>
      <span class="status-pulse"></span>
    `;
    statusIndicator.setAttribute('role', 'status');
    statusIndicator.setAttribute('aria-live', 'polite');
    statusIndicator.setAttribute('aria-label', 'Agent status: online');

    header.appendChild(statusIndicator);

    // Simulate status updates
    updateAgentStatus();
    setInterval(updateAgentStatus, CONFIG.agentStatusInterval);
  }

  function updateAgentStatus() {
    const statuses = ['online', 'active', 'busy'];
    const weights = [0.7, 0.2, 0.1]; // Weighted random

    const random = Math.random();
    let cumulative = 0;
    let newStatus = statuses[0];

    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        newStatus = statuses[i];
        break;
      }
    }

    agentStatus = newStatus;

    const indicator = document.querySelector('.agent-status');
    if (indicator) {
      indicator.className = `agent-status status-${newStatus}`;

      const statusText = indicator.querySelector('.status-text');
      if (statusText) {
        const texts = {
          online: 'Agents active',
          active: 'Shipping now',
          busy: 'Deep work mode'
        };
        statusText.textContent = texts[newStatus];
      }

      indicator.setAttribute('aria-label', `Agent status: ${newStatus}`);
    }
  }

  // ==========================================
  // 5. Dark/Light Mode Toggle
  // ==========================================
  function initThemeToggle() {
    const header = document.querySelector('.main-nav');
    if (!header) return;

    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle dark mode');
    themeToggle.setAttribute('title', 'Toggle theme (T)');
    themeToggle.innerHTML = `
      <span class="theme-icon light" aria-hidden="true">☀️</span>
      <span class="theme-icon dark" aria-hidden="true">🌙</span>
    `;

    themeToggle.addEventListener('click', toggleTheme);

    // Insert before the agent status
    const agentStatus = header.querySelector('.agent-status');
    if (agentStatus) {
      header.insertBefore(themeToggle, agentStatus);
    } else {
      header.appendChild(themeToggle);
    }
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('edgeless-theme', theme);
    applyTheme(theme);

    // Animate the transition
    document.documentElement.style.setProperty('--transition-duration', '0.3s');
    setTimeout(() => {
      document.documentElement.style.setProperty('--transition-duration', '');
    }, 300);
  }

  function applyTheme(newTheme) {
    document.documentElement.setAttribute('data-theme', newTheme);

    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = newTheme === 'dark' ? '#0a0a0a' : '#fafafa';
    }
  }

  // ==========================================
  // 6. Keyboard Navigation Shortcuts
  // ==========================================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if in input/textarea
      if (e.target.matches('input, textarea, [contenteditable]')) return;

      // Theme toggle: T
      if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          toggleTheme();
        }
      }

      // Focus search: /
      if (e.key === '/') {
        e.preventDefault();
        const searchTrigger = document.querySelector('.search-trigger');
        if (searchTrigger) searchTrigger.click();
      }

      // Navigate to work: G then W
      if (e.key === 'g' || e.key === 'G') {
        document.body.classList.add('key-g-pressed');
        setTimeout(() => document.body.classList.remove('key-g-pressed'), 500);
      }

      if (e.key === 'w' || e.key === 'W') {
        if (document.body.classList.contains('key-g-pressed')) {
          e.preventDefault();
          window.location.href = '/work/';
        }
      }

      // Navigate to agents: G then A
      if (e.key === 'a' || e.key === 'A') {
        if (document.body.classList.contains('key-g-pressed')) {
          e.preventDefault();
          window.location.href = '/agents/';
        }
      }

      // Easter egg: Konami code
      checkKonamiCode(e.key);
    });

    // Visual keyboard shortcut helper
    initShortcutHelp();
  }

  function initShortcutHelp() {
    const helpTrigger = document.createElement('button');
    helpTrigger.className = 'shortcut-help-trigger';
    helpTrigger.setAttribute('aria-label', 'Keyboard shortcuts');
    helpTrigger.setAttribute('title', 'Shortcuts (?);');
    helpTrigger.innerHTML = '?';

    document.body.appendChild(helpTrigger);

    helpTrigger.addEventListener('click', showShortcutModal);

    // ? key to show help
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        showShortcutModal();
      }
    });
  }

  function showShortcutModal() {
    const modal = document.createElement('div');
    modal.className = 'shortcut-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Keyboard shortcuts');
    modal.innerHTML = `
      <div class="shortcut-modal__overlay"></div>
      <div class="shortcut-modal__content">
        <button class="shortcut-modal__close" aria-label="Close">×</button>
        <h2>Keyboard Shortcuts</h2>
        <dl>
          <dt><kbd>T</kbd></dt>
          <dd>Toggle dark/light theme</dd>
          <dt><kbd>/</kbd></dt>
          <dd>Focus search</dd>
          <dt><kbd>G</kbd> <kbd>W</kbd></dt>
          <dd>Go to Work</dd>
          <dt><kbd>G</kbd> <kbd>A</kbd></dt>
          <dd>Go to Agents</dd>
          <dt><kbd>?</kbd></dt>
          <dd>Show this help</dd>
          <dt><kbd>Esc</kbd></dt>
          <dd>Close modal / Cancel</dd>
        </dl>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();

    modal.querySelector('.shortcut-modal__close').addEventListener('click', closeModal);
    modal.querySelector('.shortcut-modal__overlay').addEventListener('click', closeModal);

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Focus trap
    modal.querySelector('.shortcut-modal__close').focus();

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  // ==========================================
  // 7. Easter Egg Interactions
  // ==========================================
  function initEasterEggs() {
    // Konami code easter egg
    document.addEventListener('keydown', (e) => {
      checkKonamiCode(e.key);
    });

    // Click logo 5 times for matrix mode
    let logoClicks = 0;
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        if (e.detail === 5) {
          activateMatrixMode();
        }
      });
    }
  }

  function checkKonamiCode(key) {
    if (key === CONFIG.easterEggSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === CONFIG.easterEggSequence.length) {
        activateKonamiEasterEgg();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  }

  function activateKonamiEasterEgg() {
    // Add "edgeless mode" - inverted colors with animation
    document.body.classList.add('konami-active');

    // Show message
    const message = document.createElement('div');
    message.className = 'easter-egg-message';
    message.textContent = '🎮 Edgeless Mode Activated 🎮';
    document.body.appendChild(message);

    // Add floating emoji
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        createFloatingEmoji();
      }, i * 100);
    }

    // Auto-disable after 10 seconds
    setTimeout(() => {
      document.body.classList.remove('konami-active');
      message.remove();
    }, 10000);
  }

  function activateMatrixMode() {
    document.body.classList.add('matrix-mode');

    const message = document.createElement('div');
    message.className = 'easter-egg-message';
    message.textContent = '👁️ The Lab is watching...';
    message.style.fontFamily = 'monospace';
    document.body.appendChild(message);

    setTimeout(() => {
      document.body.classList.remove('matrix-mode');
      message.remove();
    }, 5000);
  }

  function createFloatingEmoji() {
    const emoji = document.createElement('span');
    emoji.className = 'floating-emoji';
    emoji.textContent = ['🐝', '🔥', '⚡', '💎', '🚀'][Math.floor(Math.random() * 5)];
    emoji.style.left = `${Math.random() * 100}vw`;
    emoji.style.top = '-50px';
    emoji.style.animationDuration = `${3 + Math.random() * 2}s`;
    document.body.appendChild(emoji);

    setTimeout(() => emoji.remove(), 5000);
  }

  // ==========================================
  // 8. Reduced Motion Support
  // ==========================================
  function initReducedMotionCheck() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.matches) {
      document.body.classList.add('reduced-motion');
    }

    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    });
  }

  // ==========================================
  // Initialize
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
