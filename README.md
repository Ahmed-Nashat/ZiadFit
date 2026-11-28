# Coach Ziad — Fitness Coaching Platform

A full-stack fitness coaching platform for managing personalized workout plans, tracking client progress, and streamlining online coaching.

## Features

- **Client Portal:** Personalized workouts, exercise logging, attendance, and progress analytics.
- **Coach Dashboard:** Client management, training programs, subscriptions, and performance monitoring.
- **Landing Page:** Coaching services, transformations, certificates, pricing, and CMS.
- **Google Sheets Integration:** Import existing workout programs and client data.
- **Progress Tracking:** Weekly/monthly analytics, exercise comparisons, and personal records.
- **Subscriptions:** Manual payment verification and subscription management.

## Tech Stack

| Frontend | Backend | Database | Caching | Hosting |
|---|---|---|---|---|
| React + Tailwind CSS | Node.js + Express | MongoDB Atlas | Redis | Cloudflare |

## System Architecture

- **Public Website:** Landing page and subscription entry point.
- **Client Application:** Personalized training and performance tracking.
- **Admin Application:** Coaching operations and content management.
- **REST API:** Centralized business logic, authentication, and data management.
- **Database:** Client profiles, subscriptions, workout programs, and performance history.

## Coach client search

`GET /user/clients` requires authentication and the coach role. Optional query
parameters can be combined:

- `search`: case-insensitive name or email search (1–100 characters). Each
  space-separated word must match a name or email field.
- `accountStatus`: `0` for active or `1` for suspended.
- `gender`: `0` for male or `1` for female.
- `page`: positive integer, up to 1,000,000 (default 1).
- `limit`: positive integer, up to 100 (default 10).

Example: `/user/clients?search=ahmad%20ali&accountStatus=0&page=1&limit=10`.

---

**Coach Ziad — Train Hard. Track Everything.**
