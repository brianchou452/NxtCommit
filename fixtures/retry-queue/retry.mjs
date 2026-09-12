export function retryDelay(attempt) {
  return attempt * 100;
}
