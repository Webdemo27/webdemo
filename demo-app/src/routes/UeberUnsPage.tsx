import { useOutletContext } from "react-router-dom";
import { AboutSection } from "../components/AboutSection";
import { EditorialGallery } from "../components/EditorialGallery";
import type { LeadData } from "../types";

export function UeberUnsPage() {
  const data = useOutletContext<LeadData>();
  return (
    <>
      <AboutSection text={data.aboutText} promise={data.brandPromise} companyName={data.companyName} />
      <EditorialGallery items={data.editorial} label={data.galleryLabel} />
    </>
  );
}
