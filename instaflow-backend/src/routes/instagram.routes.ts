import { Router } from 'express';
import { InstagramController } from '../controllers/instagram.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { instagramCallbackSchema, getCommentsSchema } from '../schema/instagram.schema';

const router = Router();

router.get('/connect-url', authMiddleware, InstagramController.loginUrl);
router.get('/callback', validate(instagramCallbackSchema), authMiddleware, InstagramController.callback);
router.post('/disconnect', authMiddleware, InstagramController.disconnect);
router.get('/status', authMiddleware, InstagramController.verify);
router.get('/posts', authMiddleware, InstagramController.getPosts);
router.get('/posts/:mediaId/comments', validate(getCommentsSchema), authMiddleware, InstagramController.getComments);
router.post('/subscribe-comments', authMiddleware, InstagramController.subscribeToComments);
router.get('/me', authMiddleware, InstagramController.getProfile);

export default router;
