/**
 * Attachment Controller
 * Handles file upload, retrieval, and deletion
 */

import multer from 'multer';
import {
  JsonController,
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  QueryParam,
  CurrentUser,
  Req,
  Res,
  UploadedFile,
  Body,
} from 'routing-controllers';
import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { AttachmentService } from '../../services/attachment.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto, UpdateAttachmentPropertiesDto } from '@aimo/dto';
import type { Request, Response } from 'express';


/**
 * Check if a MIME type is allowed, supporting wildcard patterns like "image/*"
 * @param mimeType - The MIME type to check (e.g., "image/heic", "image/png")
 * @param allowedTypes - Array of allowed MIME types, can include wildcards (e.g., "image/*", "video/*")
 * @returns true if the MIME type is allowed, false otherwise
 */
function isMimeTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
  // First try exact match
  if (allowedTypes.includes(mimeType)) {
    return true;
  }

  // Then check wildcard patterns (e.g., "image/*", "video/*", "audio/*")
  for (const allowed of allowedTypes) {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2); // Remove "/*"
      if (mimeType.startsWith(prefix + '/')) {
        return true;
      }
    }
  }

  return false;
}


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
  async uploadAttachment(@Req() request: Request, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Use multer middleware to handle file upload
      return new Promise((resolve) => {
        upload.single('file')(request, {} as Response, async (error) => {
          if (error) {
            if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
                return resolve(ResponseUtility.error(ErrorCode.FILE_TOO_LARGE));
              }
            console.error('File upload error:', error);
            return resolve(ResponseUtility.error(ErrorCode.FILE_UPLOAD_ERROR));
          }

          const file = (request as any).file;
          if (!file) {
            return resolve(ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'No file uploaded'));
          }

          // Validate file type (supports wildcard like "image/*")
          const mimeType = file.mimetype;
          if (!isMimeTypeAllowed(mimeType, config.attachment.allowedMimeTypes)) {
            return resolve(
              ResponseUtility.error(
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                `File type ${mimeType} is not allowed`
              )
            );
          }

          try {
            // Parse optional createdAt parameter from FormData (for imports)
            let createdAt: number | undefined;
            const createdAtString = (request as any).body?.createdAt;
            if (createdAtString) {
              const parsed = Number.parseInt(createdAtString as string, 10);
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
              ResponseUtility.success({
                message: 'File uploaded successfully',
                attachment,
              })
            );
          } catch (error) {
            console.error('Failed to save attachment:', error);
            return resolve(ResponseUtility.error(ErrorCode.STORAGE_ERROR));
          }
        });
      });
    } catch (error) {
      console.error('Upload attachment error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
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
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.attachmentService.getAttachmentsByUser({
        uid: user.uid,
        page,
        limit,
      });

      return ResponseUtility.success(result);
    } catch (error) {
      console.error('Get attachments error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
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
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // attachmentId format: just the nano ID (stored in database)
      // The actual file path is stored in the attachment record
      const attachment = await this.attachmentService.getAttachment(attachmentId, user.uid);
      if (!attachment) {
        return ResponseUtility.error(ErrorCode.ATTACHMENT_NOT_FOUND);
      }

      return ResponseUtility.success(attachment);
    } catch (error) {
      console.error('Get attachment error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
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
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // attachmentId format: just the nano ID (stored in database)
      const success = await this.attachmentService.deleteAttachment(attachmentId, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.ATTACHMENT_NOT_FOUND);
      }

      return ResponseUtility.success({ message: 'Attachment deleted successfully' });
    } catch (error) {
      console.error('Delete attachment error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
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
        return response.status(401).json(ResponseUtility.error(ErrorCode.UNAUTHORIZED));
      }

      // attachmentId format: just the nano ID (stored in database)
      // Get attachment buffer with permission check
      const result = await this.attachmentService.getAttachmentBuffer(attachmentId, user.uid);

      if (!result) {
        return response.status(404).json(ResponseUtility.error(ErrorCode.ATTACHMENT_NOT_FOUND));
      }

      // Set response headers
      response.setHeader('Content-Type', result.mimeType);
      response.setHeader('Content-Length', result.buffer.length);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.filename)}"`
      );
      response.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

      // Send file buffer
      return response.send(result.buffer);
    } catch (error) {
      console.error('Download attachment error:', error);
      return response.status(500).json(ResponseUtility.error(ErrorCode.SYSTEM_ERROR));
    }
  }

  /**
   * Update attachment properties
   * PATCH /api/v1/attachments/:attachmentId/properties
   */
  @Patch('/:attachmentId/properties')
  async updateAttachmentProperties(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: UserInfoDto,
    @Body() body: UpdateAttachmentPropertiesDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body || !body.properties) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Properties are required');
      }

      // Update attachment properties
      const attachment = await this.attachmentService.updateAttachmentProperties(
        attachmentId,
        user.uid,
        body.properties
      );

      if (!attachment) {
        return ResponseUtility.error(ErrorCode.ATTACHMENT_NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Properties updated successfully',
        attachment,
      });
    } catch (error) {
      console.error('Update attachment properties error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
