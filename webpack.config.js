'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = function(env) {
    const entry = [
        './source/code/frontend/app.ts',
    ];

    const plugins = [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './source/pages/index.pug',
            inject: false
        }),
        new CopyWebpackPlugin([
            { from: 'source/css', to: 'css' },
            { from: 'source/fonts', to: 'fonts' },
        ])
    ];

    if(env !== undefined && env.enableReload) {
        entry.unshift('webpack-hot-middleware/client?reload=true');
        plugins.push(
            new webpack.optimize.OccurrenceOrderPlugin(),
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoEmitOnErrorsPlugin()
        );
    }

    return {
        entry,
        devtool: 'inline-source-map',
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /(source\/shaders|node_modules)/,
                },
                {
                    test: /\.pug$/,
                    use: 'pug-loader'
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(glsl|vert|frag)$/,
                    use: { loader: 'webpack-glsl-loader' },
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build'),
            library: undefined,
            libraryTarget: 'umd',
            publicPath: '/',
        },
        plugins
    };
};
