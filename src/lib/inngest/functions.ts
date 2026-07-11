import type { InngestFunction } from "inngest";

/**
 * Registered Inngest functions, collected here so the route handler has a
 * single import. Empty until the external-signals to-do adds the first
 * scheduled feed-fetch function.
 */
export const functions: InngestFunction.Any[] = [];
