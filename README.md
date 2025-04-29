# Pixie Bot

A friendly and knowledgeable Discord bot with a playful yet professional personality, powered by the [Vercel AI SDK](https://sdk.vercel.ai/providers/ai-sdk-providers).

## Features

- 🤖 AI-powered responses with natural conversation flow
- 💬 Support for both DM and server channels
- ⚙️ Configurable settings per server
- 🔒 Channel-specific permissions
- 🎨 Rich text formatting with Markdown support

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pixie-bot.git
cd pixie-bot
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file:
   - Copy `.env.template` to `.env`
   - Fill in your configuration values:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_GUILD_INVITE=your_discord_guild_invite

# AI Configuration(s)
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORG_ID=your_openai_org_id

# Database Configuration
DATABASE_URL=your_database_url

# Bot Configuration
BOT_LOGO=your_bot_logo_url
BOT_BANNER=your_bot_banner_url
BOT_INVITE=your_bot_invite_url
```

4. Initialize the database:
```bash
bun prisma migrate dev
```

5. Start the bot:
```bash
bun run dev
```

## Commands

- `@Pixie [message]` - Chat with Pixie in any channel
- `/settings` - Configure bot settings (Admin only)
- `/clear` - Clear conversation history
- `/help` - Show help information

## Server Settings

Server administrators can configure:
- AI model selection
- Maximum token limit
- Allowed channels
- Temperature (creativity level)
- Maximum conversation length

## Development

### Project Structure
```
src/
├── client/     # Discord client setup
├── events/     # Discord event handlers
├── handlers/   # Core functionality handlers
├── models/     # Database models
└── utils/      # Utility functions
```

### Requirements
- Node.js 18+
- Bun runtime
- MySQL database

### Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

### AGPL-3.0 Requirements
- You must disclose the source code of your modified version
- You must license your modified version under AGPL-3.0
- You must make the source code available to users who interact with your modified version over a network
- You must preserve all legal notices and author attributions

For more details, see the [LICENSE](LICENSE) file.

## Support

For support, please open an issue in the GitHub repository. 