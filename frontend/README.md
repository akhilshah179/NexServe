# NexServe — Frontend Web Application

The responsive web client for **NexServe**, built using **React 19**, **Vite**, and **Tailwind CSS v4**.

## ✨ Features
- **React 19 & React Router v7** with route protection and role-based redirects.
- **Tailwind CSS v4** for clean, responsive, and modern UI components.
- **Google OAuth 2.0 Client** integration for seamless login.
- **Razorpay Checkout SDK** integration with payment signature verification.
- **Role-specific portals**:
  - Customer Discovery & Booking Wizard
  - Service Provider Dashboard & Availability Scheduler
  - Admin Analytics & Platform Governance Console

## 🛠️ Getting Started

### 1. Configure Environment
```bash
# Copy template
copy .env.example .env     # Windows
cp .env.example .env       # macOS / Linux
```

Edit `.env` if necessary:
```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will be running at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.
