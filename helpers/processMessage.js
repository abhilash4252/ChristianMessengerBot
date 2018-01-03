const API_AI_TOKEN = '3e4e16f1cc074cc98fc8084962b14a3a'
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAAVRhfRwxYABAK8CfHpWEbpyKJVJmtvSbsq5eJaEwJAjJUZBpGZAndnh3bs1rUOtWnnR0tS4GrosJzKW1r0d40UZB34SOTRxzoSjV3YGinHPqgm9Y0Cwd34VDia7ujUHyHtZCP0oAZBPD0kZChPaMlgmPfzqcZA8yeAF6fE76fjLAZDZD';

const request = require('request');
const sendTextMessage = (senderId, text) => {
 request({
 url: 'https://graph.facebook.com/v2.6/me/messages',
 qs: { access_token: FACEBOOK_ACCESS_TOKEN },
 method: 'POST',
 json: {
 recipient: { id: senderId },
 message: { text },
 }
 });
};

module.exports = (event) => {
  const senderId = event.sender.id;
  const message = event.message.text;
  const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'christiangamebot_bot'});
  apiaiSession.on('response', (response) => {
    const result = response.result.fulfillment.speech;
    sendTextMessage(senderId, result);
  });
  apiaiSession.on('error', error => console.log(error));
  apiaiSession.end();
};
