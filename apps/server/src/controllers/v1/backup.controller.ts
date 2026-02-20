import { JsonController, Get, Post, Authorized } from 'routing-controllers';
import { Service } from 'typedi';
import { Container } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { BackupService } from '../../services/backup.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

/**
 * Backup management API endpoints
 * These endpoints are protected and should only be accessible by administrators
 */
@Service()
@JsonController('/api/v1/backup')
export class BackupV1Controller {
  /**
   * Get backup service status
   */
  @Get('/status')
  @Authorized()
  async getBackupStatus() {
    try {
      const backupService = Container.get(BackupService);
      const status = backupService.getStatus();

      return ResponseUtility.success({
        backup: status,
      });
    } catch (error) {
      console.error('Error getting backup status:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get backup status');
    }
  }

  /**
   * Trigger a manual full backup
   * Bypasses throttle mechanism
   */
  @Post('/force')
  @Authorized()
  async forceBackup() {
    try {
      const backupService = Container.get(BackupService);
      await backupService.forceBackup();

      return ResponseUtility.success({
        message: 'Backup started successfully',
      });
    } catch (error) {
      console.error('Error triggering manual backup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger backup';
      return ResponseUtility.error(ErrorCode.DB_ERROR, errorMessage);
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  @Post('/cleanup')
  @Authorized()
  async cleanupOldBackups() {
    try {
      const backupService = Container.get(BackupService);
      await backupService.cleanupOldBackups();

      return ResponseUtility.success({
        message: 'Backup cleanup completed',
      });
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to cleanup backups');
    }
  }
}
