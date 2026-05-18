import express from 'express';
import {
  register,
  login,
  googleLogin,
  logout,
  refreshToken,
  getCurrentUser,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';
import { uploadDocuments } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', uploadDocuments, validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google-login', uploadDocuments, googleLogin);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
