import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Connexion · PTN-RDC",
};

export default function LoginPage() {
  return <LoginClient />;
}
