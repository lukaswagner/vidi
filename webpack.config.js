'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function() {
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

    return {
        entry: './source/code/frontend/app.ts',
        devtool: 'inline-source-map',
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader'
                    },
                },
                {
                    test: /\.pug$/,
                    use: {
                        loader: 'pug-loader'
                    },
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: 'style-loader'
                        }, {
                            loader: 'css-loader'
                        }],
                },
                {
                    test: /\.(glsl|vert|frag)$/,
                    use: {
                        loader: 'webpack-glsl-loader'
                    },
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                shared: path.resolve(__dirname, 'source/code/shared'),
                frontend: path.resolve(__dirname, 'source/code/frontend'),
                worker: path.resolve(__dirname, 'source/code/worker'),
                loader: path.resolve(__dirname, 'source/code/worker/loader'),
            }
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
