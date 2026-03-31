const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix EMFILE: force Metro to ignore deeply nested node_modules
config.resolver.blockList = [
    /node_modules\/.*\/node_modules\/.*/,
    /\.git\/.*/,
];

// Reduce the number of files Metro watches
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
