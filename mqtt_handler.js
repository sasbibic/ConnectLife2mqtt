
const mqtt = require('mqtt');

class MqttHandler {
  constructor(host) {
    this.mqttName = global.config.mqtt.rootTopic
    this.username = global.config.mqtt.username
    this.password = global.config.mqtt.password
    this.mqttClient = null;
    this.host = host;
  }

  connect(onConnected) {
    // Connect mqtt with credentials (in case of needed, otherwise we can omit 2nd param)
    this.mqttClient = mqtt.connect(this.host,
      {
        username: this.username,
        password: this.password,
        will: {
          topic: `${this.mqttName}/LWT`,
          payload: 'Offline',
          retain: true,
        }
      });

    // Mqtt error calback
    this.mqttClient.on('error', (err) => {
      console.log(err);
      this.MqttHandler.publish()
      this.mqttClient.end();
    });

    // Connection callback
    this.mqttClient.on('connect', () => {
      this.mqttClient.publish(`${this.mqttName}/LWT`, "Online", { retain: true });
      onConnected(this.mqttClient, this.mqttName);
      console.log(`INFO: mqtt client connected`);
    });

    this.mqttClient.on('close', () => {
      console.log(`INFO: mqtt client disconnected`);
    });
  }

  // Sends a mqtt message to topic: mytopic
  sendMessage(topic, message) {
    this.mqttClient.publish(`${this.mqttName}/${topic}`, message);
  }

  subscribe(topic, opts) {
    this.mqttClient.subscribe(`${this.mqttName}/${topic}`, opts)
  }
}

module.exports = MqttHandler;