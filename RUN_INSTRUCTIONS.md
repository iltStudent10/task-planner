# Run Instructions

This file explains how to run the Task Manager App and show the Assignment 9 requirements.

## 1. Open the project
Work from the project root:

`/home/labadmin/task-planner`

## 2. Start the full Docker Compose stack
Run:

```bash
docker compose up --build
```

This starts:
- Express API
- MongoDB
- React client served by Nginx

The client now includes register/login screens. Create an account or log in first, then the task dashboard loads with your saved session.

## 3. Verify the running application
Open these URLs:

- Client: http://localhost:8080
- API health: http://localhost:3000/health
- API tasks: http://localhost:3000/api/tasks
- API summary: http://localhost:3000/api/summary

The tasks and summary endpoints require authentication headers once a user is signed in.

## 4. Show the Assignment 9 Docker requirements
The following files demonstrate the required Docker setup:

- `app/Dockerfile`
- `client/Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `client/nginx.conf`

What they show:
- Alpine-based images
- Layer caching
- Non-root API container user
- API HEALTHCHECK
- Multi-stage React build
- Nginx reverse proxy for `/api/`
- MongoDB with named volume, health checks, and `depends_on`

## 5. Demonstrate the API
Example checks:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/summary
curl "http://localhost:3000/api/tasks?completed=false"
```

## 6. Validate the Kubernetes requirement with Kind
Create a Kind cluster:

```bash
kind create cluster --name task-manager
```

Build and load the API image:

```bash
docker build -t task-manager-api ./app
kind load docker-image task-manager-api:latest --name task-manager
```

Apply the manifests:

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/task-manager-api --context kind-task-manager
kubectl get pods,svc --context kind-task-manager
```

This validates:
- Deployment with 2 replicas
- Resource requests and limits
- Liveness and readiness probes
- ClusterIP service with label-based routing

To access the API from your machine during the demo, forward the service port:

```bash
kubectl port-forward service/task-manager-api 3000:3000 --context kind-task-manager
```

## 7. Review the deployment document
Open:

- `DEPLOYMENT.md`

This covers:
- Local build to ECR to cluster workflow
- EC2 with Docker Compose vs. EKS trade-offs
- Secrets handling
- Horizontal vs. vertical scaling
- AWS cost considerations

## 8. Stop the application
Stop Docker Compose:

```bash
docker compose down
```

Delete the Kind cluster when finished:

```bash
kind delete cluster --name task-manager
```

## Quick Demo Path
If you need the fastest demonstration:

1. Run `docker compose up --build`
2. Open http://localhost:8080
3. Open http://localhost:3000/health
4. Open http://localhost:3000/api/tasks
5. Run the Kind commands if Kubernetes validation is required
