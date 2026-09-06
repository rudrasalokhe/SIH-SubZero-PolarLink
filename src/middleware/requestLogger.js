const morgan = require('morgan');

// Custom morgan format for PolarLink station activity
const requestLogger = morgan(':method :url :status :res[content-length] - :response-time ms');

module.exports = requestLogger;
