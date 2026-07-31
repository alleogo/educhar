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

Create a `.env` file in the `backend` directory (refer to `.env.example` if available):
```env
PORT=4000
MONGODB_URL=your_mongodb_url
JWT_SECRET=your_jwt_secret
FOLDER_NAME=your_cloudinary_folder

# Cloudinary
CLOUD_NAME=your_cloud_name
API_KEY=your_api_key
API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret

# Nodemailer
MAIL_HOST=smtp.gmail.com
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

Start the backend server:
```bash
npm run dev
```
*(Runs on http://localhost:4000)*

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
*(Runs on http://localhost:5173 by default)*

## License
This project is licensed under the ISC License.
