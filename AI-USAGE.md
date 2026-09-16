# AI Usage Log

This project used AI assistance during development.

## Feature 1: Express Policy and Claims API
- **Prompt/context provided:** Build a protected Express REST API for users, policies, claims, dashboard metrics, and claim notes with proper status codes.
- **AI suggestion:** Structure the API into separate route, middleware, and data files and use a JSON-backed store with MongoDB support.
- **Outcome:** Accepted and adapted. I kept the structure, then refined the routes and validation to fit the policy claims tracker scenario.
- **Validation:** Verified route behavior manually, tested protected requests with bearer tokens, and confirmed MongoDB persistence.
- **Limitations encountered:** Some generated examples drifted toward unrelated domain models, so I rewrote them to match policies and claims.

## Feature 2: React Policy Claims UI
- **Prompt/context provided:** Build a polished UI for registration, login, dashboard metrics, policies, claims, and claim detail.
- **AI suggestion:** A card-based layout with protected routes, summary panels, forms, and detail pages.
- **Outcome:** Accepted with modifications. I adjusted the layout, labels, and flows to match the capstone demonstration checklist.
- **Validation:** Built the client, reviewed the rendered UI, and confirmed the data flow matched the API.
- **Limitations encountered:** Some suggestions over-optimized for a task workflow, so I reworked them into a policy and claims experience.
