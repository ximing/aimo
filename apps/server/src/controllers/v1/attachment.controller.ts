/**
 * Attachment Controller
 * Handles file upload, retrieval, and deletion
 */

import {
  JsonController,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  QueryParam,
  CurrentUser,
  Req,
  Res,
  UploadedFile,
} from 'routing-controllers';
import { Service } from 'typedi';
import type { Request, Response } from 'express';
import multer from 'multer';
import mime from 'mime-types';
import type { UserInfoDto } from '@aimo/dto';
import { AttachmentService } from '../../services/attachment.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { config } from '../../config/config.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.attachment.maxFileSize,
  },
});

@Service()
@JsonController('/api/v1/attachments')
export class AttachmentV1Controller {
  constructor(private attachmentService: AttachmentService) {}

  /**
   * Upload attachment
   * POST /api/v1/attachments/upload
   */
  @Post('/upload')
  async uploadAttachment(
    @Req() req: Request,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // Use multer middleware to handle file upload
      return new Promise((resolve) => {
        upload.single('file')(req, {} as Response, async (err) => {
          if (err) {
            if (err instanceof multer.MulterError) {
              if (err.code === 'LIMIT_FILE_SIZE') {
                return resolve(ResponseUtil.error(ErrorCode.FILE_TOO_LARGE));
              }
            }
            console.error('File upload error:', err);
            return resolve(ResponseUtil.error(ErrorCode.FILE_UPLOAD_ERROR));
          }

          const file = (req as any).file;
          if (!file) {
            return resolve(ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'No file uploaded'));
          }

          // Validate file type
          const mimeType = file.mimetype;
          if (!config.attachment.allowedMimeTypes.includes(mimeType)) {
            return resolve(
              ResponseUtil.error(
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                `File type ${mimeType} is not allowed`
              )
            );
          }

          try {
            // Parse optional createdAt parameter from FormData (for imports)
            let createdAt: number | undefined;
            const createdAtStr = (req as any).body?.createdAt;
            if (createdAtStr) {
              const parsed = parseInt(createdAtStr as string, 10);
              if (!isNaN(parsed) && parsed > 0) {
                createdAt = parsed;
              }
            }

            // Create attachment
            const attachment = await this.attachmentService.createAttachment({
              uid: user.uid,
              buffer: file.buffer,
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              createdAt,
            });

            return resolve(
              ResponseUtil.success({
                message: 'File uploaded successfully',
                attachment,
              })
            );
          } catch (error) {
            console.error('Failed to save attachment:', error);
            return resolve(ResponseUtil.error(ErrorCode.STORAGE_ERROR));
          }
        });
      });
    } catch (error) {
      console.error('Upload attachment error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  /**
   * Get user's attachments
   * GET /api/v1/attachments
   */
  @Get()
  async getAttachments(
    @CurrentUser() user: UserInfoDto,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 20
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.attachmentService.getAttachmentsByUser({
        uid: user.uid,
        page,
        limit,
      });

      return ResponseUtil.success(result);
    } catch (error) {
      console.error('Get attachments error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get single attachment info
   * GET /api/v1/attachments/:attachmentId
   */
  @Get('/:attachmentId')
  async getAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // attachmentId format: "attachments/xxxxx"
      const fullId = attachmentId.includes('attachments/') ? attachmentId : `attachments/${attachmentId}`;

      const attachment = await this.attachmentService.getAttachment(fullId, user.uid);
      if (!attachment) {
        return ResponseUtil.error(ErrorCode.ATTACHMENT_NOT_FOUND);
      }

      return ResponseUtil.success(attachment);
    } catch (error) {
      console.error('Get attachment error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Delete attachment
   * DELETE /api/v1/attachments/:attachmentId
   */
  @Delete('/:attachmentId')
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // attachmentId format: "attachments/xxxxx"
      const fullId = attachmentId.includes('attachments/') ? attachmentId : `attachments/${attachmentId}`;

      const success = await this.attachmentService.deleteAttachment(fullId, user.uid);
      if (!success) {
        return ResponseUtil.error(ErrorCode.ATTACHMENT_NOT_FOUND);
      }

      return ResponseUtil.success({ message: 'Attachment deleted successfully' });
    } catch (error) {
      console.error('Delete attachment error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Download attachment (secure proxy for export)
   * GET /api/v1/attachments/:attachmentId/download
   */
  @Get('/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: UserInfoDto,
    @Res() response: Response
  ) {
    try {
      if (!user?.uid) {
        return response.status(401).json(ResponseUtil.error(ErrorCode.UNAUTHORIZED));
      }

      // attachmentId format: "attachments/xxxxx" or just the ID
      const fullId = attachmentId.includes('attachments/') ? attachmentId : `attachments/${attachmentId}`;

      // Get attachment buffer with permission check
      const result = await this.attachmentService.getAttachmentBuffer(fullId, user.uid);
      
      if (!result) {
        return response.status(404).json(ResponseUtil.error(ErrorCode.ATTACHMENT_NOT_FOUND));
      }

      // Set response headers
      response.setHeader('Content-Type', result.mimeType);
      response.setHeader('Content-Length', result.buffer.length);
      response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      response.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

      // Send file buffer
      return response.send(result.buffer);
    } catch (error) {
      console.error('Download attachment error:', error);
      return response.status(500).json(ResponseUtil.error(ErrorCode.SYSTEM_ERROR));
    }
  }
}

/**
 * File Access Controller
 * Serves local attachment files (no authentication required)
 */
@Service()
@Controller('/api/v1/attachments/file')
export class AttachmentFileController {
  constructor(private attachmentService: AttachmentService) {}

  /**
   * Access local attachment file (public, no auth)
   * GET /api/v1/attachments/file/:filename
   */
  @Get('/:filename')
  async getFile(@Param('filename') filename: string, @Res() response: Response) {
    try {
      // Check if local storage is configured
      if (config.attachment.storageType !== 'local') {
        return response.status(404).send('File not found');
      }

      // Get file buffer
      const buffer = await this.attachmentService.getLocalFileBuffer(filename);

      // Determine content type
      const mimeType = mime.lookup(filename) || 'application/octet-stream';

      // Set headers
      response.setHeader('Content-Type', mimeType);
      response.setHeader('Content-Length', buffer.length);
      response.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Send file
      return response.send(buffer);
    } catch (error) {
      console.error('Get file error:', error);
      return response.status(404).send('File not found');
    }
  }
}
