import User from '../models/User.js';
import InstructorRequest from '../models/InstructorRequest.js';
import { generateTokens, verifyRefreshToken } from '../config/jwt.js';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, reason, experience } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create user - everyone starts as a student initially if they request instructor
    const user = new User({
      email,
      passwordHash: password,
      firstName,
      lastName,
      roles: ['student'], // Default role
    });

    await user.save();

    // If they chose instructor, create a request automatically
    if (role === 'instructor') {
      try {
        let idCard = '';
        let cv = '';
        let diploma = '';

        if (req.files) {
          if (req.files.idCard) idCard = req.files.idCard[0].filename;
          if (req.files.cv) cv = req.files.cv[0].filename;
          if (req.files.diploma) diploma = req.files.diploma[0].filename;
        }

        const instructorRequest = new InstructorRequest({
          userId: user._id,
          name: `${firstName} ${lastName}`,
          email: email,
          reason: reason || 'Requested during sign up',
          experience: experience || '',
          idCard,
          cv,
          diploma,
          status: 'pending',
        });
        await instructorRequest.save();
      } catch (reqError) {
        console.error('Failed to create automatic instructor request:', reqError);
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      message: role === 'instructor'
        ? 'Registered successfully. Your instructor request is pending approval.'
        : 'User registered successfully',
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('CRITICAL REGISTER ERROR:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error.message,
      code: error.name
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login (use findOneAndUpdate to avoid potential save/versioning conflicts on the full document)
    await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('CRITICAL LOGIN ERROR:', error);
    // Return specific error message in response to help the user identify the issue (e.g. Atlas timeout)
    res.status(500).json({
      error: 'Login failed',
      details: error.message,
      code: error.name
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken: googleAccessToken, role, reason, experience } = req.body;

    let payload;

    if (idToken) {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (googleAccessToken) {
      // Fetch user info using access token
      const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAccessToken}`);
      payload = googleResponse.data;
    } else {
      return res.status(400).json({ error: 'ID Token or Access Token required' });
    }

    const { email, given_name, family_name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        email,
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        avatar: picture,
        roles: ['student'],
        // Password is not needed for Google users, but we can set a random one 
        passwordHash: Math.random().toString(36).slice(-10),
      });
      await user.save();

      // If they chose instructor during signup
      if (role === 'instructor') {
        let idCard = '';
        let cv = '';
        let diploma = '';

        if (req.files) {
          if (req.files.idCard) idCard = req.files.idCard[0].filename;
          if (req.files.cv) cv = req.files.cv[0].filename;
          if (req.files.diploma) diploma = req.files.diploma[0].filename;
        }

        const instructorRequest = new InstructorRequest({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          reason: reason || 'Requested during Google sign up',
          experience: experience || '',
          idCard,
          cv,
          diploma,
          status: 'pending',
        });
        await instructorRequest.save();
      }
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.json({
      message: 'Google login successful',
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('GOOGLE LOGIN ERROR:', error);
    res.status(500).json({ error: 'Google login failed' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const logout = (req, res) => {
  // JWT is stateless, just clear on client side
  res.json({ message: 'Logout successful' });
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    // Generate a secure random token using Node.js crypto
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');

    // Save token and expiry (60 minutes) to user record
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Use updateOne to avoid triggering the password hash pre-save hook
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: token,
        resetPasswordExpires: user.resetPasswordExpires,
      }
    );

    res.json({
      message: 'Reset token generated successfully.',
      resetToken: token,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password must be 128 characters or less' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new reset link.' });
    }

    // Set new password (the pre-save hook will hash it)
    user.passwordHash = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
