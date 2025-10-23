# Mythras Star Wars Character Sheet

A web-based character sheet for the Mythras Star Wars RPG, built with React Router, Cloudflare Workers, and Durable Objects.

## Features

- 🌟 Star Wars themed UI with sci-fi aesthetics
- 💾 Automatic saving with version history
- 🖼️ Character image upload
- 📊 Complete character management (stats, skills, equipment, powers, etc.)
- 🔗 Shareable character URLs
- 📱 Responsive design

## Development

### Install dependencies:

```bash
bun install
```

### Run locally:

```bash
bun dev
```

### Build for production:

```bash
bun run build
```

### Deploy to Cloudflare:

```bash
bun run deploy
```

## API

### Get Character Data as JSON

You can retrieve character data in JSON format for external applications or integrations:

```
GET /:characterId/json
```

Example:

```
https://mythras.familiar.games/cosmic-swift-starfighter/json
```

Response:

```json
{
  "success": true,
  "data": {
    "characterData": {
      "info": { ... },
      "stats": { ... },
      "hitPoints": { ... },
      "skills": [ ... ],
      "equipment": { ... },
      "orders": [ ... ],
      "powers": [ ... ]
    },
    "characterId": "cosmic-swift-starfighter"
  }
}
```

## Technologies

- **React Router** - Server-side rendering and routing
- **Cloudflare Workers** - Serverless deployment
- **Cloudflare Durable Objects** - Persistent storage with SQL
- **Cloudflare R2** - Image storage
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Storage Architecture

- **Character Data**: Stored in Durable Objects with SQLite for versioning and quick access
- **Images**: Stored in R2 bucket to avoid size limits and improve performance
  - Images are stored with the character ID as the key
  - Each upload overwrites the previous image to conserve storage
