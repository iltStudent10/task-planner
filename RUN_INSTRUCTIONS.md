# Run Instructions

This file explains how to run the Policy Claims Tracker and show the assignment requirements.

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

The client includes register/login screens. Create an account or log in first, then the protected policy and claims dashboard loads with your saved session.

## 3. Verify the running application
Open these URLs:

- Client: http://localhost:8080
- API health: http://localhost:3000/health
- API policies: http://localhost:3000/api/policies
- API claims: http://localhost:3000/api/claims
- API summary: http://localhost:3000/api/summary

The policies, claims, and summary endpoints require authentication headers once a user is signed in.

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
curl http://localhost:3000/api/policies
curl http://localhost:3000/api/claims
curl http://localhost:3000/api/summary
curl "http://localhost:3000/api/claims?status=submitted"
```

## 6. Validate the Kubernetes requirement with Kind
Create a Kind cluster:

```bash
kind create cluster --name policy-claims
```

Build and load the API image:

```bash
docker build -t policy-claims-api ./app
kind load docker-image policy-claims-api:latest --name policy-claims
```

Apply the manifests:

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/policy-claims-api --context kind-policy-claims
kubectl get pods,svc --context kind-policy-claims
```

This validates:
- Deployment with 2 replicas
- Resource requests and limits
- Liveness and readiness probes
- NodePort service with label-based routing

To access the API from your machine during the demo, forward the service port:

```bash
kubectl port-forward service/policy-claims-api 3000:3000 --context kind-policy-claims
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
kind delete cluster --name policy-claims
```

## Quick Demo Path
If you need the fastest demonstration:

1. Run `docker compose up --build`
2. Open http://localhost:8080
3. Open http://localhost:3000/health
4. Open http://localhost:3000/api/policies
5. Open http://localhost:3000/api/claims
6. Run the Kind commands if Kubernetes validation is required
