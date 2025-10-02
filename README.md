# Twitter Meme Radar

A real-time cryptocurrency meme coin trend detection and alert system that monitors Twitter activity and sends Discord notifications for emerging opportunities.

## 🚀 Features

- **Real-time Trend Detection**: Monitors Twitter for meme coin mentions across multiple time windows (1m, 5m, 15m, 1h, 4h, 24h)
- **Hype Score Calculation**: Advanced scoring algorithm combining sentiment, growth metrics, and influencer activity
- **Pre-pump Detection**: Identifies coins showing early signs of momentum before major price movements
- **Discord Alerts**: Automated notifications for trending and pre-pump coins with detailed analytics
- **Interactive Dashboard**: Beautiful web interface with leaderboards, charts, and detailed coin analysis
- **Multi-chain Support**: Tracks coins across different blockchain networks

## 🏗️ Architecture

### Frontend
- **Next.js 14** with TypeScript and App Router
- **Tailwind CSS** for styling with custom design system
- **Recharts** for data visualization and sparklines
- **Lucide React** for icons
- Static export optimized for Netlify deployment

### Backend
- **Netlify Functions** for serverless API endpoints
- **Grok API** integration for Twitter data analysis
- **Discord Webhooks** for real-time notifications
- **Zod** for runtime type validation and schema enforcement

### Key Components

#### Netlify Functions
- `discover-trends.ts` - Fetches and analyzes Twitter data via Grok API
- `send-alerts.ts` - Scheduled function (2-minute intervals) for Discord notifications
- `api-leaderboard.ts` - Provides leaderboard data for the frontend
- `api-coin.ts` - Detailed coin analytics across multiple time windows

#### Frontend Pages
- **Leaderboard** (`/`) - Main dashboard with trending coins, filters, and statistics
- **Coin Detail** (`/coin/[chain]/[symbol]`) - Comprehensive coin analysis with sparklines and tweets

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** >= 18.17.0 (required for Next.js 14)
- **npm** or **yarn**
- **Grok API Key** (for Twitter data access)
- **Discord Webhook URL** (for notifications)

### Local Development

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd twitter-meme-radar
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your credentials:
   ```env
   GROK_API_KEY=your_grok_api_key_here
   DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates a static export in the `out/` directory optimized for Netlify deployment.

## 🚀 Deployment

### Netlify Deployment

1. **Connect Repository**: Link your Git repository to Netlify

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `out`
   - Functions directory: `netlify/functions`

3. **Environment Variables**:
   Set the following in Netlify dashboard:
   ```
   GROK_API_KEY=your_grok_api_key_here
   DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
   ```

4. **Scheduled Functions**:
   The `send-alerts` function is automatically configured to run every 2 minutes via `netlify.toml`

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy to Netlify CLI (if installed)
netlify deploy --prod --dir=out
```

## 📊 API Endpoints

### Frontend APIs
- `GET /api/api-leaderboard?window={1m|5m|15m|1h|4h|24h}&chain={optional}` - Leaderboard data
- `GET /api/api-coin?chain={chain}&symbol={symbol}` - Detailed coin analytics

### Internal Functions
- `GET /api/discover-trends?window={window}&chain={optional}` - Raw trend data from Grok API
- `POST /api/send-alerts` - Triggered by Netlify scheduler for Discord notifications

## 🎯 Key Features Explained

### Hype Score Algorithm
The hype score combines multiple factors:
- **Growth Metrics**: Tweet count, author count, engagement growth vs baseline
- **Influence Factor**: Verified accounts and KOL (Key Opinion Leader) participation
- **Sentiment Analysis**: Positive/negative sentiment from Grok analysis
- **Grok Hype Score**: AI-powered hype assessment from Grok API

### Pre-pump Detection
Identifies coins with:
- Hype score ≥ 0.5
- Significant growth in mentions and unique authors
- Increased KOL/verified account activity
- Positive sentiment trends

### Alert System
- **Pre-pump Alerts**: Immediate notifications for early opportunities
- **Trending Alerts**: Top 3 highest hype coins per cycle
- **Cooldown System**: 10-minute cooldown prevents spam
- **Rich Embeds**: Detailed Discord messages with metrics and links

## 🔧 Configuration

### Time Windows
- `1m`, `5m`, `15m` - Short-term trend detection
- `1h`, `4h` - Medium-term analysis
- `24h` - Long-term trend validation

### Supported Chains
- Ethereum
- Solana
- Base
- Polygon
- BSC (Binance Smart Chain)
- And more (configurable)

### Discord Alert Format
```json
{
  "embeds": [{
    "title": "🚀 PRE-PUMP ALERT: $SYMBOL",
    "description": "Early momentum detected on {chain}",
    "color": 15548997,
    "fields": [
      {"name": "💯 Hype Score", "value": "85.2%", "inline": true},
      {"name": "📈 Growth", "value": "+245%", "inline": true},
      {"name": "👥 Authors", "value": "156 (+89%)", "inline": true}
    ],
    "footer": {"text": "Twitter Meme Radar • Real-time alerts"}
  }]
}
```

## 🛡️ Security & Best Practices

- **Environment Variables**: All sensitive data stored in environment variables
- **Input Validation**: Zod schemas validate all API inputs and outputs
- **Rate Limiting**: Built-in cooldown systems prevent API abuse
- **Error Handling**: Comprehensive error handling with fallbacks
- **CORS**: Proper CORS configuration for API endpoints

## 📈 Monitoring & Analytics

### Built-in Metrics
- Total coins tracked
- Pre-pump detection count
- High-hype coin identification
- Alert success rates
- API response times

### Logging
- Structured logging for all functions
- Error tracking and debugging
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [Issues](../../issues) page
2. Review the troubleshooting section below
3. Create a new issue with detailed information

## 🔧 Troubleshooting

### Common Issues

**Node.js Version Error**
```
You are using Node.js 18.16.0. For Next.js, Node.js version >= v18.17.0 is required.
```
**Solution**: Update Node.js to version 18.17.0 or higher

**Build Failures**
- Ensure all environment variables are set
- Check TypeScript compilation errors
- Verify all dependencies are installed

**API Errors**
- Validate Grok API key is correct and has sufficient credits
- Check Discord webhook URL format
- Ensure proper CORS configuration

**Deployment Issues**
- Verify Netlify build settings match the configuration
- Check function deployment logs
- Ensure environment variables are set in Netlify dashboard

---

Built with ❤️ for the crypto community. Happy trading! 🚀