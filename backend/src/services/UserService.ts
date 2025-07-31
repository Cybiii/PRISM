import { User } from '@supabase/supabase-js';
import { supabaseService, UserProfile } from './SupabaseService';
import { logger } from '../utils/logger';

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  medicalConditions?: string[];
  medications?: string[];
}

export interface UserSession {
  user: User;
  profile: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export class UserService {
  
  // Authentication
  async signUp(userData: CreateUserRequest): Promise<UserSession> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseService['supabase'].auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName
          }
        }
      });

      if (authError || !authData.user) {
        logger.error('Error creating user:', authError);
        throw authError || new Error('Failed to create user');
      }

      // Create user profile
      const profile = await supabaseService.createUserProfile(authData.user, {
        full_name: userData.fullName,
        age: userData.age,
        gender: userData.gender,
        medical_conditions: userData.medicalConditions,
        medications: userData.medications
      });

      logger.info(`New user registered: ${userData.email}`);

      return {
        user: authData.user,
        profile,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || ''
      };

    } catch (error) {
      logger.error('Error in user signup:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    try {
      const { data: authData, error: authError } = await supabaseService['supabase'].auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        logger.error('Error signing in user:', authError);
        throw authError || new Error('Invalid credentials');
      }

      // Get user profile
      const profile = await supabaseService.getUserProfile(authData.user.id);
      if (!profile) {
        throw new Error('User profile not found');
      }

      logger.info(`User signed in: ${email}`);
      logger.info('🔍 Session data:', {
        hasSession: !!authData.session,
        hasAccessToken: !!authData.session?.access_token,
        hasRefreshToken: !!authData.session?.refresh_token,
        accessTokenLength: authData.session?.access_token?.length || 0,
        refreshTokenLength: authData.session?.refresh_token?.length || 0
      });

      if (!authData.session) {
        logger.error('❌ No session data returned from Supabase signIn');
        throw new Error('Authentication succeeded but no session tokens were returned');
      }

      if (!authData.session.access_token || !authData.session.refresh_token) {
        logger.error('❌ Missing tokens in session:', {
          hasAccessToken: !!authData.session.access_token, 
          hasRefreshToken: !!authData.session.refresh_token
        });
        throw new Error('Authentication succeeded but session tokens are missing');
      }

      logger.info('✅ Successfully obtained Supabase tokens');

      return {
        user: authData.user,
        profile,
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token
      };

    } catch (error) {
      logger.error('Error in user signin:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabaseService['supabase'].auth.signOut();
      if (error) {
        logger.error('Error signing out:', error);
        throw error;
      }
      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Error in user signout:', error);
      throw error;
    }
  }

  async refreshSession(refreshToken: string): Promise<UserSession> {
    try {
      const { data: authData, error: authError } = await supabaseService['supabase'].auth.refreshSession({
        refresh_token: refreshToken
      });

      if (authError || !authData.user) {
        logger.error('Error refreshing session:', authError);
        throw authError || new Error('Failed to refresh session');
      }

      const profile = await supabaseService.getUserProfile(authData.user.id);
      if (!profile) {
        throw new Error('User profile not found');
      }

      return {
        user: authData.user,
        profile,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || ''
      };

    } catch (error) {
      logger.error('Error refreshing session:', error);
      throw error;
    }
  }

  // Profile Management
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Remove read-only fields
      const { id, email, created_at, ...validUpdates } = updates;
      
      const updatedProfile = await supabaseService.updateUserProfile(userId, validUpdates);
      logger.info(`Profile updated for user: ${userId}`);
      
      return updatedProfile;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await supabaseService.getUserProfile(userId);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Password Management
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabaseService['supabase'].auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        logger.error('Error sending reset password email:', error);
        throw error;
      }

      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error('Error in password reset:', error);
      throw error;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      // Set the session first
      const { error: sessionError } = await supabaseService['supabase'].auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Will be handled by Supabase
      });

      if (sessionError) {
        throw sessionError;
      }

      const { error } = await supabaseService['supabase'].auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Error updating password:', error);
        throw error;
      }

      logger.info('Password updated successfully');
    } catch (error) {
      logger.error('Error in password update:', error);
      throw error;
    }
  }

  // User Verification
  async verifyUser(token: string, type: 'signup' | 'recovery'): Promise<UserSession> {
    try {
      const { data: authData, error: authError } = await supabaseService['supabase'].auth.verifyOtp({
        token_hash: token,
        type
      });

      if (authError || !authData.user) {
        logger.error('Error verifying user:', authError);
        throw authError || new Error('Invalid verification token');
      }

      const profile = await supabaseService.getUserProfile(authData.user.id);
      if (!profile) {
        throw new Error('User profile not found');
      }

      return {
        user: authData.user,
        profile,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || ''
      };

    } catch (error) {
      logger.error('Error in user verification:', error);
      throw error;
    }
  }

  // Utility methods
  async getCurrentUser(accessToken: string): Promise<UserSession | null> {
    try {
      logger.info('🔍 Getting current user with access token');
      logger.info(`🎫 Token length: ${accessToken.length}`);
      logger.info(`🎫 Token starts with: ${accessToken.substring(0, 20)}...`);
      
      // Directly verify the JWT token with Supabase
      const { data: { user }, error } = await supabaseService['supabase'].auth.getUser(accessToken);

      if (error) {
        logger.error('❌ Failed to verify JWT token in getCurrentUser:');
        logger.error('❌ Error name:', error.name);
        logger.error('❌ Error message:', error.message);
        logger.error('❌ Full error:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!user) {
        logger.warn('No user found for provided JWT token');
        return null;
      }

      logger.info('✅ Successfully verified JWT token for user:', user.id, user.email);

      // Get user profile
      const profile = await supabaseService.getUserProfile(user.id);
      if (!profile) {
        logger.warn('No profile found for user:', user.id);
        return null;
      }

      logger.debug('Successfully retrieved user profile');

      return {
        user,
        profile,
        accessToken,
        refreshToken: '' // Not needed for verification
      };

    } catch (error) {
      logger.error('Error getting current user:', error);
      return null;
    }
  }
}

export const userService = new UserService(); 