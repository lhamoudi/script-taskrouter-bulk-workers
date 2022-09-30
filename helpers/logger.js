const moment = require('moment');
const winston = require('winston');
const { align, colorize, combine, printf, timestamp } = winston.format;

const fileTimestamp = moment().format('YYYY-MM-DDTHH-mm-ssZZ');
const logFileName = `logs/createupdate-workers-${fileTimestamp}.log`;
console.log('A log of this script execution can be found at', logFileName);

const generateWinstonFormat = (isConsole) => {
  const timeStampFormat = 'YYYY-MM-DD HH:mm:ss.SSS';

  return isConsole
    ? combine(
      colorize({ all: true }),
      timestamp({ format: timeStampFormat }),
      printf((data) => `[${data.timestamp}] ${data.message}`)
    )
    : combine(
      timestamp({ format: timeStampFormat }),
      align(),
      printf((data) => `[${data.timestamp}] ${data.level} ${data.message}`)
    )
}

const log = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: generateWinstonFormat(true)
    }),
    new winston.transports.File({
      filename: `logs/createupdate-workers-${fileTimestamp}.log`,
      format: generateWinstonFormat(false)
    })
  ]
});

module.exports = {
  log
};
