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
Duplicate file detection with content hashing
AI-powered file summarization and tagging
Semantic search to find files by meaning, not just name
Chat with your files using natural language questions
Optional Python microservice for advanced file analysis and AI features

Tech Stack

Backend: Node.js, Express, TypeScript, Prisma ORM, SQLite, JWT, bcrypt
Frontend: Next.js 16, React, TypeScript, TailwindCSS, Axios
AI Service: Python, FastAPI, sentence-transformers, ChromaDB, transformers, OpenAI API (optional)
File Processing: Pillow, PyPDF2, python-docx, chardet, imagehash

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

Python AI Service Setup (Optional but Recommended)

The Python service provides AI-powered features including automatic file summarization, keyword tagging, semantic search, and chat capabilities. It also handles image analysis, document text extraction, and thumbnail generation. The main application works without it, but AI features will be disabled.

Navigate to the python-service folder:

```bash
cd python-service
```

Create a `.env` file for AI configuration (required for OpenAI):

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector database path
VECTOR_DB_PATH=./data/vectors

# Only needed if you decide to run local models later
# MODEL_PROVIDER=local
# LOCAL_SUMMARIZATION_MODEL=sshleifer/distilbart-cnn-12-6
# LOCAL_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

Install Python dependencies inside a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Start the Python service:

```bash
python main.py
```

The Python service will start on http://localhost:8000

Note: When using OpenAI (recommended), the install is lightweight. Running fully local models requires additional packages and downloads several gigabytes the first time.

Using the Application

Open your web browser and go to http://localhost:3000
Create a new account by clicking Sign up
Log in with your credentials
Start uploading files by dragging them into the upload area
Files are automatically analyzed for AI summaries and tags (if Python service is running)
Click on any file to see its version history, summary, and tags
Use the search bar for semantic search to find files by meaning
Click "Chat With Files" to ask natural language questions about your documents
Deleted files go to the Recycle Bin where you can restore them
Click "Check Duplicates" on the dashboard to find files with identical content
Use folders to organize your files into a hierarchical structure
Click "Refresh AI Summary" on any file to regenerate its summary and tags

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
GET /api/files/duplicates/scan - Find duplicate files by content hash

Folders (all require authentication):
POST /api/files/folders - Create a new folder
GET /api/files/folders/tree - Get folder hierarchy

AI Features (all require authentication and Python service):
POST /api/ai/process/:fileId - Regenerate AI summary and tags for a file
GET /api/ai/search?q=query - Semantic search across files by meaning
POST /api/ai/chat - Chat with your files (body: { "question": "...", "top_k": 4 })

Python Service (optional, requires service running):
GET /api/files/python-service/status - Check if Python service is available
GET /api/files/:fileId/analyze - Analyze file with Python service

Troubleshooting

If the backend port is already in use, you can change it by editing the PORT value in backend/.env

If you encounter database errors, try deleting the dev.db file in the backend folder and running the migration command again.

Make sure both the backend and frontend servers are running at the same time for the application to work properly.

Database Structure

The system uses four main tables:

Users: Stores account information, hashed passwords, and per-user storage limits
Files: Stores file metadata, binary content, SHA-256 content hash, AI-generated summaries, tags, and vector embeddings
FileVersions: Keeps track of every previous revision and its binary payload
Folders: Stores hierarchical folder structure for organizing files

AI Features

The system includes intelligent file analysis powered by machine learning:

Automatic Summarization: When you upload text documents or PDFs, the system extracts text and generates a 2-3 sentence summary
Keyword Tagging: Automatically identifies 3-5 relevant keywords from your document content
Semantic Search: Find files by meaning, not just filename. Search for "quarterly metrics" and find files about "Q4 performance stats"
Vector Embeddings: Each file's content is converted to a mathematical representation stored in ChromaDB for fast similarity matching
Chat Interface: Ask questions like "What were the action items from last week's meeting?" and get answers with source file references
Local or Cloud AI: Choose between free local models or OpenAI API for higher quality results

Duplicate Detection

The system automatically calculates a SHA-256 hash of every uploaded file. This allows you to find exact duplicates even if they have different names or are in different folders. Click the Check Duplicates button on the dashboard to scan your files and see groups of identical content. You can select and delete duplicates to free up storage space.

Python Service Features

When the optional Python service is running, you get access to advanced file processing:

Image Analysis: Generate thumbnails, extract EXIF data, detect image dimensions
Document Processing: Extract text from PDFs and Word documents for content search
Perceptual Hashing: Find similar images even if they have been resized or slightly modified
File Classification: Intelligent MIME type detection and metadata extraction

Future Enhancements

You could extend this project by adding file previews for images and PDFs, file sharing between users, real-time synchronization, encryption for stored files, or a command-line tool for automated syncing. The current version provides a solid foundation that you can build upon based on your needs.
# LocalCloud
