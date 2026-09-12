// User-authorized deadline: 2026-09-13 01:00 Asia/Taipei.
export const SHUTDOWN_AT = Date.parse('2026-09-12T17:00:00Z');
export const hasExpired = (now = Date.now()) => now >= SHUTDOWN_AT;
