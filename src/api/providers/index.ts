import type { PaymentMode } from '@/models';

export interface PaymentProvider {
  prepay(orderId: string, amountCent: number, mode: PaymentMode): Promise<{ tradeNo: string; paidCent: number; mode: PaymentMode }>;
}

export interface AirspaceProvider {
  apply(orderId: string): Promise<{ requestId: string; status: 'approved' | 'rejected' }>;
}

export interface InsuranceProvider {
  quote(orderId: string, valueCent: number): Promise<{ premiumCent: number; insuredAmountCent: number }>;
}

export interface CreditProvider {
  bureauScore(userId: string): Promise<{ userId: string; score: number }>;
}

export interface DroneProvider {
  arm(droneId: string): Promise<{ droneId: string; ready: boolean }>;
}

export interface Providers {
  payment: PaymentProvider;
  airspace: AirspaceProvider;
  insurance: InsuranceProvider;
  credit: CreditProvider;
  drone: DroneProvider;
}

export { providers } from './mock';
