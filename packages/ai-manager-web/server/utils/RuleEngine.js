"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
var RuleEngine = /** @class */ (function () {
    function RuleEngine() {
        this.rules = [];
    }
    RuleEngine.prototype.registerRule = function (rule) {
        this.rules.push(rule);
    };
    RuleEngine.prototype.evaluateAll = function (context) {
        var diagnostics = [];
        for (var _i = 0, _a = this.rules; _i < _a.length; _i++) {
            var rule = _a[_i];
            var results = rule.evaluate(context);
            diagnostics.push.apply(diagnostics, results);
        }
        return diagnostics;
    };
    return RuleEngine;
}());
exports.RuleEngine = RuleEngine;
