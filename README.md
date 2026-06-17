# Afinidad con Luna Backend

Node.js + Express + MongoDB API for Luna's affinity system.

## Environment

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/sleepy-cat
CAT_SECRET_KEY=super-secret-key
CORS_ORIGIN=http://localhost:5173
```

`CORS_ORIGIN` is optional. Omit it to allow all origins.

## Routes

- `POST /api/cat/register`
- `POST /api/cat/pet`
- `POST /api/cat/reset`
- `GET /api/cat/progress/:deviceId`
- `PATCH /api/cat/state`
- `GET /data/cat?key=super-secret-key`
