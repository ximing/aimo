/**
 * Version information for a single platform
 */
export interface VersionInfoDto {
  /** Version string (e.g., "1.0.0") or undefined if not available */
  version: string | undefined;
  /** Error message if version fetch failed */
  error?: string;
}

/**
 * Response containing version information for all platforms
 */
export interface AllVersionsResponseDto {
  /** Desktop app version (from ximing/aimo) */
  desktop: VersionInfoDto;
  /** APK version (from ximing/aimo-app) */
  apk: VersionInfoDto;
}
