import {
  FastifyReply,
  RouteHandlerMethod,
  RouteGenericInterface,
} from 'fastify';
import { RequestWithUser } from '../types/fastify.js';

// 用于需要认证的路由
export function withUser<T extends RouteGenericInterface>(
  handler: (
    request: RequestWithUser<T>,
    reply: FastifyReply
  ) => Promise<unknown>
): RouteHandlerMethod {
  return (request, reply) => handler(request as RequestWithUser<T>, reply);
}
