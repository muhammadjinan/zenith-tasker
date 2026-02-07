# Zenith Tasker

A modern, full-stack productivity application for managing tasks and notes with a beautiful, responsive UI.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## ✨ Features

- 📝 **Page Management** - Create, edit, and organize pages with drag-and-drop reordering
- ✅ **Task Tracking** - Manage tasks with status updates and controls
- 🔐 **Authentication** - Secure login with email/password and Google OAuth
- 📧 **Password Reset** - Email-based password recovery via SMTP
- 📤 **Export Options** - Export pages to PDF and DOCX formats
- 🎨 **Modern UI** - Glassmorphism design with smooth animations
- 🐳 **Docker Ready** - Easy deployment with Docker Compose

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT, Google OAuth 2.0 |
| Containerization | Docker, Docker Compose |

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js](https://nodejs.org/) (for local development)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/muhammadjinan/zenith-tasker.git
   cd zenith-tasker
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example .env
   ```
   Edit `.env` and fill in your values (see [Configuration](#configuration) below).

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=productivity_db
DATABASE_URL=postgres://your_db_user:your_secure_password@db:5432/productivity_db

# Backend Secrets
JWT_SECRET=your_super_secret_jwt_key

# SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com

# Frontend
FRONTEND_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note:** For Gmail SMTP, you'll need to [generate an App Password](https://support.google.com/accounts/answer/185833).

## 📁 Project Structure

```
zenith-tasker/
├── backend/
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth middleware
│   │   └── index.js      # Entry point
│   ├── uploads/          # File uploads
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # Auth context
│   │   ├── pages/        # Page components
│   │   └── App.jsx       # Main app
│   └── Dockerfile
├── db_data/        # Auto-generated, git-ignored
├── docker-compose.yml
└── .env
```

> **Note:** The `db_data/` folder is automatically created when you start the database. It contains PostgreSQL data files and is excluded from version control.

## 🧪 Development

### Running Locally (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ by [Muhammad Jinan](https://github.com/muhammadjinan)
