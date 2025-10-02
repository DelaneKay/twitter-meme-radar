import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { validateGrokResponse, validateQueryParams, calculateHypeScore, Window } from '../../lib/schemas'

interface GrokAPIRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user'
    content: string
  }>
  temperature: number
  max_tokens: number
  response_format: {
    type: 'json_object'
  }
}

const GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions'

const SYSTEM_PROMPT = "You are a crypto meme-coin trend hunter for X.com. Output valid JSON only matching schema. No prose."

const generateUserPrompt = (window: Window): string => {
  return `Find trending meme coins on X in the last ${window}.
Chains: SOL, ETH, BSC. English only.
Extract: tweet_count, unique_authors, verified_count, kol_count, cashtag_count, hashtag_count, new_wallet_signals.
Return 1–3 top tweet URLs + authors with flags.
Disambiguate tokens (cashtags/contracts).
Exclude spam/bots.
Add baseline: if ${window} ∈ {1m,5m,15m} → prev window; if {1h,4h,24h} → avg_24h.
Compute hype_score 0..1 using:
0.30*vol_growth + 0.20*kol + 0.10*verified + 0.10*cashtag + 0.10*hashtag + 0.10*wallet + 0.10*grok_hype.
Reason_short ≤18 words.
Pre-pump (we compute): tweet_count ≥3x baseline, authors ≥2x baseline, KOL+verified ≥5.
Output JSON only. If no coins pass ≥5 tweets & 3 authors, return {"coins":[],"window_used":"${window}","generated_at_iso":"${new Date().toISOString()}"}.`
}

async function callGrokAPI(window: Window): Promise<any> {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new Error('GROK_API_KEY environment variable is not set')
  }

  const request: GrokAPIRequest = {
    model: 'grok-beta',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: generateUserPrompt(window)
      }
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: {
      type: 'json_object'
    }
  }

  const response = await fetch(GROK_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Grok API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from Grok API')
  }

  const content = data.choices[0].message.content
  
  try {
    return JSON.parse(content)
  } catch (error) {
    console.error('Failed to parse Grok response:', content)
    throw new Error('Invalid JSON response from Grok API')
  }
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
    // Parse and validate query parameters
    const queryParams = validateQueryParams({
      window: event.queryStringParameters?.window || '5m',
      chain: event.queryStringParameters?.chain || 'ALL',
    })

    console.log(`Discovering trends for window: ${queryParams.window}`)

    // Call Grok API
    const grokResponse = await callGrokAPI(queryParams.window)
    
    // Validate the response structure
    const validatedResponse = validateGrokResponse(grokResponse)

    // If no coins returned, return empty response
    if (validatedResponse.coins.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(validatedResponse),
      }
    }

    // Recalculate hype scores to ensure consistency
    const coinsWithRecalculatedScores = validatedResponse.coins.map(coin => ({
      ...coin,
      hype_score: calculateHypeScore(coin),
    }))

    // Sort by hype score (descending)
    const sortedCoins = coinsWithRecalculatedScores.sort((a, b) => b.hype_score - a.hype_score)

    // Filter by chain if specified
    const filteredCoins = queryParams.chain === 'ALL' 
      ? sortedCoins 
      : sortedCoins.filter(coin => coin.chain === queryParams.chain)

    const response = {
      ...validatedResponse,
      coins: filteredCoins,
    }

    console.log(`Found ${response.coins.length} trending coins for ${queryParams.window} window`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error('Error in discover-trends function:', error)
    
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