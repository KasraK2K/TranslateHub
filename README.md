# TranslateHub

## Run with Docker

Start the app and MongoDB:

```bash
docker compose up -d
```

Open `http://localhost:3000`.

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose down -v
```

Notes:

- MongoDB data is stored in the `mongo-data` Docker volume.
- The app uses the setup screen on first run, so seeding is optional.
- Change `JWT_SECRET` in `docker-compose.yml` before using this outside local development.
