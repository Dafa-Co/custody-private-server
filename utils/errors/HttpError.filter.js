"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpErrorFilter = void 0;
require("dotenv/config");
var common_1 = require("@nestjs/common");
var HttpErrorFilter = function () {
    var _HttpErrorFilter_instances, _HttpErrorFilter_writeToLog;
    var _classDecorators = [(0, common_1.Catch)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HttpErrorFilter = _classThis = /** @class */ (function () {
        function HttpErrorFilter_1() {
            _HttpErrorFilter_instances.add(this);
            this.logger = new common_1.Logger();
        }
        HttpErrorFilter_1.prototype.catch = function (exception, host) {
            var ctx = host.switchToHttp();
            var request = ctx.getRequest();
            var response = ctx.getResponse();
            console.log('exception', exception);
            var status = exception instanceof common_1.HttpException
                ? exception.getStatus()
                : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            var message = exception instanceof common_1.HttpException
                ? exception.message || exception.message['error']
                : 'Internal server error';
            var devErrorResponse = {
                status: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
                source: request.constructor.name,
                errorName: exception === null || exception === void 0 ? void 0 : exception.name,
                message: exception === null || exception === void 0 ? void 0 : exception.message,
            };
            var prodErrorResponse = {
                status: status,
                message: message,
            };
            var responseData = process.env.NODE_ENV === 'DEVELOPMENT'
                ? devErrorResponse
                : prodErrorResponse;
            __classPrivateFieldGet(this, _HttpErrorFilter_instances, "m", _HttpErrorFilter_writeToLog).call(this, request, exception, status);
            this.logger.log("request method: ".concat(request.method, " request url").concat(request.url), JSON.stringify(responseData));
            var errors = exception instanceof common_1.HttpException
                ? exception['response'] : { error: 'internal server error' };
            response.status(status).json({
                status: status,
                message: message,
                errors: errors
            });
        };
        return HttpErrorFilter_1;
    }());
    _HttpErrorFilter_instances = new WeakSet();
    _HttpErrorFilter_writeToLog = function _HttpErrorFilter_writeToLog(request, exception, status) {
        var _a;
        var data = {
            url: request.url,
            method: request.method,
            req_body: request.body,
            code: status,
            message: exception.message,
            user_id: (_a = request.user) === null || _a === void 0 ? void 0 : _a.id,
            timestamp: new Date().toISOString(),
        };
    };
    __setFunctionName(_classThis, "HttpErrorFilter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HttpErrorFilter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HttpErrorFilter = _classThis;
}();
exports.HttpErrorFilter = HttpErrorFilter;
