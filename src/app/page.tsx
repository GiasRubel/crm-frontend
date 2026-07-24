import type { Metadata } from "next";
import LandingPage from "@/crm-pages/LandingPage";

export const metadata: Metadata = {
  title: "CRM Pro — The all-in-one revenue platform",
  description:
    "Capture leads, manage your pipeline, support customers and automate the busywork — all in one CRM built for sales, marketing and support teams.",
};

export default function Home() {
  return <LandingPage />;
}
