import multer from 'multer';
import { JsonController, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';
import { AttachmentService } from '../../services/attachment.service.js';
import { UserService } from '../../services/user.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { Request, Response } from 'express';

function isMimeTypeBlocked(mimeType: string, blockedTypes: string[]): boolean {
  if (blockedTypes.includes(mimeType)) {
    return true;
  }

  for (const blocked of blockedTypes) {
    if (blocked.endsWith('/*')) {
      const prefix = blocked.slice(0, -2);
      if (mimeType.startsWith(prefix + '/')) {
        return true;
      }
    }
  }

  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.attachment.maxFileSize,
  },
});

@Service()
@JsonController('/api/v1/attachments/ba')
export class AttachmentBAController {
  constructor(
    private attachmentService: AttachmentService,
    private userService: UserService
  ) {}

  /**
   * Upload attachment via BA authentication (no JWT required)
   * User ID is passed as a query parameter
   * Requires BA_AUTH_TOKEN in environment variable
   */
  @Post('/upload')
  @UseBefore(baAuthInterceptor)
  async uploadAttachmentByBA(@Req() request: Request, @QueryParam('uid') uid: string) {
    try {
      if (!uid) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'User ID (uid) is required');
      }

      const user = await this.userService.findUserByUid(uid);
      if (!user) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'User not found');
      }

      return new Promise((resolve) => {
        upload.single('file')(request, {} as Response, async (error) => {
          if (error) {
            if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
              return resolve(ResponseUtility.error(ErrorCode.FILE_TOO_LARGE));
            }

            logger.error('File upload by BA error', {
              uid,
              error: error instanceof Error ? error.message : String(error),
            });
            return resolve(ResponseUtility.error(ErrorCode.FILE_UPLOAD_ERROR));
          }

          const file = (request as any).file;
          if (!file) {
            return resolve(ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'No file uploaded'));
          }

          const mimeType = file.mimetype;
          if (isMimeTypeBlocked(mimeType, config.attachment.blockedMimeTypes)) {
            return resolve(
              ResponseUtility.error(
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                `File type ${mimeType} is not allowed due to security restrictions`
              )
            );
          }

          try {
            let createdAt: number | undefined;
            const createdAtString = (request as any).body?.createdAt;
            if (createdAtString) {
              const parsed = Number.parseInt(createdAtString as string, 10);
              if (!isNaN(parsed) && parsed > 0) {
                createdAt = parsed;
              }
            }

            let properties: string | undefined;
            const propertiesString = (request as any).body?.properties;
            if (propertiesString && typeof propertiesString === 'string') {
              try {
                JSON.parse(propertiesString);
                properties = propertiesString;
              } catch {
                // Ignore invalid JSON properties.
              }
            }

            const attachment = await this.attachmentService.createAttachment({
              uid,
              buffer: file.buffer,
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              createdAt,
              properties,
            });

            return resolve(
              ResponseUtility.success({
                message: 'File uploaded successfully via BA authentication',
                attachment,
              })
            );
          } catch (saveError) {
            logger.error('Failed to save attachment by BA', {
              uid,
              error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            return resolve(ResponseUtility.error(ErrorCode.STORAGE_ERROR));
          }
        });
      });
    } catch (error) {
      logger.error('Upload attachment by BA error', {
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
