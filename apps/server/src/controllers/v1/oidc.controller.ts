import { Controller, Get, QueryParam, Req, Res } from 'routing-controllers';
import { Service } from 'typedi';

import { OidcService } from '../../services/oidc.service.js';
import { logger } from '../../utils/logger.js';

import type { Request, Response } from 'express';

@Service()
@Controller('/api/v1/auth/oidc')
export class OidcV1Controller {
  constructor(private oidcService: OidcService) {}

  @Get('/status')
  status(@Res() response: Response) {
    return response.json(this.oidcService.status());
  }

  @Get('/account')
  async account(@Req() request: Request, @Res() response: Response) {
    if (!request.user?.uid) {
      return response.status(401).json({ enabled: false, linked: false, hasPassword: false });
    }
    return response.json(await this.oidcService.account(request.user.uid));
  }

  @Get('/start')
  async start(
    @QueryParam('returnTo') returnTo: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    try {
      const location = await this.oidcService.begin(request, response, 'login', returnTo);
      return response.redirect(location);
    } catch {
      logger.error('oidc start failed');
      return response.redirect('/auth?oidc_error=OIDC_UNAVAILABLE');
    }
  }

  @Get('/bind/start')
  async bindStart(@Req() request: Request, @Res() response: Response) {
    try {
      const location = await this.oidcService.begin(request, response, 'bind', undefined);
      return response.redirect(location);
    } catch {
      logger.error('oidc bind start failed');
      return response.redirect('/settings/account?oidc_error=OIDC_UNAVAILABLE');
    }
  }

  @Get('/callback')
  async callback(@Req() request: Request, @Res() response: Response) {
    try {
      const location = await this.oidcService.complete(request, response);
      return response.redirect(location);
    } catch {
      logger.error('oidc callback failed');
      return response.redirect('/auth?oidc_error=OIDC_UNAVAILABLE');
    }
  }
}
