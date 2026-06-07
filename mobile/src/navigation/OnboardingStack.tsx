import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../theme/colors';

// Screens
import { InterestSelect } from '../screens/Onboarding/InterestSelect';
import { FirstDebate } from '../screens/Onboarding/FirstDebate';
import { BadgeReveal } from '../screens/Onboarding/BadgeReveal';

const Stack = createStackNavigator();

export const OnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background }
      }}
    >
      <Stack.Screen name="InterestSelect" component={InterestSelect} />
      <Stack.Screen name="FirstDebate" component={FirstDebate} />
      <Stack.Screen name="BadgeReveal" component={BadgeReveal} />
    </Stack.Navigator>
  );
};
