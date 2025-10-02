'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Users, MessageCircle, Hash, DollarSign, Zap, Clock, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CoinDetail } from '@/lib/schemas';

export default function CoinDetailPage() {
  const params = useParams();
  const chain = params.chain as string;
  const symbol = params.symbol as string;
  
  const [coinData, setCoinData] = useState<CoinDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/api-coin?chain=${encodeURIComponent(chain)}&symbol=${encodeURIComponent(symbol)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch coin data: ${response.status}`);
        }
        
        const data = await response.json();
        setCoinData(data);
      } catch (err) {
        console.error('Error fetching coin data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch coin data');
      } finally {
        setLoading(false);
      }
    };

    if (chain && symbol) {
      fetchCoinData();
    }
  }, [chain, symbol]);

  const formatHypeScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  const getHypeColor = (score: number) => {
    if (score >= 0.7) return 'text-danger-600';
    if (score >= 0.5) return 'text-warning-600';
    return 'text-success-600';
  };

  const getHypeBadge = (score: number) => {
    if (score >= 0.7) return 'badge-danger';
    if (score >= 0.5) return 'badge-warning';
    return 'badge-success';
  };

  const formatGrowth = (current: number, baseline: number) => {
    if (baseline === 0) return '+∞';
    const growth = ((current - baseline) / baseline) * 100;
    return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (current: number, baseline: number) => {
    if (baseline === 0) return 'text-danger-600';
    const growth = ((current - baseline) / baseline) * 100;
    return growth > 0 ? 'text-success-600' : 'text-danger-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
                <div className="h-96 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Link>
          <div className="card p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Coin Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!coinData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Link>
          <div className="card p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Coin Not Found</h2>
            <p className="text-gray-600">No data available for {symbol} on {chain}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentWindow = coinData.windows[0];
  const sparklineData = coinData.hype_sparkline.map((point, index) => ({
    window: point.window,
    hype: point.hype_score * 100,
    index
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Link>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date(coinData.last_updated).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Coin Header */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">${currentWindow.symbol}</h1>
                <span className="badge-secondary">{currentWindow.chain}</span>
                {coinData.is_pre_pump && (
                  <span className="badge-danger">PRE-PUMP</span>
                )}
                {coinData.is_trending && (
                  <span className="badge-warning">TRENDING</span>
                )}
              </div>
              {currentWindow.name && (
                <p className="text-lg text-gray-600 mb-2">{currentWindow.name}</p>
              )}
              {currentWindow.contract_address && (
                <p className="text-sm text-gray-500 font-mono">{currentWindow.contract_address}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatHypeScore(currentWindow.hype_score)}%
                </span>
                <span className={`badge ${getHypeBadge(currentWindow.hype_score)}`}>
                  HYPE
                </span>
              </div>
              <p className="text-sm text-gray-500">Current Hype Score</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hype Sparkline */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Hype Score Trend
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="window" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Hype Score (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Hype Score']}
                      labelFormatter={(label) => `Window: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hype" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Tweets */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Top Tweets
              </h2>
              <div className="space-y-4">
                {currentWindow.top_tweets.map((tweet, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">@{tweet.author_handle}</span>
                        {tweet.is_verified && (
                          <span className="badge-primary text-xs">VERIFIED</span>
                        )}
                        {tweet.is_kol && (
                          <span className="badge-warning text-xs">KOL</span>
                        )}
                      </div>
                      <a 
                        href={tweet.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sentiment</span>
                  <span className={`font-medium ${currentWindow.sentiment > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {currentWindow.sentiment > 0 ? '+' : ''}{(currentWindow.sentiment * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Grok Hype</span>
                  <span className={`font-medium ${getHypeColor(currentWindow.grok_hype)}`}>
                    {formatHypeScore(currentWindow.grok_hype)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Windows Available</span>
                  <span className="font-medium text-gray-900">{coinData.windows_available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Highest Hype</span>
                  <span className="font-medium text-gray-900">{formatHypeScore(coinData.highest_hype_score)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Hype</span>
                  <span className="font-medium text-gray-900">{formatHypeScore(coinData.average_hype_score)}%</span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Tweets</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{currentWindow.counts.tweet_count}</div>
                    <div className={`text-xs ${getGrowthColor(currentWindow.counts.tweet_count, currentWindow.baseline.tweet_count)}`}>
                      {formatGrowth(currentWindow.counts.tweet_count, currentWindow.baseline.tweet_count)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Authors</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{currentWindow.counts.unique_authors}</div>
                    <div className={`text-xs ${getGrowthColor(currentWindow.counts.unique_authors, currentWindow.baseline.unique_authors)}`}>
                      {formatGrowth(currentWindow.counts.unique_authors, currentWindow.baseline.unique_authors)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">KOL + Verified</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {currentWindow.counts.kol_count + currentWindow.counts.verified_count}
                    </div>
                    <div className={`text-xs ${getGrowthColor(
                      currentWindow.counts.kol_count + currentWindow.counts.verified_count, 
                      currentWindow.baseline.kol_count + currentWindow.baseline.verified_count
                    )}`}>
                      {formatGrowth(
                        currentWindow.counts.kol_count + currentWindow.counts.verified_count, 
                        currentWindow.baseline.kol_count + currentWindow.baseline.verified_count
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Cashtags</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{currentWindow.counts.cashtag_count}</div>
                    <div className={`text-xs ${getGrowthColor(currentWindow.counts.cashtag_count, currentWindow.baseline.cashtag_count)}`}>
                      {formatGrowth(currentWindow.counts.cashtag_count, currentWindow.baseline.cashtag_count)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Hashtags</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{currentWindow.counts.hashtag_count}</div>
                    <div className={`text-xs ${getGrowthColor(currentWindow.counts.hashtag_count, currentWindow.baseline.hashtag_count)}`}>
                      {formatGrowth(currentWindow.counts.hashtag_count, currentWindow.baseline.hashtag_count)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis</h3>
              <p className="text-gray-700 leading-relaxed">{currentWindow.reason_short}</p>
            </div>

            {/* Tags */}
            {(currentWindow.cashtags.length > 0 || currentWindow.hashtags.length > 0) && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="space-y-3">
                  {currentWindow.cashtags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Cashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentWindow.cashtags.map((tag, index) => (
                          <span key={index} className="badge-secondary text-xs">
                            ${tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentWindow.hashtags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentWindow.hashtags.map((tag, index) => (
                          <span key={index} className="badge-secondary text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}