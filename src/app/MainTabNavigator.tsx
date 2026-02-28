import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { ChatStackNavigator } from './ChatStackNavigator';
import { MemoryStackNavigator } from './MemoryStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { HollowText } from '../components/common/HollowText';
import { colors, spacing } from '../theme';
import { useI18n } from '../i18n';
import { useResponsive } from '../hooks/useResponsive';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const DESKTOP_NAV_ITEMS: { name: keyof MainTabParamList; icon: string; labelKey: string }[] = [
  { name: 'ChatStack', icon: 'message-circle', labelKey: 'tabs.chat' },
  { name: 'MemoryStack', icon: 'database', labelKey: 'tabs.memory' },
  { name: 'SettingsStack', icon: 'settings', labelKey: 'tabs.settings' },
];

export function MainTabNavigator() {
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isDesktop ? styles.desktopTabBar : styles.tabBar,
        tabBarBackground: () =>
          isDesktop ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          ) : Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ),
        tabBarLabelStyle: isDesktop ? styles.desktopTabLabel : styles.tabLabel,
        tabBarIconStyle: isDesktop ? styles.desktopTabIcon : undefined,
        tabBarItemStyle: isDesktop ? styles.desktopTabItem : undefined,
      }}
      tabBar={isDesktop ? (props) => <DesktopNavRail {...props} /> : undefined}
    >
      <Tab.Screen
        name="ChatStack"
        component={ChatStackNavigator}
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'ChatList';
          // Only hide tab bar for VoiceMode (fullscreen); keep it for ChatSession
          const hideTabBar = focusedRoute === 'VoiceMode';
          return {
            tabBarLabel: t('tabs.chat'),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Feather name="message-circle" size={size} color={color} />
            ),
            ...(hideTabBar && { tabBarStyle: { display: 'none' as const } }),
          };
        }}
      />
      <Tab.Screen
        name="MemoryStack"
        component={MemoryStackNavigator}
        options={{
          tabBarLabel: t('tabs.memory'),
          tabBarIcon: ({ color, size }) => (
            <Feather name="database" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsStack"
        component={SettingsStackNavigator}
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'Settings';
          const hideTabBar = focusedRoute !== 'Settings';
          return {
            tabBarLabel: t('tabs.settings'),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Feather name="settings" size={size} color={color} />
            ),
            ...(hideTabBar && { tabBarStyle: { display: 'none' as const } }),
          };
        }}
      />
    </Tab.Navigator>
  );
}

function DesktopNavRail({ state, navigation }: any) {
  const { t } = useI18n();

  return (
    <View style={styles.navRail}>
      <HollowText variant="subheading" serif color={colors.amber} style={styles.navBrand}>
        Hollow
      </HollowText>
      {DESKTOP_NAV_ITEMS.map((item, index) => {
        const isActive = state.index === index;
        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            <Feather
              name={item.icon as any}
              size={20}
              color={isActive ? colors.amber : colors.textMuted}
            />
            <HollowText
              variant="caption"
              color={isActive ? colors.amber : colors.textMuted}
              style={styles.navLabel}
            >
              {t(item.labelKey)}
            </HollowText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.tabBar,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Desktop nav rail (left side vertical nav)
  navRail: {
    width: 72,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap: spacing.xs,
  },
  navBrand: {
    marginBottom: spacing.xl,
    fontSize: 14,
  },
  navItem: {
    width: 56,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navItemActive: {
    backgroundColor: colors.amberMuted,
  },
  navLabel: {
    fontSize: 10,
  },
  desktopTabBar: {
    display: 'none',
  },
  desktopTabLabel: {
    display: 'none',
  },
  desktopTabIcon: {
    display: 'none',
  },
  desktopTabItem: {
    display: 'none',
  },
});
