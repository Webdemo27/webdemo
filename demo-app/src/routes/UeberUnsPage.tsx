import { useOutletContext } from "react-router-dom";
import { AboutSection } from "../components/AboutSection";
import type { LeadData } from "../types";

export function UeberUnsPage() {
  const data = useOutletContext<LeadData>();
  return <AboutSection text={data.aboutText} promise={data.brandPromise} companyName={data.companyName} />;
}
