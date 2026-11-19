# ZiadFit backend handoff

This conversation is for developing the ZiadFit backend in TypeScript. The user asked where to start and then requested a folder structure; no backend application code has been implemented yet.

The existing `landing-page/` is a React application. The project README proposes Node.js, Express and MongoDB. See `coach_zyaead_specs_updated/04_PORTAL_ADMIN_IMPLEMENTATION.md` for backend requirements; the specifications describe Cloudflare Workers as a hosting preference, subject to an Express/MongoDB compatibility proof of concept.

A `backend/` folder was created with `src/config`, shared `src/common` folders, feature modules for auth, users, onboarding, subscriptions, workouts, progress and CMS, and `tests/`. The `.gitkeep` files preserve empty folders.

Suggested first milestone: set up TypeScript and Express, connect MongoDB, then implement registration, login, a protected profile route and client/coach authorization. Treat this as a suggested plan, not permission to implement everything without the user's direction. Inspect the current files before making changes.
