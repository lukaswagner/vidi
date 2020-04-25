'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const argv = require('yargs')
    .option('data', {
        type: 'string',
        default: 'data'
    })
    .argv;

const dataDir = argv.data;
const datasetDir = path.join(dataDir, 'datasets');

const app = express();

console.log(dataDir);

const auth = JSON.parse(fs.readFileSync('./credentials.json'));
app.use((req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [user, pass] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (user && pass && user === auth.user && pass === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
});

app.use('/data', express.static(dataDir));
app.use('/', express.static('build'));

app.get('/ls', (req, res) => {
    fs.readdir(datasetDir, (e, d) => {
        if (e) {
            res.statusCode = 500;
            res.send(e.message);
        }
        res.send(d.map((f) => {
            return {
                name: path.basename(f, path.extname(f)),
                path: path.join(datasetDir, f)
            };
        }));
    });
});

app.listen(3000);
