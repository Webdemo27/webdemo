import { useOutletContext } from "react-router-dom";
import { ContactSection } from "../components/ContactSection";
import type { LeadData } from "../types";

export function KontaktPage() {
  const data = useOutletContext<LeadData>();
  return <ContactSection data={data} />;
}
