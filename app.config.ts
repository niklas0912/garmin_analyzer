import { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

const BASE_PACKAGE = 'com.anonymous.GarminApp3';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'DebugGarminAnalyzer' : 'Garmin Analyzer',
  slug: 'garminapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: IS_DEV ? 'garminapp3dev' : 'garminapp3',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? `${BASE_PACKAGE}.dev` : BASE_PACKAGE,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: IS_DEV ? `${BASE_PACKAGE}.dev` : BASE_PACKAGE,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    router: {},
    eas: {
      projectId: 'c5f23b8d-92c2-47d8-aad5-4308f8f9107a',
    },
  },
  owner: 'n1k1as0912s-team',
  runtimeVersion: { policy: 'appVersion' },
updates: {
  url: 'https://u.expo.dev/c5f23b8d-92c2-47d8-aad5-4308f8f9107a',
},
});
