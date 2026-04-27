# Resvy

> Apartment amenity booking platform — residents book shared spaces like gyms, BBQ areas, and study rooms without calling the management office.

## Why this exists

Apartment complexes in Korea manage shared amenity reservations through paper sign-up sheets, KakaoTalk group chats, or phone calls to the apartment office. Resvy replaces that with a clean, self-hosted web platform.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 (raw SQL — no ORM) |
| Frontend | React, Vite, TypeScript |
| Auth | JWT (access + refresh tokens) |
| Deployment | AWS EC2 + RDS, Nginx |
| API Docs | Swagger / OpenAPI |

## Architecture