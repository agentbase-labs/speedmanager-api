# Speed Manager Backend API

NestJS backend for the Speed Manager football game.

## Features

- ✅ User authentication (JWT)
- ✅ Player database (50+ players including Roy Hogeg)
- ✅ Match engine with decision system
- ✅ Leaderboard system
- ✅ Player collection & packs
- ✅ PostgreSQL database

## Quick Start

### Local Development

```bash
npm install
npm run start:dev
```

### Production Build

```bash
npm install
npm run build
npm run start:prod
```

## Environment Variables

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true
JWT_SECRET=your-secret-key
```

## API Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `GET /auth/health` - Health check

### Players
- `GET /players` - List all players (paginated)
- `GET /players/:id` - Get player details

### User
- `GET /user/profile` - Get user profile (requires auth)
- `GET /user/collection` - Get owned players (requires auth)
- `POST /user/open-pack` - Open player pack (requires auth, costs 100 coins)

### Match
- `POST /match/start` - Start new match (requires auth)
- `POST /match/decision` - Make decision during match (requires auth)
- `POST /match/complete` - Finish match and get rewards (requires auth)
- `GET /match/leaderboard?type=stars|coins` - Get leaderboard

## Database Schema

### Users
- Stores user accounts with coins, stars, rank
- Default: 1000 coins, 0 stars, Bronze rank

### Players
- 50+ football players
- Roy Hogeg: Special 99-rated player (0.1% drop rate)
- Positions: Forward, Midfielder, Defender, Goalkeeper
- Rarities: Common, Rare, Epic, Legendary

### Matches
- Match history with decisions
- Tracks user/opponent scores, rewards

## Match Engine

- 90-second matches
- 3-5 critical decision moments
- Decisions affect goal probability
- Rewards based on result:
  - Win: 150-200 coins, 3-5 stars
  - Draw: 75-100 coins, 1 star
  - Loss: 50-70 coins, 0 stars
- 20% chance for player pack on win

## Deployment

This backend is designed to deploy on:
- **Platform**: Render / AgentBase
- **Database**: PostgreSQL (managed)
- **Port**: 10000
- **SSL**: Required with rejectUnauthorized: false

### Deploy to AgentBase

1. Create repository
2. Provision PostgreSQL database
3. Deploy service with:
   - Runtime: Node.js
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
   - Env vars: DATABASE_URL, JWT_SECRET, PORT=10000
4. Attach subdomain: api.speedmanagergame.com

## Notes

- Database auto-seeds on first run
- TypeScript compiled to `dist/` folder
- Uses TypeORM for database management
- CORS enabled for speedmanagergame.com
