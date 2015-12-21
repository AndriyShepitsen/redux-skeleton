'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _methodOverride = require('method-override');

var _methodOverride2 = _interopRequireDefault(_methodOverride);

var _errorhandler = require('errorhandler');

var _errorhandler2 = _interopRequireDefault(_errorhandler);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _jspm = require('jspm');

var _jspm2 = _interopRequireDefault(_jspm);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _chokidarSocketEmitter = require('chokidar-socket-emitter');

var _chokidarSocketEmitter2 = _interopRequireDefault(_chokidarSocketEmitter);

var _api = require('./server/routes/api');

var _api2 = _interopRequireDefault(_api);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Load JSPM modules
//
var loader = new _jspm2.default.Loader();
var jspmImports = {};
var saveImport = function saveImport(importName) {
    return function (imported) {
        var keys = Object.keys(imported);
        if (keys.length === 1 && keys[0] === 'default') jspmImports[importName] = imported.default;else jspmImports[importName] = imported;
    };
};
var baseImportPath = './app/client/src';
var imports = ['react:React', 'react-redux:reactRedux', 'react-dom/server:reactDom', 'redux-simple-router:reduxSimpleRouter', 'history/lib/createLocation:createLocation', 'react-router:reactRouter', baseImportPath + '/routes:routes', baseImportPath + '/reducers/root-reducer:rootReducer', baseImportPath + '/containers/root:RootContainer', baseImportPath + '/store/configure-store:configureStore'];

var promises = imports.map(function (importPath) {
    var path = importPath;
    var key = importPath;
    if (importPath.indexOf(':') >= 0) {
        var components = importPath.split(':');
        path = components[0];
        key = components[1];
    }
    return loader.import(path).then(saveImport(key));
});

var importsLoading = _q2.default.all(promises);

var replaceRegex = /<!--REPLACE-->\s*(.+)\s*<!--REPLACE-END-->/im;

function renderFullPage(html, initialState) {
    var fullHtmlTemplate = _fs2.default.readFileSync(_path2.default.join(__dirname, 'index.html'), { encoding: 'utf8' });
    var match = replaceRegex.exec(fullHtmlTemplate);

    if (!match) {
        console.error('Template not valid, doesn\'t contain replace markers'); // eslint-disable-line no-console
        return fullHtmlTemplate;
    }

    var pre = fullHtmlTemplate.substr(0, match.index);
    var post = fullHtmlTemplate.substr(match.index + match[0].length);
    var inner = match[1];
    var innerClosingTagLoc = inner.indexOf('</div>');
    var innerPre = inner.substr(0, innerClosingTagLoc);
    var innerPost = inner.substr(innerClosingTagLoc);
    var initialStateTag = '<script>window.__INITIAL_STATE__=' + JSON.stringify(initialState) + '</script>';

    var out = [pre, initialStateTag + '\n', innerPre, html, innerPost, post];

    return out.join('');
}

function handleRender(req, res) {

    try {
        (function () {
            var React = jspmImports.React;
            var configureStore = jspmImports.configureStore;
            var reactDom = jspmImports.reactDom;
            var createLocation = jspmImports.createLocation;
            var reactRouter = jspmImports.reactRouter;
            var routes = jspmImports.routes;
            var reactRedux = jspmImports.reactRedux;

            var location = createLocation(req.url);
            var Provider = reactRedux.Provider;
            var RoutingContext = reactRouter.RoutingContext;

            reactRouter.match({ routes: routes.routes(), location: location }, function (err, redirectLocation, renderProps) {
                if (err) {
                    console.error(err);
                    return res.status(500).end('Internal Server Error');
                }

                if (!renderProps) return res.status(404).end('Not found!');

                var store = configureStore();

                var initialComponent = React.createElement(
                    Provider,
                    { store: store },
                    React.createElement(RoutingContext, renderProps)
                );

                var initialState = store.getState();
                var fullPage = renderFullPage(reactDom.renderToString(initialComponent), initialState);

                res.end(fullPage);
            });
        })();
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
}

var app = (0, _express2.default)();

app.set('port', process.env.PORT || 3000);
app.use((0, _compression2.default)());
app.use((0, _morgan2.default)('combined'));
app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded({ extended: true }));
app.use((0, _methodOverride2.default)());
app.use(_express2.default.static(_path2.default.join(__dirname, 'client'), { maxAge: 31557600000 }));

app.use('/api', _api2.default);

app.get('*', function (req, res) {
    importsLoading.then(function () {
        handleRender(req, res);
    }, function (err) {
        console.log(err);
        res.status(500).end('Internal server error!');
    });
});

app.use((0, _errorhandler2.default)());
var server = _http2.default.createServer(app);

server.listen(3000);
exports.default = app;
