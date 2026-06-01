import { PublicSite } from "@/components/public-site";
import { loadSiteData } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadSiteData();
  return <PublicSite data={data} />;
}
