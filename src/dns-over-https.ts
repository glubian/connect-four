import { DOH_URLS } from "@/urls";

/** DNS response containing type A or AAAA records. */
interface DNSResponse {
  Status: number;
  TC: boolean;
  RD: true;
  RA: true;
  AD: boolean;
  CD: boolean;
  Question: {
    name: string;
    type: number;
  }[];
  Answer?: {
    name: string;
    type: number;
    TTL: number;
    data: string;
  }[];
  Comment?: string;
}

/** Queries DNS server for type A records. */
export async function queryDNS(name: string): Promise<DNSResponse | null> {
  const headers = new Headers();
  headers.set("Accept", "application/dns-json");

  for (const urlStr of DOH_URLS) {
    const url = new URL(urlStr);
    url.searchParams.set("name", name);
    try {
      const resStr = await fetch(url, { headers });
      return JSON.parse(await resStr.text()) as DNSResponse;
    } catch (_) {
      continue;
    }
  }

  return null;
}
