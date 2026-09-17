# Policy Claims Tracker Specs

## Purpose
Build a policy and claims tracking application that demonstrates the assignment requirements from the PDF as real deliverables.

## Required Deliverables

### 1. Dockerized Express API
- Alpine base image
- Layer caching by copying package files first
- Non-root container user
- HEALTHCHECK instruction

### 2. Docker Compose Multi-Service Setup
- Express API + MongoDB
- Named volume for persistent database data
- Health checks for services
- depends_on with health condition
- Environment variables for configuration
- .dockerignore file

### 3. Multi-Stage React Client
- Stage 1 builds the React app
- Stage 2 serves the build output from Nginx
- nginx.conf proxies /api/ requests to the API

### 4. Kubernetes Manifests
- Deployment with 2 replicas
- Resource requests and limits
- Liveness and readiness probes
- NodePort Service
- Validate with a Kind cluster

### 5. Deployment Architecture Document
- 300–500 words
- Local build → ECR → cluster workflow
- EC2 with Docker Compose vs. EKS trade-offs
- Secrets handling in production
- Horizontal vs. vertical scaling
- AWS cost considerations

## User-Facing App Goals
- Show the above requirements clearly
- Provide protected register/login flows
- Support dashboard, policy CRUD, claim CRUD, and claim notes
- Keep the UI simple, modern, and focused on policy and claims workflows

## Suggested Pages / Sections
- Overview
- Policies
- Claims
- Policy detail
- Claim detail
- Deployment notes

## Naming Convention
Use policy-claims names throughout the project:
- policy-claims-api
- policy-claims-client
- policy claims deployment terminology

## Notes
This specs file should guide the actual application and repository naming so the project reads as a policy claims tracker rather than a generic assignment shell.