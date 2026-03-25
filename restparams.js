// Rest-parameters wrapper for IE / ES5
function __restParams(fn, startIndex) {
    startIndex = startIndex == null ? fn.length - 1 : startIndex;

    return function () {
        var len = arguments.length;
        var normalArgsCount = startIndex;
        var restCount = len > normalArgsCount ? len - normalArgsCount : 0;

        var args = new Array(normalArgsCount + 1);
        var i;

        // Copy fixed parameters
        for (i = 0; i < normalArgsCount && i < len; i++) {
            args[i] = arguments[i];
        }

        // Build rest array
        var rest = new Array(restCount);
        for (i = 0; i < restCount; i++) {
            rest[i] = arguments[normalArgsCount + i];
        }

        // Last argument is the rest array
        args[normalArgsCount] = rest;

        return fn.apply(this, args);
    };
}