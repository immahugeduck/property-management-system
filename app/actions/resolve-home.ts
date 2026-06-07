"use server"

import { getUserRole } from "@/lib/tenant-auth"

/** Returns the correct landing path for the signed-in user based on their role. */
export async function resolveHomePath(): Promise<string> {
  const role = await getUserRole()
  return role === "tenant" ? "/portal" : "/dashboard"
}
