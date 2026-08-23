'use strict';
// Disabled — directory is now managed via CSV and hardcoded in index.html
exports.handler = async function() {
  return { statusCode: 200, body: 'Directory sync disabled' };
};
