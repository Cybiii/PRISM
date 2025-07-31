import { Router, Request, Response } from 'express';
import { userService } from '../services/UserService';
import { logger } from '../utils/logger';

const router = Router();

// User Registration
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, age, gender, medicalConditions, medications } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const userSession = await userService.signUp({
      email,
      password,
      fullName,
      age,
      gender,
      medicalConditions,
      medications
    });

    logger.info(`New user registered: ${email}`);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: userSession.user.id,
          email: userSession.user.email,
          emailConfirmed: userSession.user.email_confirmed_at ? true : false
        },
        profile: userSession.profile,
        accessToken: userSession.accessToken,
        refreshToken: userSession.refreshToken
      }
    });

  } catch (error: any) {
    logger.error('Signup error:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// User Sign In
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const userSession = await userService.signIn(email, password);

    logger.info(`User signed in: ${email}`);

    return res.json({
      success: true,
      data: {
        user: {
          id: userSession.user.id,
          email: userSession.user.email,
          emailConfirmed: userSession.user.email_confirmed_at ? true : false
        },
        profile: userSession.profile,
        accessToken: userSession.accessToken,
        refreshToken: userSession.refreshToken
      }
    });

  } catch (error: any) {
    logger.error('Signin error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
});

// Sign Out
router.post('/signout', async (req: Request, res: Response) => {
  try {
    await userService.signOut();
    
    return res.json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error: any) {
    logger.error('Signout error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Sign out failed'
    });
  }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const newSession = await userService.refreshSession(refreshToken);

    return res.json({
      success: true,
      data: {
        user: {
          id: newSession.user.id,
          email: newSession.user.email,
          emailConfirmed: newSession.user.email_confirmed_at ? true : false
        },
        profile: newSession.profile,
        access_token: newSession.accessToken,
        refresh_token: newSession.refreshToken
      }
    });

  } catch (error: any) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

// Get Current User
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer token

    // Try real Supabase authentication first
    if (token) {
      try {
        logger.info('🔍 Attempting real Supabase authentication for /auth/me');
        const currentUser = await userService.getCurrentUser(token);

        if (currentUser) {
          logger.info('✅ Real Supabase user authenticated:', currentUser.user.email);
          return res.json({
            success: true,
            data: {
              user: {
                id: currentUser.user.id,
                email: currentUser.user.email,
                emailConfirmed: currentUser.user.email_confirmed_at ? true : false
              },
              profile: currentUser.profile
            }
          });
        }
      } catch (error) {
        logger.warn('❌ Real authentication failed:', error);
      }
    }

    // No mock user fallback - require real authentication
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }

    // Invalid or expired token
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });

  } catch (error: any) {
    logger.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user information'
    });
  }
});

// Update Profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // Try real Supabase authentication first
    if (token) {
      try {
        logger.info('🔍 Attempting real Supabase authentication for profile update');
        const currentUser = await userService.getCurrentUser(token);
        
        if (currentUser) {
          logger.info('✅ Real user authenticated for profile update:', currentUser.user.email);
          const updates = req.body;
          const updatedProfile = await userService.updateProfile(currentUser.user.id, updates);

          return res.json({
            success: true,
            data: updatedProfile
          });
        }
      } catch (error) {
        logger.warn('❌ Real authentication failed for profile update:', error);
      }
    }

    // Development fallback only if real auth failed
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info('🔄 Falling back to mock profile update');
      const { full_name, age, gender, medical_conditions, medications } = req.body;
      return res.json({
        success: true,
        data: {
          user: {
            id: 'demo-user-123',
            email: 'demo@puma-health.com',
            emailConfirmed: true
          },
          profile: {
            id: 'demo-profile-123',
            full_name: full_name || 'Demo User',
            age: age || 25,
            gender: gender || 'prefer_not_to_say',
            medical_conditions: medical_conditions || [],
            medications: medications || []
          }
        }
      });
    }

    // Production: No token provided
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }

    // Production: Authentication failed
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });

  } catch (error: any) {
    logger.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Profile update failed'
    });
  }
});

// Password Reset Request
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    await userService.resetPassword(email);

    return res.json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error: any) {
    logger.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Password reset failed'
    });
  }
});

export default router; 