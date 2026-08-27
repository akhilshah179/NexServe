<div align="center">

# 🚀 NexServe
### *On-Demand Multi-Service Booking & Management Platform*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2+-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00.svg?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Razorpay](https://img.shields.io/badge/Razorpay-Gateway-0C2340.svg?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>NexServe</b> is an enterprise-grade, full-stack on-demand marketplace connecting customers with verified local service professionals across 12+ categories (Home Cleaning, AC Repair, Salon & Spa, Tutoring, Fitness, Plumbing, Electrician, and more). Built with a high-performance <b>FastAPI</b> asynchronous backend, a reactive <b>React 19 + Tailwind CSS v4</b> frontend, <b>PostgreSQL</b> relational persistence, <b>Google OAuth 2.0 + JWT</b> authentication, and seamless <b>Razorpay</b> payment integration.
</p>

[Explore Features](#-features-matrix) •
[System Architecture](#-system-architecture) •
[User Flows](#-end-to-end-user-flows) •
[API Reference](#-api-endpoints-overview) •
[Quick Start](#-installation--setup-guide)

---

</div>

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Features Matrix](#-features-matrix)
   - [Customer Features](#-customer-features)
   - [Service Provider Features](#-service-provider-features)
   - [Admin Console Features](#-admin-console-features)
3. [End-to-End User Flows](#-end-to-end-user-flows)
4. [Authentication Architecture](#-authentication--security)
5. [Tech Stack](#-tech-stack)
6. [System Architecture](#-system-architecture)
7. [Project Structure](#-project-structure)
8. [Database Schema Overview](#-database-schema--models)
9. [API Endpoints Overview](#-api-endpoints-overview)
10. [Installation & Setup Guide](#-installation--setup-guide)
    - [Prerequisites](#prerequisites)
    - [Backend Setup (FastAPI)](#step-1-backend-setup-fastapi)
    - [Frontend Setup (React + Vite)](#step-2-frontend-setup-react--vite)
11. [Environment Variables Reference](#-environment-variables-reference)
12. [Application Access URLs](#-application-access-urls)
13. [Screenshots & UI Preview](#-screenshots--ui-preview)
14. [Future Roadmap](#-future-roadmap)
15. [Author & License](#-author--license)

---

## 🌟 Project Overview

Modern urban living requires fast, reliable, and transparent access to essential home and lifestyle services. **NexServe** bridges the gap between consumers and skilled service professionals through an automated, secure, and intuitive digital marketplace.

### Why NexServe?
- **Zero-Friction Discovery**: Real-time category filtering, provider comparison, rating distribution, and transparent pricing.
- **Smart Scheduling**: Granular slot-based provider availability and collision-free booking state machine.
- **Financial Trust**: Built-in Razorpay checkout with signature verification and order tracking.
- **Role-Based Governance**: Dedicated operational views for Customers, Providers, and Platform Admins.
- **Automated Fallback**: Robust database layer supporting PostgreSQL in production with automatic fallback to SQLite for local development.

---

## ⚡ Features Matrix

### 👤 Customer Features
- **One-Click Google Authentication**: Fast, secure onboarding via Google OAuth 2.0 and JWT session management.
- **12+ Curated Service Categories**: Home Cleaning, AC Repair, Salon & Spa, Tutoring, Fitness Training, Car Care, Plumbing, Electrician, Painting, Pest Control, Packers & Movers, and Laundry.
- **Detailed Provider Profiles**: View experience, verified badge, hourly rates, bio, service catalogs, and customer reviews.
- **Interactive Multi-Step Booking Wizard**:
  - Service selection & custom requirements.
  - Dynamic slot availability selection.
  - Multi-address management (Home, Work, Other).
  - Razorpay checkout integration with instant booking confirmation.
- **Real-Time Booking Lifecycle Tracking**: Filter by `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, or `REJECTED`.
- **Review & Rating System**: Post verified feedback, ratings (1–5 stars), and written reviews upon service completion.
- **Customer Service History**: Comprehensive log of past bookings, payments, and downloadable invoices.
- **In-App Messaging & Notifications**: Contextual alerts for booking status transitions and direct provider messaging.

### 🛠️ Service Provider Features
- **Provider Dashboard**: Real-time snapshot of active bookings, completed jobs, rating averages, and earnings metrics.
- **Availability Management**: Define weekly operating hours, slot intervals, and block out personal unavailable dates.
- **Service Catalog Management**: Add, update, price, and activate/deactivate specific service offerings.
- **Booking Management Pipeline**: Inspect inbound job requests with address details; one-click `Accept`, `Start`, or `Reject`.
- **Service Completion & Payout Tracking**: Mark jobs as complete to trigger receipt generation and earnings updates.
- **Reviews & Reputation Monitoring**: Track customer feedback and rating distribution to build trust.

### 🛡️ Admin Console Features
- **Executive Analytics Dashboard**: Platform metrics for Total Revenue, Active Users, Verified Providers, Total Bookings, and Service Health.
- **User & Provider Management**: Verify credentials, toggle account statuses, suspend malicious users, and approve new providers.
- **Services & Categories Catalog**: Create, edit, and organize services across platform categories.
- **Booking & Escalation Oversight**: Live monitoring of all platform bookings with status overrides and intervention capabilities.
- **Financial & Refund Processing**: Audit transaction logs, track Razorpay payment IDs, and trigger refunds.
- **Feedback & Complaints Moderation**: Moderate reviews, address user support tickets, and resolve dispute cases.
- **Audit Logs**: Immutable activity logging for critical administrative events.

---

## 🔄 End-to-End User Flows

### 1. Complete Booking Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as React / Vite
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB
    participant Razorpay as Razorpay Gateway
    actor Provider

    Customer->>Frontend: Login via Google OAuth 2.0
    Frontend->>API: POST /api/v1/auth/google
    API-->>Frontend: Returns JWT Access Token + User Profile

    Customer->>Frontend: Browse categories & select Provider
    Frontend->>API: GET /api/v1/availability/provider/{id}
    API-->>Frontend: Available Date & Time Slots

    Customer->>Frontend: Fill Booking Wizard & Select Slot
    Customer->>Frontend: Click "Pay & Confirm"
    Frontend->>API: POST /api/v1/payments/create-order
    API->>Razorpay: Generate Order ID
    Razorpay-->>API: order_id
    API-->>Frontend: Return Razorpay Order Details

    Frontend->>Razorpay: Open Razorpay Checkout Modal
    Customer->>Razorpay: Complete Payment
    Razorpay-->>Frontend: payment_id + signature
    Frontend->>API: POST /api/v1/payments/verify
    API->>API: Verify HMAC-SHA256 Signature
    API->>DB: Create Booking (Status: PENDING) & Payment Record
    API-->>Frontend: Payment Verified & Booking Created

    Provider->>Frontend: View Inbound Bookings
    Provider->>API: PATCH /api/v1/bookings/{id}/status (ACCEPTED)
    API->>DB: Update Booking Status -> ACCEPTED
    API-->>Customer: Notification: Booking Accepted

    Provider->>API: PATCH /api/v1/bookings/{id}/status (COMPLETED)
    API->>DB: Update Booking Status -> COMPLETED
    Customer->>Frontend: Rate & Review Provider
    Frontend->>API: POST /api/v1/reviews
    API->>DB: Save Review & Recalculate Provider Rating
```

### 2. User Flow Breakdowns

#### 👤 Customer Journey
$$\text{Google Login} \longrightarrow \text{Browse Services} \longrightarrow \text{Select Provider} \longrightarrow \text{Check Availability} \longrightarrow \text{Book Slot} \longrightarrow \text{Razorpay Payment} \longrightarrow \text{Service Delivery} \longrightarrow \text{Submit Review} \longrightarrow \text{View History}$$

#### 🛠️ Provider Journey
$$\text{Provider Login} \longrightarrow \text{Manage Services} \longrightarrow \text{Set Availability Hours} \longrightarrow \text{Receive Inbound Booking} \longrightarrow \text{Accept / Reject} \longrightarrow \text{Deliver Service} \longrightarrow \text{Mark Completed} \longrightarrow \text{Track Earnings \& Reviews}$$

#### 🛡️ Admin Management Matrix
$$\text{User Governance} \longrightarrow \text{Provider Verification} \longrightarrow \text{Service Catalog} \longrightarrow \text{Live Bookings} \longrightarrow \text{Payment Audits} \longrightarrow \text{Review Moderation} \longrightarrow \text{Complaints Resolution} \longrightarrow \text{Platform Analytics}$$

---

## 🔐 Authentication & Security

NexServe enforces enterprise-grade security standards across all layers:

- **Google OAuth 2.0**: Direct client-side authentication with server-side token validation against Google's token verification endpoints.
- **JWT (JSON Web Tokens)**: Stateless authentication via `HS256` signed tokens with strict expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Role-Based Access Control (RBAC)**: Secure route protection with granular permission gates (`CUSTOMER`, `PROVIDER`, `ADMIN`).
- **Payment Signature Verification**: Cryptographic HMAC-SHA256 validation on all Razorpay callbacks to prevent tampering.
- **Environment Isolation**: Zero hardcoded secrets; 100% configuration loaded via Pydantic `BaseSettings`.
- **CORS Protection**: Explicit domain allowlists for API security.

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Modern declarative user interface with component-driven architecture |
| **Build Tool** | **Vite 8** | Ultra-fast Hot Module Replacement (HMR) and optimized bundler |
| **Styling** | **Tailwind CSS v4** | Utility-first responsive design with modern styling directives |
| **Routing** | **React Router v7** | Single Page Application (SPA) client-side routing & auth guards |
| **HTTP Client** | **Axios** | Interceptor-driven REST client with automatic JWT token attachment |
| **Backend Framework** | **FastAPI** | High-concurrency asynchronous Python web framework |
| **ASGI Server** | **Uvicorn** | High-performance ASGI web server |
| **ORM** | **SQLAlchemy 2.0** | Type-safe Python SQL toolkit and Object-Relational Mapper |
| **Database Migrations** | **Alembic** | Version-controlled schema migrations |
| **Primary Database** | **PostgreSQL 16** | Robust ACID-compliant relational data store |
| **Development DB** | **SQLite3** | Automated zero-configuration fallback for local testing |
| **Caching & Queues** | **Redis / Celery** | In-memory cache and background job processing |
| **Payment Gateway** | **Razorpay** | End-to-end checkout, webhook validation, and payment verification |
| **Authentication** | **Google OAuth + JWT** | Federated identity with OAuth 2.0 and signed JWTs |

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Layer
        A[React 19 + Vite SPA] -->|Tailwind CSS v4| B[Responsive UI Views]
        B --> C[Customer Portal]
        B --> D[Provider Dashboard]
        B --> E[Admin Management Console]
    end

    subgraph API Gateway & Security
        F[FastAPI Server :8000]
        G[CORS & Auth Middleware]
        H[JWT & Role Verification]
        A -->|REST API Calls /api/v1| F
        F --> G
        G --> H
    end

    subgraph Service Layer
        H --> I[Auth Router]
        H --> J[Services & Categories Router]
        H --> K[Bookings Router]
        H --> L[Payments Router]
        H --> M[Availability Router]
        H --> N[Admin Router]
        H --> O[Reviews & Chat Router]
    end

    subgraph Data & External Integration
        P[(PostgreSQL Database)]
        Q[(SQLite Fallback DB)]
        R[Redis Cache]
        S[Razorpay API]
        T[Google OAuth API]

        I --> T
        L --> S
        K --> P
        K --> Q
        J --> P
        M --> P
        N --> P
        O --> P
        F --> R
    end
```

---

## 📁 Project Structure

```
NexServe/
├── .gitignore                    # Comprehensive repository gitignore (Python, Node, DB, OS)
├── README.md                     # Master documentation & developer guide
│
├── backend/                      # FastAPI Backend Application
│   ├── alembic/                  # Database migration scripts & environment
│   │   ├── versions/             # Migration version files
│   │   ├── env.py                # Alembic migration runner
│   │   └── script.py.mako
│   ├── alembic.ini               # Alembic configuration
│   ├── app/                      # Main Application Package
│   │   ├── core/                 # App configuration, security & settings
│   │   │   ├── __init__.py
│   │   │   ├── config.py         # Pydantic BaseSettings & env loader
│   │   │   └── security.py       # JWT creation, decoding, password hashing
│   │   ├── database/             # Database connection & session setup
│   │   │   ├── __init__.py
│   │   │   └── database.py       # SQLAlchemy engine, SessionLocal & get_db dependency
│   │   ├── models/               # SQLAlchemy ORM Data Models
│   │   │   ├── __init__.py
│   │   │   ├── address.py        # Customer address management model
│   │   │   ├── audit_log.py      # Admin action audit trail model
│   │   │   ├── availability.py   # Provider schedule & slot model
│   │   │   ├── booking.py        # Booking lifecycle & status model
│   │   │   ├── chat.py           # In-app message model
│   │   │   ├── complaint.py      # Customer support ticket model
│   │   │   ├── contact.py        # Public contact inquiry model
│   │   │   ├── notification.py   # In-app notification model
│   │   │   ├── payment.py        # Transaction, order & payment model
│   │   │   ├── review.py         # Star rating & review model
│   │   │   ├── service.py        # Service & Category model
│   │   │   └── user.py           # User, Role, & Provider profile model
│   │   ├── routes/               # API Route Handlers (FastAPI Routers)
│   │   │   ├── __init__.py
│   │   │   ├── addresses.py      # /api/v1/addresses
│   │   │   ├── admin.py          # /api/v1/admin
│   │   │   ├── auth.py           # /api/v1/auth
│   │   │   ├── availability.py   # /api/v1/availability
│   │   │   ├── bookings.py       # /api/v1/bookings
│   │   │   ├── chat.py           # /api/v1/chat
│   │   │   ├── contact.py        # /api/v1/contact
│   │   │   ├── dependencies.py   # Shared auth dependencies & role checks
│   │   │   ├── emergency.py      # /api/v1/emergency
│   │   │   ├── health.py         # /api/v1/health
│   │   │   ├── notifications.py  # /api/v1/notifications
│   │   │   ├── payments.py       # /api/v1/payments
│   │   │   ├── providers.py      # /api/v1/providers
│   │   │   ├── reviews.py        # /api/v1/reviews
│   │   │   └── services.py       # /api/v1/services
│   │   ├── schemas/              # Pydantic Validation Schemas
│   │   ├── services/             # Business Logic & Service Layer
│   │   └── main.py               # FastAPI App entrypoint, lifespan & auto-seed
│   ├── tests/                    # Backend Pytest Test Suite
│   │   ├── conftest.py           # Pytest fixtures & mock database
│   │   ├── test_google_auth.py
│   │   ├── test_payments.py
│   │   ├── test_booking_state_machine.py
│   │   ├── test_addresses_and_matching.py
│   │   ├── test_chat_and_notifications.py
│   │   └── test_provider_onboarding.py
│   ├── .env.example              # Environment variables template for backend
│   └── requirements.txt          # Python dependencies
│
└── frontend/                     # React 19 + Vite Frontend Application
    ├── public/                   # Static assets & favicon
    ├── src/                      # Frontend Source Code
    │   ├── api/                  # Axios API modules
    │   │   ├── authApi.js
    │   │   ├── bookingsApi.js
    │   │   ├── paymentsApi.js
    │   │   └── servicesApi.js
    │   ├── assets/               # Images, SVG icons, illustrations
    │   ├── components/           # Reusable UI Components
    │   │   ├── addresses/        # Address selector & modal
    │   │   ├── booking/          # BookingWizardModal & calendar picker
    │   │   ├── chat/             # Chat widget & message bubbles
    │   │   ├── common/           # Navbar, Footer, Modal, Button, Badge
    │   │   ├── emergency/        # Emergency quick-booking banner
    │   │   ├── notifications/    # Notification bell dropdown
    │   │   └── reviews/          # Star rating selector & review list
    │   ├── context/              # React Context (AuthContext)
    │   ├── layouts/              # Main layout, Dashboard layout
    │   ├── pages/                # Application Page Views
    │   │   ├── About.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── Contact.jsx
    │   │   ├── Dashboard.jsx     # Customer Dashboard
    │   │   ├── Home.jsx          # Landing page with hero & categories
    │   │   ├── Login.jsx         # Google login page
    │   │   ├── NotFound.jsx      # 404 error page
    │   │   ├── ProviderDashboard.jsx
    │   │   ├── ProviderDetail.jsx
    │   │   ├── ServiceHistory.jsx
    │   │   ├── ServiceProviders.jsx
    │   │   └── Services.jsx
    │   ├── routes/               # AppRoutes with ProtectedRoute guards
    │   ├── utils/                # Utility helpers & Razorpay SDK loader
    │   ├── App.jsx               # Root React Component
    │   ├── index.css             # Tailwind CSS entry & global styles
    │   └── main.jsx              # DOM Mount entry point
    ├── .env.example              # Environment variables template for frontend
    ├── .gitignore                # Frontend specific gitignore
    ├── index.html                # HTML entry point with Razorpay SDK
    ├── package.json              # NPM dependencies & scripts
    └── vite.config.js            # Vite bundler configuration
```

---

## 🗄️ Database Schema & Models

NexServe utilizes a normalized relational schema with full foreign key constraints and indexed lookup paths:

| Model | Table | Key Fields | Description |
| :--- | :--- | :--- | :--- |
| `User` | `users` | `id`, `email`, `role`, `is_active`, `google_id`, `rating`, `hourly_rate` | Core user identity supporting Customers, Providers, and Admins. |
| `Category` | `categories` | `id`, `name`, `description`, `icon_url` | High-level classification for service offerings. |
| `Service` | `services` | `id`, `title`, `price`, `duration_minutes`, `category_id`, `provider_id` | Individual service catalog items offered by verified providers. |
| `Booking` | `bookings` | `id`, `customer_id`, `provider_id`, `service_id`, `status`, `scheduled_at`, `total_price` | Complete booking record with state-machine status tracking. |
| `Payment` | `payments` | `id`, `booking_id`, `razorpay_order_id`, `razorpay_payment_id`, `status`, `amount` | Financial transaction audit trail with gateway identifiers. |
| `Availability` | `availabilities` | `id`, `provider_id`, `day_of_week`, `start_time`, `end_time`, `is_active` | Slot configuration for provider working hours. |
| `Address` | `addresses` | `id`, `user_id`, `street`, `city`, `state`, `postal_code`, `is_default` | Saved user delivery addresses. |
| `Review` | `reviews` | `id`, `booking_id`, `customer_id`, `provider_id`, `rating`, `comment` | Customer feedback and star ratings with provider recalculation. |
| `Notification` | `notifications` | `id`, `user_id`, `title`, `message`, `is_read`, `created_at` | Real-time event notifications for bookings and updates. |
| `ChatMessage` | `chat_messages` | `id`, `booking_id`, `sender_id`, `receiver_id`, `message` | Direct communication thread between customer and provider. |
| `Complaint` | `complaints` | `id`, `user_id`, `booking_id`, `subject`, `status`, `resolution` | Support escalation and dispute resolution tickets. |
| `AuditLog` | `audit_logs` | `id`, `admin_id`, `action`, `target_type`, `details` | Compliance and action logging for administrative operations. |

---

## 📡 API Endpoints Overview

The FastAPI backend exposes fully documented RESTful endpoints accessible via interactive Swagger UI at `/docs`:

### 🔐 Authentication (`/api/v1/auth`)
- `POST /auth/google` — Authenticate via Google OAuth token & issue JWT.
- `POST /auth/login` — Form-based login for standard credentials.
- `GET /auth/me` — Retrieve current authenticated user profile.

### 🧹 Services & Categories (`/api/v1/services`)
- `GET /services/categories` — List all 12+ service categories.
- `GET /services` — Search & filter services by category, price, and rating.
- `GET /services/{id}` — Get detailed service specifications and provider details.
- `POST /services` — Create a new service listing *(Provider/Admin only)*.

### 📅 Bookings Lifecycle (`/api/v1/bookings`)
- `GET /bookings` — List user bookings with status and date filtering.
- `POST /bookings` — Create a new service booking.
- `GET /bookings/{id}` — Retrieve detailed booking state and breakdown.
- `PATCH /bookings/{id}/status` — Transition booking state (`ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).

### 💳 Payments & Razorpay (`/api/v1/payments`)
- `POST /payments/create-order` — Create Razorpay order with currency & amount.
- `POST /payments/verify` — Verify cryptographic signature & confirm payment.
- `POST /payments/{id}/refund` — Initiate refund for cancelled booking *(Admin only)*.

### ⏰ Availability & Scheduling (`/api/v1/availability`)
- `GET /availability/provider/{provider_id}` — Get available dates and slots for a provider.
- `POST /availability` — Set or update provider schedule hours.

### 🌟 Reviews (`/api/v1/reviews`)
- `GET /reviews/provider/{provider_id}` — List reviews for a specific provider.
- `POST /reviews` — Submit review and star rating for a completed booking.

### 🛡️ Admin Operations (`/api/v1/admin`)
- `GET /admin/analytics` — Platform-wide metrics, revenue charts, and usage statistics.
- `GET /admin/users` — Manage platform users and roles.
- `PATCH /admin/users/{id}/status` — Enable, disable, or verify user/provider accounts.
- `GET /admin/complaints` — Review and resolve customer support tickets.

---

## 🚀 Installation & Setup Guide

Follow these step-by-step instructions to clone, configure, and run NexServe on your local machine.

### Prerequisites
- **Python 3.10+** — [Download Python](https://www.python.org/downloads/)
- **Node.js 18+ & npm** — [Download Node.js](https://nodejs.org/)
- **PostgreSQL** *(Optional)* — Local instance or Docker container (NexServe automatically falls back to SQLite if PostgreSQL is not running).
- **Git** — [Download Git](https://git-scm.com/)

---

### Step 1: Backend Setup (FastAPI)

1. **Open a terminal and navigate to the `backend` directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   # Windows
   python -m venv venv

   # macOS / Linux
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables:**
   ```bash
   # Windows
   copy .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```
   *(Optional: Edit `.env` with your Google Client ID or Razorpay keys if testing live OAuth/payments; the app includes seed data and sandbox fallbacks out of the box).*

6. **Start the FastAPI server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   > 🟢 **Backend will be live at:** `http://localhost:8000`  
   > 📖 **Interactive Swagger API Docs:** `http://localhost:8000/docs`

---

### Step 2: Frontend Setup (React + Vite)

1. **Open a new terminal tab/window and navigate to the `frontend` directory:**
   ```bash
   cd frontend
   ```

2. **Configure frontend environment variables:**
   ```bash
   # Windows
   copy .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

3. **Install npm dependencies:**
   ```bash
   npm install
   ```

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   > 🔵 **Frontend will be live at:** `http://localhost:5173`

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `NexServe` | Application title displayed in API documentation |
| `APP_VERSION` | `1.0.0` | API semantic version |
| `DEBUG` | `True` | Enable debug logs and detailed error traces |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/nexserve` | PostgreSQL connection URL (falls back to SQLite if unreachable) |
| `SECRET_KEY` | *(Set a secure 32+ char key)* | Secret key used for signing JWT authentication tokens |
| `ALGORITHM` | `HS256` | JWT cryptographic signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `43200` | Token expiration duration (43200 min = 30 days) |
| `GOOGLE_CLIENT_ID` | `your-google-oauth-client-id...` | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | `your-google-oauth-client-secret` | Google OAuth 2.0 Client Secret |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis caching connection URL |
| `RAZORPAY_KEY_ID` | `your-razorpay-key-id` | Razorpay API key identifier |
| `RAZORPAY_KEY_SECRET` | `your-razorpay-key-secret` | Razorpay API secret key for HMAC verification |
| `RAZORPAY_WEBHOOK_SECRET` | `your-razorpay-webhook-secret` | Webhook secret for asynchronous event verification |
| `RAZORPAY_CURRENCY` | `INR` | Default transaction currency |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed frontend origins for CORS protection |

### Frontend (`frontend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | `your-google-client-id...` | Google OAuth Client ID for web sign-in |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Root URL for the FastAPI backend API |

---

## 🔗 Application Access URLs

| Service | Description | Access Link |
| :--- | :--- | :--- |
| **Frontend Application** | React 19 Client UI | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | FastAPI Root Endpoint | [http://localhost:8000](http://localhost:8000) |
| **Interactive API Documentation** | Swagger UI | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Alternative API Specs** | ReDoc | [http://localhost:8000/redoc](http://localhost:8000/redoc) |
| **Health Check** | API System Health | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) |

---

## 📸 Screenshots & UI Preview

<div align="center">

| Customer Marketplace & Discovery | Interactive Booking & Slot Selection |
| :---: | :---: |
| *Browse 12+ categories with instant filtering and transparent provider ratings* | *Real-time availability calendar, address selection, and Razorpay checkout* |

| Provider Management Console | Executive Admin Analytics Dashboard |
| :---: | :---: |
| *Manage inbound booking requests, availability schedules, and earnings* | *Platform overview: metrics, user management, transaction logs, and dispute resolution* |

</div>

---

## 🔮 Future Roadmap

- [ ] **Real-Time WebSockets**: Live GPS location tracking of on-duty service providers.
- [ ] **AI-Powered Matching Engine**: Smart provider recommendations based on proximity, historical ratings, and acceptance rates.
- [ ] **Multi-Currency Support**: Expand payment support for international service markets with Stripe integration.
- [ ] **Mobile Applications**: Cross-platform iOS and Android companion apps built with React Native.
- [ ] **Automated Invoice Generation**: PDF invoice delivery to customer email via Celery background workers.

---

## 👨‍💻 Author & License

**NexServe** is designed and developed by **Akhil Shah** as a showcase full-stack marketplace system.

- **GitHub**: [@akhilshah179](https://github.com/akhilshah179)
- **LinkedIn**: [Connect on LinkedIn](https://www.linkedin.com/)

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
