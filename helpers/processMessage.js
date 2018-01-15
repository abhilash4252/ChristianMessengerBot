const API_AI_TOKEN = '3e4e16f1cc074cc98fc8084962b14a3a'
const apiAiClient = require('apiai')(API_AI_TOKEN);
const Game = require('../models/Game');
const Topic = require('../models/topics');
const User = require('../models/User');
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
async function addUsersToTeam(senderId, teamName, teamId) {
  user = new User({ user_name: 'FIX LATER', team: teamName, fb_psid: senderId, state: 'new'})
  alreadyPresent = await User.findOne({fb_psid: senderId})
  if(!alreadyPresent) {
    await user.save();
  }
  else {
    await User.findOne({fb_psid: senderId}, function(err, user) {
      user.team = teamName
      user.save();
    });
  }

  await Game.findOne(condition, function(err, doc) {
    oldUsers = [];

    //Removing user from Team1 if already present
    oldUsers = doc.team1_members;
    newUsers = [];
    oldUsers.forEach(function(member) {
      if(member != senderId) {
        newUsers.push(member);
      }
    });
    doc.team1_members = newUsers;

    //Removing user from Team2 if already present
    oldUsers = doc.team2_members;
    newUsers = [];
    oldUsers.forEach(function(member) {
      if(member != senderId) {
        newUsers.push(member);
      }
    });
    doc.team2_members = newUsers;


    if(teamId == 'team1') {
      doc.team1_members.push(senderId);
    }
    else if(teamId == 'team2') {
      doc.team2_members.push(senderId);
    }
    doc.save()
  });
}

async function getCurrentUser(senderId) {
  var user = null;
  await User.findOne({fb_psid: senderId}, function(err, doc) {
    user = doc
  });

  console.log(user);
  return user;
}

async function updateTopcNameOfUser(senderId, topicName) {
  await User.findOne({ fb_psid: senderId}, function(err, user) {
    user.topic_name = topicName
    user.save();
  });
}


function updateStateOfUser(senderId, state) {
  User.findOne({ fb_psid: senderId}, function(err, user) {
    user.state = state
    user.save();
  });
}

async function addTopicToGame(topicName, senderId, state) {
  var topic = new Topic({
    topic_name: topicName.toUpperCase(),
    team1_score: 0,
    team2_score: 0,
    effects: []
  });

  var alreadyPresent = await Topic.findOne({topic_name: topicName.toUpperCase()});

  if(!alreadyPresent) {
    await topic.save();
  }

  await User.findOne({fb_psid: senderId}, function(err, user) {
    user.topic_name = topicName.toUpperCase();
    user.state = state
    user.save();
  });
};

async function addEffectToTopic( senderId, effectDescription, topicInfo, state) {
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.push({
      effect_description: effectDescription,
      state: 'new',
      effect_owner: senderId,
      topic_name: topicInfo,
      reasons: []
    })
    topic.save();
  });

  await User.findOne({fb_psid: senderId}, function(err, user) {
    user.state = state
    user.save();
  });
};

async function sendVerficationMessages(effect, senderId, gameData, user) {
  verifiersList = [];
  if(user.team == 'Gutmenschen') {
    own_player_list = gameData.team1_members
    opponent_players_list = gameData.team2_members
  }
  else if( user.team == 'Wutburger') {
    own_player_list = gameData.team2_members
    opponent_players_list = gameData.team1_members
  }

  var elem1;
  var elem2;
  var elemListLength = opponent_players_list.length;

  elem1 = opponent_players_list[Math.floor(Math.random() * elemListLength)];
  if (elemListLength > 1) {
    do {
      elem2 = opponent_players_list[Math.floor(Math.random() * elemListLength)];
    } while(elem1 == elem2);
  }

  verifiersList.push(elem1);
  if(elem2) {
    verifiersList.push(elem2);
  }

  verifiersList = [...(new Set(verifiersList))]
  var lengthOfList = 0;

  if(verifiersList.length < 3) {
    lengthOfList = verifiersList.length;
  }
  else {
    lengthOfList = 3
  }

  for(var i = 0; i< lengthOfList; i++) {
    console.log(verifiersList);
    recieverId = verifiersList[i];
    if(recieverId != senderId) {
      console.log(recieverId);
      await User.findOne({fb_psid: recieverId}, function(err, user) {
        user.state = "waiting_for_response";
        user.save();
      });
      text_hash = {
        "text":  "Hey! Another Player gave in an possible negative effect."
      }
      sendTextMessage(recieverId, text_hash);
      text_hash = {
        "text":  "He thinks the following might take place: '" + effect + "'."
      }
      sendTextMessage(recieverId, text_hash);

      text_hash = {
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text": "Do you agree, that this might be possible?",
            "buttons":[
              {
                "type":"postback",
                "payload":effect + "+./agree+./" + user.topic_name,
                "title":"Agree"
              },
              {
                "type":"postback",
                "payload":effect + "+./disagree+./" + user.topic_name,
                "title":"Disagree"
              }
            ]
          }
        }
      }
      sendTextMessage(recieverId, text_hash)

    }
  }

}

async function agreeUserReponseForEffect(topicInfo, effectDescription, user) {
  var topic_owner = null;
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        if(effect.state == 'new') {
          effect.state = 'partial_upvote'
          text_hash = {
            "text": "Good news. One player accepted your input '" + effect.effect_description + "'. One more and you score a point for your team!"
          }
          sendTextMessage(effect.effect_owner, text_hash);
        }
        else if ( effect.state == 'partial_downvote') {
          effect.state = 'neutral'
          text_hash = {
            "text": "Good news. One player accepted your input '" + effect.effect_description + "'. One more and you score a point for your team!"
          }
          sendTextMessage(effect.effect_owner, text_hash);
        }
        else if (effect.state == 'partial_upvote' || effect.state == 'neutral') {
          User.findOne({fb_psid: effect.effect_owner}, function(err, topic_owner) {
            console.log(topic_owner.team);
            effect.state = 'agreed'
            if(topic_owner.team == 'Gutmenschen') {
              topic.team1_score = topic.team1_score + 1;
              Game.findOne(condition, function(err, doc) {
                doc.team1_score = doc.team1_score + 1;
                doc.save();
              });
            }
            else if(topic_owner.team = 'Wutburger') {
              topic.team2_score = topic.team2_score + 1;
              Game.findOne(condition, function(err, doc) {
                doc.team2_score = doc.team2_score + 1;
                doc.save();
              });
            }
            text_hash = {
              "text":  "Hey! Good news. Your input '" + effect.effect_description + "' had been confirmed."
            }
            sendTextMessage(effect.effect_owner, text_hash);
            text_hash = {
              "text":  "Congrats you have earned a point for you team!"
            }
            sendTextMessage(effect.effect_owner, text_hash);
          });
          updateStateOfUser(effect.effect_owner , 'new')
        }
      }
    });

    topic.save();
  });

  updateStateOfUser(user.fb_psid , 'new')
  text_hash = {
    "text": "Perfect. Thanks for your agreement! I will inform the other players about it right away!"
  }

  sendTextMessage(user.fb_psid, text_hash);

}

async function disAgreeUserReponseForEffect(topicInfo, effectDescription, user, reason) {
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        effect.reasons.push({
          description: reason,
          user_id: user.fb_psid
        });

        if(effect.state == 'new') {
          effect.state = 'partial_downvote'
           text_hash = {
            "text":  "Oh, I have to inform you that one player disagreed with your effect: '" + effect.effect_description + "'. His reason was: '" + reason + "'. But don’t mind, there are still two more players who could confirm your input. I cross my fingers for you! "
          }
          updateStateOfUser(effect.effect_owner, 'new')
          sendTextMessage(effect.effect_owner, text_hash);
        }
        else if (effect.state == 'partial_upvote') {
          effect.state = 'neutral'
          updateStateOfUser(effect.effect_owner, 'new')
          text_hash = {
            "text":  "Oh, I have to inform you that one player disagreed with your effect: '" + effect.effect_description + "'. His reason was: '" + reason + "'. But don’t mind, there are still two more players who could confirm your input. I cross my fingers for you! "
          }
          sendTextMessage(effect.effect_owner, text_hash);
        }
        else if (effect.state == 'partial_downvote' || effect.state == 'neutral') {
          effect.state = 'dis_agreed'
          updateStateOfUser(effect.effect_owner, 'disagreed_effect_response')
          text_hash = {
            "text":  "Hey " + effect.effect_owner + " I have to inform you that your input " + effect.effect_description + "had been rejected"
          }
          sendTextMessage(effect.effect_owner, text_hash);
          text_hash = {
            "text":  "The other players gave the following reasons: "
          }
          sendTextMessage(effect.effect_owner, text_hash);

          var i = 1;
          effect.reasons.forEach(function(reason) {
            text_hash = {
              "text": String(i) + ": " + reason.description
            }
            sendTextMessage(effect.effect_owner, text_hash);
            i++;
          })

          text_hash = {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"button",
                "text": "Do you want to drop your input or report a conflict?",
                "buttons":[
                  {
                    "type":"postback",
                    "payload": effect + "+./agree+./" + topic.topic_name,
                    "title":"Drop the input"
                  },
                  {
                    "type":"postback",
                    "payload": effect + "+./conflict+./" + topic.topic_name,
                    "title":"Report Conflict"
                  }
                ]
              }
            }
          }
          sendTextMessage(effect.effect_owner, text_hash)
        }

      }
    });

    topic.save();
  });

  updateStateOfUser(user.fb_psid, 'new');

  text_hash = {
    "text": "Your response has been shared with Effect Owner."
  }

  sendTextMessage(user.fb_psid, text_hash);
}

async function getGameData() {
  var data = null;
  await Game.findOne(condition, function(err, doc) {
    data = doc;
  });
  return data;
}

async function formatAndSendMessage(senderId, text){
  Game.findOne(condition, function(err, doc) {
    gameData = doc;
    User.findOne({fb_psid: senderId}, function(err, currentUser) {
      if(gameData) {
        if(currentUser) {
          var state  = currentUser.state;
        }
        var topics = gameData.topics;
        console.log(state);
        console.log(currentUser);
        switch(state) {
          case 'create_state':
            if(text) {
              text_hash = {
                "text": 'Ok perfect. You are joining the game with following topic: ' + text
              }
              addTopicToGame(text, senderId, 'create_effect');
              sendTextMessage(senderId, text_hash);
              text_hash = getAfterTopicSelectionText;
              sendTextMessage(senderId, text_hash);
            }
            break;
          case 'create_effect':
            if(text == "dont_know") {
              updateStateOfUser(senderId, 'new');
              text_hash = {
                "text": 'No Problem. I will inform you about incoming effects of other players and when the next phase of game is starting'
              }
              sendTextMessage(senderId, text_hash);
            }
            else if(text) {
              console.log(text);

              addEffectToTopic(senderId, text, currentUser.topic_name, 'create_effect');
              sendVerficationMessages(text, senderId, gameData, currentUser);

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
            break;
          case 'disagreed_effect_response':
            console.log(text);
            var effectDescription = text.split('+./')[0];
            var userResponse = text.split('+./')[1];
            var topicInfo = text.split('+./')[2];
            if(userResponse == 'agree') {
              //TODO delete effect from db
              text_hash = {
                "text": "You Input has been dropped. Next time it will work!"
              }
              sendTextMessage(senderId, text_hash);
            }

            else if (userResponse == 'conflict') {
              text_hash = {
                "text": "Your input has been highlighted as conflict. This will decrease overall System points."
              }

              sendTextMessage(senderId, text_hash);
            }

            updateStateOfUser(senderId, 'new')

            break;

          case 'waiting_for_response':
            if(currentUser.sub_state) {
              var effectDescription = currentUser.sub_state.split('+./')[0];
              var topicInfo = currentUser.sub_state.split('+./')[2];
            }
            else {
              var effectDescription = text.split('+./')[0];
              var userResponse = text.split('+./')[1];
              var topicInfo = text.split('+./')[2];
            }
            if(userResponse == 'agree') {
              agreeUserReponseForEffect(topicInfo, effectDescription, currentUser);
            }

            else if (userResponse == 'disagree') {
              text_hash = {
                "text": "Fair enough! Why don't you agree? What is your reason?"
              }
              User.findOne({fb_psid: senderId}, function(err, user) {
                user.sub_state = text;
                user.save();
              })

              sendTextMessage(senderId, text_hash);
            }
            else {
              disAgreeUserReponseForEffect(topicInfo, effectDescription, currentUser, text)
              User.findOne({fb_psid: senderId}, function(err, user) {
                user.sub_state = null;
                user.save();
              })
            }

            break;

          case 'new':
            if(text == 'own_topic') {
              text_hash = {
                'text': "Ok. Please describe your topic in one word."
              }
              console.log(text);
              updateStateOfUser(senderId, 'create_state');
              sendTextMessage(senderId, text_hash);
            }
            else if(text == 'existing_topic') {
              var buttons = []
              Topic.find({}, function(err, topics) {
                for(var i = 0 ; i < topics.length; i++) {
                  console.log(topics[i].topic_name)
                  buttons.push({
                    "type": "postback",
                    "payload": topics[i].topic_name,
                    "title": topics[i].topic_name
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
                updateStateOfUser(senderId, 'create_state')
                sendTextMessage(senderId, text_hash);
              });
            }

          default:
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
              addUsersToTeam(senderId, 'Gutmenschen', 'team1');

              text_hash = {
                'text': 'Ok great, you are a member of the team Gutmenschen now.'
              };
              sendTextMessage(senderId, text_hash);

              text_hash = getAfterJoinReplyButtonPayloads;
              sendTextMessage(senderId, text_hash)
            }
            else if(text == 'join_team_2') {
              addUsersToTeam(senderId, 'Wutburger', 'team2');

              text_hash = {
                'text': 'Ok great, you are a member of the team Wutburger now.'
              };
              sendTextMessage(senderId, text_hash);

              text_hash = getAfterJoinReplyButtonPayloads;
              sendTextMessage(senderId, text_hash)
            }

            else if(text){
              text_hash = {
                'text': 'Not a Valid Option! Please type start to begin the game'
              };
              sendTextMessage(senderId, text_hash);
            }
            break;
        };
      }
      else {
        formatAndSendMessage(senderId, text);
      }
    });
  });
};
