import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  interests: string[];
  firstVotedDebateId: string | null;
  setInterests: (interests: string[]) => void;
  setFirstVotedDebate: (id: string | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      interests: [],
      firstVotedDebateId: null,
      setInterests: (interests) => set({ interests }),
      setFirstVotedDebate: (id) => set({ firstVotedDebateId: id }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, interests: [], firstVotedDebateId: null }),
    }),
    {
      name: 'verdict-onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
