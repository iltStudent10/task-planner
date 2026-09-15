# Task Manager App

This repository contains a daily task management application that helps users organize groceries, meals, errands, household chores, and other personal tasks.

- Dockerized Express API
- Docker Compose multi-service setup with MongoDB
- Multi-stage React client built with Nginx
- Kubernetes manifests with probes and resource limits
- Deployment architecture document
- AI usage log
- Written rationale

## Example Uses

- Grocery shopping lists
- Cooking dinner plans
- Household chores
- Errands and reminders
- Personal work or study tasks

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
- MongoDB: internal only

The Compose stack was validated with the API connected to MongoDB and reporting `"storage":"mongodb"` from the health endpoint.

## Docker Images

### API Image
```bash
docker build -t task-manager-api ./app
```

### Client Image
```bash
docker build -t task-manager-client ./client
```

## Kubernetes

Apply the API manifests to a Kind cluster:

```bash
kubectl apply -f k8s/
```

The API service is exposed internally as a `ClusterIP` service. For local access on Kind, use port-forwarding:

```bash
kubectl port-forward service/task-manager-api 3000:3000 --context kind-task-manager
```

Validation performed on Kind:

```bash
kind create cluster --name task-manager
kind load docker-image task-manager-api:latest --name task-manager
kubectl apply -f k8s/
kubectl rollout status deployment/task-manager-api --context kind-task-manager
```

## Health Checks

- API health endpoint: `/health`
- API tasks endpoint: `/api/tasks`
- API summary endpoint: `/api/summary`

## REST Examples

- `GET /api/tasks?search=buy` filters tasks by text search
- `GET /api/tasks?category=Shopping` filters by category
- `GET /api/tasks?completed=false` returns only open tasks

## Notes

- Secrets are not committed to the repository.
- Dockerfiles use alpine-based images and layer caching.
- The API runs as a non-root user and includes a HEALTHCHECK instruction.
