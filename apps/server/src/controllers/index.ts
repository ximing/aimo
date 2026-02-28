/* eslint-disable import/order */
import { AIV1Controller } from './v1/ai.controller.js';
import { ASRV1Controller } from './v1/asr.controller.js';
import { AttachmentV1Controller } from './v1/attachment.controller.js';
import { AuthV1Controller } from './v1/auth.controller.js';
import { CategoryV1Controller } from './v1/category.controller.js';
import { ExploreController } from './v1/explore.controller.js';
import { InsightsController } from './v1/insights.controller.js';
import { MemoBAController } from './v1/memo.ba.controller.js';
import { MemoV1Controller } from './v1/memo.controller.js';
import { OcrV1Controller } from './v1/ocr.controller.js';
import { PushRuleV1Controller } from './v1/push-rule.controller.js';
import { TagV1Controller } from './v1/tag.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { SystemController } from './v1/system.controller.js';
import { StaticController } from './static.controller.js';

// Note: StaticController import should stay last to avoid catching API routes
export const controllers = [
  MemoBAController,
  MemoV1Controller,
  InsightsController,
  AuthV1Controller,
  UserV1Controller,
  CategoryV1Controller,
  TagV1Controller,
  AttachmentV1Controller,
  ASRV1Controller,
  OcrV1Controller,
  ExploreController,
  AIV1Controller,
  PushRuleV1Controller,
  SystemController,
  StaticController,
];
