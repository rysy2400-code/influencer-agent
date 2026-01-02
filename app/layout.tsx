import type { Metadata } from "next";
import "./globals.css";

// 使用 Web 安全字体栈，确保在所有环境下都能正常显示
// 这些字体在所有操作系统和浏览器中都可用，无需下载
// 如果需要使用 Google Fonts，可以在生产环境网络正常时启用
// 
// 字体栈说明：
// - system-ui: 使用系统默认 UI 字体（macOS: San Francisco, Windows: Segoe UI）
// - -apple-system: macOS/iOS 系统字体
// - BlinkMacSystemFont: Chrome on macOS
// - Segoe UI: Windows 系统字体
// - Roboto: Android 系统字体
// - Helvetica Neue, Arial: 通用后备字体
// - sans-serif: 最终后备
const fontStack = [
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'sans-serif'
].join(', ');

const monoFontStack = [
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  'Consolas',
  'Liberation Mono',
  'Courier New',
  'monospace'
].join(', ');

export const metadata: Metadata = {
  title: "Binfluencer AI - 红人经纪工作台",
  description: "AI驱动的红人商业合作平台",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ fontFamily: fontStack }}>
        {children}
      </body>
    </html>
  );
}
