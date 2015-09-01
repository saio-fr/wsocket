module.exports = function(config) {
  config.set({

    plugins: [
      require('karma-jasmine'),
      require('karma-browserify'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher')
    ],

    frameworks: ['browserify', 'jasmine'],
    browsers: ['Chrome', 'Firefox'],

    basePath: '../../',
    files: [
      'spec/*.spec.js'
    ],
    preprocessors: {
      'spec/*.spec.js': ['browserify']
    },

    phantomjsLauncher: {
      exitOnRessourceError: true
    },

    autoWatch: false,
    singleRun: true

  });
};
