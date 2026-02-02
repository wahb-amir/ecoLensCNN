import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EcoTracker 🌱 | Track Your Eco-Friendly Actions",
  description:
    "EcoTracker helps you monitor and improve your environmental impact. Log eco-actions, save energy, reduce waste, and track your sustainable progress.",
  icons: {
    icon: "/butt.png",
  },
  keywords: [
    "EcoTracker",
    "Environment",
    "Sustainability",
    "Carbon footprint",
    "Eco-friendly",
    "Green living",
    "Climate change",
    "Environmental tracker",
  ],
  authors: [{ name: "Shahnawaz Saddam Butt", url: "https://your-portfolio-link.com" }],
  openGraph: {
    title: "EcoTracker 🌱 | Track Your Eco-Friendly Actions",
    description:
      "EcoTracker helps you monitor and improve your environmental impact. Log eco-actions, save energy, reduce waste, and track your sustainable progress.",
    url: "https://your-website-url.com",
    siteName: "EcoTracker",
    images: [
      {
        url: "https://your-website-url.com/social-preview.png",
        width: 1200,
        height: 630,
        alt: "EcoTracker - Environmental Tracker",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoTracker 🌱 | Track Your Eco-Friendly Actions",
    description:
      "EcoTracker helps you monitor and improve your environmental impact. Log eco-actions, save energy, reduce waste, and track your sustainable progress.",
    site: "@yourTwitterHandle",
    creator: "@yourTwitterHandle",
    images: ["https://your-website-url.com/social-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
