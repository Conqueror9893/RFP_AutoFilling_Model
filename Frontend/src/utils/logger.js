const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  ERROR: "error",
};

// Set the current log level: only logs equal to or higher than this will be printed
const CURRENT_LOG_LEVEL = LOG_LEVELS.ERROR;

const logLevelPriority = {
  [LOG_LEVELS.DEBUG]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.ERROR]: 3,
};

const log = (level, message, data = null) => {
  if (logLevelPriority[level] < logLevelPriority[CURRENT_LOG_LEVEL]) return;

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
};

const Logger = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
};

export default Logger;
