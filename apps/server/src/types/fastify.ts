import { FastifyRequest, RouteGenericInterface } from 'fastify';
import { FastifyJWT } from '@fastify/jwt';

export interface RequestWithUser<
  T extends RouteGenericInterface = RouteGenericInterface,
> extends FastifyRequest<T> {
  user: FastifyJWT['user'];
}
