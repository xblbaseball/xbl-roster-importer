/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import type { ElectronAPI } from './src/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
