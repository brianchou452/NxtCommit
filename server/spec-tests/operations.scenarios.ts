import { test } from 'node:test';
import { operationsCases } from '../test-support/authoring.js';

/**
 * Spec: api.health
 * Scenario: health-route-is-liveness-only
 * Given The server process accepts HTTP even when configured execution is refused.
 * When Health is requested.
 * Then It returns liveness and non-secret refusal context without failing the process probe.
 */
test('api.health / health-route-is-liveness-only', operationsCases['health-route-is-liveness-only']!);

/**
 * Spec: api.metrics
 * Scenario: metrics-route-exposes-bounded-observations
 * Given The server is running.
 * When Metrics are scraped.
 * Then Text exposition includes serving build identity and no secret or unbounded repository labels.
 */
test('api.metrics / metrics-route-exposes-bounded-observations', operationsCases['metrics-route-exposes-bounded-observations']!);

/**
 * Spec: api.readiness
 * Scenario: readiness-reflects-serving-dependencies
 * Given Database and queue-worker readiness may differ from execution-mode consent.
 * When Readiness is requested.
 * Then HTTP status follows serving dependencies while any execution refusal is reported without credentials.
 */
test('api.readiness / readiness-reflects-serving-dependencies', operationsCases['readiness-reflects-serving-dependencies']!);
