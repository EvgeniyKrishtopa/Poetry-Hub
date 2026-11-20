import type { MetadataRoute } from "next";

import { buildRobots } from "@/features/seo";
import { getSiteUrl } from "@/shared/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(getSiteUrl());
}
