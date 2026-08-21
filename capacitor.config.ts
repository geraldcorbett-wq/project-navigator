import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.projectnavigator.app',
  appName: 'Navigator',
  webDir: 'out',

  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          androidScheme: serverUrl.startsWith('https://') ? 'https' : 'http'
        }
      }
    : {})
};

export default config;
