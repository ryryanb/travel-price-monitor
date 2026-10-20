import { randomUUID } from "node:crypto";
import type { CreatePriceMonitorInput, MonitorRepository, PriceMonitor } from "./types.ts";

const AIRPORT_CODE = /^[A-Z]{3}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCreateMonitorInput(input: unknown): Omit<PriceMonitor, "monitorId" | "userId" | "status" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Request body must be a JSON object.");
  }
  const value = input as Record<string, unknown>;
  const origin = typeof value.origin === "string" ? value.origin.trim().toUpperCase() : "";
  const destination = typeof value.destination === "string" ? value.destination.trim().toUpperCase() : "";
  const departureDate = typeof value.departureDate === "string" ? value.departureDate.trim() : "";
  const returnDate = typeof value.returnDate === "string" && value.returnDate.trim() ? value.returnDate.trim() : undefined;
  const targetPrice = value.targetPrice;
  const currency = typeof value.currency === "string" && value.currency.trim()
    ? value.currency.trim().toUpperCase()
    : "USD";

  if (!AIRPORT_CODE.test(origin)) throw new Error("Origin must be a three-letter IATA airport code.");
  if (!AIRPORT_CODE.test(destination)) throw new Error("Destination must be a three-letter IATA airport code.");
  if (origin === destination) throw new Error("Origin and destination must be different.");
  if (!isRealDate(departureDate)) throw new Error("Departure date must be a valid YYYY-MM-DD date.");
  if (departureDate < new Date().toISOString().slice(0, 10)) throw new Error("Departure date cannot be in the past.");
  if (returnDate !== undefined) {
    if (!isRealDate(returnDate)) throw new Error("Return date must be a valid YYYY-MM-DD date.");
    if (returnDate < departureDate) throw new Error("Return date cannot be before departure date.");
  }
  if (typeof targetPrice !== "number" || !Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > 10_000_000) {
    throw new Error("Target price must be a positive number no greater than 10000000.");
  }
  if (!CURRENCY_CODE.test(currency)) throw new Error("Currency must be a three-letter ISO currency code.");

  return {
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    targetPrice: Math.round(targetPrice * 100) / 100,
    currency,
  };
}

export async function createPriceMonitor(
  input: unknown,
  userId: string,
  repository: MonitorRepository,
  now = new Date(),
): Promise<PriceMonitor> {
  if (!userId.trim()) throw new Error("Authenticated user is required.");
  const valid = validateCreateMonitorInput(input);
  const timestamp = now.toISOString();
  const monitor: PriceMonitor = {
    ...valid,
    monitorId: randomUUID(),
    userId,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await repository.create(monitor);
  return monitor;
}
