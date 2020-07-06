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
    .option('override-page', {
        alias: 'p',
        type: 'string',
        description:
            'Use given dir as root dir instead of webpack-dev-middleware.'
    })
    .option('disable-reload', {
        type: 'boolean',
        description:
            'Disable auto reload when building using webpack-dev-middleware.'
    })
    .argv;

if(argv['override-page'] !== undefined)
    argv['disable-reload'] = true;

const credentials = argv.credentials;
const dataDir = argv.data;
const datasetDir = path.join(dataDir, 'datasets');

const app = express();
if(argv['disable-reload'])
    webpackConfig.entry = webpackConfig.entry.filter((e) => {
        return !e.startsWith('webpack-hot-middleware');
    });
const compiler = webpack(webpackConfig);

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
if(argv['override-page'] !== undefined) {
    app.use('/', express.static(argv['override-page']));
} else {
    app.use(webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
    }));
    if(!argv['disable-reload'])
        app.use(webpackHotMiddleware(compiler, { reload: true }));
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
