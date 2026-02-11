import { MemoV1Controller } from './v1/memo.controller.js';
import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { AttachmentV1Controller, AttachmentFileController } from './v1/attachment.controller.js';
import { StaticController } from './static.controller.js';

// Note: StaticController should be last to handle all non-API routes
export const controllers = [
  MemoV1Controller,
  AuthV1Controller,
  UserV1Controller,
  AttachmentV1Controller,
  AttachmentFileController,
  StaticController,
];
