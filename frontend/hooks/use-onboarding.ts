import { useState, useEffect } from 'react';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSeenFeature: (feature: string) => boolean;
  markFeatureAsSeen: (feature: string) => void;
  resetOnboarding: () => void;
  completeOnboarding: () => void;
}

const ONBOARDING_STORAGE_KEY = 'securewatch-onboarding';
const FEATURES_STORAGE_KEY = 'securewatch-features-seen';

export function useOnboarding(): OnboardingState {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [seenFeatures, setSeenFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check onboarding completion status
    const onboardingCompleted = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}-completed`);
    setHasCompletedOnboarding(onboardingCompleted === 'true');

    // Load seen features
    const featuresData = localStorage.getItem(FEATURES_STORAGE_KEY);
    if (featuresData) {
      try {
        const features = JSON.parse(featuresData);
        setSeenFeatures(new Set(features));
      } catch (error) {
        console.warn('Failed to parse seen features data:', error);
      }
    }
  }, []);

  const hasSeenFeature = (feature: string): boolean => {
    return seenFeatures.has(feature);
  };

  const markFeatureAsSeen = (feature: string): void => {
    setSeenFeatures(prev => {
      const newSet = new Set(prev);
      newSet.add(feature);
      
      // Persist to localStorage
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
  };

  const completeOnboarding = (): void => {
    setHasCompletedOnboarding(true);
    localStorage.setItem(`${ONBOARDING_STORAGE_KEY}-completed`, 'true');
  };

  const resetOnboarding = (): void => {
    setHasCompletedOnboarding(false);
    setSeenFeatures(new Set());
    localStorage.removeItem(`${ONBOARDING_STORAGE_KEY}-completed`);
    localStorage.removeItem(FEATURES_STORAGE_KEY);
  };

  return {
    hasCompletedOnboarding,
    hasSeenFeature,
    markFeatureAsSeen,
    resetOnboarding,
    completeOnboarding
  };
}