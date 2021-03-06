/*
 * Copyright (c) 2017 TopCoder, Inc. All rights reserved.
 */
/**
 * This module contains the express middlewares for the whole app.
 *
 * @author TCSCODER
 * @version 1.0
 */
'use strict';
const config = require('config');
const _ = require('lodash');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const healthcheck = require('topcoder-healthcheck-dropin');
const logger = require('./utils/logger');

/**
 * Method to check the service status
 * @returns {Object} The returned status
 */
function check() {
  // No checks to run. The output of this itself is an indication that the app is actively running
  return {
    checksRun: 1
  };
}

const webhooks = require('./routes/webhooks');

const app = express();

// app.use(logger('dev'));
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(healthcheck.middleware([check]));

app.use('/webhooks', webhooks);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// // error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.log(err);
  res.status(err.status || 500); // eslint-disable-line no-magic-numbers
  res.json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

process.on('uncaughtException', (err) => {
  // Check if error related to Dynamodb conn
  if (err.code === 'NetworkingError' && err.region) {
    logger.error('DynamoDB connection failed.');
  }
  logger.logFullError(err, 'system');
});

// handle and log unhanled rejection
process.on('unhandledRejection', (err) => {
  logger.logFullError(err, 'system');
});

// dump the configuration to logger
const ignoreConfigLog = ['cert', 'key', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];
/**
 * Print configs to logger
 * @param {Object} params the config params
 * @param {Number} level the level of param object
 */
function dumpConfigs(params, level) {
  Object.keys(params).forEach((key) => {
    if (_.includes(ignoreConfigLog, key)) {
      return;
    }
    const item = params[key];
    let str = '';
    let n = 0;
    while (n < level) { // eslint-disable-line no-restricted-syntax
      n++;
      str += '  ';
    }
    if (item && _.isObject(item)) {
      str += `${key}=`;
      logger.debug(str);
      dumpConfigs(item, level + 1);
    } else {
      str += `${key}=${item}`;
      logger.debug(str);
    }
  });
}
logger.debug('--- List of Configurations ---');
dumpConfigs(config, 0);
logger.debug('--- End of List of Configurations ---');

module.exports = app;
