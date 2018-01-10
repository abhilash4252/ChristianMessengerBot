const API_AI_TOKEN = '3e4e16f1cc074cc98fc8084962b14a3a'
const apiAiClient = require('apiai')(API_AI_TOKEN);
const Game = require('../models/Game');
const condition = { uuid: 1 };
const FACEBOOK_ACCESS_TOKEN = 'EAAVRhfRwxYABAK8CfHpWEbpyKJVJmtvSbsq5eJaEwJAjJUZBpGZAndnh3bs1rUOtWnnR0tS4GrosJzKW1r0d40UZB34SOTRxzoSjV3YGinHPqgm9Y0Cwd34VDia7ujUHyHtZCP0oAZBPD0kZChPaMlgmPfzqcZA8yeAF6fE76fjLAZDZD';
var create_topic

const request = require('request');
const sendTextMessage = (senderId, text_hash) => {
  console.log(text_hash);
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: FACEBOOK_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: senderId },
      message: text_hash,
    }
  });
};

function getUserInfo(senderId){
  //TODO Fix THIS later
  return 'In Progres'
};


module.exports = (event) => {
  const senderId = event.sender.id;
  var message = '';
  if(event.postback && event.postback.payload) {
    message = event.postback.payload;
  }
  else {
    message = event.message.text;
  }
  formatAndSendMessage(senderId, message);

  /*
   *const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'christiangamebot_bot'});
   *apiaiSession.on('response', (response) => {
   *  var result = response.result.fulfillment.speech;
   *  formatAndSendMessage(senderId, result);
   *});
   *apiaiSession.on('error', error => console.log(error));
   *apiaiSession.end();
   */
};

const getAfterJoinReplyButtonPayloads = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text": "Do you want to play on an own topic or an open one?",
      "buttons":[
        {
          "type":"postback",
          "payload":"own_topic",
          "title":"Own topic"
        },
        {
          "type":"postback",
          "payload":"existing_topic",
          "title":"Existing topic"
        }
      ]
    }
  }
}

const getAfterTopicSelectionText = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text": "Ok Please describe one negative effect of the topic in less than 20 words.",
      "buttons":[
        {
          "type":"postback",
          "payload":"dont_know",
          "title":"Don't know"
        }
      ]
    }
  }
}

function getStateOfUser(senderId) {
  Game.findOne(condition, function(err, doc) {
    doc.team1_members.forEach(function(member) {
      if(member.user_name == getUserInfo(senderId)) {
        return member.state;
      }
    });

    doc.team2_members.forEach(function(member) {
      if(member.user_name == getUserInfo(senderId)) {
        return member.state;
      }
    });
  })
}

const formatAndSendMessage = (senderId, text) => {
  console.log(text);
  var state = getStateOfUser(senderId);
  console.log(state);
  if(text == 'start') {
    text_hash = {
      'text': 'Hey and welcome to the game Gutmenschen vs Wutburger.'
    };
    sendTextMessage(senderId, text_hash);

    text_hash = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text": "Which team do you want to join?",
          "buttons":[
            {
              "type":"postback",
              "payload":"join_team_1",
              "title":"Gutmenschen"
            },
            {
              "type":"postback",
              "payload":"join_team_2",
              "title":"Wutburger"
            }
          ]
        }
      }
    }
    sendTextMessage(senderId, text_hash)
  }
  else if(text == 'join_team_1') {
    console.log(getUserInfo(senderId));
    Game.findOne(condition, function(err, doc){
      doc.team1_members.push({ user_name: getUserInfo(senderId), team: 'Gutmenschen'})
      doc.save();
    });

   text_hash = {
      'text': 'Ok great, you are a member of the team Gutmenschen now.'
    };
    sendTextMessage(senderId, text_hash);

    text_hash = getAfterJoinReplyButtonPayloads;
    sendTextMessage(senderId, text_hash)

  }
  else if(text == 'join_team_2') {
    console.log(getUserInfo(senderId));
    Game.findOne(condition, function(err, doc){
      doc.team2_members.push({ user_name: getUserInfo(senderId), team: 'Wutburger'})
      doc.save();
    });

   text_hash = {
      'text': 'Ok great, you are a member of the team Wutburger now.'
    };
    sendTextMessage(senderId, text_hash);

    text_hash = getAfterJoinReplyButtonPayloads;
    sendTextMessage(senderId, text_hash)
  }

  else if(text == 'own_topic' || create_topic) {
    text_hash = {
      'text': "Ok. Please describe your topic in one word."
    }
    create_topic = true;
    sendTextMessage(senderId, text_hash);
  }
  else if(create_topic) {
    text_hash = {
      "text": 'Ok perfect. You are joining the game with following topic: ' + text
    }

    Game.findOne(condition, function(err, doc){
      doc.topics.push(
        {
          topic_name: text,
          effects: []
        })
      doc.save();
    });

   sendTextMessage(senderId, text_hash);
    text_hash = getAfterTopicSelectionText;
    create_topic = false;
    sendTextMessage(senderId, text_hash);
  }

  else if(text == 'existing_topic') {
    var buttons = []
    Game.findOne(condition, function(err, doc) {
      for(var i = 0 ; i < doc.topics.length; i++) {
        buttons.push({
          "type":"postback",
          "payload":doc.topics[i].topic_name,
          "title": doc.topics[i].topic_name
        });
      };
    });
    text_hash = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text": "Ok. Choose one of the following topics.",
          "buttons": buttons
        }
      }
    }
  }
  else {
    console.log(create_topic);
    text_hash = {
      'text': 'Not a Valid Option! Please type start to begin the game'
    };
    sendTextMessage(senderId, text_hash);
  }
};
