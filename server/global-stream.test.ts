import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Response } from "express";
import { GlobalStream } from "./services/global-stream.js";

test("global invalidation removes slow or ended subscribers before asynchronous close", () => {
  const events = new GlobalStream();
  const response = new EventEmitter() as EventEmitter & {
    writableEnded: boolean;
    destroyed: boolean;
    set: () => void;
    flushHeaders: () => void;
    write: () => boolean;
    end: () => void;
  };
  let writes = 0;
  response.writableEnded = false;
  response.destroyed = false;
  response.set = response.flushHeaders = () => {};
  response.write = () => {
    assert.equal(response.writableEnded, false);
    writes++;
    return writes === 1;
  };
  response.end = () => {
    response.writableEnded = true;
  };
  events.connect(response as unknown as Response);
  events.publish("mission_update", {});
  events.publish("mission_update", {});
  assert.equal(writes, 2);
  response.emit("close");
  events.close();
});
