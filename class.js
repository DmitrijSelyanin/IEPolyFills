// ======================================================
//  ES6 "class" → ES5 polyfill core (runtime + transformer)
//  Designed for IE10/IE11, no BHO logic included.
// ======================================================

(function (global) {
    "use strict";

    // -----------------------------
    // 1. Runtime helpers (Babel-style)
    // -----------------------------

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = !!descriptor.enumerable;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }

    function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        return Constructor;
    }

    function _getPrototypeOf(o) {
        _getPrototypeOf = Object.setPrototypeOf
            ? Object.getPrototypeOf
            : function (o) { return o.__proto__ || Object.getPrototypeOf(o); };
        return _getPrototypeOf(o);
    }

    function _setPrototypeOf(o, p) {
        _setPrototypeOf = Object.setPrototypeOf ||
            function (o, p) { o.__proto__ = p; return o; };
        return _setPrototypeOf(o, p);
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function");
        }
        subClass.prototype = Object.create(
            superClass && superClass.prototype,
            { constructor: { value: subClass, writable: true, configurable: true } }
        );
        if (superClass) _setPrototypeOf(subClass, superClass);
    }

    function _assertThisInitialized(self) {
        if (self === void 0) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }
        return self;
    }

    function _possibleConstructorReturn(self, call) {
        if (call && (typeof call === "object" || typeof call === "function")) {
            return call;
        }
        return _assertThisInitialized(self);
    }

    function _createSuper(Derived) {
        var hasNativeReflectConstruct = typeof Reflect === "object" &&
            typeof Reflect.construct === "function";

        return function _createSuperInternal() {
            var Super = _getPrototypeOf(Derived);
            var result;
            if (hasNativeReflectConstruct) {
                result = Reflect.construct(Super, arguments, Derived);
            } else {
                Super.apply(this, arguments);
                result = this;
            }
            return _possibleConstructorReturn(this, result);
        };
    }

    // Expose helpers globally for transformed code
    global._classCallCheck = _classCallCheck;
    global._createClass = _createClass;
    global._inherits = _inherits;
    global._createSuper = _createSuper;
    global._possibleConstructorReturn = _possibleConstructorReturn;
    global._assertThisInitialized = _assertThisInitialized;
    global._getPrototypeOf = _getPrototypeOf;
    global._setPrototypeOf = _setPrototypeOf;

    // -----------------------------
    // 2. Minimal class transformer
    // -----------------------------
    //
    // This is a *very* small, pattern-based transformer.
    // It is NOT a full ES parser. It’s good for:
    //   - class Foo { ... }
    //   - class Foo extends Bar { ... }
    //   - constructor(...)
    //   - instance methods
    //   - static methods
    //
    // You call:
    //   var out = ES6ClassPolyfill.transform(source);
    //   eval(out);  // or inject into a <script>

    function transformClasses(source) {
        // Very naive tokenizer for "class" blocks.
        // We scan for "class <Name> [extends <Base>] { ... }"
        var result = "";
        var index = 0;
        var len = source.length;

        while (index < len) {
            var classPos = source.indexOf("class ", index);
            if (classPos === -1) {
                // No more classes, append the rest
                result += source.slice(index);
                break;
            }

            // Append everything before the class
            result += source.slice(index, classPos);

            // Move index to after "class "
            var i = classPos + 6;

            // Skip whitespace
            while (i < len && /\s/.test(source.charAt(i))) i++;

            // Read class name
            var nameStart = i;
            while (i < len && /[A-Za-z0-9_$]/.test(source.charAt(i))) i++;
            var className = source.slice(nameStart, i);

            // Skip whitespace
            while (i < len && /\s/.test(source.charAt(i))) i++;

            // Check for "extends"
            var superClass = null;
            if (source.slice(i, i + 7) === "extends") {
                i += 7;
                while (i < len && /\s/.test(source.charAt(i))) i++;
                var superStart = i;
                while (i < len && /[A-Za-z0-9_.$]/.test(source.charAt(i))) i++;
                superClass = source.slice(superStart, i);
                while (i < len && /\s/.test(source.charAt(i))) i++;
            }

            // Next must be "{"
            if (source.charAt(i) !== "{") {
                // Not a real class, just bail and copy literally
                result += source.slice(classPos, i + 1);
                index = i + 1;
                continue;
            }

            // Find matching "}" for the class body
            var bodyStart = i + 1;
            var braceDepth = 1;
            i = bodyStart;
            while (i < len && braceDepth > 0) {
                var ch = source.charAt(i);
                if (ch === "{") braceDepth++;
                else if (ch === "}") braceDepth--;
                i++;
            }
            var bodyEnd = i - 1;
            var classBody = source.slice(bodyStart, bodyEnd);

            // Transform the class body into constructor + methods
            var transformed = transformSingleClass(className, superClass, classBody);

            result += transformed;
            index = i; // continue after the class
        }

        return result;
    }

    function transformSingleClass(className, superClass, body) {
        // Parse body line-by-line (very naive).
        // We expect patterns like:
        //   constructor(...) { ... }
        //   methodName(...) { ... }
        //   static methodName(...) { ... }

        var lines = splitTopLevel(body);
        var ctor = null;
        var protoMethods = [];
        var staticMethods = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            var isStatic = false;
            if (startsWithWord(line, "static")) {
                isStatic = true;
                line = line.replace(/^static\s+/, "");
            }

            if (startsWithWord(line, "constructor")) {
                // constructor(...)
                var ctorSigEnd = line.indexOf("{");
                var ctorHeader = line.slice(0, ctorSigEnd).trim(); // "constructor(...)"
                var ctorBody = extractBlockBody(line, lines, i);
                ctor = {
                    header: ctorHeader,
                    body: ctorBody.body,
                    consumedLines: ctorBody.consumedLines
                };
                i += ctor.consumedLines;
            } else {
                // methodName(...)
                var methodSigEnd = line.indexOf("{");
                if (methodSigEnd === -1) continue;
                var methodHeader = line.slice(0, methodSigEnd).trim(); // "name(...)" or "[computed](...)"
                var methodBody = extractBlockBody(line, lines, i);
                var methodName = methodHeader.split("(")[0].trim();

                var method = {
                    name: methodName,
                    header: methodHeader,
                    body: methodBody.body,
                    consumedLines: methodBody.consumedLines
                };

                if (isStatic) staticMethods.push(method);
                else protoMethods.push(method);

                i += method.consumedLines;
            }
        }

        // Build ES5 output
        var out = [];
        var hasSuper = !!superClass;

        if (!ctor) {
            // Default constructor
            if (hasSuper) {
                out.push("var " + className + " = /*#__PURE__*/(function (_Super) {");
                out.push("  _inherits(" + className + ", _Super);");
                out.push("  var _super = _createSuper(" + className + ");");
                out.push("  function " + className + "() {");
                out.push("    _classCallCheck(this, " + className + ");");
                out.push("    return _super.apply(this, arguments);");
                out.push("  }");
            } else {
                out.push("var " + className + " = /*#__PURE__*/(function () {");
                out.push("  function " + className + "() {");
                out.push("    _classCallCheck(this, " + className + ");");
                out.push("  }");
            }
        } else {
            if (hasSuper) {
                out.push("var " + className + " = /*#__PURE__*/(function (_Super) {");
                out.push("  _inherits(" + className + ", _Super);");
                out.push("  var _super = _createSuper(" + className + ");");
                out.push("  function " + className + ctor.header.replace("constructor", "") + " {");
                out.push("    _classCallCheck(this, " + className + ");");
                // naive: assume user calls super() themselves if needed
                out.push(ctor.body);
                out.push("  }");
            } else {
                out.push("var " + className + " = /*#__PURE__*/(function () {");
                out.push("  function " + className + ctor.header.replace("constructor", "") + " {");
                out.push("    _classCallCheck(this, " + className + ");");
                out.push(ctor.body);
                out.push("  }");
            }
        }

        // Build proto methods
        if (protoMethods.length > 0 || staticMethods.length > 0) {
            out.push("  _createClass(" + className + ", [");
            for (var j = 0; j < protoMethods.length; j++) {
                var m = protoMethods[j];
                out.push("    {");
                out.push("      key: " + JSON.stringify(m.name) + ",");
                out.push("      value: function " + m.header + " {");
                out.push(m.body);
                out.push("      }");
                out.push("    }" + (j === protoMethods.length - 1 && staticMethods.length === 0 ? "" : ","));
            }
            out.push("  ], [");
            for (var k = 0; k < staticMethods.length; k++) {
                var sm = staticMethods[k];
                out.push("    {");
                out.push("      key: " + JSON.stringify(sm.name) + ",");
                out.push("      value: function " + sm.header + " {");
                out.push(sm.body);
                out.push("      }");
                out.push("    }" + (k === staticMethods.length - 1 ? "" : ","));
            }
            out.push("  ]);");
        }

        if (hasSuper) {
            out.push("  return " + className + ";");
            out.push("})(" + superClass + ");");
        } else {
            out.push("  return " + className + ";");
            out.push("})();");
        }

        return out.join("\n");
    }

    // -----------------------------
    // 3. Tiny helpers for body parsing
    // -----------------------------

    function splitTopLevel(body) {
        // Split by newlines but keep braces balanced.
        var lines = body.split("\n");
        return lines;
    }

    function startsWithWord(str, word) {
        return str.indexOf(word) === 0 &&
            (str.length === word.length || /\s|\(/.test(str.charAt(word.length)));
    }

    function extractBlockBody(firstLine, lines, index) {
        // firstLine contains "xxx(...) { ...maybe... "
        var line = firstLine;
        var bracePos = line.indexOf("{");
        var body = line.slice(bracePos + 1);
        var depth = 1;
        var consumed = 0;

        for (var i = index + 1; i < lines.length && depth > 0; i++) {
            var l = lines[i];
            for (var j = 0; j < l.length; j++) {
                var ch = l.charAt(j);
                if (ch === "{") depth++;
                else if (ch === "}") depth--;
            }
            if (depth > 0) {
                body += "\n" + l;
            } else {
                // last line, strip trailing "}" and keep rest
                var lastIndex = l.lastIndexOf("}");
                if (lastIndex > -1) {
                    body += "\n" + l.slice(0, lastIndex);
                }
            }
            consumed++;
        }

        return {
            body: body,
            consumedLines: consumed
        };
    }

    // -----------------------------
    // 4. Public API
    // -----------------------------

    var ES6ClassPolyfill = {
        transform: function (source) {
            return transformClasses(source);
        }
    };

    global.ES6ClassPolyfill = ES6ClassPolyfill;

})(this);