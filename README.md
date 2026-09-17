# Policy Claims Tracker

This repository contains a policy and claims tracking application with JWT-protected APIs, MongoDB persistence, a React frontend, Docker packaging, and Kubernetes deployment assets.

- Dockerized Express API
- Docker Compose multi-service setup with MongoDB
- Multi-stage React client built with Nginx
- Kubernetes manifests with probes and resource limits
- Deployment architecture document
- AI usage log
- Written rationale

## Example Uses

- Register insurance staff users
- Create and review policy records
- Create claims linked to policies
- Track claim statuses and notes
- Demonstrate protected dashboard metrics

## Project Structure

- `app/` - Express API source and Dockerfile
- `client/` - React client, Nginx config, and Dockerfile
- `k8s/` - Kubernetes manifests
- `docker-compose.yml` - Local multi-service stack
- `DEPLOYMENT.md` - Architecture plan
- `AI-USAGE.md` - AI assistance log
- `RATIONALE.md` - Written explanation of the design

## Local Development

### API
```bash
cd app
npm install
npm start
```

If `MONGO_URI` is not set, the API falls back to the local JSON seed file for simple standalone development. In Docker Compose, the API uses MongoDB.

Authentication endpoints are available at `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`. The API uses `JWT_SECRET` when provided, and falls back to a development secret for local runs.

For Postman, use the token returned from `/api/auth/register` or `/api/auth/login` in the request header: `Authorization: Bearer <token>`. In the live app, the token is stored in the session and automatically attached to protected requests.

The dashboard endpoint is available at `/api/dashboard` and returns policy and claim summary metrics used by the demo UI.

Primary policy endpoints:

- `GET /api/policies`
- `POST /api/policies`
- `GET /api/policies/:id`
- `PUT /api/policies/:id`
- `DELETE /api/policies/:id`

Primary claim endpoints:

- `GET /api/claims`
- `POST /api/claims`
- `GET /api/claims/:id`
- `PUT /api/claims/:id`
- `DELETE /api/claims/:id`
- `POST /api/claims/:id/notes`

### Client
```bash
cd client
npm install
npm run dev
```

The client proxies `/api/` requests to the API in development.

## Docker Compose

Build and run the full stack:

```bash
docker compose up --build
```

Services:
- API: http://localhost:3000
- Client: http://localhost:8080
- MongoDB: mongodb://root:example@localhost:27018

The Compose stack was validated with the API connected to MongoDB and reporting `"storage":"mongodb"` from the health endpoint.

## Docker Images

### API Image
```bash
docker build -t policy-claims-api ./app
```

### Client Image
```bash
docker build -t policy-claims-client ./client
```

## Kubernetes

Apply the API manifests to a Kind cluster:

```bash
kubectl apply -f k8s/
```

The API service is exposed as a `NodePort` service on port `30080`. On a local Kind cluster, you can still use port-forwarding if preferred:

```bash
kubectl port-forward service/policy-claims-api 3000:3000 --context kind-policy-claims
```

Validation performed on Kind:

```bash
kind create cluster --name policy-claims
kind load docker-image policy-claims-api:latest --name policy-claims
kubectl apply -f k8s/
kubectl rollout status deployment/policy-claims-api --context kind-policy-claims
```

## Health Checks

- API health endpoint: `/health`
- API dashboard endpoint: `/api/dashboard` (requires a Bearer token after login)
- API policies endpoint: `/api/policies` (requires a Bearer token after login)
- API claims endpoint: `/api/claims` (requires a Bearer token after login)
- API summary endpoint: `/api/summary` (requires a Bearer token after login)

## REST Examples

- `GET /api/policies?status=active` filters policies by status
- `GET /api/policies?type=auto` filters policies by type
- `GET /api/claims?status=submitted` filters claims by status
- `GET /api/claims?policy=<policyId>` filters claims by linked policy

## Notes

- Secrets are not committed to the repository.
- Dockerfiles use alpine-based images and layer caching.
- The API runs as a non-root user and includes a HEALTHCHECK instruction.
