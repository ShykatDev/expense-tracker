import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Lets a phone on the same Wi-Fi open the dev server by this machine's
   * network address (http://192.168.11.86:3000). Next.js blocks dev assets
   * from any host other than localhost by default, which leaves the page
   * stuck on the splash screen because its scripts never load.
   * Update the address if the router assigns this machine a new one.
   */
  allowedDevOrigins: ["192.168.11.86"],
};

export default nextConfig;
