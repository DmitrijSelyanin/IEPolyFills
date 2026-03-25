/* ============================================================
   ES6 SPREAD OPERATOR POLYFILLS FOR IE (ARRAY, OBJECT, CALL)
   Clean ES5, no dependencies, safe for Trident
   ============================================================ */

/* ------------------------------
   Array spread: [...a, ...b]
   ------------------------------ */
function __spreadArray(target, source) {
    var i, len = source.length;
    for (i = 0; i < len; i++) {
        target.push(source[i]);
    }
    return target;
}

/* ------------------------------
   Object spread: { ...a, ...b }
   ------------------------------ */
function __spreadObject(target, source) {
    for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
        }
    }
    return target;
}

/* ------------------------------
   Spread call: fn(...args)
   ------------------------------ */
function __spreadCall(fn, thisArg, argsArray) {
    return fn.apply(thisArg, argsArray);
}

/* ------------------------------
   Optional unified array spread:
   __spread(a, b, [3,4], 5)
   ------------------------------ */
function __spread() {
    var result = [];
    var i, j, arr;

    for (i = 0; i < arguments.length; i++) {
        arr = arguments[i];

        // Expand array-like
        if (arr && typeof arr.length === "number") {
            for (j = 0; j < arr.length; j++) {
                result.push(arr[j]);
            }
        } else {
            // Push single value
            result.push(arr);
        }
    }

    return result;
}