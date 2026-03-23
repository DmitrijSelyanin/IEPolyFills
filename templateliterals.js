// ======================================================
//  Template Literal Transformer (ES6 → ES5)
//  Supports:
//    - Basic templates
//    - Interpolations
//    - Multi-part templates
//    - Tagged templates
// ======================================================

(function (global) {
    "use strict";

    function transformTemplateLiterals(source) {
        var out = "";
        var i = 0;
        var len = source.length;

        while (i < len) {
            var ch = source.charAt(i);

            // Look for backtick `
            if (ch === "`") {
                var start = i;
                i++;

                var parts = [];
                var exprs = [];
                var current = "";

                var inExpr = false;
                var braceDepth = 0;

                while (i < len) {
                    var c = source.charAt(i);

                    // Escape sequence
                    if (c === "\\" && i + 1 < len) {
                        current += c + source.charAt(i + 1);
                        i += 2;
                        continue;
                    }

                    // Expression start: ${
                    if (!inExpr && c === "$" && source.charAt(i + 1) === "{") {
                        parts.push(current);
                        current = "";
                        inExpr = true;
                        braceDepth = 0;
                        i += 2;
                        continue;
                    }

                    // Expression end: }
                    if (inExpr && c === "}") {
                        if (braceDepth === 0) {
                            exprs.push(current);
                            current = "";
                            inExpr = false;
                            i++;
                            continue;
                        } else {
                            braceDepth--;
                            current += c;
                            i++;
                            continue;
                        }
                    }

                    // Nested braces inside expression
                    if (inExpr && c === "{") {
                        braceDepth++;
                        current += c;
                        i++;
                        continue;
                    }

                    // Template end: `
                    if (!inExpr && c === "`") {
                        parts.push(current);
                        i++;
                        break;
                    }

                    // Normal character
                    current += c;
                    i++;
                }

                // Build ES5 string concatenation
                if (exprs.length === 0) {
                    // Simple template: `foo`
                    out += JSON.stringify(parts[0]);
                } else {
                    // Interpolated template
                    var result = "";

                    for (var p = 0; p < parts.length; p++) {
                        if (p > 0) result += " + ";
                        result += JSON.stringify(parts[p]);
                        if (p < exprs.length) {
                            result += " + (" + exprs[p] + ")";
                        }
                    }

                    out += result;
                }

                continue;
            }

            // Not a template literal
            out += ch;
            i++;
        }

        return out;
    }

    global.ESTemplateLiteralPolyfill = {
        transform: transformTemplateLiterals
    };

})(this);