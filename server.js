var http = require("http");
var url = require("url");
var querystring = require("querystring");

http.createServer(onRequest).listen(8088);

// Объявим хранилища
var storage = {}, tokens = {}, authStorage = {}, handlers = {};

// Объявим роуты
// Роуты объявляются регулярными выражениями без видимых параметров
registerHandler('POST', setValue, '^\/keys\/new$');
registerHandler('GET', getValue, '^\/keys\/show\/(.*)\/$');
registerHandler('PUT', updateValue, '^\/keys\/update\/(.*)$');
registerHandler('DELETE', deleteValue, '^\/keys\/delete\/?(.*)\/$');

registerHandler('POST', getToken, '^\/auth\/get_token$');
registerHandler('DELETE', releaseToken, '^\/auth\/release_token\/?(.*)?$');

// Тестовые данные для авторизации
authStorage["123456"] = "0dbad3c93acf3cbb67e89cd74cc02e6a0328b10e";

// Базовый коллбек
function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    // Принимаем POST/PUT
    if (request.method == 'POST' || request.method == 'PUT') {
        var postData = '';
        request.setEncoding("utf8");

        request.addListener("data", function (postDataChunk) {
            postData += postDataChunk;
        });

        request.addListener("end", function () {
            matchRoute(request.method, pathname, response, querystring.parse(postData));
        });
    } else {
        matchRoute(request.method, pathname, response, querystring.parse(url.parse(request.url).query));
    }
}

// Роутим
function matchRoute(method, route, response, params) {
    var methodBlock = handlers[method];

    if (methodBlock != undefined) {
        for (var k in methodBlock) {
            var matcher = new RegExp(k);
            if (matcher.test(route)) {
                var param = matcher.exec(route);
                if (param.length > 1) {
                    params['param'] = param[1];
                }
                methodBlock[k](response, params);
            }
        }
    }

    // 404, если нет совпадения
    sendResponse(response, '404 Not Found', 404);
}

// Бизнес-логика

// Авторизация по токенам
function getToken(response, params) {
    var clientId = params.client_id;
    var apiKey = params.api_key;
    var responseBody = '';

    if (clientId == undefined || apiKey == undefined) {
        responseBody = __jsonError('Api key or client ID incorrect');
    } else if (authStorage[clientId] != apiKey) {
        responseBody = __jsonError('Api key or client ID incorrect');
    } else {
        var token = __randomString();
        tokens[token] = clientId;
        responseBody = JSON.stringify({
            status: 'OK',
            token: token
        })
    }
    sendResponse(response, responseBody, 200);
}

function releaseToken(response, params) {
    var token = params.param;

    if (tokenInvalid(response, params.token)) {
        return;
    }

    tokens[token] = undefined;
    sendResponse(response, __jsonOk, 200);
}

// Работа с хранением ключей-значений
function setValue(response, params) {
    var key = params.key;
    var value = params.value;
    var token = params.token;

    if (tokenInvalid(response, params.token)) {
        return;
    }

    var clientId = tokens[token];
    var userStorage = storage[clientId];
    if (userStorage == undefined) {
        userStorage = {}
    }
    userStorage[key] = value;
    storage[clientId] = userStorage;
    sendResponse(response, __jsonOk, 200);
}

function getValue(response, params) {
    var key = params.param;
    var token = params.token;
    var responseBody = '';

    if (tokenInvalid(response, params.token)) {
        return;
    }

    var clientId = tokens[token];
    var userStorage = storage[clientId];
    if (userStorage == undefined || userStorage[key] == undefined) {
        responseBody = __jsonError('Key not found')
    } else {
        responseBody = JSON.stringify({
            status: 'OK',
            value: userStorage[key]
        })
    }
    sendResponse(response, responseBody, 200);
}

function updateValue(response, params) {
    setValue(response, {
        key: params.param,
        value: params.value,
        token: params.token
    })
}

function deleteValue(response, params) {
    var key = params.param;
    var token = params.token;

    if (tokenInvalid(response, token)) {
        return;
    }

    var clientId = tokens[ token];
    var userStorage = storage[clientId];
    if (userStorage == undefined) {
        userStorage = {}
    }

    userStorage[key] = undefined;
    storage[clientId] = userStorage;
    sendResponse(response, __jsonOk, 200);
}

// Проверка актуальности токена клиента
function tokenInvalid(response, token) {
    if (token != undefined && tokens[token] != undefined) {
        sendResponse(response, __jsonError('Invalid token'), 200);
        return true;
    }
    return false;
}

// Вспомогательные функции
function __randomString() {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = 16; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

function __jsonError(reason) {
    return JSON.stringify({
        status: 'Error',
        reason: reason
    })
}

var __jsonOk = JSON.stringify({status: 'OK'});

function sendResponse(response, body, code) {
    response.writeHead(code, {
        'Content-Type': 'text/plain'
    });
    response.write(body);
    response.end();
}

function registerHandler(method, callback, regexp) {
    var methodBlock = handlers[method];
    if (methodBlock == undefined) {
        methodBlock = [];
    }
    methodBlock[regexp] = callback;
    handlers[method] = methodBlock;
}