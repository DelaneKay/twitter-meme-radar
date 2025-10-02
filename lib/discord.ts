import { Coin, isPrePump } from './schemas'

interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
  }
  timestamp?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
}

export class DiscordWebhook {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendAlert(coin: Coin): Promise<boolean> {
    try {
      const isPump = isPrePump(coin)
      const message = this.formatAlertMessage(coin, isPump)
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        console.error('Discord webhook failed:', response.status, response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending Discord alert:', error)
      return false
    }
  }

  private formatAlertMessage(coin: Coin, isPrePump: boolean): DiscordMessage {
    const { counts, baseline, hype_score, reason_short, top_tweets } = coin
    
    // Calculate growth ratios
    const tweetGrowth = baseline.tweet_count > 0 
      ? (counts.tweet_count / baseline.tweet_count).toFixed(1)
      : 'N/A'
    const authorGrowth = baseline.unique_authors > 0 
      ? (counts.unique_authors / baseline.unique_authors).toFixed(1)
      : 'N/A'
    
    const kolVerifiedCount = counts.kol_count + counts.verified_count

    // Format tweet sources
    const tweetSources = top_tweets
      .slice(0, 3)
      .map(tweet => `[${tweet.author_handle}](${tweet.url})`)
      .join(' • ')

    // Determine alert type and color
    const alertType = isPrePump ? '🚨 PRE-PUMP ALERT' : '📈 TRENDING'
    const color = isPrePump ? 0xFF4444 : 0x3B82F6 // Red for pre-pump, blue for trending
    
    const title = `${alertType} • $${coin.symbol} (${coin.chain}) • ${coin.window_used || '5m'}`
    
    const description = `**Hype Score:** ${(hype_score * 100).toFixed(0)}% | **Growth:** Tweets +${tweetGrowth}x, Authors +${authorGrowth}x | **Influence:** ${kolVerifiedCount} KOL+Verified\n\n**${reason_short}**`

    const embed: DiscordEmbed = {
      title,
      description,
      color,
      fields: [
        {
          name: '📊 Metrics',
          value: [
            `Tweets: ${counts.tweet_count} (${tweetGrowth}x)`,
            `Authors: ${counts.unique_authors} (${authorGrowth}x)`,
            `KOLs: ${counts.kol_count} | Verified: ${counts.verified_count}`,
            `Cashtags: ${counts.cashtag_count} | Hashtags: ${counts.hashtag_count}`,
            `New Wallets: ${counts.new_wallet_signals}`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 Baseline Comparison',
          value: [
            `Base Tweets: ${baseline.tweet_count}`,
            `Base Authors: ${baseline.unique_authors}`,
            `Base KOLs: ${baseline.kol_count}`,
            `Base Verified: ${baseline.verified_count}`
          ].join('\n'),
          inline: true
        }
      ],
      footer: {
        text: 'Twitter Meme Radar • Real-time crypto trend detection'
      },
      timestamp: new Date().toISOString()
    }

    // Add tweet sources if available
    if (tweetSources) {
      embed.fields.push({
        name: '🔗 Top Sources',
        value: tweetSources,
        inline: false
      })
    }

    // Add contract address if available
    if (coin.contract_address) {
      embed.fields.push({
        name: '📝 Contract',
        value: `\`${coin.contract_address}\``,
        inline: false
      })
    }

    return {
      embeds: [embed]
    }
  }

  async sendBatchAlert(coins: Coin[]): Promise<boolean> {
    if (coins.length === 0) return true

    try {
      const prePumpCoins = coins.filter(isPrePump)
      const trendingCoins = coins.filter(coin => !isPrePump(coin))

      // Send pre-pump alerts first (higher priority)
      for (const coin of prePumpCoins) {
        await this.sendAlert(coin)
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Send trending alerts (max 3 to avoid spam)
      const topTrending = trendingCoins
        .sort((a, b) => b.hype_score - a.hype_score)
        .slice(0, 3)

      for (const coin of topTrending) {
        await this.sendAlert(coin)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return true
    } catch (error) {
      console.error('Error sending batch alerts:', error)
      return false
    }
  }

  async sendSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    try {
      const colors = {
        info: 0x3B82F6,
        warning: 0xF59E0B,
        error: 0xEF4444
      }

      const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌'
      }

      const embed: DiscordEmbed = {
        title: `${icons[type]} System ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: message,
        color: colors[type],
        footer: {
          text: 'Twitter Meme Radar System'
        },
        timestamp: new Date().toISOString()
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      })

      return response.ok
    } catch (error) {
      console.error('Error sending system message:', error)
      return false
    }
  }
}

// Singleton instance
let discordInstance: DiscordWebhook | null = null

export function getDiscordWebhook(): DiscordWebhook {
  if (!discordInstance) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL environment variable is not set')
    }
    discordInstance = new DiscordWebhook(webhookUrl)
  }
  return discordInstance
}

// Utility function for quick alerts
export async function sendQuickAlert(coin: Coin): Promise<boolean> {
  try {
    const discord = getDiscordWebhook()
    return await discord.sendAlert(coin)
  } catch (error) {
    console.error('Failed to send quick alert:', error)
    return false
  }
}