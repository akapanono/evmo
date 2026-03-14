import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evmo.app',
  appName: '友记',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
  },
};

export default config;
