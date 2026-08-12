import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
// Ordre volontaire : Carbon d'abord, Tailwind ensuite.
// À spécificité égale, la dernière règle l'emporte — les utilitaires
// Tailwind peuvent donc surcharger un défaut Carbon, jamais l'inverse.
import "@/styles/globals.scss";
import "@/styles/tailwind.css";
import { ProfileProvider } from "@/components/profile/ProfileContext";
import { AuthProvider } from "@/components/auth/AuthContext";
import { OrganisationProvider } from "@/components/profile/OrganisationContext";
import { UserProvider } from "@/components/profile/UserContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import { TranslationProvider } from "@/components/translation/TranslationWidget";
import { CommandPaletteProvider } from "@/components/chrome/CommandPalette";

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PTN-RDC · Plateforme de gouvernance",
  description:
    "Projet de Transformation Numérique de la République Démocratique du Congo · P180495 · IDA + AFD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-carbon-theme="g10"
      data-profile="ugp"
      className={`${ibmSans.variable} ${ibmMono.variable}`}
    >
      <body>
        <a href="#ptn-main" className="ptn-skip-link">
          Aller au contenu principal
        </a>
        <ProfileProvider>
          <AuthProvider>
            <OrganisationProvider>
              <UserProvider>
                <ToastProvider>
                  <TranslationProvider>
                    <CommandPaletteProvider>{children}</CommandPaletteProvider>
                  </TranslationProvider>
                </ToastProvider>
              </UserProvider>
            </OrganisationProvider>
          </AuthProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
