# LocalCloud Architecture & Technical Guide

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  Next.js 16 + React + TypeScript + TailwindCSS             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │Dashboard │  │  Files   │  │  Profile │   │
│  │ Register │  │  Upload  │  │ Versions │  │ Settings │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│              Axios + JWT Interceptors                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
                       │ JSON + multipart/form-data
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     Backend API                             │
│           Express.js + TypeScript + Node.js                 │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  Auth Routes     │          │  File Routes     │        │
│  │  /api/auth/*     │          │  /api/files/*    │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
│           │                              │                  │
│  ┌────────▼─────────┐          ┌────────▼─────────┐        │
│  │ Auth Controller  │          │ File Controller  │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
│           │                              │                  │
│  ┌────────▼─────────┐          ┌────────▼─────────┐        │
│  │  Auth Service    │          │  File Service    │        │
│  │  - JWT tokens    │          │  - Upload        │        │
│  │  - bcrypt hash   │          │  - Versioning    │        │
│  │  - validation    │          │  - Soft delete   │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
│           │                              │                  │
│  ┌────────▼──────────────────────────────▼─────────┐       │
│  │         Prisma ORM (Type-safe DB client)        │       │
│  └────────┬──────────────────────────────┬─────────┘       │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
┌───────────▼──────────────────────────────▼──────────────────┐
│                   Data Layer                                │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  SQLite Database │          │  File System     │        │
│  │  - Users         │          │  /uploads/       │        │
│  │  - Files         │          │    /{userId}/    │        │
│  │  - Versions      │          │    /versions/    │        │
│  └──────────────────┘          └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## JWT Authentication Flow (Detailed)

### Registration Flow

```
Frontend                      Backend                     Database
    │                            │                            │
    │ POST /api/auth/register    │                            │
    │──────────────────────────▶ │                            │
    │ { email, password, name }  │                            │
    │                            │                            │
    │                            │ 1. Validate input          │
    │                            │    (email format, pwd len) │
    │                            │                            │
    │                            │ 2. Check user exists       │
    │                            │───────────────────────────▶│
    │                            │◀───────────────────────────│
    │                            │    (query by email)        │
    │                            │                            │
    │                            │ 3. Hash password (bcrypt)  │
    │                            │    salt rounds = 10        │
    │                            │                            │
    │                            │ 4. Create user record      │
    │                            │───────────────────────────▶│
    │                            │◀───────────────────────────│
    │                            │    (new user object)       │
    │                            │                            │
    │                            │ 5. Generate JWT            │
    │                            │    payload: {userId, email}│
    │                            │    secret: JWT_SECRET      │
    │                            │    expiry: 7d              │
    │                            │                            │
    │◀──────────────────────────│                            │
    │ { token, user }            │                            │
    │                            │                            │
    │ 6. Store in localStorage   │                            │
    │    - token                 │                            │
    │    - user (JSON)           │                            │
    │                            │                            │
    │ 7. Redirect to /dashboard  │                            │
    │                            │                            │
```

### Protected Request Flow

```
Frontend                      Backend Middleware          Service
    │                            │                            │
    │ GET /api/files             │                            │
    │ Header: Authorization:     │                            │
    │         Bearer <token>     │                            │
    │──────────────────────────▶ │                            │
    │                            │                            │
    │                            │ 1. Extract header          │
    │                            │    check "Bearer " prefix  │
    │                            │                            │
    │                            │ 2. Verify JWT              │
    │                            │    jwt.verify(token,       │
    │                            │      JWT_SECRET)           │
    │                            │                            │
    │                            │ 3. Extract payload         │
    │                            │    { userId, email }       │
    │                            │                            │
    │                            │ 4. Attach to request       │
    │                            │    req.userId = userId     │
    │                            │                            │
    │                            │ 5. Call next()             │
    │                            │───────────────────────────▶│
    │                            │                            │
    │                            │    6. Execute controller   │
    │                            │       use req.userId       │
    │                            │                            │
    │◀───────────────────────────┼────────────────────────────│
    │ { success: true, data }    │                            │
    │                            │                            │
```

### Token Expiry Handling

```
Frontend                      Backend                     Frontend
    │                            │                            │
    │ API Request with token     │                            │
    │──────────────────────────▶ │                            │
    │                            │                            │
    │                            │ Token expired              │
    │                            │ jwt.verify() throws        │
    │                            │ TokenExpiredError          │
    │                            │                            │
    │◀──────────────────────────│                            │
    │ 401 Unauthorized           │                            │
    │ { message: "Token expired" }│                           │
    │                            │                            │
    │ Axios Interceptor catches  │                            │
    │ 401 error                  │                            │
    │                            │                            │
    │ Clear localStorage         │                            │
    │ - remove token             │                            │
    │ - remove user              │                            │
    │                            │                            │
    │ Redirect to /login         │                            │
    │────────────────────────────────────────────────────────▶│
    │                            │                         Login Page
```

---

## File Upload & Versioning Flow

### Initial File Upload

```
Frontend                    Backend                   File System         Database
    │                          │                          │                  │
    │ User drops file          │                          │                  │
    │ into upload zone         │                          │                  │
    │                          │                          │                  │
    │ FormData created         │                          │                  │
    │ formData.append('file',  │                          │                  │
    │   fileObject)            │                          │                  │
    │                          │                          │                  │
    │ POST /api/files/upload   │                          │                  │
    │ Content-Type:            │                          │                  │
    │   multipart/form-data    │                          │                  │
    │──────────────────────────▶│                          │                  │
    │                          │                          │                  │
    │                          │ 1. Auth middleware       │                  │
    │                          │    extracts userId       │                  │
    │                          │                          │                  │
    │                          │ 2. Multer middleware     │                  │
    │                          │    processes upload      │                  │
    │                          │    creates user dir      │                  │
    │                          │    /uploads/{userId}/    │                  │
    │                          │                          │                  │
    │                          │ 3. Generate filename     │                  │
    │                          │    timestamp-random.ext  │                  │
    │                          │                          │                  │
    │                          │ 4. Save to disk          │                  │
    │                          │────────────────────────▶ │                  │
    │                          │                    File written             │
    │                          │                          │                  │
    │                          │ 5. Create metadata       │                  │
    │                          │────────────────────────────────────────────▶│
    │                          │    {                     │         File record
    │                          │      userId,             │         created
    │                          │      name,               │                  │
    │                          │      originalName,       │                  │
    │                          │      path,               │                  │
    │                          │      size,               │                  │
    │                          │      mimeType            │                  │
    │                          │    }                     │                  │
    │                          │                          │                  │
    │◀──────────────────────────│                          │                  │
    │ { success: true,         │                          │                  │
    │   file: {...} }          │                          │                  │
    │                          │                          │                  │
    │ Update UI                │                          │                  │
    │ Refresh file list        │                          │                  │
    │                          │                          │                  │
```

### File Version Upload

```
User                      Frontend                Backend                File System/DB
  │                          │                        │                       │
  │ Click "Upload Version"   │                        │                       │
  │─────────────────────────▶│                        │                       │
  │                          │                        │                       │
  │ Select new file          │                        │                       │
  │─────────────────────────▶│                        │                       │
  │                          │                        │                       │
  │                          │ POST /api/files/       │                       │
  │                          │   {fileId}/version     │                       │
  │                          │────────────────────────▶│                       │
  │                          │                        │                       │
  │                          │                        │ 1. Fetch existing file│
  │                          │                        │   with versions       │
  │                          │                        │──────────────────────▶│
  │                          │                        │◀──────────────────────│
  │                          │                        │   { file, versions[] }│
  │                          │                        │                       │
  │                          │                        │ 2. Create version dir │
  │                          │                        │   /uploads/{userId}/  │
  │                          │                        │     /versions/        │
  │                          │                        │──────────────────────▶│
  │                          │                        │                       │
  │                          │                        │ 3. Save old file to   │
  │                          │                        │    version path       │
  │                          │                        │──────────────────────▶│
  │                          │                        │                       │
  │                          │                        │ 4. Create version     │
  │                          │                        │    record in DB       │
  │                          │                        │──────────────────────▶│
  │                          │                        │    {                  │
  │                          │                        │      fileId,          │
  │                          │                        │      path,            │
  │                          │                        │      size,            │
  │                          │                        │      version: N+1     │
  │                          │                        │    }                  │
  │                          │                        │                       │
  │                          │                        │ 5. Update main file   │
  │                          │                        │    with new path/size │
  │                          │                        │──────────────────────▶│
  │                          │                        │                       │
  │                          │◀────────────────────────│                       │
  │                          │ { file, version }      │                       │
  │                          │                        │                       │
  │◀─────────────────────────│                        │                       │
  │ Version created          │                        │                       │
  │ View updated list        │                        │                       │
  │                          │                        │                       │
```

---

## Soft Delete & Restore Mechanism

### Soft Delete Flow

```
User clicks "Delete"
        │
        ▼
    Confirm dialog
        │
        ▼
DELETE /api/files/{fileId}
        │
        ▼
┌───────────────────────┐
│ File Service          │
│                       │
│ 1. Find file by ID    │
│    and userId         │
│                       │
│ 2. Update record:     │
│    isDeleted = true   │
│    deletedAt = now()  │
│                       │
│ 3. File stays on disk │
│    (no physical del)  │
│                       │
│ 4. Return updated     │
│    file object        │
└───────────────────────┘
        │
        ▼
File hidden from main list
(still in database & disk)
        │
        ▼
Visible in Recycle Bin
```

### Restore Flow

```
User clicks "Restore"
        │
        ▼
POST /api/files/{fileId}/restore
        │
        ▼
┌───────────────────────┐
│ File Service          │
│                       │
│ 1. Find file where:   │
│    id = fileId        │
│    userId = current   │
│    isDeleted = true   │
│                       │
│ 2. Update record:     │
│    isDeleted = false  │
│    deletedAt = null   │
│                       │
│ 3. Return file object │
└───────────────────────┘
        │
        ▼
File reappears in main list
        │
        ▼
Removed from Recycle Bin
```

### Permanent Delete Flow

```
User clicks "Delete Forever"
        │
        ▼
    Confirm dialog
    (serious warning)
        │
        ▼
DELETE /api/files/{fileId}?permanent=true
        │
        ▼
┌───────────────────────┐
│ File Service          │
│                       │
│ 1. Find file + vers   │
│                       │
│ 2. Delete from disk:  │
│    - Main file        │
│    - All versions     │
│    fs.unlinkSync()    │
│                       │
│ 3. Delete from DB:    │
│    - File record      │
│    - Version records  │
│    (CASCADE)          │
└───────────────────────┘
        │
        ▼
File completely removed
(unrecoverable)
```

---

## Database Relationships

```
User (1) ────────────▶ (N) File
  │                         │
  └─ id (PK)                ├─ id (PK)
     email (unique)         ├─ userId (FK) ──┐
     password (hashed)      ├─ name           │
     name                   ├─ originalName   │
     createdAt              ├─ path           │
                            ├─ size           │
                            ├─ mimeType       │
                            ├─ isDeleted      │
                            ├─ deletedAt      │
                            ├─ createdAt      │
                            └─ updatedAt      │
                                   │          │
                                   │          │
                                   │ (1)      │
                                   │          │
                                   ▼          │
                            FileVersion (N)   │
                                   │          │
                                   ├─ id (PK) │
                                   ├─ fileId (FK)
                                   ├─ path    │
                                   ├─ size    │
                                   ├─ version │
                                   └─ createdAt
                                              │
                                              │
                                    Cascade delete
                                    on parent delete
```

---

## Security Measures

### Password Security

1. **Hashing**: bcrypt with salt rounds = 10
2. **No plain text**: Passwords never stored or logged
3. **Validation**: Min 6 characters (configurable)

### Token Security

1. **Secret**: Stored in environment variable
2. **Expiry**: 7 days default
3. **Signature**: HS256 algorithm
4. **Transmission**: Authorization header only

### File Security

1. **Isolation**: Files separated by user ID
2. **Authorization**: Every request validates userId
3. **Path sanitization**: Multer handles safe filenames
4. **Size limits**: 100MB max (configurable)

### API Security

1. **CORS**: Configured for frontend origin
2. **Validation**: Input validated before processing
3. **Error handling**: No sensitive info in errors
4. **Rate limiting**: Can be added via middleware

---

## Performance Considerations

### Database

- **Indexes**: Created on userId, isDeleted
- **Cascading**: Deletes propagate automatically
- **Connection pooling**: Prisma handles internally

### File System

- **Directory structure**: Prevents large folder issues
- **Lazy loading**: Files loaded on demand
- **Streaming**: Large downloads use streams

### Frontend

- **Code splitting**: Next.js automatic
- **Image optimization**: Can add next/image
- **Lazy loading**: Components loaded as needed

---

## Error Handling Strategy

### Backend

```typescript
try {
  // Operation
} catch (error) {
  // Log internally
  console.error(error);
  
  // Return user-friendly message
  return errorResponse(res, 'Operation failed', 400);
}
```

### Frontend

```typescript
try {
  await api.post('/endpoint', data);
} catch (error: any) {
  // Extract backend message
  const message = error.response?.data?.message || 'Request failed';
  
  // Show to user
  setError(message);
  
  // Or use toast notification
}
```

---

## Scalability Path

### Current Limitations

- SQLite: Single-writer, file-based
- File storage: Local disk only
- No caching layer
- Single process

### Migration Path

1. **Database**: SQLite → PostgreSQL/MySQL
   - Change DATABASE_URL in .env
   - Run new migrations
   
2. **Storage**: Local → S3/MinIO
   - Replace fs operations with SDK
   - Update file paths to URLs

3. **Caching**: Add Redis
   - Cache user sessions
   - Cache file metadata
   
4. **Load Balancing**: Add reverse proxy
   - Nginx/Traefik
   - Multiple backend instances

---

## Testing Strategy

### Backend Tests (to implement)

```typescript
// Unit tests
describe('AuthService', () => {
  test('should hash password', async () => {
    // Test bcrypt hashing
  });
});

// Integration tests
describe('POST /api/files/upload', () => {
  test('should upload file with valid token', async () => {
    // Test full upload flow
  });
});
```

### Frontend Tests (to implement)

```typescript
// Component tests
describe('FileUpload', () => {
  test('should show upload progress', () => {
    // Test drag-and-drop
  });
});

// E2E tests (Playwright/Cypress)
test('user can upload and download file', async () => {
  // Full user flow
});
```

---

## Monitoring & Logging

### Current Logging

- Console logs in development
- Prisma query logs (dev mode)
- Request/response logs

### Production Recommendations

1. **Structured logging**: Winston/Pino
2. **Log aggregation**: ELK stack
3. **Error tracking**: Sentry
4. **Performance monitoring**: New Relic
5. **Uptime monitoring**: UptimeRobot

---

## Backup Strategy

### Database

```bash
# SQLite backup
cp backend/dev.db backup/dev.db.$(date +%Y%m%d)

# Or use Prisma
npx prisma db push --force-reset
```

### Files

```bash
# Full backup
tar -czf backup-files.tar.gz backend/uploads/

# Incremental with rsync
rsync -av backend/uploads/ backup/uploads/
```

---

## Environment Variables Reference

### Backend (.env)

```bash
PORT=5000                    # Server port
NODE_ENV=development         # Environment
JWT_SECRET=secret-key        # JWT signing key
JWT_EXPIRES_IN=7d           # Token expiry
DATABASE_URL=file:./dev.db  # SQLite connection
UPLOAD_DIR=./uploads        # File storage path
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api  # Backend API URL
```

---

This architecture is designed for local development and learning. For production deployment, additional security, monitoring, and scaling considerations are needed.

