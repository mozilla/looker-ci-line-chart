let path = require('path');

const TerserPlugin = require("terser-webpack-plugin");

let webpackConfig = {
    entry: {
        ciLineChart: './src/ci-line-chart.js'
    },
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'dist'),
        library: '[name]',
        libraryTarget: 'umd'
    },
    resolve: {
        extensions: ['.js', '.scss', '.css']
    },
    plugins: [
        new TerserPlugin()
    ],
    module: {
        rules: [
            { test: /\.js$/, use: [ 'babel-loader' ] },
            { test: /\.css$/, use: [ 'to-string-loader', 'css-loader' ] },
            { test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ]
            }
        ]
    },
    devServer: {
        compress: true,
        port: 3443,
        https: true
    },
    devtool: 'eval',
    watch: true
};

module.exports = webpackConfig;
