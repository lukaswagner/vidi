'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const child_process = require('child_process');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = function (env) {
    const api_url =
        (env !== undefined && env.api_url !== undefined) ?
            env.api_url :
            'https://api.varg.dev';
    const api_user =
        (env !== undefined && env.api_user !== undefined) ?
            env.api_user :
            'topicmap';
    let commit;
    try {
        commit = child_process.execSync('git rev-parse HEAD', {
            encoding: 'utf-8'
        });
    } catch (e) {
        commit = e.message;
    }

    const plugins = [
        new DefinePlugin({
            COMMIT: JSON.stringify(commit),
            API_URL: JSON.stringify(api_url),
            API_USER: JSON.stringify(api_user),
        }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './source/pages/index.pug',
            inject: false
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'source/css', to: 'css' },
                { from: 'source/fonts', to: 'fonts' },
            ]
        }),
    ];

    if (env !== undefined && env.analyze !== undefined) {
        plugins.push(new BundleAnalyzerPlugin());
    }

    return {
        entry: './source/code/frontend/app.ts',
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
