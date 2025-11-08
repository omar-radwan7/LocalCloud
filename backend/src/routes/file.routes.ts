import { Router } from 'express';
import { FileController } from '../modules/files/file.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();
const fileController = new FileController();

// All file routes require authentication
router.use(authenticate);

// File operations
router.post('/upload', upload.single('file'), (req, res) => fileController.uploadFile(req, res));
router.post('/:fileId/version', upload.single('file'), (req, res) =>
  fileController.uploadVersion(req, res)
);
router.get('/', (req, res) => fileController.getFiles(req, res));
router.get('/stats', (req, res) => fileController.getStorageStats(req, res));

// Folder operations
router.post('/folders', (req, res) => fileController.createFolder(req, res));
router.get('/folders/tree', (req, res) => fileController.getFolderTree(req, res));

router.get('/recycle-bin/list', (req, res) => fileController.getRecycleBin(req, res));
router.post('/:fileId/restore', (req, res) => fileController.restoreFile(req, res));

router.get('/version/:versionId/download', (req, res) =>
  fileController.downloadVersion(req, res)
);
router.get('/:fileId/versions', (req, res) => fileController.getFileVersions(req, res));
router.get('/:fileId/download', (req, res) => fileController.downloadFile(req, res));
router.get('/:fileId', (req, res) => fileController.getFileById(req, res));
router.delete('/:fileId', (req, res) => fileController.deleteFile(req, res));

// Python service integration routes
router.get('/python-service/status', (req, res) => fileController.checkPythonService(req, res));
router.get('/:fileId/analyze', (req, res) => fileController.analyzeFile(req, res));

// Duplicate detection
router.get('/duplicates/scan', (req, res) => fileController.findDuplicates(req, res));

export default router;

