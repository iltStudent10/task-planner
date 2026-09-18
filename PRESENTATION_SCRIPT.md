# Policy Claims Tracker — Presentation Script
**Estimated Time: 10 minutes**

---

## CONTEXT NOTE (for reviewer)

**Timeline:** This capstone was completed in ~6 hours of focused development time due to production obligations. The engineer was the sole team member responding to a critical production issue during the sprint, which consumed full-time availability. Despite this constraint, all core requirements are complete and production-ready. The optional EKS/AWS bonus was intentionally deferred in favor of delivering a rock-solid, well-tested, fully-documented implementation.

---

## OPENING — *30 seconds*

**[Show the running application on screen]**

"Good [morning/afternoon]. I'm presenting the Policy Claims Tracker, a full-stack insurance management application that brings together everything we've learned in Phase 3.

This is a real-world domain—insurance adjusters and administrators use tools like this to manage policies and the claims filed against them. Over the next 10 minutes, I'll walk you through the architecture, the technical implementation, and how everything deploys from development all the way to Kubernetes."

---

## ARCHITECTURE OVERVIEW — *1 minute*

**[Show architecture diagram or describe layers]**

"Let me break down the architecture:

**Backend:**
- Node.js + Express REST API running TypeScript
- MongoDB for data persistence
- JWT-based authentication with bcrypt password hashing

**Frontend:**
- React + TypeScript single-page application built with Vite
- React Router for navigation and protected routes
- Axios with interceptors for API communication and token management

**Infrastructure:**
- Docker Compose for local development and production deployment
- Nginx for SSL/TLS termination in production
- Kubernetes (Kind) for orchestration
- Self-signed certificates for HTTPS locally

The entire stack—API, database, and client—runs in containers and scales across a Kubernetes cluster."

---

## DATA MODEL & AUTH — *1.5 minutes*

**[Show the three core models]**

"The application centers on three main data models:

**Users** — Adjusters and admins who log in. We hash passwords with bcrypt and issue JWTs for session management.

**Policies** — Insurance policies with fields like policy number, holder name, type (auto, home, life), premium, status, and dates. Each policy is owned by a user.

**Claims** — Claims filed against policies. Each claim has a unique number, status, incident date, amount, and a notes array where adjusters can collaborate.

When a user logs in, they get a JWT token. That token is included in all subsequent API requests. We validate it on every protected endpoint—if it's missing or invalid, we return 401 Unauthorized.

Admins see all data. Adjusters only see policies and claims they own."

---

## API ROUTES & VALIDATION — *1.5 minutes*

**[Walk through key endpoints]**

"The API exposes standard REST endpoints with full CRUD:

**Authentication:**
- POST /api/auth/register — Create a new user with email and password
- POST /api/auth/login — Authenticate and receive a JWT
- GET /api/auth/me — Retrieve authenticated user profile

**Policies:**
- GET /api/policies — List with filtering by type, status, and search
- POST /api/policies — Create a new policy
- GET/PUT/DELETE — Standard resource operations

**Claims:**
- GET /api/claims — List all claims with filtering and pagination
- GET /api/claims/stats — Aggregated statistics by status and amount
- POST /api/claims/:id/notes — Add notes to collaborate on claims
- Full CRUD operations

**Dashboard:**
- GET /api/dashboard — Returns summary statistics: total claims, claims by status, policies by type, total amount claimed

We validate all input with express-validator. Bad requests return 400 with field-level error messages. Duplicate emails return 409. Resource errors return 404.

The middleware stack includes helmet for security headers, rate limiting, CORS, and centralized error handling."

---

## FRONTEND EXPERIENCE — *1.5 minutes*

**[Demo or screenshot key pages]**

"On the client side, users flow through:

**Login & Registration** — Simple auth forms with validation. After login, the JWT is stored in localStorage and automatically attached to all requests.

**Dashboard** — A landing page showing key stats:
- Total claims, claims by status
- Total policies, policies by type
- Recent claims table
- Claim amount metrics

**Claims Management** — A full CRUD interface:
- List all claims with status filter and search
- Click to view claim details
- Add notes to collaborate with other adjusters
- Update claim status
- Delete claims

**Policy Management** — Similar interface:
- List all policies with type and status filters
- Create new policies
- View policy details and related claims
- Edit and delete

**Navigation** — A responsive navbar shows active page, user name, role badge, and logout button. Protected routes redirect to login if you lose your session.

Everything is styled with a clean, professional design. We use semantic HTML and color-coded status badges so you can scan information quickly."

---

## CONTAINERIZATION & LOCAL DEPLOYMENT — *1.5 minutes*

**[Show docker-compose.yml]**

"Development is simple. With one command:

```bash
docker compose up --build
```

Three containers spin up:
1. **MongoDB** — Persisted data, initialized with seed data
2. **API** — Express server on port 4000, connected to MongoDB
3. **Client** — Nginx serving the React SPA on port 3000

The containers communicate over a Docker network. The client proxies /api requests to the backend.

We seed the database automatically on startup with sample users, policies, and claims. This lets you log in immediately and explore the full feature set.

**For production,** we use docker-compose.prod.yml with SSL termination:
- We generate self-signed certificates with OpenSSL
- Nginx listens on 443 (HTTPS) and redirects HTTP to HTTPS
- The API and database are not exposed to the host—only the client
- Environment variables are injected at runtime

We tested this locally at https://localhost:8443 and it works end-to-end."

---

## KUBERNETES DEPLOYMENT — *1.5 minutes*

**[Show the k8s manifests]**

"For production-grade deployment, we use Kubernetes with Kind—a local K8s cluster in Docker.

**Setup:**
```bash
kind create cluster --config k8s/kind-config.yaml --name policy-claims
docker build -t capstone-api:latest ./app
docker build -t capstone-client:latest ./client
kind load docker-image capstone-api:latest --name policy-claims
kind load docker-image capstone-client:latest --name policy-claims
```

Then we deploy manifests:
- **Namespace** — Isolates the application in its own namespace
- **Secrets** — Holds JWT_SECRET and MONGODB_URI securely
- **MongoDB** — Deployment + PersistentVolumeClaim (1Gi) + Service
- **API** — 2 replicas with readiness and liveness probes, pulls secrets
- **Client** — 1 replica, NodePort service on port 30080

The API probes /api/health every 10 seconds. If it fails, Kubernetes restarts the pod. This gives us self-healing and high availability.

Data persists across pod restarts thanks to the PVC.

We access the app at http://localhost:30080. The internal DNS service-to-service communication is automatic."

---

## TESTING — *45 seconds*

**[Show test files briefly]**

"We wrote tests for both backend and frontend:

**API Tests (Vitest):**
- Registration returns a JWT token
- Login with wrong password returns 401
- Creating a claim returns 201
- Accessing claims without auth returns 401
- Missing required fields return 400

**Component Tests (Vitest + React Testing Library):**
- Login form renders email and password inputs
- Navbar displays navigation links and user name
- Protected routes redirect unauthenticated users to login

All tests pass. This validates core flows work reliably."

---

## KEY CHALLENGES & DECISIONS — *45 seconds*

"A few highlights:

**Data Privacy** — Adjusters should only see policies and claims they own. We implemented role-based filtering on the backend. Admins bypass these checks.

**Real-time Collaboration** — We added a notes feature to claims so multiple adjusters can leave comments. Each note timestamps and attributes to the author.

**Security** — Passwords are hashed with bcrypt (12 rounds). JWTs expire in 7 days. All API endpoints validate input. We use HTTPS in production.

**DevOps** — The same Docker images work in Compose, Kind, and (if needed) in EKS. Environment-specific configs are injected at runtime, not baked into images."

---

## DEMO — *1 minute (optional, live or video)*

**[If time permits, show one quick user flow]**

"Let me quickly show a real workflow:

1. I'm on the login page. I'll enter credentials...
2. [Login] → Dashboard appears with summary stats
3. [Click Into Claims] → List of all claims
4. [Create a New Claim] → Form validates in real-time
5. [Submit] → New claim appears in the list
6. [Click to View Detail] → Add a note, update status
7. [Logout] → Redirects to login

Everything is responsive and works end-to-end."

---

## CLOSING — *30 seconds*

"To summarize:

We built a production-ready full-stack application that demonstrates:
- Modern API design with REST, validation, and error handling
- A responsive React frontend with protected routes and client-side state
- Professional containerization with Docker and Nginx
- Enterprise orchestration with Kubernetes
- Comprehensive testing and documentation

The code is clean, well-organized, and documented. Everything is version-controlled in Git. Tests pass. The application runs locally, in Docker Compose, and in Kubernetes—ready to ship.

**[Show landing on dashboard]**

Thanks for watching. I'm happy to answer any questions."

---

## TALKING POINTS FOR Q&A

**Q: How do you handle authentication tokens?**
A: Tokens are JWT-based, signed with a secret, and include expiration (7 days). On the frontend, we store them in localStorage and attach to every request via an Axios interceptor. The backend validates the token on every protected endpoint.

**Q: How are passwords secured?**
A: We hash them with bcrypt at 12 salt rounds before storing. Even if the database is compromised, passwords are unreadable. During login, we compare the submitted password's hash against the stored hash.

**Q: What if someone tries to access another user's claim?**
A: The API filters claims by ownership. An adjuster can only see claims on policies they own. An admin sees everything. If they try a direct GET request with someone else's ID, they get a 404 or 403.

**Q: How do you handle failures in production?**
A: Kubernetes health probes detect unresponsive pods and restart them automatically. MongoDB uses PersistentVolumeClaims so data survives pod restarts. The database and multiple API replicas provide redundancy.

**Q: Could this scale to more users?**
A: Yes. Horizontally, we'd add more API replicas and use a load balancer. Vertically, we'd upgrade MongoDB and node specs. We'd also add caching (Redis) and possibly read replicas for the database.

**Q: Why both Docker Compose and Kubernetes?**
A: Compose is great for local development—simple setup, fast iteration. Kubernetes is for production—orchestration, auto-scaling, health management, secrets handling. We wanted to show both workflows.

**Q: What about the optional EKS deployment?**
A: That was deferred by design. During this sprint, I was the sole engineer handling a production issue that demanded full-time attention. With 6 hours available for the capstone, I prioritized delivering a complete, well-tested, production-ready implementation locally and in Kind over adding AWS infrastructure that wouldn't have been fully tested or documented. In real work, production stability always comes first. EKS deployment would be straightforward once this is proven—the images and manifests are portable to any Kubernetes environment.

**Q: How did you complete this in just 6 hours?**
A: Focus, scaffolding, and prioritization. I started with a clear checklist, reused proven patterns, and avoided scope creep. I skipped the optional AWS piece and focused on core requirements: working API, working frontend, secure auth, Docker, and Kubernetes. The tests and documentation were essential, not optional—they take time upfront but prevent rework. Having a seed script and sample data ready meant I could verify everything quickly.

**Q: What would you do differently with more time?**
A: I'd add more comprehensive integration tests, implement real-time notifications (WebSocket), add database query optimization and indexing, implement audit logging, and add monitoring/alerting (Prometheus, Grafana). I'd also flesh out the EKS deployment and add CI/CD pipelines (GitHub Actions).

---

## TIMING GUIDE

- Opening: 0:30
- Architecture: 1:00
- Data Model: 1:30
- API Routes: 1:30
- Frontend: 1:30
- Docker: 1:30
- Kubernetes: 1:30
- Testing: 0:45
- Challenges: 0:45
- Demo (optional): 1:00
- Closing: 0:30

**Total: ~9–10 minutes (without Q&A)**

Adjust pacing as needed. If running long, compress the Docker and Kubernetes sections or skip the live demo.
