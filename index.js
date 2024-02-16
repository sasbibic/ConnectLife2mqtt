/*
TCP (net) Server
*/
let fs = require('fs'), ini = require('ini')
global.config = ini.parse(fs.readFileSync('./server.ini', 'utf-8'))

let mqttHandler = require('./mqtt_handler');
let mqttClient = {}

const cron = require('node-cron');
const axios = require('axios').default;

const ConLifeID = global.config.ConnectLife.username
const ConLIfePWD = global.config.ConnectLife.password
let serverReady = false

let access_token = ''

const apiKey = '4_yhTWQmHFpZkQZDSV1uV-_A';
const gmid = 'gmid.ver4.AtLt3mZAMA.C8m5VqSTEQDrTRrkYYDgOaJWcyQ-XHow5nzQSXJF3EO3TnqTJ8tKUmQaaQ6z8p0s.zcTbHe6Ax6lHfvTN7JUj7VgO4x8Vl-vk1u0kZcrkKmKWw8K9r0shyut_at5Q0ri6zTewnAv2g1Dc8dauuyd-Sw.sc3';
const clientId = "5065059336212";

let appsProps = []

function getFormData(object) {
    const formData = new FormData();
    Object.keys(object).forEach(key => formData.append(key, object[key]));
    return formData;
}

async function getAppData(appID) {
    let url = 'https://api.connectlife.io/api/v1/appliance'

    if (appID) {
        url += '/' + appID
    }
    let promise = axios.get(url,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': access_token
            }
        })
        .catch((err) => {
            console.log(`ERROR: getAppData(${appID}) => ${err.message}`)
        })
    return promise
}
async function putAppData(data) {
    let url = 'https://api.connectlife.io/api/v1/appliance'

    let promise = axios.post(url, data,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': access_token
            }
        })
        .catch((err) => {
            console.log(`ERROR: putAppData(${data}) => ${err.message}`)
        })
    return promise
}

function fetchData() {
    if (!serverReady) return

    appsProps.forEach((app) => {
        getAppData(app.id)
            .then((resp) => {
                let data = resp.data[0]
                for (const prop in data.properties) {
                    const value = data.properties[prop]
                    if (Number.isNaN(Number.parseFloat(value))) {
                        app.props[prop] = value
                    } else if (Number.isInteger(value)) {
                        app.props[prop] = Number.parseInt(value)
                    } else {
                        app.props[prop] = Number.parseFloat(value)
                    }
                }
                app.props.timestamp = new Date()
                mqttClient.sendMessage(`appliance/${app.name}/get`, JSON.stringify(app.props))
                console.log(`INFO: Get ${app.name} => ${JSON.stringify(app.props)}`)
            })
            .catch((err) => {
                console.log(`ERROR:Get ${app.name} => ${err.message}`)
            })
    })
}


function receivedMessage(topic, message) {
    if (!serverReady) return

    const topicPath = topic.split("/")
    if (topicPath.lengt < 3) return

    if (topicPath[3] == "set") {
        const appl = appsProps.find((a) => a.name == topicPath[2])
        const props = JSON.parse(message)
        const setprop = [{
            properties: {},
            id: appl.id
        }]
        for (const prop in props) {
            setprop[0].properties[prop] = props[prop] + ''
        }
        putAppData(setprop)
            .then((resp) => {
                console.log(`INFO: Set ${appl.name} <= ${JSON.stringify(message)}`)
                setTimeout(() => fetchData(), 10000)
            })
    }
}


function setupAppliences(appliences) {
    let promises = []

    mqttClient = new mqttHandler(global.config.mqtt.server)
    mqttClient.connect((client, mqttName) => {
        client.subscribe(`${mqttName}/command`, { qos: 0 });
        client.on('message', function (topic, message) {
            receivedMessage(topic, message)
        })
    })

    appliences.forEach((app) => {
        let idx = 0
        promises.push(
            getAppData(`metadata/${app.id}/en`)
                .then((resp) => {
                    let props = {
                        name: app.name,
                        id: app.id,
                        metadata: resp.data[0].propertyMetadata,
                        props: {
                            timestamp: new Date()
                        },
                    }
                    resp.data[0].propertyMetadata.forEach((prop) => {
                        props.props[prop.key] = null
                    })
                    mqttClient.subscribe(`appliance/${app.name}/set`, { qos: 0 })
                    mqttClient.sendMessage(`appliance/${app.name}/metadata`, JSON.stringify(props.metadata))
                    appsProps[idx++] = props
                })
        )
    })
    Promise.allSettled(promises)
        .then((result) => {
            serverReady = true
            fetchData()
        })
}
function getAccessToken() {
    serverReady = false
    let uid = ''
    axios.post('https://accounts.eu1.gigya.com/accounts.login',
        getFormData({
            loginID: ConLifeID,
            password: ConLIfePWD,
            APIKey: apiKey,
            gmid: gmid,
        }),
        {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then((resp) => {
            if (resp.data.errorCode) {
                console.log(`ERROR:getAccessToken ${resp.request.host} => ${resp.data.errorMessage}`)
                process.exit(1)
            }
            uid = resp.data.UID;
            return axios.post('https://accounts.eu1.gigya.com/accounts.getJWT',
                getFormData({
                    APIKey: apiKey,
                    gmid: gmid,
                    login_token: resp.data.sessionInfo.cookieValue
                }),
                { headers: { 'Content-Type': 'multipart/form-data' } })
        })
        .then((resp) => {
            return axios.post('https://oauth.hijuconn.com/oauth/authorize', {
                client_id: clientId,
                idToken: resp.data.id_token,
                response_type: 'code',
                redirect_uri: 'https://api.connectlife.io/swagger/oauth2-redirect.html',
                thirdType: 'CDC',
                thirdClientId: uid
            })
        })
        .then((resp) => {
            return axios.post('https://oauth.hijuconn.com/oauth/token',
                ({
                    client_id: clientId,
                    code: resp.data.code,
                    grant_type: 'authorization_code',
                    client_secret: '07swfKgvJhC3ydOUS9YV_SwVz0i4LKqlOLGNUukYHVMsJRF1b-iWeUGcNlXyYCeK',
                    redirect_uri: 'https://api.connectlife.io/swagger/oauth2-redirect.html',
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        })
        .then((resp) => {
            console.log(`INFO: Logon successfull`)
            access_token = resp.data.access_token
            const expires_in = resp.data.expires_in
            getAppData()
                .then((resp) => {
                    setupAppliences(resp.data)
                })
            setTimeout(() => { getAccessToken() }, (expires_in / 2) * 60 * 1000)
        })
        .catch((err) => {
            console.log(`ERROR:getAccessToken ${err.request.host} => ${err.message}`)
            setTimeout(() => { getAccessToken() }, (60 * 1000))
        })
}


let net = require('net');

let server = net.createServer(function (socket) {
    socket.write('Echo server\r\n');
    socket.pipe(socket);
});

cron.schedule('* * * * *', () => {
    fetchData();
});
getAccessToken()
server.listen(9987, '127.0.0.1');

