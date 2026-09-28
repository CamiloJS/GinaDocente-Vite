// Lightweight polyfills to ensure 100% compatibility with older browsers and computers

// 1. globalThis polyfill
(function() {
  if (typeof globalThis === 'undefined') {
    if (typeof self !== 'undefined') {
      self.globalThis = self;
    } else if (typeof window !== 'undefined') {
      window.globalThis = window;
    } else if (typeof global !== 'undefined') {
      global.globalThis = global;
    }
  }
})();

// 2. Object.fromEntries polyfill
if (!Object.fromEntries) {
  Object.fromEntries = function(entries) {
    if (!entries || !entries[Symbol.iterator]) {
      throw new TypeError('Object.fromEntries requires an iterable');
    }
    var obj = {};
    var iter = entries[Symbol.iterator]();
    var step;
    while (!(step = iter.next()).done) {
      var pair = step.value;
      if (Object(pair) !== pair) {
        throw new TypeError('Iterator value must be an entry object');
      }
      obj[pair[0]] = pair[1];
    }
    return obj;
  };
}

// 3. Object.hasOwn polyfill
if (!Object.hasOwn) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 4. Array.prototype.flat polyfill
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth) {
    var d = typeof depth === 'number' ? depth : 1;
    var result = [];
    (function flatten(arr, curDepth) {
      for (var i = 0; i < arr.length; i++) {
        if (i in arr) {
          var val = arr[i];
          if (Array.isArray(val) && curDepth > 0) {
            flatten(val, curDepth - 1);
          } else {
            result.push(val);
          }
        }
      }
    })(this, d);
    return result;
  };
}

// 5. Array.prototype.flatMap polyfill
if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function(callback, thisArg) {
    return this.map(callback, thisArg).flat();
  };
}

// 6. Array.prototype.at polyfill
if (!Array.prototype.at) {
  Array.prototype.at = function(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 7. String.prototype.at polyfill
if (!String.prototype.at) {
  String.prototype.at = function(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this.charAt(n);
  };
}

// 8. String.prototype.replaceAll polyfill
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(searchValue, replaceValue) {
    if (searchValue instanceof RegExp) {
      if (!searchValue.global) {
        throw new TypeError('String.prototype.replaceAll called with a non-global RegExp');
      }
      return this.replace(searchValue, replaceValue);
    }
    return this.split(searchValue).join(replaceValue);
  };
}

// 9. Promise.allSettled polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      Array.from(promises).map(function(p) {
        return Promise.resolve(p).then(
          function(value) { return { status: 'fulfilled', value: value }; },
          function(reason) { return { status: 'rejected', reason: reason }; }
        );
      })
    );
  };
}

// 10. Promise.any polyfill
if (!Promise.any) {
  Promise.any = function(promises) {
    return new Promise(function(resolve, reject) {
      var arr = Array.from(promises);
      if (arr.length === 0) {
        return reject(new Error('All promises were rejected'));
      }
      var errors = [];
      var rejectedCount = 0;
      arr.forEach(function(p, i) {
        Promise.resolve(p).then(
          resolve,
          function(err) {
            errors[i] = err;
            rejectedCount++;
            if (rejectedCount === arr.length) {
              reject(new Error('All promises were rejected: ' + errors.join(', ')));
            }
          }
        );
      });
    });
  };
}

// 11. queueMicrotask polyfill
if (typeof queueMicrotask !== 'function') {
  window.queueMicrotask = function(callback) {
    Promise.resolve().then(callback).catch(function(err) {
      setTimeout(function() { throw err; }, 0);
    });
  };
}

// 12. structuredClone fallback polyfill
if (typeof structuredClone !== 'function') {
  window.structuredClone = function(obj) {
    if (obj === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  };
}

// 13. crypto.randomUUID fallback polyfill
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = function() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function(c) {
      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
    });
  };
}

// 14. Performance.now polyfill for old devices
if (typeof performance === 'undefined') {
  window.performance = {};
}
if (!performance.now) {
  var nowOffset = Date.now();
  performance.now = function() {
    return Date.now() - nowOffset;
  };
}
