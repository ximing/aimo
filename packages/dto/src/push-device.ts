/**
 * Device push registration.
 * The Android app obtains a Huawei Push Kit token and registers it here.
 */

export type PushProvider = 'huawei';

export class RegisterPushDeviceDto {
  /** Push provider. Only `huawei` is supported. */
  provider!: PushProvider;
  /** Huawei Push Kit device token. */
  token!: string;
}

export class PushDeviceDto {
  /** Device row id. */
  id!: string;
  /** Push provider. */
  provider!: PushProvider;
}
