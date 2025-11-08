LocalCloud - Local Cloud Storage Emulator

A fullstack application that works like Dropbox but runs entirely on your local machine. Upload files, manage versions, use a recycle bin, and organize everything with a clean web interface.

Project Idea

This is a complete cloud storage system that you can run locally without any external services. It includes user authentication, file uploads with drag-and-drop, automatic versioning when you update files, a recycle bin for deleted items, and a modern React interface. All your files are persisted directly in the local SQLite database (no loose files on disk) so the project stays self-contained and portable.

Features

User authentication with secure password hashing
Upload and download files with progress tracking
Drag-and-drop file uploads
Create nested folders to organise files
Automatic file versioning when you replace files
Recycle bin with restore and permanent delete options
Search through your files
Storage usage visualization with configurable quotas
View and download previous versions of any file
User profile management

Tech Stack

Backend: Node.js, Express, TypeScript, Prisma ORM, SQLite, JWT, bcrypt
Frontend: Next.js 16, React, TypeScript, TailwindCSS, Axios

How to Run

Prerequisites: You need Node.js 18 or newer installed on your computer.

Set the maximum upload size inside `backend/.env` if you need a higher limit (default is 2048 MB):

```
MAX_FILE_SIZE_MB=2048
```

Define the per-user storage quota that should be tracked in the database (default is 5120 MB / 5 GB):

```
DEFAULT_STORAGE_LIMIT_MB=5120
```

Backend Setup

Open your terminal and navigate to the backend folder:

```bash
cd backend
```

Install the required packages:

```bash
npm install
```

Set up the database:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the backend server:

```bash
npm run dev
```

The backend will start on http://localhost:5000


Frontend Setup

Open a new terminal window and navigate to the frontend folder:

```bash
cd frontend
```

Install the required packages:

```bash
npm install
```

Start the frontend server:

```bash
npm run dev
```

The frontend will start on http://localhost:3000

Using the Application

Open your web browser and go to http://localhost:3000
Create a new account by clicking Sign up
Log in with your credentials
Start uploading files by dragging them into the upload area
Click on any file to see its version history
Deleted files go to the Recycle Bin where you can restore them

File Storage

Every uploaded file (and all historic versions) is stored as binary data in the SQLite database. When you clone this repository you only pull the code; your personal data remains inside your own generated `dev.db` file and is never committed to Git.

Authentication

The system uses JSON Web Tokens for secure authentication. When you log in, you receive a token that is stored in your browser and sent with every request. Passwords are hashed using bcrypt before being stored in the database. Tokens expire after 7 days by default.

API Endpoints

Authentication:
POST /api/auth/register - Create new account
POST /api/auth/login - Log in
GET /api/auth/profile - Get your profile (requires authentication)
PUT /api/auth/profile - Update your profile (requires authentication)

Files (all require authentication):
POST /api/files/upload - Upload a new file
GET /api/files - Get all your files
GET /api/files/:fileId - Get file details with versions
GET /api/files/:fileId/download - Download a file
DELETE /api/files/:fileId - Delete a file (soft delete)
DELETE /api/files/:fileId?permanent=true - Permanently delete
POST /api/files/:fileId/restore - Restore from recycle bin
POST /api/files/:fileId/version - Upload a new version
GET /api/files/:fileId/versions - Get version history
GET /api/files/version/:versionId/download - Download specific version
GET /api/files/recycle-bin/list - Get deleted files
GET /api/files/stats - Get storage statistics

Troubleshooting

If the backend port is already in use, you can change it by editing the PORT value in backend/.env

If you encounter database errors, try deleting the dev.db file in the backend folder and running the migration command again.

Make sure both the backend and frontend servers are running at the same time for the application to work properly.

Database Structure

The system uses three main tables:

Users: Stores account information, hashed passwords, and per-user storage limits
Files: Stores file metadata along with the binary content for the latest version
FileVersions: Keeps track of every previous revision and its binary payload

Future Enhancements

You could extend this project by adding file previews for images and PDFs, folder organization, file sharing between users, real-time synchronization, encryption for stored files, or a command-line tool for automated syncing. The current version provides a solid foundation that you can build upon based on your needs.

# LocalCloud
# LocalCloud
