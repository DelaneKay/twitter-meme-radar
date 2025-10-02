import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { validateGrokResponse, Window, Coin, CoinDetail } from '../../lib/schemas'

const WINDOWS: Window[] = ['1m', '5m', '15m', '1h', '4h', '24h']

// Internal function to call discover-trends for a specific window
async function getDiscoverTrends(window: Window): Promise<any> {
  const baseUrl = process.env.URL || 'http://localhost:8888'
  const url = `${baseUrl}/.netlify/functions/discover-trends?window=${window}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trends for ${window}: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Extract coin parameters from query string
    const symbol = event.queryStringParameters?.symbol
    const chain = event.queryStringParameters?.chain

    if (!symbol || !chain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'Both symbol and chain parameters are required',
        }),
      }
    }

    console.log(`Fetching coin detail for ${symbol} on ${chain}`)

    // Fetch data for all windows
    const windowPromises = WINDOWS.map(async (window) => {
      try {
        const data = await getDiscoverTrends(window)
        const validatedData = validateGrokResponse(data)
        
        // Find the specific coin in this window's data
        const coin = validatedData.coins.find(c => 
          c.symbol.toLowerCase() === symbol.toLowerCase() && 
          c.chain.toLowerCase() === chain.toLowerCase()
        )
        
        return { window, coin, timestamp: validatedData.generated_at_iso }
      } catch (error) {
        console.error(`Error fetching ${window} data:`, error)
        return { window, coin: null, timestamp: new Date().toISOString() }
      }
    })

    const windowResults = await Promise.all(windowPromises)
    
    // Find the most recent coin data to use as base info
    const baseCoin = windowResults.find(result => result.coin)?.coin
    
    if (!baseCoin) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Coin not found',
          message: `No data found for ${symbol} on ${chain} in any time window`,
        }),
      }
    }

    // Build windows object with coin data for each timeframe
    const windows: Record<Window, any> = {} as Record<Window, any>
    const hypeSparkline: Array<{
      window: Window
      hype_score: number
      timestamp: string
    }> = []

    for (const result of windowResults) {
      if (result.coin) {
        // Remove redundant fields for the windows object
        const { symbol: _, chain: __, name: ___, contract_address: ____, ...windowData } = result.coin
        windows[result.window] = windowData
        
        hypeSparkline.push({
          window: result.window,
          hype_score: result.coin.hype_score,
          timestamp: result.timestamp,
        })
      }
    }

    // Sort sparkline by window order
    const windowOrder: Record<Window, number> = {
      '1m': 1, '5m': 2, '15m': 3, '1h': 4, '4h': 5, '24h': 6
    }
    hypeSparkline.sort((a, b) => windowOrder[a.window] - windowOrder[b.window])

    // Build the detailed response
    const coinDetail: CoinDetail = {
      symbol: baseCoin.symbol,
      chain: baseCoin.chain,
      name: baseCoin.name,
      contract_address: baseCoin.contract_address,
      windows,
      hype_sparkline: hypeSparkline,
    }

    // Add metadata
    const response = {
      ...coinDetail,
      metadata: {
        windows_available: Object.keys(windows).length,
        highest_hype_score: Math.max(...hypeSparkline.map(h => h.hype_score)),
        lowest_hype_score: Math.min(...hypeSparkline.map(h => h.hype_score)),
        average_hype_score: hypeSparkline.reduce((sum, h) => sum + h.hype_score, 0) / hypeSparkline.length,
        last_updated: new Date().toISOString(),
        is_trending: hypeSparkline.some(h => h.hype_score >= 0.5),
        is_pre_pump: windowResults.some(result => {
          if (!result.coin) return false
          const { counts, baseline } = result.coin
          const tweetGrowth = baseline.tweet_count > 0 ? counts.tweet_count / baseline.tweet_count : 0
          const authorGrowth = baseline.unique_authors > 0 ? counts.unique_authors / baseline.unique_authors : 0
          const kolVerifiedCount = counts.kol_count + counts.verified_count
          return tweetGrowth >= 3 && authorGrowth >= 2 && kolVerifiedCount >= 5
        }),
      }
    }

    console.log(`Coin detail response for ${symbol}: ${response.metadata.windows_available} windows, max hype: ${response.metadata.highest_hype_score.toFixed(2)}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error('Error in api-coin function:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      }),
    }
  }
}