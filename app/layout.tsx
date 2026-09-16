import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusDesk · 企业客服工作台",
  description: "面向企业软件服务团队的会话与工单一体化工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
