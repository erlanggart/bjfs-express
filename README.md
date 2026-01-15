# Bogor Junior FS - Backend API

Express.js REST API for Bogor Junior Football School Management System.

## Features

- **Authentication**: JWT-based authentication system
- **Member Management**: CRUD operations for members
- **Attendance System**: Track member attendance with QR code scanning
- **Schedule Management**: Manage training schedules
- **Branch Management**: Multi-branch support
- **Analytics**: Google Analytics 4 integration
- **File Uploads**: Handle avatars, documents, and images

## Tech Stack

- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Analytics**: Google Analytics Data API

## Prerequisites

- Node.js >= 18.x
- MySQL >= 8.0
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bogorjunior-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Setup Google Analytics credentials:
- Place your service account JSON file in `config/google/`
- Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member by ID
- `POST /api/members` - Create new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/stats` - Get attendance statistics

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get branch by ID
- `POST /api/branches` - Create new branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch

### Schedules
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Analytics
- `GET /api/analytics/realtime` - Get realtime visitor data
- `GET /api/analytics/historical` - Get historical analytics

## Project Structure

```
bogorjunior-backend/
├── src/
│   ├── server.js           # Entry point
│   ├── config/
│   │   ├── database.js     # Database configuration
│   │   └── ga4.js          # Google Analytics config
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication middleware
│   │   ├── upload.js       # File upload middleware
│   │   └── errorHandler.js # Global error handler
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── members.js      # Member routes
│   │   ├── attendance.js   # Attendance routes
│   │   ├── branches.js     # Branch routes
│   │   ├── schedules.js    # Schedule routes
│   │   └── analytics.js    # Analytics routes
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── memberController.js
│   │   ├── attendanceController.js
│   │   ├── branchController.js
│   │   ├── scheduleController.js
│   │   └── analyticsController.js
│   └── utils/
│       ├── jwt.js          # JWT utilities
│       └── validation.js   # Input validation
├── uploads/                # File uploads directory
├── config/
│   └── google/            # Google service account credentials
├── .env.example           # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Database Migration

The database structure remains compatible with the existing MySQL database. No migration is needed for existing data.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.

## License

Proprietary
