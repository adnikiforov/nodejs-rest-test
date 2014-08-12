function matchRoute(method, route) {

}

function addRoute(method, route) {
    var methodBlock = routes[method];
    if (methodBlock == undefined) {
        methodBlock = [];
    }
    methodBlock.push(route);
}

function parseRoute(route, url) {
    var parsedUrl = basicParser.exec(url);
    var parsedRoute = basicParser.exec(route);
    var resultParams = {};
    parsedRoute.forEach(function(i) {
        resultParams[parsedRoute[i]] = parsedUrl[i];
    });
    return resultParams;
}

var routes = {};
var basicParser = /^\/get(.*)?$/;

exports.addRoute = addRoute;