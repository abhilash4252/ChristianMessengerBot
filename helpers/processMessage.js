const API_AI_TOKEN = '3e4e16f1cc074cc98fc8084962b14a3a'
const apiAiClient = require('apiai')(API_AI_TOKEN);
const Game = require('../models/Game');
const condition = { uuid: 1 };
const FACEBOOK_ACCESS_TOKEN = 'EAAVRhfRwxYABAK8CfHpWEbpyKJVJmtvSbsq5eJaEwJAjJUZBpGZAndnh3bs1rUOtWnnR0tS4GrosJzKW1r0d40UZB34SOTRxzoSjV3YGinHPqgm9Y0Cwd34VDia7ujUHyHtZCP0oAZBPD0kZChPaMlgmPfzqcZA8yeAF6fE76fjLAZDZD';
var create_topic = null;

const request = require('request');
const sendTextMessage = (senderId, text_hash) => {
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
function addUsersToTeam(doc, senderId, teamName, teamId) {
  oldUsers = [];
  //TODO FIx username
  newUser = { user_name: 'FIX LATER', team: teamName, fb_psid: senderId}

  //Removing user from Team1 if already present
  oldUsers = doc.team1_members;
  newUsers = [];
  oldUsers.forEach(function(member) {
    if(member.fb_psid != senderId) {
      newUsers.push(member);
    }
  });
  doc.team1_members = newUsers;

  //Removing user from Team2 if already present
  oldUsers = doc.team2_members;
  newUsers = [];
  oldUsers.forEach(function(member) {
    if(member.fb_psid != senderId) {
      newUsers.push(member);
    }
  });
  doc.team2_members = newUsers;


  if(teamId == 'team1') {
    doc.team1_members.push(newUser);
  }
  else if(teamId == 'team2') {
    doc.team2_members.push(newUser);
  }
}

function getStateOfUser(doc, senderId) {
  var state = null;
  doc.team1_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      state = member.state;
    }
  });

  doc.team2_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      state = member.state;
    }
  });
  return state;

}

function updateTopcNameOfUser(doc, senderId, topicName) {
  doc.team1_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      member.topic_name = topicName;
    }
  });

  doc.team2_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      member.topic_name = topicName;
    }
  });
}


function updateStateOfUser(doc, senderId, state) {
  doc.team1_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      member.state = state
    }
  });

  doc.team2_members.forEach(function(member) {
    if(member.fb_psid == senderId) {
      member.state = state
    }
  });
}

function getTopicInfoForUser(doc, senderId) {
  var topicInfo;
  doc.team1_members.forEach(function(user) {
    if(senderId == user.fb_psid) {
      topicInfo = user.topic_name;
    }
  });
  doc.team2_members.forEach(function(user) {
    if(senderId == user.fb_psid) {
      topicInfo = user.topic_name
    }
  });
  return topicInfo;
};

function addTopicToGame(doc, topicName) {
  var alreadyPresent = false;
  doc.topics.forEach(function(topic) {
    if(topic.topic_name == topicName.toUpperCase()) {
      alreadyPresent = true;
    }
  });

  if(!alreadyPresent) {
    doc.topics.push({
      topic_name: topicName.toUpperCase(),
      team1_score: 0,
      team2_score: 0,
    });

    console.log(doc.topics)
  }
};

function addEffectToTopic(doc, senderId, effectDescription) {
  var topicInfo = getTopicInfoForUser(doc, senderId);
  console.log(topicInfo);
  doc.effects.push({
    effect_description: effectDescription,
    state: 'new',
    effect_owner: senderId,
    topic_name: topicInfo,
    reasons: []
  })
};

const formatAndSendMessage = (senderId, text) => {
  Game.findOne(condition, function(err, doc) {
    var state = getStateOfUser(doc, senderId);;
    console.log(state);
    console.log(text);
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
      addUsersToTeam(doc, senderId, 'Gutmenschen', 'team1');
      updateStateOfUser(doc, senderId, 'new');
      doc.save();

      text_hash = {
        'text': 'Ok great, you are a member of the team Gutmenschen now.'
      };
      sendTextMessage(senderId, text_hash);

      text_hash = getAfterJoinReplyButtonPayloads;
      sendTextMessage(senderId, text_hash)
    }
    else if(text == 'join_team_2') {
      addUsersToTeam(doc, senderId, 'Wutburger', 'team2');
      updateStateOfUser(doc, senderId, 'new');
      doc.save();

      text_hash = {
        'text': 'Ok great, you are a member of the team Wutburger now.'
      };
      sendTextMessage(senderId, text_hash);

      text_hash = getAfterJoinReplyButtonPayloads;
      sendTextMessage(senderId, text_hash)
    }
    else if(text == 'own_topic') {
      text_hash = {
        'text': "Ok. Please describe your topic in one word."
      }
      updateStateOfUser(doc, senderId, 'create_state');
      doc.save();
      sendTextMessage(senderId, text_hash);
    }
    else if(text == 'existing_topic') {
      var buttons = []
      for(var i = 0 ; i < doc.topics.length; i++) {
        console.log(doc.topics[i].topic_name)
        buttons.push({
          "type": "postback",
          "payload": doc.topics[i].topic_name,
          "title": doc.topics[i].topic_name
        });
      };
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
      updateStateOfUser(doc, senderId, 'create_effect')
      doc.save();
      sendTextMessage(senderId, text_hash);
    }
    else if(state == 'create_state' ) {
      text_hash = {
        "text": 'Ok perfect. You are joining the game with following topic: ' + text
      }

      addTopicToGame(doc, text);
      updateTopcNameOfUser(doc, senderId, text.toUpperCase());
      updateStateOfUser(doc, senderId, 'create_effect');
      doc.save();

      sendTextMessage(senderId, text_hash);
      text_hash = getAfterTopicSelectionText;
      sendTextMessage(senderId, text_hash);
    }
    else if(text == "selected_topic") {
      text_hash = {
        "text": 'Ok perfect. You are joining the game with following topic: ' + text
      }
      updateStateOfUser(doc, senderId, 'create_effect');
      updateTopcNameOfUser(doc, senderId, text)
      doc.save();
      sendTextMessage(senderId, text_hash);
      text_hash = getAfterTopicSelectionText;
      sendTextMessage(senderId, text_hash);
    }
    else if(text == "dont_know") {
      updateStateOfUser(doc, senderId, 'free');
      doc.save();
      text_hash = {
        "text": 'No Problem. I will inform you about incoming effects of other players and when the next phase of game is starting'
      }
      sendTextMessage(senderId, text_hash);
    }
    else if(state == 'create_effect') {
      addEffectToTopic(doc, senderId, text);
      console.log(doc.effects);
      updateStateOfUser(doc, senderId, 'free');
      doc.save();
      console.log(doc.effects)

      text_hash = {
        text: "Thanks for your input. I will ask other players, if they agree and inform you if it got accepted"
      }
      sendTextMessage(senderId, text_hash)

      text_hash = {
        text: "Do you know about another possible negative effect?"
      }
      sendTextMessage(senderId, text_hash)
      text_hash = {
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text": "If yes, please describe it in less than 20 words!.",
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

      sendTextMessage(senderId, text_hash);
    }
    else {
      text_hash = {
        'text': 'Not a Valid Option! Please type start to begin the game'
      };
      sendTextMessage(senderId, text_hash);
    }
  });
};
