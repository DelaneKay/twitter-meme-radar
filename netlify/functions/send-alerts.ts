import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { getDiscordWebhook } from '../../lib/discord'
import { validateGrokResponse, isPrePump, Coin } from '../../lib/schemas'

// Internal function to call discover-trends
async function getDiscoverTrends(window: string = '5m'): Promise<any> {
  const baseUrl = process.env.URL || 'http://localhost:8888'
  const url = `${baseUrl}/.netlify/functions/discover-trends?window=${window}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trends: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

// Check if we should send alerts for a coin (basic rate limiting)
const alertHistory = new Map<string, number>()
const ALERT_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes cooldown per coin

function shouldSendAlert(coin: Coin): boolean {
  const key = `${coin.symbol}-${coin.chain}`
  const lastAlert = alertHistory.get(key)
  const now = Date.now()
  
  if (!lastAlert || (now - lastAlert) > ALERT_COOLDOWN_MS) {
    alertHistory.set(key, now)
    return true
  }
  
  return false
}

// Clean up old entries from alert history
function cleanupAlertHistory(): void {
  const now = Date.now()
  const cutoff = now - (2 * ALERT_COOLDOWN_MS) // Keep entries for 2x cooldown period
  
  for (const [key, timestamp] of alertHistory.entries()) {
    if (timestamp < cutoff) {
      alertHistory.delete(key)
    }
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json',
  }

  try {
    console.log('Starting send-alerts function...')
    
    // Clean up old alert history
    cleanupAlertHistory()
    
    // Get Discord webhook instance
    const discord = getDiscordWebhook()
    
    // Check multiple windows for comprehensive coverage
    const windows = ['1m', '5m', '15m'] as const
    const allCoinsWithWindow: Array<{coin: Coin, window: string}> = []
    
    for (const window of windows) {
      try {
        console.log(`Fetching trends for ${window} window...`)
        const trendsData = await getDiscoverTrends(window)
        const validatedData = validateGrokResponse(trendsData)
        
        if (validatedData.coins.length > 0) {
          allCoinsWithWindow.push(...validatedData.coins.map(coin => ({coin, window})))
          console.log(`Found ${validatedData.coins.length} coins in ${window} window`)
        }
      } catch (error) {
        console.error(`Error fetching ${window} trends:`, error)
        // Continue with other windows even if one fails
      }
    }
    
    if (allCoinsWithWindow.length === 0) {
      console.log('No trending coins found across all windows')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'No trending coins found',
          timestamp: new Date().toISOString(),
        }),
      }
    }
    
    // Remove duplicates (same symbol + chain combination)
    const uniqueCoinsWithWindow = allCoinsWithWindow.reduce((acc, {coin, window}) => {
      const key = `${coin.symbol}-${coin.chain}`
      const existing = acc.find(c => `${c.coin.symbol}-${c.coin.chain}` === key)
      
      if (!existing || coin.hype_score > existing.coin.hype_score) {
        // Keep the coin with higher hype score
        return [...acc.filter(c => `${c.coin.symbol}-${c.coin.chain}` !== key), {coin, window}]
      }
      
      return acc
    }, [] as Array<{coin: Coin, window: string}>)
    
    console.log(`Processing ${uniqueCoinsWithWindow.length} unique coins after deduplication`)
    
    // Separate pre-pump and trending coins
    const prePumpCoins = uniqueCoinsWithWindow.filter(({coin}) => {
      const isPump = isPrePump(coin)
      const shouldAlert = shouldSendAlert(coin)
      return isPump && shouldAlert
    })
    
    const trendingCoins = uniqueCoinsWithWindow.filter(({coin}) => {
      const isPump = isPrePump(coin)
      const shouldAlert = shouldSendAlert(coin)
      return !isPump && shouldAlert && coin.hype_score >= 0.5 // Only alert on high hype trending coins
    })
    
    console.log(`Pre-pump coins: ${prePumpCoins.length}, Trending coins: ${trendingCoins.length}`)
    
    let alertsSent = 0
    
    // Send pre-pump alerts (highest priority)
    for (const {coin, window} of prePumpCoins) {
      try {
        const success = await discord.sendAlert(coin, window)
        if (success) {
          alertsSent++
          console.log(`Sent pre-pump alert for ${coin.symbol} (${coin.chain}) from ${window} window`)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Failed to send pre-pump alert for ${coin.symbol}:`, error)
      }
    }
    
    // Send trending alerts (limited to top 3 to avoid spam)
    const topTrending = trendingCoins
      .sort((a, b) => b.coin.hype_score - a.coin.hype_score)
      .slice(0, 3)
    
    for (const {coin, window} of topTrending) {
      try {
        const success = await discord.sendAlert(coin, window)
        if (success) {
          alertsSent++
          console.log(`Sent trending alert for ${coin.symbol} (${coin.chain}) from ${window} window`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Failed to send trending alert for ${coin.symbol}:`, error)
      }
    }
    
    // Send summary if no alerts were sent but coins were found
    if (alertsSent === 0 && uniqueCoinsWithWindow.length > 0) {
      const topCoinWithWindow = uniqueCoinsWithWindow.sort((a, b) => b.coin.hype_score - a.coin.hype_score)[0]
      const topCoin = topCoinWithWindow.coin
      await discord.sendSystemMessage(
        `Monitoring ${uniqueCoinsWithWindow.length} coins. Top: $${topCoin.symbol} (${topCoin.chain}) with ${(topCoin.hype_score * 100).toFixed(0)}% hype score.`,
        'info'
      )
    }
    
    const response = {
      message: `Alerts processing complete`,
      alertsSent,
      coinsProcessed: uniqueCoinsWithWindow.length,
      prePumpCount: prePumpCoins.length,
      trendingCount: trendingCoins.length,
      timestamp: new Date().toISOString(),
    }
    
    console.log('Send-alerts function completed:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    }
    
  } catch (error) {
    console.error('Error in send-alerts function:', error)
    
    // Try to send error notification to Discord
    try {
      const discord = getDiscordWebhook()
      await discord.sendSystemMessage(
        `Alert system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    } catch (discordError) {
      console.error('Failed to send error notification to Discord:', discordError)
    }
    
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