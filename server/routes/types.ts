import type { Router } from 'express';
import type { ServiceContext } from '../services/context.js';
export type RouteModule = (context: ServiceContext) => Router;
