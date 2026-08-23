import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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
import { QueryProvider } from "@/lib/api/QueryProvider";

/**
 * Les fontes viennent du dépôt, non de Google.
 *
 * `next/font/google` les TÉLÉCHARGE À LA CONSTRUCTION. La construction
 * échouait donc sans accès à fonts.googleapis.com — constaté en
 * fabriquant l'image — et elle aurait continué d'échouer sur tout
 * réseau qui filtre Google, ce qui n'est pas une hypothèse d'école pour un
 * déploiement destiné à Kinshasa. Une mise en production ne doit pas
 * dépendre d'un tiers joignable.
 *
 * Les fichiers viennent de `@ibm/plex-sans` et `@ibm/plex-mono`, déjà
 * présents en dépendance de Carbon, et sont copiés dans le dépôt avec leur
 * licence OFL — que la redistribution impose, comme pour les TTF du
 * composeur de documents.
 */
const ibmSans = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PTN-RDC · Plateforme de gouvernance",
  description:
    "Projet de Transformation Numérique de la République Démocratique du Congo · P180495 · IDA + AFD",
};

/**
 * La mise en page est ASYNCHRONE : la langue se lit dans un cookie, donc au
 * serveur, avant tout rendu. Sans cela, la page paraîtrait d'abord en
 * français puis basculerait — ce clignotement se voit, et sur une
 * connexion lente il dure.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("commun");

  return (
    <html
      // L'attribut suit la langue active : il commande la césure, les
      // guillemets, et ce qu'annonce un lecteur d'écran. Figé à « fr », un
      // texte anglais serait lu avec l'accent français.
      lang={locale}
      data-carbon-theme="g10"
      data-profile="ugp"
      className={`${ibmSans.variable} ${ibmMono.variable}`}
    >
      <body>
        <a href="#ptn-main" className="ptn-skip-link">
          {t("allerAuContenu")}
        </a>
        <NextIntlClientProvider messages={messages}>
        <QueryProvider>
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
        </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
