'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const child_process = require('child_process');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

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
            template: './source/pages/index.pug'
        }),
        new MiniCssExtractPlugin(),
        new RemoveEmptyScriptsPlugin(),
    ];

    if (env !== undefined && env.analyze !== undefined) {
        plugins.push(new BundleAnalyzerPlugin());
    }

    return {
        entry: {
            app: './source/code/frontend/app.ts',
            toggle: './source/code/frontend/toggle.ts',
            icons: './source/code/frontend/icons.ts',
            style: './source/css/style.css',
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: { loader: 'ts-loader' },
                },
                {
                    test: /\.pug$/,
                    use: { loader: 'pug-loader' },
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader' },
                    ]
                },
                {
                    test: /\.(glsl|vert|frag)$/,
                    use: {
                        loader: 'webpack-glsl-loader'
                    },
                },
                {
                    test: /\.(eot|otf|ttf|woff|woff2)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext][query]'
                    }
                },
                {
                    test: /\.json$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'data/[name][ext][query]'
                    }
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
                data: path.resolve(__dirname, 'data'),
            }
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build'),
            library: undefined,
            libraryTarget: 'umd',
            publicPath: './',
            clean: true
        },
        plugins,
        devServer: {
            headers: {
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp'
            },
            hot: false
        }
    };
};
