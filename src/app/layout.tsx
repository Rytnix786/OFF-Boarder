import type { Metadata } from "next";
import { Roboto_Flex, Manrope } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/theme/ThemeRegistry";

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "OffboardHQ - Secure Employee Offboarding",
  description: "Automate and secure the employee exit process.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
        />
      </head>
      <body
        className={`${robotoFlex.variable} ${manrope.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
