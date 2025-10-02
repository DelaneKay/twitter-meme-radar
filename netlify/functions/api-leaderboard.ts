import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { validateQueryParams } from '../../lib/schemas'

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
    // Parse and validate query parameters
    const queryParams = validateQueryParams({
      window: event.queryStringParameters?.window || '5m',
      chain: event.queryStringParameters?.chain || 'ALL',
    })

    // Get base URL for internal function calls
    const baseUrl = process.env.URL || 'http://localhost:8888'
    
    // Build query string for discover-trends
    const searchParams = new URLSearchParams({
      window: queryParams.window,
      chain: queryParams.chain,
    })
    
    const discoverUrl = `${baseUrl}/.netlify/functions/discover-trends?${searchParams.toString()}`
    
    console.log(`Fetching leaderboard data from: ${discoverUrl}`)
    
    // Call discover-trends function
    const response = await fetch(discoverUrl)
    
    if (!response.ok) {
      throw new Error(`Discover-trends API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Add leaderboard-specific metadata
    const leaderboardResponse = {
      ...data,
      metadata: {
        total_coins: data.coins?.length || 0,
        window: queryParams.window,
        chain_filter: queryParams.chain,
        last_updated: new Date().toISOString(),
        pre_pump_count: data.coins?.filter((coin: any) => {
          const { counts, baseline } = coin
          const tweetGrowth = baseline.tweet_count > 0 ? counts.tweet_count / baseline.tweet_count : 0
          const authorGrowth = baseline.unique_authors > 0 ? counts.unique_authors / baseline.unique_authors : 0
          const kolVerifiedCount = counts.kol_count + counts.verified_count
          return tweetGrowth >= 3 && authorGrowth >= 2 && kolVerifiedCount >= 5
        }).length || 0,
        high_hype_count: data.coins?.filter((coin: any) => coin.hype_score >= 0.7).length || 0,
      }
    }
    
    console.log(`Leaderboard response: ${leaderboardResponse.metadata.total_coins} coins, ${leaderboardResponse.metadata.pre_pump_count} pre-pump`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(leaderboardResponse),
    }

  } catch (error) {
    console.error('Error in api-leaderboard function:', error)
    
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