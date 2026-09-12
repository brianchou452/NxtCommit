import type { Response } from "express";
/** A process-local invalidation transport. REST and SQLite remain authoritative. */
export class GlobalStream {
  private clients = new Set<Response>();
  connect(response: Response) {
    response.set({
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    });
    response.flushHeaders();
    response.write(": connected\n\n");
    this.clients.add(response);
    const timer = setInterval(
      () => this.send(response, "heartbeat", {}),
      15000,
    );
    timer.unref();
    response.on("close", () => {
      clearInterval(timer);
      this.clients.delete(response);
    });
  }
  private send(response: Response, name: string, payload: unknown) {
    if (!response.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`))
      response.end();
  }
  publish(
    name:
      | "mission_update"
      | "run_update"
      | "achievement"
      | "exec_event"
      | "heartbeat",
    payload: unknown,
  ) {
    for (const response of this.clients) this.send(response, name, payload);
  }
  close() {
    for (const response of this.clients) response.end();
    this.clients.clear();
  }
}
