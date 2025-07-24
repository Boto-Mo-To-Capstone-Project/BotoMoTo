// src/lib/requestContext.ts
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage<{
  ip: string;
  userAgent: string;
}>();
