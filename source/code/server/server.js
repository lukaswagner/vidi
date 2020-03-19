'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const dataDir = 'data';
const datasetDir = path.join(dataDir, 'datasets');

const app = express();

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
