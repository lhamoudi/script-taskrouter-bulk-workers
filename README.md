# script-taskrouter-bulk-workers
Node.js script that uses the Twilio Helper Library to create or update workers from a CSV file containing worker properties and attributes.

This script was primarily developed to populate worker attributes that are used by Flex Insights. A full list of available Flex Insights Agent attributes is available here:

https://www.twilio.com/docs/flex/end-user-guide/insights/data-model#agents

More information on using task and worker attributes to populate Flex Insights data is available here:

https://www.twilio.com/docs/flex/developer/insights/enhance-integration

## Pre-requisites
Node.js, preferably a LTS release. This script was tested using Node.js version 14.18.1
 
## Setup
1. Clone the repository, open a terminal, and change to the repo directory
2. Run `npm install`
3. Copy or rename `.env.sample` to `.env`
4. Edit the `.env` file with the appropriate values for the target Twilio account

## CSV Import File
Please see the [`import-sample.csv`](import-sample.csv) file for an example CSV import file. Each header in that CSV file is accounted for in this script. Please note the following:

* Any empty fields will not be written as an attribute to the target worker
* The `date_joined` and `date_left` fields must be an epoch timestamp in milliseconds. Any other timestamp format will be rejected by Flex Insights. An online tool like [EpochConverter.com](https://www.epochconverter.com/) can be easily used to convert a human readable date to epoch format.
* To use additional or different attributes in the CSV file, the script code will need to be modified as the attribute names are hardcoded

## Using the script
To run the script, simply use the command:

```bash
node createupdate.js {filename}.csv
```

Replace the curly bracket values with the input CSV filename.

## Logs
A log file for the script execution will be written to the `/logs` folder in the script directory. This can be used to review which workers were successfully created or updated, and any errors that occurred.
