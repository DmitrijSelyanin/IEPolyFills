// IE10-safe helpers for "destructuring"

function _toArray(iterable) {
    if (Array.isArray(iterable)) return iterable;
    if (iterable != null && typeof iterable.length === "number") {
        var arr = [];
        for (var i = 0; i < iterable.length; i++) arr.push(iterable[i]);
        return arr;
    }
    throw new TypeError("Invalid attempt to destructure non-iterable instance.");
}

function _slicedToArray(arr, i) {
    arr = _toArray(arr);
    if (i == null || i >= arr.length) return arr;
    var out = [];
    for (var j = 0; j < i; j++) out[j] = arr[j];
    return out;
}

function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};
    var target = {};
    for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key) &&
            excluded.indexOf(key) === -1) {
            target[key] = source[key];
        }
    }
    return target;
}