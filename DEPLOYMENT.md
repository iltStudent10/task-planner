# Deployment Architecture Plan

This policy claims tracker project should be built locally, tagged, and pushed to Amazon ECR before deployment. The recommended workflow is: build the Express API image and the React client image, run them locally with Docker Compose, then push versioned images such as `1.0.0` and `latest` to ECR. A CI pipeline can repeat the same build steps on every commit so the cluster always pulls a known image tag.

For runtime, I would choose EKS if the goal is a production-style managed Kubernetes deployment, because it provides declarative rollout control, pod rescheduling, and a path to autoscaling. I would choose EC2 with Docker Compose for a smaller learning or budget-focused deployment, because it is easier to understand and cheaper to operate at small scale. EC2 is simpler, but it requires more manual setup and does not give the same orchestration features as EKS.

Secrets should never be committed to the repository. In production, I would store database credentials and API keys in AWS Secrets Manager or SSM Parameter Store and inject them at deploy time. For Kubernetes, those values can be mounted through Secrets or synced by an external secrets controller. The repository should only contain example files and placeholders.

I would scale horizontally when the application is getting more traffic, the API becomes stateless, or CPU and request latency start increasing. Horizontal scaling is the better option for the web tier because replicas can be added quickly behind a service or ingress. I would scale vertically when the app is limited by a single instance and the workload is still small enough that a larger machine is easier than managing more replicas. In practice, I would monitor CPU, memory, and response time, then scale based on those metrics.

Cost control should focus on using the smallest viable compute tier, reusing a single ECR repository, and keeping persistent storage minimal. EKS has a control-plane cost, so it is more expensive than EC2 Docker Compose for small projects. To reduce cost, I would prefer small on-demand instances for development, use right-sized pod requests and limits, delete unused resources, and keep the MongoDB data volume small. If the project must stay in AWS long term, I would also prefer image caching, shorter build pipelines, and fewer always-on services.

## EKS deployment workflow

To deploy this project to EKS, the usual path is:

1. Build the application images locally.
2. Tag them for Amazon ECR.
3. Push them to ECR.
4. Update the Kubernetes manifests to use the ECR image URIs.
5. Apply the manifests to the EKS cluster.

Example commands:

```bash
aws ecr create-repository --repository-name policy-claims-api
aws ecr create-repository --repository-name policy-claims-client

aws ecr get-login-password --region us-east-1 \
	| docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t policy-claims-api ./app
docker build -t policy-claims-client ./client

docker tag policy-claims-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/policy-claims-api:latest
docker tag policy-claims-client:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/policy-claims-client:latest

docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/policy-claims-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/policy-claims-client:latest
```

For EKS, the API service should usually be exposed with a `LoadBalancer` service or an ingress controller instead of a local-only `NodePort`. The MongoDB PVC should rely on the cluster default storage class, which is why the manifest should not hardcode a Kind-specific class name.

After that, apply the manifests and verify the rollout:

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/mongo
kubectl rollout status deployment/policy-claims-api
kubectl get svc
kubectl get pvc
```

If the client is deployed separately in EKS, point its Nginx proxy or frontend configuration at the API load balancer hostname.
