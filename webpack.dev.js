const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = function (env) {
    return merge(common(env), {
        mode: 'development',
        devtool: 'eval-source-map',
    });
};
