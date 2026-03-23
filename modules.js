// ======================================================
//  ES Module Polyfill: Runtime + Transformer
//  Target: IE10/IE11 (ES5 only)
//  Features:
//    - import default / named / namespace
//    - export default / named / re-exports
//    - relative path resolution
//    - CommonJS-style execution model
//  Non-goals:
//    - dynamic import()
//    - top-level await
//    - perfect ES spec live-binding semantics (we approximate)
// ======================================================

(function (global) {
    "use strict";

    // ==================================================
    // 1. RUNTIME: MODULE REGISTRY + LOADER
    // ==================================================

    var ModuleRegistry = {}; // path -> { factory, exports, executed }

    function resolvePath(base, relative) {
        if (!relative || relative.charAt(0) !== ".") {
            // Absolute or "bare" specifier (you can map these in C++ if desired)
            return relative;
        }

        var baseParts = base.split("/");
        baseParts.pop(); // remove filename

        var relParts = relative.split("/");

        for (var i = 0; i < relParts.length; i++) {
            var part = relParts[i];
            if (part === "." || part === "") continue;
            if (part === "..") {
                baseParts.pop();
            } else {
                baseParts.push(part);
            }
        }

        return baseParts.join("/");
    }

    function __require__(path, fromModule) {
        var fullPath = fromModule ? resolvePath(fromModule, path) : path;

        var mod = ModuleRegistry[fullPath];
        if (!mod) {
            throw new Error("Module not found: " + fullPath);
        }

        if (!mod.executed) {
            mod.executed = true;
            mod.factory(
                function (p) { return __require__(p, fullPath); },
                mod.exports,
                mod
            );
        }

        return mod.exports;
    }

    function __registerModule__(path, factory) {
        ModuleRegistry[path] = {
            factory: factory,
            exports: {},
            executed: false
        };
    }

    global.__require__ = __require__;
    global.__registerModule__ = __registerModule__;

    // ==================================================
    // 2. TRANSFORMER: IMPORT / EXPORT → COMMONJS STYLE
    // ==================================================
    //
    // This is a pragmatic, real-world transformer:
    //  - Handles:
    //      import X from "m";
    //      import * as ns from "m";
    //      import { a, b as c } from "m";
    //      export default ...
    //      export const / let / var
    //      export function / class
    //      export { a, b as c };
    //      export { a, b } from "m";
    //      export * from "m";
    //  - Assumes reasonably formatted code (not minified beyond recognition).
    //  - Not a full ES parser, but robust enough for typical app/library code.

    function transformModules(source, modulePath) {
        var imports = [];
        var exports = [];
        var reexports = [];
        var hasDefaultExport = false;

        var code = source;

        // -----------------------------
        // 2.1 Handle import statements
        // -----------------------------
        //
        // Patterns:
        //   import X from "m";
        //   import * as ns from "m";
        //   import { a, b as c } from "m";
        //   import "m";
        //
        // We rewrite them into:
        //   var __modN = __require__("m", __modulePath__);
        //   var X = __modN.default;
        //   var ns = __modN;
        //   var a = __modN.a;
        //   var c = __modN.b;
        //   __require__("m", __modulePath__); // side-effect only

        code = code.replace(
            /(^|\s)import\s+([^;]+?)\s*from\s*(['"])([^'"]+)\3\s*;?/g,
            function (match, prefix, clause, quote, spec) {
                var modVar = "__mod_" + imports.length;
                var out = prefix + "var " + modVar + " = __require__(" + quote + spec + quote + ", __modulePath__);\n";

                clause = clause.trim();

                if (clause === "") {
                    // Shouldn't happen here; handled by side-effect import below
                    return out;
                }

                // Default + named / namespace
                // e.g. "Foo", "Foo, { a, b as c }", "{ a, b }", "* as ns"
                var defaultPart = null;
                var namedPart = null;

                // Split on first comma if present
                var commaIndex = clause.indexOf(",");
                if (commaIndex !== -1) {
                    defaultPart = clause.slice(0, commaIndex).trim();
                    namedPart = clause.slice(commaIndex + 1).trim();
                } else {
                    // No comma: either default, named-only, or namespace
                    if (clause.charAt(0) === "{") {
                        namedPart = clause;
                    } else {
                        defaultPart = clause;
                    }
                }

                if (defaultPart) {
                    if (defaultPart.indexOf("* as") === 0) {
                        // import * as ns from "m";
                        var nsName = defaultPart.replace("* as", "").trim();
                        out += "var " + nsName + " = " + modVar + ";\n";
                    } else {
                        // import Foo from "m";
                        out += "var " + defaultPart + " = " + modVar + ".default;\n";
                    }
                }

                if (namedPart) {
                    namedPart = namedPart.trim();
                    if (namedPart.charAt(0) === "{") {
                        // import { a, b as c } from "m";
                        var inner = namedPart.replace(/^\{\s*|\s*\}$/g, "");
                        var parts = inner.split(",");
                        for (var i = 0; i < parts.length; i++) {
                            var p = parts[i].trim();
                            if (!p) continue;
                            var asIndex = p.indexOf(" as ");
                            if (asIndex !== -1) {
                                var orig = p.slice(0, asIndex).trim();
                                var alias = p.slice(asIndex + 4).trim();
                                out += "var " + alias + " = " + modVar + "." + orig + ";\n";
                            } else {
                                out += "var " + p + " = " + modVar + "." + p + ";\n";
                            }
                        }
                    }
                }

                return out;
            }
        );

        // Side-effect only imports: import "m";
        code = code.replace(
            /(^|\s)import\s+(['"])([^'"]+)\2\s*;?/g,
            function (match, prefix, quote, spec) {
                return prefix + "__require__(" + quote + spec + quote + ", __modulePath__);\n";
            }
        );

        // -----------------------------
        // 2.2 Handle export statements
        // -----------------------------
        //
        // Patterns:
        //   export default expr;
        //   export default function Foo() {}
        //   export default class Foo {}
        //   export const a = 1;
        //   export function foo() {}
        //   export class Bar {}
        //   export { a, b as c };
        //   export { a, b } from "m";
        //   export * from "m";

        // export default ...
        code = code.replace(
            /(^|\s)export\s+default\s+([^;]+);?/g,
            function (match, prefix, expr) {
                hasDefaultExport = true;
                return prefix + "var __default_export__ = " + expr + ";\n__exports__.default = __default_export__;\n";
            }
        );

        // export default function Foo() {} / class Foo {}
        code = code.replace(
            /(^|\s)export\s+default\s+(function|class)\s+([A-Za-z0-9_$]+)\s*\(/g,
            function (match, prefix, kind, name) {
                hasDefaultExport = true;
                return prefix + kind + " " + name + "(" + "/*__args__*/";
            }
        );
        // We then rely on the previous rule to catch the trailing "export default Foo;"

        // export const/let/var
        code = code.replace(
            /(^|\s)export\s+(const|let|var)\s+([^;]+);?/g,
            function (match, prefix, kind, decls) {
                // e.g. "a = 1, b = 2"
                var out = prefix + kind + " " + decls + ";\n";
                var parts = decls.split(",");
                for (var i = 0; i < parts.length; i++) {
                    var p = parts[i].trim();
                    if (!p) continue;
                    var eqIndex = p.indexOf("=");
                    var name = eqIndex === -1 ? p : p.slice(0, eqIndex).trim();
                    out += "__exports__." + name + " = " + name + ";\n";
                }
                return out;
            }
        );

        // export function foo() {}
        code = code.replace(
            /(^|\s)export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g,
            function (match, prefix, name) {
                return prefix + "function " + name + "(" + "/*__args__*/";
            }
        );
        // After function body, we’ll attach exports via a simple post-pass:
        // we approximate by scanning for "function name(" and adding __exports__.name = name;

        // export class Foo {}
        code = code.replace(
            /(^|\s)export\s+class\s+([A-Za-z0-9_$]+)\s*\{/g,
            function (match, prefix, name) {
                return prefix + "class " + name + " {";
            }
        );
        // Same idea: we’ll attach __exports__.Foo = Foo; in a post-pass.

        // export { a, b as c };
        code = code.replace(
            /(^|\s)export\s*\{\s*([^}]+)\s*\}\s*;?/g,
            function (match, prefix, inner) {
                var out = prefix;
                var parts = inner.split(",");
                for (var i = 0; i < parts.length; i++) {
                    var p = parts[i].trim();
                    if (!p) continue;
                    var asIndex = p.indexOf(" as ");
                    if (asIndex !== -1) {
                        var orig = p.slice(0, asIndex).trim();
                        var alias = p.slice(asIndex + 4).trim();
                        out += "__exports__." + alias + " = " + orig + ";\n";
                    } else {
                        out += "__exports__." + p + " = " + p + ";\n";
                    }
                }
                return out;
            }
        );

        // export { a, b as c } from "m";
        code = code.replace(
            /(^|\s)export\s*\{\s*([^}]+)\s*\}\s*from\s*(['"])([^'"]+)\3\s*;?/g,
            function (match, prefix, inner, quote, spec) {
                var modVar = "__reexp_" + reexports.length;
                var out = prefix + "var " + modVar + " = __require__(" + quote + spec + quote + ", __modulePath__);\n";
                var parts = inner.split(",");
                for (var i = 0; i < parts.length; i++) {
                    var p = parts[i].trim();
                    if (!p) continue;
                    var asIndex = p.indexOf(" as ");
                    if (asIndex !== -1) {
                        var orig = p.slice(0, asIndex).trim();
                        var alias = p.slice(asIndex + 4).trim();
                        out += "__exports__." + alias + " = " + modVar + "." + orig + ";\n";
                    } else {
                        out += "__exports__." + p + " = " + modVar + "." + p + ";\n";
                    }
                }
                return out;
            }
        );

        // export * from "m";
        code = code.replace(
            /(^|\s)export\s*\*\s*from\s*(['"])([^'"]+)\2\s*;?/g,
            function (match, prefix, quote, spec) {
                var modVar = "__reexp_all_" + reexports.length;
                var out = prefix + "var " + modVar + " = __require__(" + quote + spec + quote + ", __modulePath__);\n";
                out += "for (var __k in " + modVar + ") { if (__k !== 'default' && Object.prototype.hasOwnProperty.call(" + modVar + ", __k)) __exports__[__k] = " + modVar + "[__k]; }\n";
                return out;
            }
        );

        // Post-pass: attach exports for "export function" and "export class"
        // We approximate by scanning for "function name(" and "class name {"
        // that were originally exported.
        // This is heuristic but works well in practice.

        var exportFuncRegex = /(^|\s)function\s+([A-Za-z0-9_$]+)\s*\(/g;
        var exportClassRegex = /(^|\s)class\s+([A-Za-z0-9_$]+)\s*\{/g;

        var extra = "";

        var m;
        while ((m = exportFuncRegex.exec(code)) !== null) {
            var fname = m[2];
            if (source.indexOf("export function " + fname) !== -1) {
                extra += "__exports__." + fname + " = " + fname + ";\n";
            }
        }

        while ((m = exportClassRegex.exec(code)) !== null) {
            var cname = m[2];
            if (source.indexOf("export class " + cname) !== -1) {
                extra += "__exports__." + cname + " = " + cname + ";\n";
            }
        }

        if (extra) {
            code += "\n" + extra;
        }

        // Wrap into __registerModule__
        var wrapped =
            "__registerModule__(\"" + modulePath + "\", function(require, exports, module) {\n" +
            "  var __modulePath__ = " + JSON.stringify(modulePath) + ";\n" +
            "  var __exports__ = exports;\n" +
            code +
            "\n});\n";

        return wrapped;
    }

    // Public API for the transformer
    global.ESModulePolyfill = {
        transform: function (source, modulePath) {
            return transformModules(source, modulePath);
        }
    };

})(this);