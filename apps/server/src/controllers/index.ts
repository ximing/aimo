/* eslint-disable import/order */
import { ASRV1Controller } from './v1/asr.controller.js';
import { AttachmentV1Controller } from './v1/attachment.controller.js';
import { AuthV1Controller } from './v1/auth.controller.js';
import { CategoryV1Controller } from './v1/category.controller.js';
import { ExploreController } from './v1/explore.controller.js';
import { InsightsController } from './v1/insights.controller.js';
import { MemoV1Controller } from './v1/memo.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { SystemController } from './v1/system.controller.js';
import { StaticController } from './static.controller.js';

// Note: StaticController import should stay last to avoid catching API routes
export const controllers = [
  MemoV1Controller,
  InsightsController,
  AuthV1Controller,
  UserV1Controller,
  CategoryV1Controller,
  AttachmentV1Controller,
  ASRV1Controller,
  ExploreController,
  SystemController,
  StaticController,
];
