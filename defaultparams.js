// ======================================================
//  Default Parameter Transformer (ES6 → ES5)
//  Supports:
//    - function foo(a = 1, b = a + 2) {}
//    - const f = function(a = 1) {}
//    - methods: class X { m(a = 1) {} }
//    - export function foo(a = 1) {}
//  Non-goals:
//    - destructuring defaults (handled separately)
// ======================================================

(function (global) {
    "use strict";

    function transformDefaultParams(source) {
        var out = "";
        var i = 0;
        var len = source.length;

        while (i < len) {
            // Look for "function" or method shorthand
            var funcMatch = matchFunction(source, i);
            if (!funcMatch) {
                out += source.charAt(i++);
                continue;
            }

            // Emit everything before the function
            out += source.slice(i, funcMatch.start);
            i = funcMatch.start;

            // Extract function header and body
            var header = funcMatch.header;
            var body = funcMatch.body;
            var end = funcMatch.end;

            // Parse parameters
            var params = parseParams(header);

            // If no defaults, output unchanged
            if (!params.hasDefaults) {
                out += header + body;
                i = end;
                continue;
            }

            // Build rewritten function
            var rewritten = rewriteFunctionWithDefaults(header, body, params);
            out += rewritten;
            i = end;
        }

        return out;
    }

    // ------------------------------------------------------
    // Match a function declaration/expression/method
    // ------------------------------------------------------
    function matchFunction(src, pos) {
        // Look for "function" keyword or method shorthand inside classes
        var funcRegex = /\bfunction\b|\b[A-Za-z0-9_$]+\s*\(/g;
        funcRegex.lastIndex = pos;
        var m = funcRegex.exec(src);
        if (!m) return null;

        var start = m.index;

        // Find parameter list
        var parenStart = src.indexOf("(", start);
        if (parenStart === -1) return null;

        var parenEnd = findMatchingParen(src, parenStart);
        if (parenEnd === -1) return null;

        var header = src.slice(start, parenEnd + 1);

        // Find function body (must start with "{")
        var braceStart = src.indexOf("{", parenEnd);
        if (braceStart === -1) return null;

        var braceEnd = findMatchingBrace(src, braceStart);
        if (braceEnd === -1) return null;

        var body = src.slice(braceStart, braceEnd + 1);

        return {
            start: start,
            header: header,
            body: body,
            end: braceEnd + 1
        };
    }

    // ------------------------------------------------------
    // Parse parameters and detect defaults
    // ------------------------------------------------------
    function parseParams(header) {
        var parenStart = header.indexOf("(");
        var parenEnd = header.lastIndexOf(")");
        var inside = header.slice(parenStart + 1, parenEnd).trim();

        if (!inside) {
            return { params: [], defaults: [], hasDefaults: false };
        }

        var parts = inside.split(",");
        var params = [];
        var defaults = [];
        var hasDefaults = false;

        for (var i = 0; i < parts.length; i++) {
            var p = parts[i].trim();
            var eq = p.indexOf("=");

            if (eq === -1) {
                params.push(p);
                defaults.push(null);
            } else {
                var name = p.slice(0, eq).trim();
                var def = p.slice(eq + 1).trim();
                params.push(name);
                defaults.push(def);
                hasDefaults = true;
            }
        }

        return {
            params: params,
            defaults: defaults,
            hasDefaults: hasDefaults
        };
    }

    // ------------------------------------------------------
    // Rewrite function with default parameter logic
    // ------------------------------------------------------
    function rewriteFunctionWithDefaults(header, body, info) {
        var params = info.params;
        var defaults = info.defaults;

        // Rebuild header without defaults
        var parenStart = header.indexOf("(");
        var parenEnd = header.lastIndexOf(")");
        var before = header.slice(0, parenStart + 1);
        var after = header.slice(parenEnd);

        var newHeader = before + params.join(", ") + after;

        // Build default assignments
        var assigns = "";
        for (var i = 0; i < params.length; i++) {
            if (defaults[i] !== null) {
                assigns += "if (" + params[i] + " === undefined) " + params[i] + " = " + defaults[i] + ";\n";
            }
        }

        // Insert assignments at start of body
        var bodyInner = body.slice(1, -1); // remove { }
        var newBody = "{\n" + assigns + bodyInner + "\n}";

        return newHeader + newBody;
    }

    // ------------------------------------------------------
    // Utility: find matching parentheses/braces
    // ------------------------------------------------------
    function findMatchingParen(src, pos) {
        var depth = 0;
        for (var i = pos; i < src.length; i++) {
            var c = src.charAt(i);
            if (c === "(") depth++;
            else if (c === ")") {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    function findMatchingBrace(src, pos) {
        var depth = 0;
        for (var i = pos; i < src.length; i++) {
            var c = src.charAt(i);
            if (c === "{") depth++;
            else if (c === "}") {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    // ------------------------------------------------------
    // Public API
    // ------------------------------------------------------
    global.ESDefaultParamPolyfill = {
        transform: transformDefaultParams
    };

})(this);