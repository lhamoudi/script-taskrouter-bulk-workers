require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const client = require('twilio')(
  process.env.ACCOUNT_SID,
  process.env.AUTH_TOKEN
);

async function sleep(milliseconds) { 
  return new Promise(resolve => setTimeout(resolve, milliseconds))
};

function isArraysEqual(a, b) {
  return Array.isArray(a)
    && Array.isArray(b)
    && a.length === b.length
    && a.every((val) => b.includes(val));
}

function escapeNonAlphaChars(stringToEscape, prefix = '_') {
  const escaped = stringToEscape.replace(/[^A-Za-z0-9]/g, function(match) {
      const hex = match.charCodeAt(0).toString(16).toUpperCase();
      return prefix + (hex.length < 2 ? '0' + hex : hex);
  });
  return escaped;
}

async function getExistingWorkers() {//Go get existing Workers
  console.log('Fetching all existing workers');
  client.taskrouter.workspaces(process.env.TR_WORKSPACE_SID)
    .workers
    .list()
    .then(workers => {
      console.log('Workers fetched. Loading CSV');
      loadCSV(workers)
    });
}

function loadCSV(existingWorkers) { //Let's load the CSV
  let workersToLoad = [];
  fs.createReadStream(process.argv.slice(2)[0])
    .pipe(csv())
    .on('data', (data) => {
      workersToLoad.push(data);
    })
    .on('end', () => {
      sortWorkersToLoad(workersToLoad, existingWorkers);
    });
}

// async function sortWorkers(workers) {
//   let existingWorkers = workers; //Build Array for the existing Workers

//   // for (let i = 0; i < taskQueues.length; i++) {
//   //   let singleQueue = {}
//   //   let name = taskQueues[i].friendlyName
//   //   singleQueue[name] = taskQueues[i].sid
//   //   existingWorkers.push(singleQueue)
//   // }

//   loadCSV(existingWorkers)
// }

async function sortWorkersToLoad(workersToLoad, existingWorkers) {
  const existingWorkerNames = existingWorkers.map(w => w.friendlyName);
  
  let workersToUpdate = [];
  let workersToCreate = [];
  // for (let i = 0; i < existingWorkers.length; i++) { //Build Array for existing Queue names
  //   existingWorkerNames.push(Object.keys(existingWorkers[i])[0])
  // }
  
  for (let i = 0; i < workersToLoad.length; i++) { //Build Array for Worker names to load
    //newQueueNames.push(workersToLoad[i].QueueFriendlyName)

    const workerFriendlyName = workersToLoad[i].friendlyName;

    if (existingWorkerNames.indexOf(workerFriendlyName) === -1) { //Check for new Worker
      workersToCreate.push(workerFriendlyName);

    } else {
      workersToUpdate.push(workerFriendlyName);
    }
  }

  console.log("List loaded, we have", workersToCreate.length, "new Workers and", workersToUpdate.length, "Workers to update");
  //filterQueues(workersToUpdate, workersToCreate, workersToLoad, existingWorkers)
  await createWorkers(workersToCreate, workersToLoad);
  await updateWorkers(workersToUpdate, workersToLoad, existingWorkers);
}

async function createWorkers(workersToCreate, workersToLoad) {
  const filteredWorkers = workersToLoad.filter(w => workersToCreate.includes(w.friendlyName));

  for (let i = 0; i < filteredWorkers.length; i++) {
    const worker = filteredWorkers[i];
    const {
      agent_attribute_1,
      email,
      friendlyName,
      full_name,
      location,
      manager,
      skills,
      team_id,
      team_name
    } = worker;

    const routing = {
      skills: [],
      levels: {}
    };

    if (skills) {
      const skillsArray = skills.split(',');

      for (const skill of skillsArray) {
        routing.skills.push(skill);
        routing.levels[skill] = 1
      }
    }

    const workerAttributes = {
      agent_attribute_1,
      contact_uri: escapeNonAlphaChars(friendlyName),
      email,
      full_name,
      location,
      manager,
      routing,
      team_id,
      team_name
    };

    try {
      await client.taskrouter.workspaces(process.env.TR_WORKSPACE_SID)
        .workers
        .create({
          friendlyName,
          attributes: JSON.stringify(workerAttributes)
        });
      console.log('Created worker', friendlyName);
    } catch (error) {
      switch (error.code) {
        case 20001:
          console.log(friendlyName, "exists", JSON.stringify(error));
          break;
        case 20429:
          console.log("Throttling, too many requests", JSON.stringify(error));
          break;
        default:
          console.log(JSON.stringify(error));
      }
    }
  }
}

async function updateWorkers(workersToUpdate, workersToLoad, existingWorkers) {
  const filteredWorkers = workersToLoad.filter(w => {
    if (!workersToUpdate.includes(w.friendlyName)) {
      return false;
    }
    const existingWorker = existingWorkers.find(ew => ew.friendlyName === w.friendlyName);
    const existingAttributes = JSON.parse(existingWorker.attributes);

    const existingSkills = existingAttributes.routing && existingAttributes.routing.skills;
    const newSkills = w.skills && w.skills.split(',');

    return (existingAttributes.contact_uri !== escapeNonAlphaChars(w.friendlyName)
      || existingAttributes.agent_attribute_1 !== w.agent_attribute_1
      || existingAttributes.email !== w.email
      || existingAttributes.full_name !== w.full_name
      || existingAttributes.location !== w.location
      || existingAttributes.manager !== w.manager
      || !isArraysEqual(existingSkills, newSkills)
      || existingAttributes.team_id !== w.team_id
      || existingAttributes.team_name !== w.team_name
    );
  });

  console.log("Of the workers to update, there are", filteredWorkers.length, "with changed attributes");

  if (filteredWorkers.length === 0) {
    console.log('No worker updates are required');
    return;
  }

  for (let i = 0; i < filteredWorkers.length; i++) {
    const worker = filteredWorkers[i];
    const {
      agent_attribute_1,
      email,
      friendlyName,
      full_name,
      location,
      manager,
      skills,
      team_id,
      team_name
    } = worker;

    const routing = {
      skills: [],
      levels: {}
    };

    if (skills) {
      const skillsArray = skills.split(',');

      for (const skill of skillsArray) {
        routing.skills.push(skill);
        routing.levels[skill] = 1
      }
    }
    
    const existingWorker = existingWorkers.find(w => w.friendlyName === friendlyName);
    const existingAttributes = JSON.parse(existingWorker.attributes);

    const workerAttributes = {
      ...existingAttributes,
      agent_attribute_1,
      contact_uri: escapeNonAlphaChars(friendlyName),
      email,
      full_name,
      location,
      manager,
      routing,
      team_id,
      team_name
    };

    try {
      await client.taskrouter.workspaces(process.env.TR_WORKSPACE_SID)
        .workers(existingWorker.sid)
        .update({
          attributes: JSON.stringify(workerAttributes)
        });
      console.log('Updated worker', friendlyName);
    } catch (error) {
      switch (error.code) {
        case 20001:
          console.log(friendlyName, "exists", JSON.stringify(error));
          break;
        case 20429:
          console.log("Throttling, too many requests", JSON.stringify(error));
          break;
        default:
          console.log(JSON.stringify(error));
      }
    }
  }
}

// Starting script
getExistingWorkers();
