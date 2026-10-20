export type MonitorStatus = "ACTIVE" | "PAUSED";

export interface CreatePriceMonitorInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  targetPrice: number;
  currency?: string;
}

export interface PriceMonitor {
  monitorId: string;
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  targetPrice: number;
  currency: string;
  status: MonitorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorRepository {
  create(monitor: PriceMonitor): Promise<void>;
}
