import { Router } from 'express';

import { authenticate } from '../middleware/auth';
import { AIController } from '../modules/ai/ai.controller';

const router = Router();
const controller = new AIController();

router.post('/process/:fileId', authenticate, (req, res) => controller.reprocessFile(req, res));
router.get('/search', authenticate, (req, res) => controller.semanticSearch(req, res));
router.post('/chat', authenticate, (req, res) => controller.chat(req, res));

export default router;
