import { z } from 'zod'

// Window enum for time periods
export const WindowSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '24h'])
export type Window = z.infer<typeof WindowSchema>

// Tweet schema for top tweets
export const TweetSchema = z.object({
  url: z.string().url(),
  author_handle: z.string(),
  is_verified: z.boolean(),
  is_kol: z.boolean(),
})
export type Tweet = z.infer<typeof TweetSchema>

// Counts schema for various metrics
export const CountsSchema = z.object({
  tweet_count: z.number().int().min(0),
  unique_authors: z.number().int().min(0),
  verified_count: z.number().int().min(0),
  kol_count: z.number().int().min(0),
  cashtag_count: z.number().int().min(0),
  hashtag_count: z.number().int().min(0),
  new_wallet_signals: z.number().int().min(0),
})
export type Counts = z.infer<typeof CountsSchema>

// Baseline schema for comparison metrics
export const BaselineSchema = z.object({
  window: z.string(),
  tweet_count: z.number().int().min(0),
  unique_authors: z.number().int().min(0),
  verified_count: z.number().int().min(0),
  kol_count: z.number().int().min(0),
  cashtag_count: z.number().int().min(0),
  hashtag_count: z.number().int().min(0),
})
export type Baseline = z.infer<typeof BaselineSchema>

// Coin schema for individual coin data
export const CoinSchema = z.object({
  symbol: z.string(),
  chain: z.string(),
  name: z.string().optional(),
  contract_address: z.string().nullable().optional(),
  cashtags: z.array(z.string()),
  hashtags: z.array(z.string()),
  top_tweets: z.array(TweetSchema),
  counts: CountsSchema,
  baseline: BaselineSchema,
  sentiment: z.number().min(-1).max(1),
  grok_hype: z.number().min(0).max(1),
  reason_short: z.string().max(18 * 10), // ~18 words max
  hype_score: z.number().min(0).max(1),
})
export type Coin = z.infer<typeof CoinSchema>

// Main API response schema
export const ApiResponseSchema = z.object({
  coins: z.array(CoinSchema),
  window_used: WindowSchema,
  generated_at_iso: z.string().datetime(),
})
export type ApiResponse = z.infer<typeof ApiResponseSchema>

// Empty response schema for when no coins pass criteria
export const EmptyResponseSchema = z.object({
  coins: z.array(z.never()).length(0),
  window_used: WindowSchema,
  generated_at_iso: z.string().datetime(),
})
export type EmptyResponse = z.infer<typeof EmptyResponseSchema>

// Union of possible responses
export const GrokResponseSchema = z.union([ApiResponseSchema, EmptyResponseSchema])
export type GrokResponse = z.infer<typeof GrokResponseSchema>

// Query parameters for API endpoints
export const QueryParamsSchema = z.object({
  window: WindowSchema.optional().default('5m'),
  chain: z.enum(['SOL', 'ETH', 'BSC', 'ALL']).optional().default('ALL'),
})
export type QueryParams = z.infer<typeof QueryParamsSchema>

// Coin detail response with multiple windows
export const CoinDetailSchema = z.object({
  symbol: z.string(),
  chain: z.string(),
  name: z.string().optional(),
  contract_address: z.string().nullable().optional(),
  windows: z.record(WindowSchema, CoinSchema.omit({ symbol: true, chain: true, name: true, contract_address: true })),
  hype_sparkline: z.array(z.object({
    window: WindowSchema,
    hype_score: z.number().min(0).max(1),
    timestamp: z.string().datetime(),
  })),
})
export type CoinDetail = z.infer<typeof CoinDetailSchema>

// Discord alert schema
export const DiscordAlertSchema = z.object({
  coin: CoinSchema,
  is_pre_pump: z.boolean(),
  alert_type: z.enum(['pre_pump', 'trending', 'alert']),
})
export type DiscordAlert = z.infer<typeof DiscordAlertSchema>

// Validation helpers
export const validateWindow = (window: string): Window => {
  return WindowSchema.parse(window)
}

export const validateApiResponse = (data: unknown): ApiResponse => {
  return ApiResponseSchema.parse(data)
}

export const validateGrokResponse = (data: unknown): GrokResponse => {
  return GrokResponseSchema.parse(data)
}

export const validateQueryParams = (params: unknown): QueryParams => {
  return QueryParamsSchema.parse(params)
}

// Pre-pump detection logic
export const isPrePump = (coin: Coin): boolean => {
  const { counts, baseline } = coin
  
  // Pre-pump conditions:
  // 1. tweet_count >= 3x baseline
  // 2. unique_authors >= 2x baseline  
  // 3. KOL + verified >= 5
  
  const tweetGrowth = baseline.tweet_count > 0 ? counts.tweet_count / baseline.tweet_count : 0
  const authorGrowth = baseline.unique_authors > 0 ? counts.unique_authors / baseline.unique_authors : 0
  const kolVerifiedCount = counts.kol_count + counts.verified_count
  
  return tweetGrowth >= 3 && authorGrowth >= 2 && kolVerifiedCount >= 5
}

// Hype score calculation
export const calculateHypeScore = (coin: Omit<Coin, 'hype_score'>): number => {
  const { counts, baseline, grok_hype } = coin
  
  // Growth ratios (capped at 10x for stability)
  const volGrowth = Math.min(
    baseline.tweet_count > 0 ? counts.tweet_count / baseline.tweet_count : 1,
    10
  ) / 10
  
  // Normalize other metrics (0-1 scale)
  const kolScore = Math.min(counts.kol_count / 10, 1)
  const verifiedScore = Math.min(counts.verified_count / 20, 1)
  const cashtagScore = Math.min(counts.cashtag_count / 50, 1)
  const hashtagScore = Math.min(counts.hashtag_count / 100, 1)
  const walletScore = Math.min(counts.new_wallet_signals / 10, 1)
  
  // Weighted calculation
  const hypeScore = 
    0.30 * volGrowth +
    0.20 * kolScore +
    0.10 * verifiedScore +
    0.10 * cashtagScore +
    0.10 * hashtagScore +
    0.10 * walletScore +
    0.10 * grok_hype
  
  return Math.min(Math.max(hypeScore, 0), 1)
}