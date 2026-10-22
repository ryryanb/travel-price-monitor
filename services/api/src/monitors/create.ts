import { randomUUID } from "node:crypto";
import type { MonitorRepository, PriceMonitor } from "./types.ts";

const AIRPORT_CODE = /^[A-Z]{3}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PASSENGERS = 9;
const MAX_MONITOR_NAME_LENGTH = 100;

export class MonitorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonitorValidationError";
  }
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCreateMonitorInput(input: unknown): Omit<PriceMonitor, "monitorId" | "userId" | "status" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MonitorValidationError("Request body must be a JSON object.");
  }
  const value = input as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const origin = typeof value.origin === "string" ? value.origin.trim().toUpperCase() : "";
  const destination = typeof value.destination === "string" ? value.destination.trim().toUpperCase() : "";
  const departureDate = typeof value.departureDate === "string" ? value.departureDate.trim() : "";
  const returnDate = typeof value.returnDate === "string" && value.returnDate.trim() ? value.returnDate.trim() : undefined;
  const passengerCount = value.passengerCount === undefined ? 1 : value.passengerCount;
  const targetPrice = value.targetPrice;
  const currency = typeof value.currency === "string" && value.currency.trim()
    ? value.currency.trim().toUpperCase()
    : "USD";

  if (!name) throw new MonitorValidationError("Monitor name is required.");
  if (name.length > MAX_MONITOR_NAME_LENGTH) {
    throw new MonitorValidationError(`Monitor name must be ${MAX_MONITOR_NAME_LENGTH} characters or fewer.`);
  }
  if (!AIRPORT_CODE.test(origin)) throw new MonitorValidationError("Origin must be a three-letter IATA airport code.");
  if (!AIRPORT_CODE.test(destination)) throw new MonitorValidationError("Destination must be a three-letter IATA airport code.");
  if (origin === destination) throw new MonitorValidationError("Origin and destination must be different.");
  if (!isRealDate(departureDate)) throw new MonitorValidationError("Departure date must be a valid YYYY-MM-DD date.");
  if (departureDate < new Date().toISOString().slice(0, 10)) throw new MonitorValidationError("Departure date cannot be in the past.");
  if (returnDate !== undefined) {
    if (!isRealDate(returnDate)) throw new MonitorValidationError("Return date must be a valid YYYY-MM-DD date.");
    if (returnDate < departureDate) throw new MonitorValidationError("Return date cannot be before departure date.");
  }
  if (typeof passengerCount !== "number" || !Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > MAX_PASSENGERS) {
    throw new MonitorValidationError(`Passenger count must be an integer between 1 and ${MAX_PASSENGERS}.`);
  }
  if (typeof targetPrice !== "number" || !Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > 10_000_000) {
    throw new MonitorValidationError("Target price must be a positive number no greater than 10000000.");
  }
  if (!CURRENCY_CODE.test(currency)) throw new MonitorValidationError("Currency must be a three-letter ISO currency code.");

  return {
    name,
    origin,
    destination,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    passengerCount,
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
