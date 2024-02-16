
# ConnectLife2MQTT

ConnectLife cloud gateway to MQTT.


## Features

- Connects to ConnectLife cloud with specified credentials
- Reads properties of all appliences, and makes MQTT topics for them
- forwards MQTT requests to ConnectLife cloud
## Documentation

- set parameters in server.ini
- run with node.js
- optionaly use pm2 for running as a service



## Run Locally

Clone the project

```bash
  git clone https://github.com/sasbibic/ConnectLife2mqtt.git
```

Go to the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start
```


## Badges

![javascript](https://img.shields.io/badge/javascript-8A2BE2)
![mqtt](https://img.shields.io/node/v/mqtt?label=mqtt)
![ini](https://img.shields.io/node/v/ini?label=ini)
![node-cron](https://img.shields.io/node/v/node-cron?label=node-cron)
[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)


## Tech Stack

**Server:** NodeJS, MQTT

