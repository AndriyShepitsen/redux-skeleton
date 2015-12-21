import express from 'express';
import morgan from 'morgan';
import compress from 'compression';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import errorhandler from 'errorhandler';
import path from 'path';
import jspm from 'jspm';
import q from 'q';
import fs from 'fs';
import http from 'http';

//
// Load JSPM modules
//
const loader = new jspm.Loader();
let jspmImports = {};
let saveImport = (importName) => {
    return (imported) => {
        var keys = Object.keys(imported);
        if (keys.length === 1 && keys[0] === 'default')
            jspmImports[importName] = imported.default;
        else
            jspmImports[importName] = imported;
    };
};
const baseImportPath = './app/client/src';
let imports = [
    'react:React', 'react-redux:reactRedux', 'react-dom/server:reactDom',
    'redux-simple-router:reduxSimpleRouter',
    'history/lib/createLocation:createLocation',
    'react-router:reactRouter',
    baseImportPath + '/routes:routes',
    baseImportPath + '/reducers/root-reducer:rootReducer',
    baseImportPath + '/containers/root:RootContainer',
    baseImportPath + '/store/configure-store:configureStore'
];

let promises = imports.map((importPath) => {
    var path = importPath;
    var key = importPath;
    if (importPath.indexOf(':') >= 0) {
        const components = importPath.split(':');
        path = components[0];
        key = components[1];
    }
    return loader.import(path).then(saveImport(key));
});

let importsLoading = q.all(promises);

const replaceRegex = /<!--REPLACE-->\s*(.+)\s*<!--REPLACE-END-->/im;

function renderFullPage(html, initialState) {
    const fullHtmlTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), {encoding: 'utf8'});
    const match = replaceRegex.exec(fullHtmlTemplate);

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
    var initialStateTag = `<script>window.__INITIAL_STATE__=${JSON.stringify(initialState)}</script>`;

    var out = [
        pre,
        initialStateTag + '\n',
        innerPre,
        html,
        innerPost,
        post
    ];

    return out.join('');
}

function handleRender(req, res) {

    try {
        const {
            React, configureStore,
            reactDom, createLocation,
            reactRouter,
            routes,
            reactRedux
            }  = jspmImports;

        const location = createLocation(req.url);
        const Provider = reactRedux.Provider;
        const RoutingContext = reactRouter.RoutingContext;

        reactRouter.match({routes: routes.routes(), location},
            (err, redirectLocation, renderProps) => {
                if (err) {
                    console.error(err);
                    return res.status(500).end('Internal Server Error');
                }

                if (!renderProps) return res.status(404).end('Not found!');

                const store = configureStore();

                const initialComponent = (
                    <Provider store={store}>
                        <RoutingContext {...renderProps} />
                    </Provider>
                );

                const initialState = store.getState();
                const fullPage = renderFullPage(reactDom.renderToString(initialComponent), initialState);

                res.end(fullPage);
            }
        );
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
}

const app = express();

import apiRouter from './server/routes/api';

app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'client'), {maxAge: 31557600000}));

app.use('/api', apiRouter);

app.get('*', (req, res) => {
    importsLoading.then(() => {
        handleRender(req, res);
    }, (err) => {
        console.log(err);
        res.status(500).end('Internal server error!');
    });
});

app.use(errorhandler());
const httpServer = require('http-server');

let cache = 3600
if (process.env.NODE_ENV === 'production') {
    console.log('running in production mode(with caching)-make sure you have "Disable cache (while DevTools is open)" checked in the browser to see the changes while developing')
} else {
    cache = -1
}
const server = httpServer.createServer([app,

    {
        root: 'app/client',
        cache: cache,
        robots: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true'
        }
    }]);

server.listen(3000);
export default app;
