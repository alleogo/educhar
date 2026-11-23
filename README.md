# Educhar - E-Learning Platform

Educhar is a comprehensive, modern e-learning platform built with the MERN stack (MongoDB, Express, React, Node.js). It allows instructors to create and manage courses, and students to enroll, learn, and track their progress seamlessly.

## Features

- **Authentication & Authorization**: Secure JWT-based authentication with OTP verification.
- **Course Management**: Instructors can create, update, and manage courses, including sections and subsections (lectures).
- **Course Progress Tracking**: Students can track their learning journey and mark lectures as completed.
- **Secure Payments**: Integrated with Razorpay for secure and smooth course enrollments.
- **Media Uploads**: Integrated with Cloudinary for handling course thumbnails and video lectures.
- **Email Notifications**: Automated emails via Nodemailer for registration, OTPs, and payment confirmations.
- **Modern UI**: Built with React and Vite, featuring a responsive and intuitive user interface.

## Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Backend
- **Framework**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JSON Web Tokens (JWT), bcrypt, otp-generator
- **Payments**: Razorpay
- **Cloud Storage**: Cloudinary (express-fileupload)
- **Mailing**: Nodemailer

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Cloudinary](https://cloudinary.com/) Account
- [Razorpay](https://razorpay.com/) Account

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd educhar
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory by copying the root `.env.example` and filling in the values:
```bash
cp ../.env.example .env
```

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (the frontend dev server expects `8080`) |
| `NODE_ENV` | `production` on Vercel (secure cookies, strict CORS) |
| `FRONTEND_URL` | Frontend origin for reset-password links and CORS, e.g. `http://localhost:3000` |
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing login tokens |
| `ADMIN_SECRET` | Code required to register an Admin account |
| `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` | SMTP credentials (port 587), e.g. Gmail with an app password |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FOLDER_NAME` | Cloudinary account and upload folder |
| `RAZORPAY_KEY`, `RAZORPAY_SECRET` | Razorpay API keys (use test keys locally) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret of the Razorpay webhook pointing at `/api/v1/payment/verifysignature` |

Start the backend server:
```bash
npm run dev
```
*(Runs on http://localhost:8080)*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*(Runs on http://localhost:3000)*

## Deployment (Vercel)

The Vercel project's root directory is `frontend/`. `frontend/vercel.json` builds the Vite app, serves the Express backend as a serverless function from `frontend/api/index.js` under `/api/*`, and falls back to `index.html` for client-side routes. Set every variable above in Vercel → Settings → Environment Variables (with `NODE_ENV=production` and `FRONTEND_URL=https://educhar.vercel.app`).

## License
This project is licensed under the ISC License.
