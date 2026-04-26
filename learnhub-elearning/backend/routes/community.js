import express from 'express';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
} from '../controllers/communityController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validatePost, validateComment } from '../middleware/validate.js';

const router = express.Router();

router.get('/posts', getPosts);
router.post('/posts', authMiddleware, validatePost, createPost);
router.get('/posts/:postId', getPost);
router.put('/posts/:postId', authMiddleware, updatePost);
router.delete('/posts/:postId', authMiddleware, deletePost);
router.post('/posts/:postId/like', authMiddleware, likePost);
router.post('/posts/:postId/comments', authMiddleware, validateComment, addComment);
router.delete('/posts/:postId/comments/:commentId', authMiddleware, deleteComment);

export default router;
