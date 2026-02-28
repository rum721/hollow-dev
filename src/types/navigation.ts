import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Launch: undefined;
  Welcome: undefined;
  OnboardingPrivacy: undefined;
  OnboardingNickname: undefined;
  OnboardingStyle: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  ChatStack: NavigatorScreenParams<ChatStackParamList>;
  MemoryStack: NavigatorScreenParams<MemoryStackParamList>;
  SettingsStack: NavigatorScreenParams<SettingsStackParamList>;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatSession: { sessionId: string };
  VoiceMode: { sessionId: string };
};

export type MemoryStackParamList = {
  MemoryList: undefined;
  MemoryEdit: { memoryId?: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
  Subscription: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};
