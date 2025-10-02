'use client'

import { useState, useEffect } from 'react'
import { Coin, Window } from '../../lib/schemas'
import { TrendingUp, TrendingDown, ExternalLink, Clock, Users, MessageCircle, Hash, Wallet, AlertTriangle } from 'lucide-react'

interface LeaderboardData {
  coins: Coin[]
  window_used: Window
  generated_at_iso: string
  metadata: {
    total_coins: number
    window: Window
    chain_filter: string
    last_updated: string
    pre_pump_count: number
    high_hype_count: number
  }
}

const WINDOWS: Window[] = ['1m', '5m', '15m', '1h', '4h', '24h']
const CHAINS = ['ALL', 'SOL', 'ETH', 'BSC']

export default function HomePage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<Window>('5m')
  const [selectedChain, setSelectedChain] = useState('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        window: selectedWindow,
        chain: selectedChain,
      })
      
      const response = await fetch(`/api/api-leaderboard?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedWindow, selectedChain])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, selectedWindow, selectedChain])

  const isPrePump = (coin: Coin): boolean => {
    const { counts, baseline } = coin
    const tweetGrowth = baseline.tweet_count > 0 ? counts.tweet_count / baseline.tweet_count : 0
    const authorGrowth = baseline.unique_authors > 0 ? counts.unique_authors / baseline.unique_authors : 0
    const kolVerifiedCount = counts.kol_count + counts.verified_count
    return tweetGrowth >= 3 && authorGrowth >= 2 && kolVerifiedCount >= 5
  }

  const formatGrowth = (current: number, baseline: number): string => {
    if (baseline === 0) return 'N/A'
    const growth = (current / baseline).toFixed(1)
    return `+${growth}x`
  }

  const getHypeColor = (score: number): string => {
    if (score >= 0.8) return 'text-red-600 bg-red-50'
    if (score >= 0.6) return 'text-orange-600 bg-orange-50'
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getChainColor = (chain: string): string => {
    switch (chain) {
      case 'SOL': return 'bg-purple-100 text-purple-800'
      case 'ETH': return 'bg-blue-100 text-blue-800'
      case 'BSC': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trending meme coins...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {data?.metadata && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Coins</p>
                <p className="text-2xl font-bold text-gray-900">{data.metadata.total_coins}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pre-Pump</p>
                <p className="text-2xl font-bold text-red-600">{data.metadata.pre_pump_count}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">High Hype</p>
                <p className="text-2xl font-bold text-orange-600">{data.metadata.high_hype_count}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(data.metadata.last_updated).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex flex-wrap gap-4">
            {/* Window Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {WINDOWS.map((window) => (
                <button
                  key={window}
                  onClick={() => setSelectedWindow(window)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedWindow === window
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {window}
                </button>
              ))}
            </div>

            {/* Chain Filter */}
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              {CHAINS.map((chain) => (
                <option key={chain} value={chain}>
                  {chain === 'ALL' ? 'All Chains' : chain}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600">Auto-refresh</span>
            </label>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Rank</th>
                <th className="table-header">Symbol</th>
                <th className="table-header">Chain</th>
                <th className="table-header">Hype Score</th>
                <th className="table-header">Growth</th>
                <th className="table-header">Influence</th>
                <th className="table-header">Reason</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.coins.map((coin, index) => (
                <tr key={`${coin.symbol}-${coin.chain}`} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                      {isPrePump(coin) && (
                        <AlertTriangle className="h-4 w-4 text-red-500 ml-2" title="Pre-pump detected!" />
                      )}
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">${coin.symbol}</div>
                        {coin.name && (
                          <div className="text-sm text-gray-500">{coin.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <span className={`badge ${getChainColor(coin.chain)}`}>
                      {coin.chain}
                    </span>
                  </td>
                  
                  <td className="table-cell">
                    <span className={`badge ${getHypeColor(coin.hype_score)}`}>
                      {(coin.hype_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  
                  <td className="table-cell">
                    <div className="text-sm">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="h-3 w-3 text-gray-400" />
                        <span>{formatGrowth(coin.counts.tweet_count, coin.baseline.tweet_count)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span>{formatGrowth(coin.counts.unique_authors, coin.baseline.unique_authors)}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <div className="text-sm">
                      <div>KOL: {coin.counts.kol_count}</div>
                      <div>Verified: {coin.counts.verified_count}</div>
                    </div>
                  </td>
                  
                  <td className="table-cell max-w-xs">
                    <p className="text-sm text-gray-900 truncate" title={coin.reason_short}>
                      {coin.reason_short}
                    </p>
                  </td>
                  
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <a
                        href={`/coin/${coin.chain}/${coin.symbol}`}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        View Details
                      </a>
                      {coin.top_tweets.length > 0 && (
                        <a
                          href={coin.top_tweets[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {data?.coins.length === 0 && (
            <div className="text-center py-12">
              <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Trending Coins</h3>
              <p className="text-gray-600">
                No coins meet the trending criteria for the {selectedWindow} window.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}