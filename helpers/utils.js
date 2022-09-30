const readline = require('readline');

const { log } = require('./logger');

const confirmTargetAccount = (client) => new Promise(async resolve => {
  const account = await client.api
    .accounts(client.accountSid)
    .fetch();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\nTarget account: ${account.friendlyName} (${account.sid})\n`
    + `Is this correct? (Y or N): `, response => {
      console.log("");
      rl.close();
      
      const isConfirmed = !!(response && response.toLowerCase().trim() === 'y');

      if (!isConfirmed) {
        log.info('Please try again with correct Account SID and Auth Token\n');
      }

      resolve(isConfirmed);
  });
});

const confirmToProceed = (message) => new Promise(resolve => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n${message}\n`
  + `\nWould you like to proceed? (Y or N): `, response => {
    console.log("");
    rl.close();
    
    const isConfirmed = !!(response && response.toLowerCase().trim() === 'y');

    if (!isConfirmed) {
      log.info('Process canceled per your response\n');
    }

    resolve(isConfirmed);
  });
});

module.exports = {
  confirmTargetAccount,
  confirmToProceed
};
