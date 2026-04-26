import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
