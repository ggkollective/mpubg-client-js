// main.ts
// Electron 앱의 메인 엔트리 포인트

import { app } from "electron";
import { AppInitializer } from "./core/app-initializer";

// 앱 초기화 인스턴스 생성
const appInitializer = new AppInitializer();

// 앱이 준비되면 초기화 실행
app.on("ready", async () => {
  await appInitializer.onAppReady();
});
