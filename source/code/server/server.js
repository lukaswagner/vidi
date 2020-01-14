'use strict'

const express = require('express');
const fs = require('fs');

const dataDir = 'data';

const app = express();

app.use('/data', express.static(dataDir));
app.use('/', express.static('build'));

app.get('/ls', (req, res) => {
    fs.readdir(dataDir, (e, d) => {
        if (e) {
            res.statusCode = 500;
            res.send(e.message);
        }
        res.send(d);
    });
});

app.listen(3000);
