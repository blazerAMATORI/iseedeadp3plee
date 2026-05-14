import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dota 2 Quiz - Онлайн Квиз",
  description: "Проверь свои знания Dota 2 в онлайн-квизе с друзьями!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
