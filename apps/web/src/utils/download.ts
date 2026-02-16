/**
 * File Download Utilities
 * Provides helper functions for downloading files from various sources
 */

/**
 * Download file from URL
 * Handles both local and remote files with CORS support
 * @param url - The file URL to download
 * @param filename - The filename to save as
 */
export async function downloadFileFromUrl(url: string, filename: string): Promise<void> {
  try {
    // Fetch the file
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Get the blob
    const blob = await response.blob();

    // Create download link
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Download blob as file
 * @param blob - The blob to download
 * @param filename - The filename to save as
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);

  try {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Append to body (required for Firefox)
    document.body.appendChild(link);

    // Trigger the download
    link.click();

    // Clean up
    document.body.removeChild(link);
  } finally {
    // Release the object URL
    URL.revokeObjectURL(url);
  }
}

/**
 * Extract filename from URL or use provided filename
 * @param url - The URL to extract filename from
 * @param fallback - Fallback filename if extraction fails
 * @returns The extracted or fallback filename
 */
export function getFilenameFromUrl(url: string, fallback: string = 'download'): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename || fallback;
  } catch {
    return fallback;
  }
}
