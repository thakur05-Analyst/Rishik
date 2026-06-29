# Portfolio Backend API

A production-ready Node.js + Express backend built for the portfolio website.

## Tech Stack
- Node.js, Express.js
- Nodemailer for email dispatching
- Express-Validator & Helmet for security
- Express-Rate-Limit for spam prevention
- PostgreSQL / Local JSON Database (db.js)

## Setup & Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   **Important Details:**
   - `EMAIL_USER`: Your Gmail address (e.g., thakurweirdo@gmail.com).
   - `EMAIL_PASS`: Your 16-character Google App Password. (Go to Google Account -> Security -> 2-Step Verification -> App Passwords).

3. **Start the Server**
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/contact`: Submits the contact form. Validates input, saves to DB, and sends parallel emails.
- `GET /api/health`: Healthcheck endpoint.
- `GET /api/status`: System status endpoint.

## Vercel Deployment

This repository is pre-configured for Vercel. 
1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Add the Environment Variables (`EMAIL_USER`, `EMAIL_PASS`, etc.) in the Vercel Dashboard under **Settings > Environment Variables**.
4. Deploy! The `vercel.json` configures everything automatically.
