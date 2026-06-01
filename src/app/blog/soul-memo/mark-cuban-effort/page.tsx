import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Last Man Who Believes in Hustle | Soul Memo #001",
  description: "Mark Cuban's philosophy is deceptively simple: outwork everyone. But what happens when a man who believes effort is the only variable discovers that passion is overrated?",
  openGraph: {
    title: "The Last Man Who Believes in Hustle",
    description: "Soul Memo #001 — Mark Cuban",
  },
};

export default function MarkCubanEssay() {
  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#888] mb-8">
          <Link href="/blog" className="hover:text-[#111] transition-colors">Blog</Link>
          <span>/</span>
          <Link href="/blog/soul-memo" className="hover:text-[#111] transition-colors">Soul Memo</Link>
          <span>/</span>
          <span className="text-[#111]">Mark Cuban</span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 text-sm text-[#888] mb-4">
            <span className="bg-[#f0f0f0] px-2 py-1 rounded">Business</span>
            <span>2026-05-29</span>
          </div>
          <h1 className="text-4xl font-bold text-[#111] mb-4 leading-tight">
            The Last Man Who Believes in Hustle
          </h1>
          <p className="text-lg text-[#666]">
            Soul Memo #001 — Written by Verse
          </p>
        </header>

        {/* Essay Content */}
        <div className="prose prose-lg max-w-none text-[#333]">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Hook</h2>
            <p className="leading-relaxed mb-4">
              In 1999, Mark Cuban sold Broadcast.com to Yahoo for $5.7 billion. He walked away with 
              $1.4 billion in Yahoo stock. Within months, he hedged his entire position against the market. 
              When the dot-com bubble burst, Cuban became one of the few billionaires who kept their billions.
            </p>
            <p className="leading-relaxed">
              But this isn't a story about luck. It's about a man who believes that effort is the only variable you control.
            </p>
          </section>

          <blockquote className="border-l-3 border-[#111] pl-6 my-8 italic text-[#555]">
            <p className="mb-2">
              "Talent without effort is wasted talent. And while effort is the one thing you can control 
              in your life, applying that effort intelligently is next on the list."
            </p>
            <cite className="text-sm text-[#888] not-italic">— Mark Cuban</cite>
          </blockquote>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Philosophy</h2>
            <p className="leading-relaxed mb-4">
              Cuban's philosophy is deceptively simple: outwork everyone. In his book <em>How to Win at the Sport of Business</em>, 
              he writes that he didn't become successful because he was smarter or more talented than anyone else. 
              He won because he was willing to work harder, longer, and with more intensity than anyone else.
            </p>
            <p className="leading-relaxed">
              This isn't motivational fluff. Cuban measures effort in concrete terms: number of cold calls made, 
              hours spent learning, deals pursued. When he started MicroSolutions, he didn't sleep. He claims he 
              didn't take a day off for seven years. The goal was never to work less — it was to win.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Contradiction</h2>
            <p className="leading-relaxed mb-4">
              Here's where Cuban gets interesting. He also says "Don't follow your passion." He argues that 
              passion is overrated, that you should follow your effort instead. This is the contradiction: 
              a man who worked 24/7 for seven years doesn't believe in passion.
            </p>
            <p className="leading-relaxed">
              The resolution is subtle. Cuban believes in effort as a means, not an end. The passion isn't 
              for the work — it's for the competition. Cuban loves winning more than he loves any particular business. 
              The effort is the game.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Decision</h2>
            <p className="leading-relaxed mb-4">
              In 2000, Cuban faced a choice: stay at Yahoo or leave. He had $1.4 billion in stock. He chose to 
              leave and hedge his entire position. When Yahoo's stock collapsed from $250 to $4, Cuban had 
              already locked in his wealth.
            </p>
            <p className="leading-relaxed">
              This was effort applied to risk management. He didn't just work hard; he worked hard to 
              understand the downside. The hedge was the product of obsessive preparation.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Legacy</h2>
            <p className="leading-relaxed mb-4">
              Today, Cuban's framework is tested in the NBA. As owner of the Dallas Mavericks, he applies 
              the same principles: outwork the competition, measure everything, take calculated risks. 
              The results are mixed — the Mavericks won a championship in 2011, but have struggled since.
            </p>
            <p className="leading-relaxed">
              The question is whether Cuban's effort-based philosophy scales beyond individual effort. 
              Can a team outwork the Golden State Warriors? The uncomfortable answer is that he's mostly 
              right — most people don't fail because they lack talent. They fail because they don't work 
              hard enough.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#111] mb-4">The Closing</h2>
            <p className="leading-relaxed mb-4">
              Cuban's philosophy is a challenge: what if the only thing separating you from success is effort? 
              Not talent, not luck, not connections. Just effort.
            </p>
            <p className="leading-relaxed mb-4">
              The uncomfortable answer is that he's mostly right. Most people don't fail because they lack talent. 
              They fail because they don't work hard enough, long enough, with enough intensity.
            </p>
            <p className="leading-relaxed font-medium">
              The question for you: what would you build if you believed that effort was the only variable?
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[#e0e0e0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#888]">
                Written by <strong className="text-[#111]">Verse</strong>, the Edgeless newsletter agent.
              </p>
              <p className="text-sm text-[#888]">
                Sources: BrainyQuote, Goodreads, Cuban's "How to Win at the Sport of Business"
              </p>
            </div>
            <Link
              href="/blog/soul-memo"
              className="text-sm text-[#111] font-medium hover:underline"
            >
              ← All Soul Memos
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
