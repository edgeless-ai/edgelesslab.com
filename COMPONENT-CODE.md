# Edgeless Lab - Component Pseudo-Code Foundations

**Status:** Foundation v1.0
**Date:** 2026-03-13
**Stack:** Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui + Framer Motion

These are starter component skeletons. Not production-ready, but structurally correct
and ready to iterate on with screenshot-to-code or manual development.

---

## 1. Root Layout

```tsx
// app/layout.tsx
import { GeistSans, GeistMono } from 'geist/font'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { CommandPalette } from '@/components/command-palette'
import './globals.css'

export const metadata = {
  title: { default: 'Edgeless Lab', template: '%s - Edgeless Lab' },
  description: 'Creative technology lab exploring the boundaries of design, AI, and experimental tools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="bg-[#0A0A0B] text-[#EDEDED] font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <CommandPalette />
      </body>
    </html>
  )
}
```

---

## 2. Navbar Component

```tsx
// components/navbar.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Projects', href: '/projects' },
  { label: 'Lab', href: '/lab' },
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/journal' },
]

export function Navbar() {
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    setHidden(latest > previous && latest > 150)
  })

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between
                       bg-[#141415]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl mt-4">
        {/* Logo */}
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Edgeless
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[#888] hover:text-[#EDEDED] transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* open command palette */}}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[#888]
                       border border-[#222] rounded-lg hover:border-[#333] transition-colors"
          >
            <Search size={14} />
            <span>Search</span>
            <kbd className="ml-2 text-[10px] bg-[#1A1A1B] px-1.5 py-0.5 rounded">Cmd+K</kbd>
          </button>

          <Link
            href="/contact"
            className="hidden md:block px-4 py-2 text-sm bg-[#FF6B4A] text-[#0A0A0B]
                       rounded-full font-medium hover:bg-[#FF8266] transition-colors duration-150"
          >
            Get in Touch
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer - slides from right */}
      {mobileOpen && (
        <motion.div
          className="fixed inset-0 top-0 bg-[#0A0A0B]/95 backdrop-blur-sm z-40 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-2xl font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="mt-4 px-6 py-3 bg-[#FF6B4A] text-[#0A0A0B] rounded-full font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Get in Touch
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
```

---

## 3. Hero Section

```tsx
// components/hero.tsx
'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function Hero() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,107,74,0.12) 0%, rgba(124,92,252,0.06) 50%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl">
        <motion.h1
          className="text-[clamp(48px,8vw,120px)] font-bold leading-[0.95] tracking-[-0.03em]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
        >
          Creative technology for the{' '}
          <span className="text-[#FF6B4A]">curious</span>.
        </motion.h1>

        <motion.p
          className="mt-6 text-lg text-[#888] max-w-md mx-auto"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.4}
        >
          We build tools, experiments, and products at the intersection of
          design, AI, and code.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.6}
        >
          <Link
            href="/projects"
            className="inline-block mt-10 px-8 py-4 bg-[#FF6B4A] text-[#0A0A0B]
                       rounded-full text-base font-medium hover:bg-[#FF8266]
                       transition-colors duration-150"
          >
            Explore Projects
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 text-[#555]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </motion.div>
    </section>
  )
}
```

---

## 4. Bento Grid

```tsx
// components/bento-grid.tsx
'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

interface Project {
  slug: string
  title: string
  category: string
  description: string
  thumbnail: string
  featured?: boolean
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

export function BentoGrid({ projects }: { projects: Project[] }) {
  return (
    <section className="px-6 py-20 max-w-[1440px] mx-auto">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {projects.map((project) => (
          <motion.div
            key={project.slug}
            variants={cardVariant}
            className={project.featured ? 'md:col-span-2' : ''}
          >
            <ProjectCard project={project} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block bg-[#141415] border border-[#222] rounded-2xl overflow-hidden
                 hover:border-[#333] transition-colors duration-250"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={project.thumbnail}
          alt={project.title}
          fill
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                     group-hover:scale-[1.02]"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <span className="text-xs uppercase tracking-widest text-[#555]">
          {project.category}
        </span>
        <h3 className="mt-2 text-xl font-semibold text-[#EDEDED]">
          {project.title}
        </h3>
        <p className="mt-2 text-sm text-[#888] line-clamp-2">
          {project.description}
        </p>
      </div>
    </Link>
  )
}
```

---

## 5. Capability Card (Text-only Bento Tile)

```tsx
// components/capability-card.tsx
import { LucideIcon } from 'lucide-react'

interface CapabilityCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export function CapabilityCard({ icon: Icon, title, description, href }: CapabilityCardProps) {
  return (
    <a
      href={href}
      className="group block p-8 bg-[#141415] border border-[#222] rounded-2xl
                 hover:border-[#333] transition-all duration-250"
    >
      <Icon size={32} className="text-[#FF6B4A]" strokeWidth={1.5} />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#888] leading-relaxed">{description}</p>
      <span className="inline-block mt-4 text-sm text-[#FF6B4A] group-hover:translate-x-1 transition-transform">
        Learn more &rarr;
      </span>
    </a>
  )
}
```

---

## 6. Footer

```tsx
// components/footer.tsx
import Link from 'next/link'

const footerLinks = {
  Projects: [
    { label: 'All Work', href: '/projects' },
    { label: 'Case Studies', href: '/projects?filter=case-study' },
  ],
  Lab: [
    { label: 'Experiments', href: '/lab' },
    { label: 'Open Source', href: '/lab?filter=open-source' },
    { label: 'Tools', href: '/lab?filter=tools' },
  ],
  Connect: [
    { label: 'GitHub', href: 'https://github.com/edgelesslab' },
    { label: 'Twitter/X', href: 'https://x.com/edgelesslab' },
    { label: 'Email', href: 'mailto:hello@edgelesslab.com' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
}

export function Footer() {
  return (
    <footer className="relative mt-32">
      {/* Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B] to-black pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 pt-20 pb-8">
        {/* Logo */}
        <p className="text-lg font-semibold mb-12">Edgeless Lab</p>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-medium text-[#EDEDED] mb-4">{heading}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#888] hover:text-[#EDEDED] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mb-12">
          <form className="flex max-w-md">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 bg-[#141415] border border-[#222] rounded-l-xl
                         text-sm text-[#EDEDED] placeholder-[#555]
                         focus:outline-none focus:border-[#333]"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#FF6B4A] text-[#0A0A0B] text-sm font-medium
                         rounded-r-xl hover:bg-[#FF8266] transition-colors"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-2 text-xs text-[#555]">
            Stay updated on new experiments and projects.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-8 border-t border-[#222]">
          <p className="text-xs text-[#555]">&copy; 2026 Edgeless Lab</p>
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
```

---

## 7. Scroll Reveal Wrapper

```tsx
// components/scroll-reveal.tsx
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
```

---

## 8. Glow Orb (Ambient Background Effect)

```tsx
// components/glow-orb.tsx
export function GlowOrb({
  color = '#FF6B4A',
  size = 400,
  opacity = 0.15,
  className = '',
}: {
  color?: string
  size?: number
  opacity?: number
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        opacity,
        animation: 'float 6s ease-in-out infinite',
      }}
    />
  )
}

// Add to globals.css:
// @keyframes float {
//   0%, 100% { transform: translateY(0px); }
//   50% { transform: translateY(-20px); }
// }
```

---

## 9. Global Styles Reference

```css
/* globals.css */
@import 'tailwindcss';

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Selection color */
::selection {
  background: rgba(255, 107, 74, 0.3);
  color: #EDEDED;
}

/* Focus styles */
:focus-visible {
  outline: 2px solid #FF6B4A;
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0A0A0B;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

---

## 10. Tailwind Config Reference

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0B',
          surface: '#141415',
          'surface-hover': '#1A1A1B',
          elevated: '#1E1E1F',
        },
        border: {
          subtle: '#222223',
          focus: '#333334',
        },
        text: {
          primary: '#EDEDED',
          secondary: '#888888',
          tertiary: '#555555',
        },
        accent: {
          DEFAULT: '#FF6B4A',
          hover: '#FF8266',
          alt: '#7C5CFC',
          'alt-hover': '#9478FF',
        },
        success: '#4ADE80',
        warning: '#FBBF24',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
```
