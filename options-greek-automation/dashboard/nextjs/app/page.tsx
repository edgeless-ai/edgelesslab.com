'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Activity, TrendingUp, AlertTriangle, Zap } from 'lucide-react'

// Types
interface ExposureData {
  underlying: string
  snapshot_ts: string
  delta_pcr: number
  gamma_dollar_net: number
  vanna_dollar_net: number
  iv_rank: number
}

interface SignalData {
  id: number
  underlying: string
  signal_type: string
  confidence: number
  entry_level: number
  target_level: number
  stop_level: number
  status: string
  regime: string
  narrative: string
}

interface TradeData {
  id: number
  underlying: string
  side: string
  qty: number
  status: string
  realized_pnl: number
  unrealized_pnl: number
  entry_ts: string
}

interface HealthData {
  status: string
  last_pipeline_run: string
  open_trades: number
  pending_signals: number
  uptime_seconds: number
}

export default function Dashboard() {
  const [exposure, setExposure] = useState<ExposureData[]>([])
  const [signals, setSignals] = useState<SignalData[]>([])
  const [trades, setTrades] = useState<TradeData[]>([])
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch data from FastAPI backend
  const fetchData = async () => {
    try {
      const [exp, sig, trd, hlt] = await Promise.all([
        fetch('/api/exposure').then(r => r.json()),
        fetch('/api/signals').then(r => r.json()),
        fetch('/api/trades').then(r => r.json()),
        fetch('/api/health').then(r => r.json()),
      ])
      setExposure(exp)
      setSignals(sig)
      setTrades(trd)
      setHealth(hlt)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-400" />
          Edgeless Options Greek Dashboard
        </h1>
        <div className="flex gap-4 mt-2">
          <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
            {health?.status || 'unknown'}
          </Badge>
          <span className="text-sm text-slate-400">
            Last run: {health?.last_pipeline_run ? new Date(health.last_pipeline_run).toLocaleTimeString() : 'N/A'}
          </span>
          <span className="text-sm text-slate-400">
            Uptime: {Math.floor((health?.uptime_seconds || 0) / 3600)}h
          </span>
        </div>
      </header>

      <Tabs defaultValue="exposure" className="w-full">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="exposure" className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Exposure
          </TabsTrigger>
          <TabsTrigger value="signals" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Signals
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Trades
          </TabsTrigger>
        </TabsList>

        {/* Exposure Tab */}
        <TabsContent value="exposure">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {exposure.map((e) => (
              <Card key={e.underlying} className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl">{e.underlying}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Δ PCR</span>
                      <span className={e.delta_pcr > 1 ? 'text-red-400' : 'text-green-400'}>
                        {e.delta_pcr?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Γ Net ($M)</span>
                      <span>{(e.gamma_dollar_net / 1e6).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vanna Net</span>
                      <span>{e.vanna_dollar_net?.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IV Rank</span>
                      <span>{(e.iv_rank * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle>Gamma Exposure by Strike</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={exposure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="underlying" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  <Bar dataKey="gamma_dollar_net" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals">
          <div className="space-y-4">
            {signals.map((s) => (
              <Card key={s.id} className={`bg-slate-900 border-slate-700 ${s.status === 'active' ? 'border-yellow-500' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      {s.underlying} 
                      <Badge className={s.signal_type === 'LONG' ? 'bg-green-600' : 'bg-red-600'}>
                        {s.signal_type}
                      </Badge>
                    </CardTitle>
                    <span className="text-sm text-slate-400">{s.regime}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-slate-400 text-sm">Confidence</div>
                      <div className="text-xl font-bold">{(s.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Entry</div>
                      <div className="text-xl">${s.entry_level}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Target</div>
                      <div className="text-xl text-green-400">${s.target_level}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">Stop</div>
                      <div className="text-xl text-red-400">${s.stop_level}</div>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm italic">{s.narrative}</p>
                </CardContent>
              </Card>
            ))}
            {signals.length === 0 && (
              <div className="text-center text-slate-500 py-12">No active signals</div>
            )}
          </div>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-slate-400 text-sm">Total P&L</div>
                  <div className={`text-2xl font-bold ${trades.reduce((a, t) => a + (t.realized_pnl || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${trades.reduce((a, t) => a + (t.realized_pnl || 0), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-slate-400 text-sm">Open Trades</div>
                  <div className="text-2xl font-bold">{trades.filter(t => t.status === 'open').length}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-slate-400 text-sm">Win Rate</div>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const closed = trades.filter(t => t.status === 'closed' && t.realized_pnl !== null)
                      if (closed.length === 0) return '0%'
                      const wins = closed.filter(t => t.realized_pnl > 0).length
                      return ((wins / closed.length) * 100).toFixed(0) + '%'
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-slate-400 text-sm">Total Trades</div>
                  <div className="text-2xl font-bold">{trades.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle>P&L Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trades}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="entry_ts" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                    <Line type="monotone" dataKey="realized_pnl" stroke="#fbbf24" />
                    <Line type="monotone" dataKey="unrealized_pnl" stroke="#60a5fa" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
