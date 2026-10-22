export type MonitorStatus = "ACTIVE" | "PAUSED";

export interface CreatePriceMonitorInput {
  name: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengerCount?: number;
  targetPrice: number;
  currency?: string;
}

export interface PriceMonitor {
  monitorId: string;
  userId: string;
  name: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengerCount: number;
  targetPrice: number;
  currency: string;
  status: MonitorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorRepository {
  create(monitor: PriceMonitor): Promise<void>;
}

export interface MonitorReaderRepository {
  getById(userId: string, monitorId: string): Promise<PriceMonitor | undefined>;
}
