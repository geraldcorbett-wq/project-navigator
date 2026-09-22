import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.projectnavigator.app',
  appName: 'Navigator',
  webDir: 'mobile-web',
  server: {
    url: 'https://navigator-1-production.up.railway.app',
    cleartext: false,
    allowNavigation: ['navigator-1-production.up.railway.app'],
    androidScheme: 'https'
  }
};

export default config;
