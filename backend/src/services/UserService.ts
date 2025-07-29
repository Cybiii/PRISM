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

      return {
        user: authData.user,
        profile,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || ''
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
      // Set the session
      const { error: sessionError } = await supabaseService['supabase'].auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Will be refreshed by Supabase if needed
      });

      if (sessionError) {
        return null;
      }

      const { data: { user }, error } = await supabaseService['supabase'].auth.getUser();

      if (error || !user) {
        return null;
      }

      const profile = await supabaseService.getUserProfile(user.id);
      if (!profile) {
        return null;
      }

      return {
        user,
        profile,
        accessToken,
        refreshToken: '' // Not available from getUser
      };

    } catch (error) {
      logger.error('Error getting current user:', error);
      return null;
    }
  }

  // For demo/testing purposes - create a demo user
  async createDemoUser(): Promise<UserSession> {
    const demoEmail = `demo-${Date.now()}@puma-health.local`;
    const demoPassword = 'DemoUser123!';

    return this.signUp({
      email: demoEmail,
      password: demoPassword,
      fullName: 'Demo User',
      age: 30,
      gender: 'other',
      medicalConditions: [],
      medications: []
    });
  }

  // Analytics helpers
  async getUserHealthSummary(userId: string) {
    try {
      const [stats24h, stats7d, stats30d, dailySummaries] = await Promise.all([
        supabaseService.get24HourStats(userId),
        supabaseService.get7DayStats(userId),
        supabaseService.get30DayStats(userId),
        supabaseService.getDailySummaries(userId, 7)
      ]);

      return {
        last24Hours: stats24h,
        last7Days: stats7d,
        last30Days: stats30d,
        recentDailySummaries: dailySummaries,
        overallTrend: this.calculateOverallTrend(stats24h, stats7d, stats30d)
      };
    } catch (error) {
      logger.error('Error fetching user health summary:', error);
      throw error;
    }
  }

  private calculateOverallTrend(stats24h: any, stats7d: any, stats30d: any): 'improving' | 'declining' | 'stable' {
    // Simple trend calculation based on average health scores
    const trends = [stats24h.trendDirection, stats7d.trendDirection, stats30d.trendDirection];
    
    const improvingCount = trends.filter(t => t === 'improving').length;
    const decliningCount = trends.filter(t => t === 'declining').length;
    
    if (improvingCount > decliningCount) return 'improving';
    if (decliningCount > improvingCount) return 'declining';
    return 'stable';
  }
}

export const userService = new UserService(); 