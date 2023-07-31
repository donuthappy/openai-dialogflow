const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require('express');
const twilio = require('twilio');
const axios = require('axios');
var sessionClient = new dialogflow.SessionsClient();
const {
    Configuration,
    OpenAIApi
} = require('openai');
require('dotenv').config();

const configuration = new Configuration({
    apiKey: 'sk-',
});

console.log(configuration.apiKey);
const openai = new OpenAIApi(configuration);

const textGeneration = async (queryText) => {
    try{
        const prompt = [
            { 'role': 'system', 'content': 'You are a helpful assistant.'},
            { 'role': 'user', 'content': queryText}
        ];

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: prompt,
            temperature: 0.9,
            max_tokens: 500,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6
        });
        return {
            status: 1,
            response: `${response.data.choices[0].message.content}`
        };
    } catch (error) {
        console.log(error);
        return {
            status: 0,
            response: ''
        }
    }
};
const webApp = express();
const PORT = 5000;
webApp.use(express.urlencoded({
    extended: true
}));
webApp.use(express.json());
webApp.use((req, res, next) => {
    console.log(`Path ${req.path} with Method ${req.method}`);
    next();
});
webApp.get('/', (req, res) => {
    res.sendStatus(200);
    res.send("Status Okay")
});

webApp.post('/dialogflow', async (req, res) => {
    if(res.req.body && res.req.body.session) {
        var id = (res.req.body.session).substr(43);
        console.log(id);
        const agent = new WebhookClient({
            request: req,
            response: res
        });
    
        async function fallback() {
            let action = req.body.queryResult.action;
            let queryText = req.body.queryResult.queryText;
    
            if(action == 'input.unknown') {
                let result = await textGeneration(queryText);
                if (result.status == 1) {
                    agent.add(result.response);
                } else {
                    agent.add(`Sorry, I'm not able to help with that.`);
                }
            }
        }
    
        function hi(agent) {
            console.log(`intent => hi`);
            agent.add('Hi, I am your virtual assistant, Tell me how can I help you')
        }
        let intentMap = new Map();
        intentMap.set('Default Welcome Intent', hi);
        intentMap.set('Default Fallback Intent', fallback);
        agent.handleRequest(intentMap);
    } else {
        console.error('Invalid session value in the request body');
        res.sendStatus(400);
    }
    
});

webApp.listen(PORT, () => {
    console.log(`Server is up and running at http://localhost:${PORT}/`)
})