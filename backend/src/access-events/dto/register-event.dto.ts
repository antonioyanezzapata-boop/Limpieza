import { IsEnum, IsISO8601, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EventType } from '@prisma/client';

export class RegisterEventDto {
  /** Raw scanned QR content (e.g. hospital://area/<token>) or the bare token. */
  @IsString()
  @IsNotEmpty()
  qrToken: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  /** Timestamp captured on the device - kept for reference only; the
   * server clock is always the source of truth (business rule 4). */
  @IsOptional()
  @IsISO8601()
  deviceTimestamp?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /** Idempotency key generated on-device; required so offline events
   * synced later never create duplicates (business rule / spec #23). */
  @IsString()
  @IsNotEmpty()
  clientUuid: string;
}
