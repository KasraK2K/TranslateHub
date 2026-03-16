# TranslateHub

TranslateHub is a self-hosted translation management platform for teams that want to manage application copy outside the main codebase and fetch translations at runtime through an API.

It includes a browser-based admin dashboard, per-project locale management, runtime translation delivery, project locking, admin user management, themes, and Docker support.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
  - [Docker](#docker)
- [First-Time Setup](#first-time-setup)
- [Seeding Demo Data](#seeding-demo-data)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
  - [Authentication API](#authentication-api)
  - [Admin API](#admin-api)
  - [Project API](#project-api)
  - [Public Translation API](#public-translation-api)
- [Project Security Model](#project-security-model)
- [Frontend Highlights](#frontend-highlights)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Roadmap Ideas](#roadmap-ideas)
- [Contributing](#contributing)
- [License](#license)

## Features

- Manage translation projects with custom locale codes like `en`, `en-US`, `fr-FR`, or `zh-Hans`
- Store locale metadata as `{ code, name }` for cleaner UI and API responses
- Create, edit, bulk import, and delete translation keys
- Runtime translation delivery through API key-protected public endpoints
- Source-locale fallback when a translation is missing
- Per-project password protection
- Lock and unlock projects to prevent accidental edits or deletion
- Password-confirmed project deletion flow
- Admin and super-admin roles
- Theme switching with local persistence
- Sidebar project navigation for fast switching between projects
- Mobile-friendly dashboard UI
- Docker Compose support for one-command startup

## Tech Stack

- Backend: Node.js, Express
- Database: MongoDB, Mongoose
- Auth: JWT
- Password hashing: bcryptjs
- Frontend: Vanilla JavaScript, HTML, CSS
- Icons: Font Awesome
- Containers: Docker, Docker Compose

## How It Works

TranslateHub has two main surfaces:

1. Dashboard API and UI for admins
   - manage projects
   - manage locales
   - manage translation keys
   - manage admin users

2. Public runtime API for client apps
   - fetch translations using an `X-API-Key` header
   - retrieve one locale or all locales
   - use source-locale fallback automatically

Typical flow:

1. Create a project
2. Add source and target locales
3. Add translation keys and values
4. Copy the project API key
5. Fetch translations in your application at runtime

## Getting Started

### Prerequisites

For local development you need:

- Node.js 20+
- npm
- MongoDB

If you prefer containers, Docker Desktop or Docker Engine is enough.

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Start MongoDB locally

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

### Environment Variables

Example values are available in `.env.example`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | Express server port |
| `MONGODB_URI` | No | `mongodb://localhost:27017/translate-hub` | MongoDB connection string |
| `JWT_SECRET` | Yes | - | Secret used to sign dashboard auth tokens |
| `NODE_ENV` | No | `development` | Runtime environment |

Example:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/translate-hub
JWT_SECRET=change-this-to-a-long-random-string
NODE_ENV=development
```

### Docker

The easiest way to run the full stack is:

```bash
docker compose up -d
```

This starts:

- the Express app on `http://localhost:3000`
- MongoDB on `mongodb://localhost:27017`

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose down -v
```

Notes:

- MongoDB data is stored in the `mongo-data` volume
- the compose file already wires `MONGODB_URI` to the MongoDB service
- update `JWT_SECRET` in `docker-compose.yml` before using it anywhere beyond local development

## First-Time Setup

On a fresh database, the app shows a setup screen instead of a login screen.

You will create the first `super_admin` account through the UI.

After setup:

- the app stores a JWT token in local storage
- the dashboard becomes available
- additional admins can be created from the Admins page

## Seeding Demo Data

You can load demo content with:

```bash
npm run seed
```

This creates:

- a demo project
- sample locale data
- sample translation keys
- an initial super admin if needed

Current demo project password:

```text
demo1234
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the production server |
| `npm run dev` | Start the server with nodemon |
| `npm run seed` | Seed demo data |
| `npm run test:frontend` | Run lightweight frontend helper/router tests |

## API Overview

### Authentication API

Base path: `/api/auth`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/status` | Check whether first-time setup is needed |
| `POST` | `/setup` | Create the initial super admin |
| `POST` | `/login` | Sign in with username and password |
| `GET` | `/me` | Get current authenticated user |
| `PUT` | `/password` | Change current user password |

### Admin API

Base path: `/api/admins`

Requires authenticated `super_admin` access.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | List admins |
| `POST` | `/` | Create admin or super admin |
| `PUT` | `/:id` | Update admin profile, role, status, or password |
| `DELETE` | `/:id` | Delete admin |

### Project API

Base path: `/api/projects`

Requires authenticated dashboard access.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | List projects |
| `POST` | `/` | Create project |
| `GET` | `/:id` | Get project details and stats |
| `PUT` | `/:id` | Update project metadata, locales, and password |
| `DELETE` | `/:id` | Delete project with password confirmation |
| `POST` | `/:id/regenerate-key` | Regenerate public API key |
| `POST` | `/:id/lock` | Lock project using project password |
| `POST` | `/:id/unlock` | Unlock project using project password |

Translation key management:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/:projectId/keys` | List translation keys |
| `POST` | `/:projectId/keys` | Create one key |
| `POST` | `/:projectId/keys/bulk` | Bulk import keys |
| `PUT` | `/:projectId/keys/:keyId` | Update a key |
| `PATCH` | `/:projectId/keys/:keyId/translate` | Update one locale value |
| `DELETE` | `/:projectId/keys/:keyId` | Delete a key |

### Public Translation API

Base path: `/api/v1`

Requires the `X-API-Key` header.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/translations/:locale` | Get translations for a single locale |
| `GET` | `/translations` | Get translations for all locales |
| `GET` | `/locales` | Get project locale metadata |

Example:

```bash
curl -H "X-API-Key: th_your_project_api_key" \
  http://localhost:3000/api/v1/translations/en-US
```

Example response:

```json
{
  "locale": "en-US",
  "localeName": "English (United States)",
  "projectId": "...",
  "translations": {
    "common.welcome": "Welcome to our app!",
    "nav.home": "Home"
  }
}
```

## Project Security Model

TranslateHub protects projects in two layers:

### Dashboard Auth

- users authenticate with JWT
- admins can manage projects and translations
- super admins can also manage admin accounts

### Per-Project Password

Each project can be protected by its own password.

Supported behavior:

- project lock and unlock requires project password
- deleting a project requires project password and explicit confirmation
- when a project is locked, translation keys cannot be added, edited, bulk imported, or deleted
- changing an existing project password requires the current project password
- legacy projects without a password can add one in settings

## Frontend Highlights

- vanilla JS single-page dashboard
- hash-based routing for refresh persistence and back/forward support
- local theme persistence
- fast sidebar project switching
- responsive layout for desktop and mobile
- improved large-screen layout usage

## Project Structure

```text
.
├── config/               # Database connection
├── middleware/           # Auth and API key middleware
├── models/               # Mongoose models
├── public/               # Frontend assets
│   ├── css/
│   └── js/
│       └── modules/
├── routes/
│   └── api/              # Express API routes
├── scripts/              # Seed utilities
├── tests/                # Lightweight frontend tests
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js
```

## Testing

Run the included frontend module tests:

```bash
npm run test:frontend
```

This currently validates helper and router behavior used by the dashboard.

## Deployment Notes

- set a strong `JWT_SECRET`
- keep project API keys private in client environment configuration, not hard-coded in repos
- use a managed MongoDB instance or persistent Docker volume
- prefer HTTPS in production
- consider putting a reverse proxy like Nginx or Caddy in front of the app

## Roadmap Ideas

- search and filtering for large project lists
- export/import translation files by format
- audit log for sensitive actions like unlock/delete/password changes
- end-to-end UI tests
- production deployment examples for Nginx or Traefik
- role expansion beyond `admin` and `super_admin`

## Contributing

Contributions are welcome.

Suggested flow:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run relevant checks
5. Open a pull request

If you are extending the frontend, keep the current goal in mind: improve the product while avoiding unnecessary architectural complexity.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
