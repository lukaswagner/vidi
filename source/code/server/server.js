'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const webpackConfig = require('../../../webpack.config');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const argv = require('yargs')
    .option('data', {
        alias: 'd',
        type: 'string',
        default: 'data'
    })
    .option('credentials', {
        alias: 'c',
        type: 'string',
        default: 'credentials.json'
    })
    .option('static-page', {
        alias: 'p',
        type: 'string',
        description:
            'Use given dir as root dir instead of webpack-dev-middleware.'
    })
    .option('enable-reload', {
        type: 'boolean',
        default: true,
        description:
            'Enable auto reload when building using webpack-dev-middleware.'
    })
    .argv;

const credentials = argv.credentials;
const dataDir = argv.data;
const datasetDir = path.join(dataDir, 'datasets');

const app = express();

console.log('credentials file:', credentials);
console.log('data dir:', dataDir);
console.log('available files:\n -', fs.readdirSync(datasetDir).join('\n - '));

if (fs.existsSync(credentials)) {
    const auth = JSON.parse(fs.readFileSync(credentials));
    app.use((req, res, next) => {
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [user, pass] =
            Buffer.from(b64auth, 'base64').toString().split(':');
        if (user && pass && user === auth.user && pass === auth.password) {
            return next();
        }
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Authentication required.');
    });
} else {
    console.log(
        'Could not find credentials file. Disabling password protection.');
}

app.use('/data', express.static(dataDir));
if(argv['static-page'] !== undefined) {
    console.log('Hosting static page from', argv['static-page']);
    app.use('/', express.static(argv['static-page']));
} else {
    console.log(
        'Using webpack-dev-middleware to host page - auto-reload is',
        argv['enable-reload'] ? 'enabled' : 'disabled');
    const config = webpackConfig({ enableReload: argv['enable-reload']});
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler, {
        publicPath: config.output.publicPath,
    }));
    if(argv['enable-reload']) {
        app.use(webpackHotMiddleware(compiler, { reload: true }));
    }
}

app.get('/ls', (req, res) => {
    fs.readdir(datasetDir, (e, d) => {
        if (e) {
            res.statusCode = 500;
            res.send(e.message);
        }
        res.send(d.map((f) => {
            const wholePath = path.join(datasetDir, f);
            const relativeToBase = path.relative(dataDir, wholePath);
            const alwaysWithSlash = relativeToBase.replace(path.sep, '/');
            const withPrefix = '/data/' + alwaysWithSlash;
            return {
                name: path.basename(f, path.extname(f)),
                path: withPrefix,
                size: fs.statSync(wholePath).size
            };
        }));
    });
});

app.listen(3000);
