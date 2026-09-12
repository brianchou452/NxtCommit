import type { Express } from 'express';
import type { ServiceContext } from '../services/context.js';
import type { RouteModule } from './types.js';
import { homeRoutes } from './home.js';
import { operationsRoutes } from './operations.js';
import { communityRoutes } from './community.js';
import { missionsRoutes } from './missions.js';
import { executionRoutes } from './execution.js';
import { authoringRoutes } from './authoring.js';
import { reviewRoutes } from './review.js';

/** A owns this registry; slices export independent modules. */
export const routeModules: readonly RouteModule[] = [homeRoutes, communityRoutes, missionsRoutes, executionRoutes, authoringRoutes, reviewRoutes, operationsRoutes];
export function registerRoutes(app: Express, context: ServiceContext, modules = routeModules): void {
  for (const register of modules) app.use(register(context));
}
