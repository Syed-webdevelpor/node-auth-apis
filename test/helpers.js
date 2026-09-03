const assert = require("node:assert/strict");

/**
 * Minimal in-memory Redis fake implementing the subset of commands used by
 * the OTP security services (atomic INCR/EXPIRE via eval, SET NX EX, GET,
 * GETDEL, DEL). Preserves the atomicity semantics the real client provides.
 */
class FakeRedis {
  constructor() {
    this.store = new Map();
    this.failNext = false;
  }

  _check() {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("redis unavailable");
    }
  }

  async eval(_script, opts) {
    this._check();
    const key = opts.keys[0];
    const ttl = Number(opts.arguments[0]);
    const prev = this.store.get(key);
    const count = (prev ? prev.count : 0) + 1;
    const expireAt = prev ? prev.expireAt : Date.now() / 1000 + ttl;
    this.store.set(key, { count, expireAt });
    return count;
  }

  async set(key, _value, opts) {
    this._check();
    if (opts && opts.NX && this.store.has(key)) return null;
    const ttl = opts && opts.EX ? Number(opts.EX) : null;
    this.store.set(key, {
      count: 1,
      expireAt: ttl ? Date.now() / 1000 + ttl : Infinity,
    });
    return "OK";
  }

  async get(key) {
    this._check();
    const rec = this.store.get(key);
    if (!rec) return null;
    if (rec.expireAt < Date.now() / 1000) {
      this.store.delete(key);
      return null;
    }
    return "1";
  }

  async getDel(key) {
    const val = await this.get(key);
    this.store.delete(key);
    return val;
  }

  async del(key) {
    this._check();
    this.store.delete(key);
    return 1;
  }
}

function makeFakeRedis() {
  return new FakeRedis();
}

function stubModule(moduleObj, name, implementation) {
  const original = moduleObj[name];
  moduleObj[name] = implementation;
  return () => {
    moduleObj[name] = original;
  };
}

module.exports = { makeFakeRedis, stubModule, assert };