// === ES5 "class" runtime for IE10/IE11 ===
// Inject this once per page before any transformed scripts run.

(function (global) {
    "use strict";

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

    function _possibleConstructorReturn(self, call) {
        if (call && (typeof call === "object" || typeof call === "function")) {
            return call;
        }
        return _assertThisInitialized(self);
    }

    function _assertThisInitialized(self) {
        if (self === void 0) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }
        return self;
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

})(this);