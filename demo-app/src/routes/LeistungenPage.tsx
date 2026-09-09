import { useOutletContext } from "react-router-dom";
import { ServicesSection } from "../components/ServicesSection";
import type { LeadData } from "../types";

export function LeistungenPage() {
  const data = useOutletContext<LeadData>();
  return <ServicesSection services={data.services} label={data.servicesLabel} />;
}
