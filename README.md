# Policy Claims Tracker

A full-stack insurance policy and claims tracker built for the WA3478 Phase 3 capstone. The project includes an Express API, MongoDB persistence, a React client, Dockerized deployment, HTTPS termination, and Kind-based Kubernetes manifests.

## Architecture

- API: Express + Node.js
- Database: MongoDB
- Frontend: React + Vite
- Authentication: JWT with bcrypt password hashing
- Delivery: Docker Compose + Nginx + Kind

## Project structure

- `app/` – API service and backend logic
- `client/` – React frontend
- `k8s/` – Kubernetes manifests for local Kind deployment
- `docker-compose.yml` – local Docker Compose stack
- `docker-compose.prod.yml` – HTTPS production-style stack
- `generate-certs.sh` – creates local self-signed certificates
- `certs/` – generated certs for nginx SSL mounting

## Quick start with Docker Compose

```bash
docker compose up --build
```

Then visit:

- API: http://localhost:4000
- Client: http://localhost:3000
- MongoDB: mongodb://root:example@localhost:27017

Seed the database:

```bash
docker compose exec -T api node seed.js
```

## Local development without Docker

API:

```bash
cd app
npm install
PORT=4000 MONGODB_URI=mongodb://localhost:27017/policy-claims JWT_SECRET=change-me-in-production node server.js
```

Client:

```bash
cd client
npm install
npm run dev
```

The client dev server proxies `/api` requests to `http://localhost:4000`.

## Production HTTPS setup

Generate self-signed certs:

```bash
./generate-certs.sh
```

Start the production stack:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Then open:

- https://localhost:8443
- HTTP redirect: http://localhost:8080 → HTTPS

## Kind deployment

Create the cluster:

```bash
kind create cluster --config k8s/kind-config.yaml --name policy-claims
```

Build and load images:

```bash
docker build -t capstone-api:latest ./app
docker build -t capstone-client:latest ./client
kind load docker-image capstone-api:latest --name policy-claims
kind load docker-image capstone-client:latest --name policy-claims
```

Deploy:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/client.yaml
```

Verify:

```bash
kubectl get pods -n policy-claims
kubectl get svc -n policy-claims
```

Access the app at:

```text
http://localhost:30080
```

## API endpoints

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Policies:

- `GET /api/policies`
- `POST /api/policies`
- `GET /api/policies/:id`
- `PUT /api/policies/:id`
- `DELETE /api/policies/:id`

Claims:

- `GET /api/claims`
- `GET /api/claims/stats`
- `GET /api/claims/:id`
- `POST /api/claims`
- `PUT /api/claims/:id`
- `POST /api/claims/:id/notes`
- `DELETE /api/claims/:id`

Dashboard:

- `GET /api/dashboard`
- `GET /api/health`

## Tech stack

- Node.js
- Express
- MongoDB
- React
- Vite
- Docker
- Nginx
- Kubernetes / Kind
- JWT + bcrypt

## Required validation

This project includes:

- API tests for auth and claim flows using Vitest
- Client component tests for login, navbar, and protected route behavior
- Docker and K8s configs for local deploys
- HTTPS support with self-signed certificates

## Notes

- The optional AWS/EKS section is not required for the core assignment.
- The certificate files under `certs/` should never be committed to version control.

## TypeScript-oriented source layout

The API has been structured to support the Phase 3 capstone conventions while preserving the working runtime implementation. The TypeScript-friendly entrypoints live under `app/src/`, with compatibility re-exports for the existing Express app and route modules so the project remains stable and deployable.

- `app/src/server.ts` and `app/src/seed.ts` are the TypeScript entrypoints
- `app/src/config`, `app/src/middleware`, `app/src/models`, and `app/src/routes` mirror the lab structure
- The working runtime still uses the existing `app/server.js` and `app/seed.js` modules for compatibility
