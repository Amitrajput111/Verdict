import { create } from 'zustand';

interface UserProfile {
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  reputation: number;
  accuracy: number;
  hide_bio?: boolean;
  hide_reputation?: boolean;
  is_private?: boolean;
}

interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken, refreshToken) => set({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  }),
  updateProfile: (profileUpdates) => set((state) => {
    if (!state.user) return state;
    return {
      user: {
        ...state.user,
        profile: {
          ...state.user.profile,
          ...profileUpdates,
        },
      },
    };
  }),
  logout: () => set({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  }),
}));
