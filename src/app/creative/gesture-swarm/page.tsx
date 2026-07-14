'use client';

import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ================================================================== */
/*  AGENT COLOURS                                                      */
/* ================================================================== */
const AGENT_COLORS = ['#b51670', '#e34a6f', '#f7b731', '#36a2eb', '#4ecdc4'];

/* ================================================================== */
/*  BANDIT SIMULATOR (ported from viz-utils.js)                        */
/* ================================================================== */

interface BanditState {
  counts: number[];
  rewards: number[];
}

class BanditSimulator {
  numArms: number;
  armProbs: number[];
  private _counts: number[];
  private _rewards: number[];

  constructor(numArms: number, armProbs: number[]) {
    this.numArms = numArms;
    this.armProbs = armProbs.slice();
    this._counts = new Array(numArms).fill(0);
    this._rewards = new Array(numArms).fill(0);
  }

  pullArm(armIndex: number): number {
    const reward = Math.random() < this.armProbs[armIndex] ? 1 : 0;
    this._counts[armIndex]++;
    this._rewards[armIndex] += reward;
    return reward;
  }

  getOptimalValue(): number {
    return Math.max(...this.armProbs);
  }

  reset(): void {
    for (let i = 0; i < this.numArms; i++) {
      this._counts[i] = 0;
      this._rewards[i] = 0;
    }
  }
}

/* ================================================================== */
/*  HELPER: sampleBeta, sampleGamma, sampleNormal                      */
/* ================================================================== */

function sampleGamma(k: number): number {
  if (k < 1) {
    return sampleGamma(k + 1) * Math.pow(Math.random(), 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = sampleNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleNormal(): number {
  let u: number, v: number, s: number;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  return u * Math.sqrt((-2 * Math.log(s)) / s);
}

function sampleBeta(alpha: number, beta: number): number {
  if (alpha === 1 && beta === 1) return Math.random();
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

/* ================================================================== */
/*  AGENT — strategy-based bandit agent                                */
/* ================================================================== */

type Strategy = 'random' | 'epsilon-greedy' | 'ucb' | 'thompson' | 'optimistic';

interface AgentParams {
  epsilon: number;
  ucbC: number;
  optimism: number;
}

interface AgentData {
  strategy: Strategy;
  name: string;
  color: string;
}

interface AgentInternal {
  strategy: Strategy;
  params: AgentParams;
  _numArms: number;
  _counts: number[];
  _rewards: number[];
  _values: number[];
  _totalPulls: number;
  _totalReward: number;
}

function createAgent(strategy: Strategy, params?: Partial<AgentParams>): AgentInternal {
  const p: AgentParams = {
    epsilon: params?.epsilon ?? 0.1,
    ucbC: params?.ucbC ?? 1.0,
    optimism: params?.optimism ?? 1.0,
  };
  return {
    strategy,
    params: p,
    _numArms: 0,
    _counts: [],
    _rewards: [],
    _values: [],
    _totalPulls: 0,
    _totalReward: 0,
  };
}

function initArms(agent: AgentInternal, numArms: number): void {
  if (agent._numArms === numArms) return;
  agent._numArms = numArms;
  agent._counts = new Array(numArms).fill(0);
  agent._rewards = new Array(numArms).fill(0);
  const initialVal = agent.strategy === 'optimistic' ? agent.params.optimism : 0;
  agent._values = new Array(numArms).fill(initialVal);
  agent._totalPulls = 0;
  agent._totalReward = 0;
}

function argMaxRandomTieBreak(arr: number[]): number {
  let bestVal = -Infinity;
  const bestIndices: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > bestVal) {
      bestVal = arr[i];
      bestIndices.length = 0;
      bestIndices.push(i);
    } else if (arr[i] === bestVal) {
      bestIndices.push(i);
    }
  }
  if (bestIndices.length === 1) return bestIndices[0];
  return bestIndices[Math.floor(Math.random() * bestIndices.length)];
}

function selectArm(agent: AgentInternal, simulator: BanditSimulator): number {
  const n = simulator.numArms;
  if (agent._numArms !== n) initArms(agent, n);

  switch (agent.strategy) {
    case 'random':
      return Math.floor(Math.random() * n);

    case 'epsilon-greedy':
      if (Math.random() < agent.params.epsilon) {
        return Math.floor(Math.random() * n);
      }
      return argMaxRandomTieBreak(agent._values);

    case 'ucb': {
      for (let i = 0; i < n; i++) {
        if (agent._counts[i] === 0) return i;
      }
      const ucbValues = new Array(n);
      const c = agent.params.ucbC;
      const logTotal = Math.log(agent._totalPulls);
      for (let j = 0; j < n; j++) {
        const mean = agent._values[j];
        const exploration = c * Math.sqrt((2 * logTotal) / agent._counts[j]);
        ucbValues[j] = mean + exploration;
      }
      return argMaxRandomTieBreak(ucbValues);
    }

    case 'thompson': {
      let maxSample = -Infinity;
      let bestArm = 0;
      for (let k = 0; k < n; k++) {
        const alpha = 1 + agent._rewards[k];
        const beta = 1 + agent._counts[k] - agent._rewards[k];
        const sample = sampleBeta(alpha, beta);
        if (sample > maxSample) {
          maxSample = sample;
          bestArm = k;
        }
      }
      return bestArm;
    }

    case 'optimistic':
      return argMaxRandomTieBreak(agent._values);

    default:
      return 0;
  }
}

function updateAgent(agent: AgentInternal, arm: number, reward: number): void {
  agent._counts[arm]++;
  agent._rewards[arm] += reward;
  agent._totalPulls++;
  agent._totalReward += reward;
  const n = agent._counts[arm];
  agent._values[arm] = agent._values[arm] + (reward - agent._values[arm]) / n;
}

function getRegret(agent: AgentInternal, simulator: BanditSimulator): number {
  const optimal = simulator.getOptimalValue();
  return optimal * agent._totalPulls - agent._totalReward;
}

function resetAgent(agent: AgentInternal): void {
  const initialVal = agent.strategy === 'optimistic' ? agent.params.optimism : 0;
  if (agent._numArms > 0) {
    agent._counts = new Array(agent._numArms).fill(0);
    agent._rewards = new Array(agent._numArms).fill(0);
    agent._values = new Array(agent._numArms).fill(initialVal);
  }
  agent._totalPulls = 0;
  agent._totalReward = 0;
}

/* ================================================================== */
/*  RACE RUNNER                                                        */
/* ================================================================== */

interface RaceResult {
  histories: number[][];
  finalRegrets: number[];
  finalPulls: number[];
  finalRewards: number[];
}

function runRace(agents: AgentInternal[], simulator: BanditSimulator, steps: number): RaceResult {
  const numAgents = agents.length;
  for (let a = 0; a < numAgents; a++) resetAgent(agents[a]);
  simulator.reset();
  const histories: number[][] = agents.map(() => new Array(steps));
  const optimal = simulator.getOptimalValue();
  for (let t = 0; t < steps; t++) {
    for (let j = 0; j < numAgents; j++) {
      const agent = agents[j];
      const arm = selectArm(agent, simulator);
      const reward = simulator.pullArm(arm);
      updateAgent(agent, arm, reward);
      histories[j][t] = optimal * (t + 1) - agent._totalReward;
    }
  }
  return {
    histories,
    finalRegrets: agents.map((a) => optimal * steps - a._totalReward),
    finalPulls: agents.map((a) => a._totalPulls),
    finalRewards: agents.map((a) => a._totalReward),
  };
}

/* ================================================================== */
/*  STRATEGY DEFINITIONS                                               */
/* ================================================================== */

const STRATEGIES: AgentData[] = [
  { strategy: 'random', name: 'Random', color: AGENT_COLORS[0] },
  { strategy: 'epsilon-greedy', name: 'Epsilon-Greedy', color: AGENT_COLORS[1] },
  { strategy: 'ucb', name: 'UCB1', color: AGENT_COLORS[2] },
  { strategy: 'thompson', name: 'Thompson Sampling', color: AGENT_COLORS[3] },
  { strategy: 'optimistic', name: 'Optimistic', color: AGENT_COLORS[4] },
];

/* ================================================================== */
/*  PAGE COMPONENT                                                     */
/* ================================================================== */

const STEP_COUNT = 200;

export default function GestureSwarmPage() {
  // Order of agent cards (indices into STRATEGIES)
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3, 4]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [visibleAgents, setVisibleAgents] = useState<number[]>([0, 1, 2, 3, 4]);
  const [simProgress, setSimProgress] = useState(0);
  const simRef = useRef<number>(0);

  const runSimulation = useCallback(() => {
    setRunning(true);
    setResult(null);
    setSimProgress(0);

    const simId = ++simRef.current;
    const agents = order.map((idx) =>
      createAgent(STRATEGIES[idx].strategy)
    );
    const simulator = new BanditSimulator(5, [0.1, 0.3, 0.5, 0.7, 0.9]);
    const totalSteps = STEP_COUNT;

    // Run asynchronously in chunks to keep UI responsive + show animation
    let step = 0;
    const chunkSize = 10;
    const histories: number[][] = agents.map(() => []);
    const optimal = simulator.getOptimalValue();

    function runChunk() {
      if (simId !== simRef.current) return;
      const end = Math.min(step + chunkSize, totalSteps);
      for (let t = step; t < end; t++) {
        for (let j = 0; j < agents.length; j++) {
          const agent = agents[j];
          const arm = selectArm(agent, simulator);
          const reward = simulator.pullArm(arm);
          updateAgent(agent, arm, reward);
          histories[j].push(optimal * (t + 1) - agent._totalReward);
        }
      }
      step = end;
      setSimProgress((step / totalSteps) * 100);
      setResult({
        histories,
        finalRegrets: agents.map((a) => optimal * totalSteps - a._totalReward),
        finalPulls: agents.map((a) => a._totalPulls),
        finalRewards: agents.map((a) => a._totalReward),
      });

      if (step < totalSteps) {
        requestAnimationFrame(runChunk);
      } else {
        setRunning(false);
        simRef.current = 0;
      }
    }

    requestAnimationFrame(runChunk);
  }, [order]);

  // Drag reorder handler
  const handleDragEnd = useCallback(
    (index: number, info: { offset: { x: number } }) => {
      const threshold = 80; // px to trigger a swap
      if (Math.abs(info.offset.x) < threshold) return;

      const newOrder = [...order];
      const currentIdx = newOrder.indexOf(index);
      if (currentIdx === -1) return;

      const direction = info.offset.x > 0 ? 1 : -1;
      const swapIdx = currentIdx + direction;
      if (swapIdx < 0 || swapIdx >= newOrder.length) return;

      // Swap
      [newOrder[currentIdx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[currentIdx]];
      setOrder(newOrder);
      // Re-run on reorder
      setResult(null);
    },
    [order]
  );

  const maxRegret = result
    ? Math.max(10, ...result.histories.flat().map((h) => h * 1.15))
    : 10;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 40%, #1a0a16 70%, #0d0d1a 100%)',
        color: '#e4e4e7',
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      {/* Navigation header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,15,0.7)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/creative"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
              style={{ color: 'var(--text-secondary, #a1a1aa)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <span className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <h1 className="text-sm font-medium" style={{ color: 'var(--text-primary, #f4f4f5)' }}>
              Gesture Swarm — Edgeless Lab
            </h1>
          </div>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary, #71717a)' }}>
            multi-armed bandit · drag to reorder
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8">
        {/* Agent cards */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: AGENT_COLORS[0] }} />
            <h2 className="text-xs font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary, #71717a)' }}>
              Agent Strategies
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3" style={{ perspective: '1000px' }}>
            <AnimatePresence mode="popLayout">
              {order.map((agentIdx, position) => {
                const strategy = STRATEGIES[agentIdx];
                const agentResult = result
                  ? {
                      regret: result.finalRegrets[position],
                      pulls: result.finalPulls[position],
                    }
                  : null;
                return (
                  <motion.div
                    key={agentIdx}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -20 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8,
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(_, info) => handleDragEnd(agentIdx, info)}
                    whileDrag={{ scale: 1.08, zIndex: 10 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 rounded-2xl border p-4 w-[200px] cursor-grab active:cursor-grabbing select-none"
                    style={{
                      background: `rgba(255,255,255,0.04)`,
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      borderColor: `${strategy.color}33`,
                      boxShadow: `0 4px 24px ${strategy.color}11, inset 0 1px 0 ${strategy.color}22`,
                    }}
                  >
                    {/* Priority badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{
                          background: `${strategy.color}22`,
                          color: strategy.color,
                          border: `1px solid ${strategy.color}44`,
                        }}
                      >
                        #{position + 1}
                      </span>
                      <div className="flex gap-1">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Temporarily "remove" the card (AnimatePresence demo)
                            setVisibleAgents((prev) => prev.filter((v) => v !== agentIdx));
                            setTimeout(() => {
                              setVisibleAgents((prev) =>
                                prev.includes(agentIdx) ? prev : [...prev, agentIdx].sort()
                              );
                            }, 2000);
                          }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-transparent border-none cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          ×
                        </motion.button>
                      </div>
                    </div>

                    {/* Color indicator */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: strategy.color, boxShadow: `0 0 12px ${strategy.color}44` }}
                      />
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #f4f4f5)' }}>
                        {strategy.name}
                      </h3>
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: 'var(--text-tertiary, #71717a)' }}>Regret</span>
                        <motion.span
                          key={agentResult?.regret ?? 0}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="font-mono font-medium"
                          style={{ color: strategy.color }}
                        >
                          {agentResult ? agentResult.regret.toFixed(1) : '—'}
                        </motion.span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: 'var(--text-tertiary, #71717a)' }}>Pulls</span>
                        <span className="font-mono" style={{ color: 'var(--text-secondary, #a1a1aa)' }}>
                          {agentResult ? agentResult.pulls : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Drag hint */}
                    <div
                      className="mt-3 pt-2 border-t text-[9px] font-mono text-center"
                      style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}
                    >
                      ⇔ drag to reorder
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={runSimulation}
            disabled={running}
            className="px-6 py-2.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #b51670, #e34a6f)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(181,22,112,0.3)',
            }}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  ◌
                </motion.span>
                Simulating… {Math.round(simProgress)}%
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ▶ Run Simulation
              </span>
            )}
          </motion.button>

          {result && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {order.map((agentIdx, i) => (
                <div key={agentIdx} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: STRATEGIES[agentIdx].color }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary, #71717a)' }}>
                    {result.finalRegrets[i].toFixed(1)}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Regret Chart */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: AGENT_COLORS[1] }} />
            <h2 className="text-xs font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary, #71717a)' }}>
              Cumulative Regret
            </h2>
          </div>
          <div
            className="rounded-2xl border p-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {result ? (
              <RegretChart
                histories={result.histories}
                colors={order.map((i) => AGENT_COLORS[i])}
                labels={order.map((i) => STRATEGIES[i].name)}
                maxRegret={maxRegret}
              />
            ) : (
              <div
                className="flex items-center justify-center h-[300px] rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary, #71717a)' }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2 opacity-30">📊</div>
                  <p className="text-sm">Click &quot;Run Simulation&quot; to generate regret curves</p>
                  <p className="text-[11px] mt-1 font-mono">
                    Drag agent cards left/right to change simulation priority
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ================================================================== */
/*  REGRET CHART — SVG + motion animation                              */
/* ================================================================== */

function RegretChart({
  histories,
  colors,
  labels,
  maxRegret,
}: {
  histories: number[][];
  colors: string[];
  labels: string[];
  maxRegret: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 300 });

  useEffect(() => {
    function updateSize() {
      if (svgRef.current?.parentElement) {
        const w = svgRef.current.parentElement.clientWidth;
        setDimensions({ width: Math.max(400, w), height: 300 });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const { width, height } = dimensions;
  const margin = { top: 20, right: 20, bottom: 36, left: 52 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const numSteps = histories[0]?.length ?? 0;
  const yMax = maxRegret || 10;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * i).reverse();

  // Build path data for each series
  const pathData = histories.map((series) => {
    if (numSteps < 2) return '';
    return series
      .map((val, i) => {
        const x = margin.left + (i / (numSteps - 1)) * plotW;
        const y = margin.top + plotH - (val / yMax) * plotH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  return (
    <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {yTickValues.map((val, i) => {
        const y = margin.top + (plotH / yTicks) * i;
        return (
          <g key={i}>
            <line
              x1={margin.left}
              y1={y}
              x2={margin.left + plotW}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
              fontFamily="var(--font-geist-mono), monospace"
            >
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* X-axis label */}
      <text
        x={margin.left + plotW / 2}
        y={height - 4}
        textAnchor="middle"
        fill="rgba(255,255,255,0.25)"
        fontSize={10}
        fontFamily="var(--font-geist-mono), monospace"
      >
        Steps
      </text>

      {/* Data lines */}
      {pathData.map((d, i) =>
        d ? (
          <motion.path
            key={`line-${i}`}
            d={d}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 60,
              damping: 20,
              mass: 1,
              delay: i * 0.08,
            }}
            style={{
              filter: `drop-shadow(0 0 6px ${colors[i % colors.length]}44)`,
            }}
          />
        ) : null
      )}

      {/* Legend */}
      <g transform={`translate(${margin.left + 10}, ${margin.top + 8})`}>
        {labels.map((label, i) => (
          <g key={`legend-${i}`} transform={`translate(0, ${i * 18})`}>
            <motion.rect
              x={0}
              y={1}
              width={10}
              height={10}
              rx={2}
              fill={colors[i % colors.length]}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300 }}
            />
            <text
              x={16}
              y={10}
              fill="rgba(255,255,255,0.7)"
              fontSize={10}
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              dominantBaseline="middle"
            >
              {label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
