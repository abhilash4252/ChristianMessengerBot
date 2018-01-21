const API_AI_TOKEN = '3e4e16f1cc074cc98fc8084962b14a3a'
const apiAiClient = require('apiai')(API_AI_TOKEN);
const Game = require('../models/Game');
const Topic = require('../models/topics');
const User = require('../models/User');
const condition = { uuid: 1 };
var sleep = require('sleep');
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
      "text": "If yes, Please describe it in less than 20 words.",
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

  return user;
}

async function updateTopcNameOfUser(senderId, topicName) {
  await User.findOne({ fb_psid: senderId}, function(err, user) {
    user.topic_name = topicName
    user.save();
  });
}

async function updateStateOfUser(senderId, state) {
  User.findOne({ fb_psid: senderId}, function(err, user) {
    user.state = state
    user.save();
  });
}

async function addTopicToGame(topicName, senderId, state, user) {
  var newTopic = new Topic({
    topic_name: topicName.toUpperCase(),
    team1_score: 0,
    team2_score: 0,
    effects: []
  });

  var alreadyPresent = await Topic.findOne({topic_name: topicName.toUpperCase()});

  if(!alreadyPresent) {
    await newTopic.save();
  }

  await updateTopcNameOfUser(senderId, topicName);

  await Topic.findOne({topic_name: topicName.toUpperCase()}, function(err, topic) {
    var topicAlreadyPresent = false;
    console.log(user.team);
    if(user.team == 'Gutmenschen') {
      topic.team1_members.forEach(function(user) {
        if(user == senderId) {
          topicAlreadyPresent = true
        }
      });
      if(!topicAlreadyPresent) {
        console.log("Added");
        topic.team1_members.push(senderId);
      }

    }
    else if (user.team == 'Wutburger') {
      topic.team2_members.forEach(function(user) {
        if(user == senderId) {
          topicAlreadyPresent = true
        }
      });
      if(!topicAlreadyPresent) {
        topic.team2_members.push(senderId);
      }
    }

    topic.save();
    console.log(topic);

    if(topic.team1_members.length > 0 && topic.team2_members.length > 0) {
      topic.team1_members.concat(topic.team2_members).forEach(function(user_id) {
        User.findOne({fb_psid: user_id}, function(err, usr) {
          if(usr.topic_name == topic.topic_name.toUpperCase()) {
            usr.state = 'create_effect'
            usr.save();
          }

          text_hash = {
            "text": "The game begins. It will take maximum of one hour from now on.\n\n" +
              "To score points, for your team name a possible negative effect of the topic.\n\n"+
              "Do you have any negative effect in mind, which may evolve out of topic?\n"
          }
          sendTextMessage(user_id, text_hash);

          text_hash = getAfterTopicSelectionText;
          sendTextMessage(user_id, text_hash);
        });
      });
    }
    else {
      User.findOne({fb_psid: senderId}, function(err, usr) {
        usr.topic_name = topicName.toUpperCase();
        usr.state = 'waiting_for_game_to_start'
        usr.save();
      });

      text_hash = {
        "text": "The game to the topic '" + topic.topic_name + "' starts, as soon as a minimum of 3 players joined each team. \n\n " + 
          "At the moment, we have " + topic.team1_members.length + " players in Gutmenchen team and " + topic.team2_members.length + " players in Wutburger Team.\n\n" +
            "I will inform you, as soon as the game begins."
      }
      sendTextMessage(senderId, text_hash);
    }
  });

};

async function addEffectToTopic( senderId, effectDescription, topicInfo, state, gameData, user) {
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.push({
      effect_description: effectDescription,
      state: 'new',
      effect_owner: senderId,
      topic_name: topicInfo,
      effect_verifiers: [],
      reasons: []
    })

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
        User.findOne({fb_psid: recieverId}, function(err, user) {
          user.state = "waiting_for_response";
          user.save();
        });
        console.log(topic);
        topic.effects.forEach(function(eff) {
          console.log(eff);
          if(eff.effect_description == effectDescription) {
            console.log(recieverId)
            eff.effect_verifiers.push(recieverId)
          }
        });
        topic.save();

        textMsg = "Hey! Another Player gave in an possible negative effect.\n\n" +
          "He thinks the following might take place: '" + effectDescription + "'.\n\n" +
            "Do you agree, that this might be possible?"

        text_hash = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text": textMsg,
              "buttons":[
                {
                  "type":"postback",
                  "payload":effectDescription + "+./agree+./" + user.topic_name,
                  "title":"Agree"
                },
                {
                  "type":"postback",
                  "payload":effectDescription + "+./disagree+./" + user.topic_name,
                  "title":"Disagree"
                }
              ]
            }
          }
        }
        sendTextMessage(recieverId, text_hash)

      }
    }
  });

  await User.findOne({fb_psid: senderId}, function(err, user) {
    user.state = state
    user.save();
  });
};

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
          topic.save();
        }
        else if ( effect.state == 'partial_downvote') {
          effect.state = 'neutral'
          text_hash = {
            "text": "Good news. One player accepted your input '" + effect.effect_description + "'. One more and you score a point for your team!"
          }
          topic.save();
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
              "text":  "Hey! Good news. Your input '" + effect.effect_description + "' had been confirmed.\n\n" +
              "Congrats you have earned a point for you team!"
            }
            sendTextMessage(effect.effect_owner, text_hash);
            topic.save();
          });
          updateStateOfUser(effect.effect_owner , 'new')
        }
      }
    });

  });

  updateStateOfUser(user.fb_psid , 'new')
  text_hash = {
    "text": "Perfect. Thanks for your agreement! I will inform the other players about it right away!"
  }

  sendTextMessage(user.fb_psid, text_hash);
}

async function recordUserConflictReponseForEffect(topicInfo, effectDescription, currentUser, response) {
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        if(response == 'agree') {
          effect.conflicted_votes = effect.conflicted_votes + 1
        }
        else if(response == 'dis_agree') {
          effect.conflicted_votes = effect.conflicted_votes + 1
        }
        topic.save();

        if(effect.conflicted_votes == 2) {
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
              "text":  "Hey! Good news. Your conflict for '" + effect.effect_description + "' had been resolved.\n\n" + 
                "Congrats you have earned a point for you team!"
            }
            sendTextMessage(effect.effect_owner, text_hash);
            topic.save();
          });

          User.findOne({fb_psid: effect.conflicted_reformation_owner}, function(err, topic_owner) {
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
              "text":  "Hey! Good news. Your solution for '" + effect.effect_description + "' had been confirmed.\n\n" +
                "Congrats you have earned a point for you team!"
            }
            sendTextMessage(effect.conflicted_reformation_owner, text_hash);
            topic.save();
          });
          Game.findOne(condition, function(err, doc) {
            doc.system_score = doc.system_score + 2;
            doc.save();
          });

        }
        updateStateOfUser(effect.effect_owner , 'new')
      }
    });

  });

  updateStateOfUser(currentUser.fb_psid , 'new')
  text_hash = {
    "text": "Your input has been recorded!"
  }

  sendTextMessage(currentUser.fb_psid, text_hash);
}

async function reformulateConflictedEffect(topicInfo, effectDescription, currentUser, newEffectDescription){
  verifiersList = [];
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        effect.conflicted_effect_reformulation = newEffectDescription;
        verifiersList = effect.effect_verifiers;
        verifiersList = verifiersList.concat([effect.effect_owner])
        effect.conflicted_reformation_owner = currentUser.fb_psid
        effect.conflicted_votes = 0
      }
    });

    topic.save();

    if(verifiersList.length < 3) {
      lengthOfList = verifiersList.length;
    }
    else {
      lengthOfList = 3
    }

    for(var i = 0; i< lengthOfList; i++) {
      console.log(verifiersList);
      recieverId = verifiersList[i];
      if(recieverId != currentUser.fb_psid) {
        console.log(recieverId);
        User.findOne({fb_psid: recieverId}, function(err, user) {
          user.state = "waiting_for_conflicted_solution";
          user.save();
        });

        textMessage = "The conflicted effect '" + effectDescription + "' has been reformulated to: " + newEffectDescription + "'.\n \n" + 
          "Do you agree with the solution?"

          text_hash = {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"button",
                "text": textMessage,
                "buttons":[
                  {
                    "type":"postback",
                    "payload": effectDescription + "+./agree+./" + currentUser.topic_name,
                    "title":"Agree"
                  },
                  {
                    "type":"postback",
                    "payload": effectDescription + "+./dis_agreed+./" + currentUser.topic_name,
                    "title":"Disagree"
                  }
                ]
              }
            }
          }
          sendTextMessage(recieverId, text_hash)
      }
    }
  });

  text_hash = {
    "text": "Your solution has been sent for approval!"
  }

  sendTextMessage(currentUser.fb_psid, text_hash);
}

async function conflictReportingFlow(topicInfo, effectDescription, currentUser) {
  verifiersList = [];
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        effect.state = "conflicted_effect";
        verifiersList = effect.effect_verifiers;
      }
    });

    topic.system_score = topic.system_score - 1;
    Game.findOne(condition, function(err, doc) {
      doc.system_score = doc.system_score - 1;
    });

    topic.save();

    if(verifiersList.length < 3) {
      lengthOfList = verifiersList.length;
    }
    else {
      lengthOfList = 3
    }

    for(var i = 0; i< lengthOfList; i++) {
      console.log(verifiersList);
      recieverId = verifiersList[i];
      if(recieverId != currentUser.fb_psid) {
        console.log(recieverId);
        User.findOne({fb_psid: recieverId}, function(err, user) {
          user.state = "waiting_for_conflicted_response";
          user.save();
        });

        textMessage = "The effect '" + effectDescription + "' has been reported as conflicted.\n \n" + 
          "You can offer a reformulation that fits you, to offer a solution to the conflict."

          text_hash = {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"button",
                "text": textMessage,
                "buttons":[
                  {
                    "type":"postback",
                    "payload": effectDescription + "+./no_thanks+./" + currentUser.topic_name,
                    "title":"No, thanks"
                  },
                  {
                    "type":"postback",
                    "payload": effectDescription + "+./reformulate_conflict_solution+./" + currentUser.topic_name,
                    "title":"Offer a reformulation"
                  }
                ]
              }
            }
          }
          sendTextMessage(recieverId, text_hash)
      }
    }

    text_hash = {
      "text": "Ok, a conflict has been reported. This reduces system point by 1.\n \n" +
      "At the end of the game, you get the chance to apply for a group vote to clear the conflict."
    }

      sendTextMessage(currentUser.fb_psid, text_hash)
  });
}

async function reformulateEffectDescription(topicInfo, effectDescription, currentUser, newEffectDesctiption) {
  verifiersList = [];
  await Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        effect.effect_description = newEffectDesctiption;
        effect.state = "new";
        verifiersList = effect.effect_verifiers;
      }
    });

    topic.save();

    if(verifiersList.length < 3) {
      lengthOfList = verifiersList.length;
    }
    else {
      lengthOfList = 3
    }

    for(var i = 0; i< lengthOfList; i++) {
      console.log(verifiersList);
      recieverId = verifiersList[i];
      if(recieverId != currentUser.fb_psid) {
        console.log(recieverId);
        User.findOne({fb_psid: recieverId}, function(err, user) {
          user.state = "waiting_for_response";
          user.save();
        });

        text_hash = {
          "text":  "Hey! Another Player gave in an possible negative effect."
        }
        sendTextMessage(recieverId, text_hash);
        text_hash = {
          "text":  "The previous effect '" + effectDescription + "' has been reformulated to: \n'" + newEffectDesctiption + "'."
        }
        sendTextMessage(recieverId, text_hash);

        text_hash = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text": "Do you agree now?",
              "buttons":[
                {
                  "type":"postback",
                  "payload": newEffectDesctiption + "+./agree+./" + currentUser.topic_name,
                  "title":"Agree"
                },
                {
                  "type":"postback",
                  "payload": newEffectDesctiption + "+./disagree+./" + currentUser.topic_name,
                  "title":"Disagree"
                }
              ]
            }
          }
        }
        sendTextMessage(recieverId, text_hash)
      }
    }
  });
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
                    "payload": effect.effect_description + "+./agree+./" + topic.topic_name,
                    "title":"Drop the input"
                  },
                  {
                    "type":"postback",
                    "payload": effect.effect_description + "+./conflict+./" + topic.topic_name,
                    "title":"Report Conflict"
                  },
                  {
                    "type":"postback",
                    "payload": effect.effect_description + "+./reformulate+./" + topic.topic_name,
                    "title":"Reformulate"
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

async function terminateGame(currentUser) {
  var alreadyPresent = false;

  Topic.findOne({topic_name: currentUser.topic_name}, function(err, topic) {
    topic.terminated_players.forEach(function(terminatedPlayer) {
      if(terminatedPlayer == currentUser.fb_psid) {
        alreadyPresent = true
      }
    });
    if(!alreadyPresent) {
      topic.terminated_players.push(currentUser.fb_psid)
    }
    topic.save();

    totalPlayers = topic.team1_members.concat(topic.team2_members)
    terminatedPlayers = topic.terminated_players
    if((terminatedPlayers.length/totalPlayers.length) * 100 > 90) {
      totalPlayers.forEach(function(user_id) {
        User.findOne({fb_psid: user_id}, function(err, user) {
          user.state = "final_round"
          user.save();
        });
        text_hash = {
          "text": "The final round started. Players with conflicted elements will be asked, if they apply for a group vote, to clear the conflict.\n\n" +
            "Prepare yourself for a responsible vote"
        }
        sendTextMessage(user_id, text_hash);
      });

      topic.effects.forEach(function(effect) {
        if(effect.state = 'conflicted_effect') {
          textMsg = "Your conflict about '" + effect.effect_description + "' still has a negative impact on the system status.\n\n" +
            "When is stays negative, every body will loose.\n\n" +
              "You now have a chance to drop the conflict, let is stay or apply for group decision"

          text_hash = {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"button",
                "text": textMsg,
                "buttons":[
                  {
                    "type":"postback",
                    "payload": effect.effect_description + "+./group_decision+./" + topic.topic_name,
                    "title": "Group Decision"
                  },
                    {
                    "type":"postback",
                    "payload": effect.effect_description + "+./drop_conflict+./" + topic.topic_name,
                    "title": "Drop Conflict"
                  },
                  {
                    "type":"postback",
                    "payload": effect.effect_description + "+./let_conflict_stay+./" + topic.topic_name,
                    "title": "Let Conflict Stay"
                  }
                ]
              }
            }
          }
          sendTextMessage(effect.effect_owner, text_hash);
        }

      });

    }
    else {
      text_hash = {
        "text": "You and " + terminatedPlayers.length + " other players have applied for termination. If 90% of people apply for termination, the final round will start."
      }
      sendTextMessage(currentUser.fb_psid, text_hash)
    }
  });
}

async function groupDecisionFlow(effectDescription, topicInfo, currentUser) {
  reasons = []
  reasonText = "The reasons were: \n\n"
  Topic.findOne({topic_name: topicInfo}, function(topic) {
    topic.effects.forEach(function(effect) {
      if(effect.effect_description == effectDescription) {
        effect.state = 'group_decision'
        reasons = effect.reasons
      }
    });
    for(var i = 1 ; i <= reasons.length; i++) {
      reasonText = reasonText  + String(i) + ". " + reasons[i].description + "\n\n"
    }
    topic.team1_members.concat(topic.team2_members).forEach(function(user_id) {
      if(currentUser.fb_psid != user_id) {
        textMsg = "The following effect has been disagreed: '" + effectDescription + "'\n\n" + reasonText +
          "Do you agree to the given effect, or disagree like other players?"
        text_hash = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text": textMsg,
              "buttons":[
                {
                  "type":"postback",
                  "payload": effectDescription + "+./agree+./" + topicInfo,
                  "title": "Agree"
                },
                {
                  "type":"postback",
                  "payload": effectDescription + "+./dis_agree+./" + topicInfo,
                  "title": "Disagree"
                }
              ]
            }
          }
        }

        sendTextMessage(user_id, text_hash);
      }
    });
    topic.save();
  });

  text_hash = {
    "text": "Ok, a grouped decision will take place. If 51% agree, your effect is confirmed, otherwise it's rejected."
  }
  sendTextMessage(senderId, text_hash)
}

async function castGroupVote(effectDescription, topicInfo, currentUser, response) {
  var alreadyPresent = false
  var effectOwner = null;
  Topic.findOne({topic_name: topicInfo}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if((effect.effect_description == effectDescription) && (effect.state = 'group_decision')){
        effectOwner =effect.effect_owner
        if(response == 'agree') {
          effect.agree_group_decision_votes.forEach(function(agreed_user) {
            if(agreed_user == currentUser.fb_psid) {
              alreadyPresent = true
            }
          });
          if(!alreadyPresent) {
            effect.agree_group_decision_votes.push(currentUser.fb_psid)
            text_hash = {
              "text": "You response has been recorded!"
            }
            sendTextMessage(currentUser.fb_psid, text_hash)
          }
          else {
            text_hash = {
              "text": "You have already submitted your response for this effect!"
            }
            sendTextMessage(currentUser.fb_psid, text_hash)
          }
        }
        else if(response == 'dis_agree') {
          effect.dis_agree_group_decision_votes.forEach(function(agreed_user) {
            if(agreed_user == currentUser.fb_psid) {
              alreadyPresent = true
            }
          });
          if(!alreadyPresent) {
            effect.dis_agree_group_decision_votes.push(currentUser.fb_psid)
            text_hash = {
              "text": "You response has been recorded!"
            }
            sendTextMessage(currentUser.fb_psid, text_hash)
          }
          else {
            text_hash = {
              "text": "You have already submitted your response for this effect!"
            }
            sendTextMessage(currentUser.fb_psid, text_hash)
          }
        }
      }
    });
    topic.save();

    totalPlayers = topic.team1_members.concat(topic.team2_members)
    if(topic.agree_group_decision_votes.length > (totalPlayers.length/2)){
      User.findOne({fb_psid: effectOwner}, function(user) {
        if(user.team = 'Gutmenschen') {
          topic.team1_score = topic.team1_score + 1;
        }
        else if (user.team = 'Wutburger') {
          topic.team2_score = topic.team2_score + 1;
        }
      });
      topic.system_score = topic.system_score + 2
      topic.save();
      text_hash = {
        "text": "Congrats, at least 51% of people agreed to your effect. You won a point for your team, but system score is cooled down by 2 points."
      }
      sendTextMessage(effectOwner, text_hash)


    }
    else if( topic.dis_agree_group_decision_votes.length > (totalPlayers.length/2)) {
      topic.system_score = topic.system_score + 2
      topic.save();
      text_hash = {
        "text": "I'm sorry At least 51% of people dis agreed to your input. You did not win a point for your team, but system score is cooled down by 2 points."
      }
      sendTextMessage(effectOwner, text_hash)

    }
  });
}

async function formatAndSendMessage(senderId, text){
  var gameData = null;
  await Game.findOne(condition, function(err, doc) {
    gameData = doc;

  });
  console.log("Hello");

  console.log(gameData);

  if(gameData) {
    User.findOne({fb_psid: senderId}, function(err, currentUser) {
      if(currentUser) {
        var state  = currentUser.state;
      }
      var topics = gameData.topics;
      console.log(state);
      console.log(currentUser);
      switch(state) {
        case 'create_state':
          if(text) {
            addTopicToGame(text, senderId, 'create_effect', currentUser);
          }
          break;
        case 'create_effect':
          if(text == "dont_know") {
            updateStateOfUser(senderId, 'new');
            text_hash = {
              "text": 'No Problem. I will inform you about incoming effects of other players and when the next phase of game is starting.'
            }
            sendTextMessage(senderId, text_hash);

            text_hash = {
              "attachment":{
                "type":"template",
                "payload":{
                  "template_type":"button",
                  "text": "If yout think, everything is said, you can apply to terminate the game. If 90% of the players terminated the game, the final round will start.",
                  "buttons":[
                    {
                      "type":"postback",
                      "payload": "terminate_game",
                      "title": "Terminate Game"
                    }
                  ]
                }
              }
            }

            sendTextMessage(senderId, text_hash);
          }
          else if(text) {
            console.log(text);

            addEffectToTopic(senderId, text, currentUser.topic_name, 'create_effect', gameData, currentUser);

            text_hash = {
              text: "Thanks for your input. I will ask other players, if they agree i will inform you."
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
            //TODO delete effect from db
            text_hash = {
              "text": "You Input has been dropped. Next time it will work!"
            }
            User.findOne({fb_psid: senderId}, function(err, user) {
              console.log(user.sub_state);
              user.sub_state = null;
              user.state = "new";
              user.save();
            })
            sendTextMessage(senderId, text_hash);
          }

          else if (userResponse == 'conflict') {
            conflictReportingFlow(topicInfo, effectDescription, currentUser)
            User.findOne({fb_psid: senderId}, function(err, user) {
              console.log(user.sub_state);
              user.sub_state = null;
              user.state = "new";
              user.save();
            })
          }
          else if(userResponse == 'reformulate') {
            User.findOne({fb_psid: senderId}, function(err, user) {
              user.sub_state = text;
              user.save();
            })

            text_hash = {
              "text": "Ok, please describe the reformulation in less than 20 words."
            }

            sendTextMessage(senderId, text_hash);
          }

          else {
            reformulateEffectDescription(topicInfo, effectDescription, currentUser, text)
            User.findOne({fb_psid: senderId}, function(err, user) {
              console.log(user.sub_state);
              user.sub_state = null;
              user.state = "new";
              user.save();
            })
          }

          break;

        case 'waiting_for_conflicted_response':
          if(currentUser.sub_state) {
            var effectDescription = currentUser.sub_state.split('+./')[0];
            var topicInfo = currentUser.sub_state.split('+./')[2];
          }
          else {
            var effectDescription = text.split('+./')[0];
            var userResponse = text.split('+./')[1];
            var topicInfo = text.split('+./')[2];
          }

          if(userResponse == 'no_thanks') {
            text_hash = {
              "text": "Your response has been recorded."
            }
            User.findOne({fb_psid: senderId}, function(err, user) {
              user.state = "new";
              user.save();
            })
            sendTextMessage(senderId, text_hash);
          }
          else if(userResponse == 'reformulate_conflict_solution'){
            text_hash = {
              "text": "Ok, please describe the reformulation in less than 20 words."
            }
            User.findOne({fb_psid: senderId}, function(err, user) {
              user.sub_state = text;
              user.save();
            })

            sendTextMessage(senderId, text_hash);

          }
          else {
            reformulateConflictedEffect(topicInfo, effectDescription, currentUser, text)

            User.findOne({fb_psid: senderId}, function(err, user) {
              user.sub_state = null;
              user.state = "new";
              user.save();
            })
          }
          break;

        case 'waiting_for_conflicted_solution':
          console.log(text);
          var effectDescription = text.split('+./')[0];
          var userResponse = text.split('+./')[1];
          var topicInfo = text.split('+./')[2];
          var response = null;

          if(userResponse == 'agree') {
            response = 'agree';
          }

          else if (userResponse == 'disagree') {
            response = 'dis_agree';
          }

          if(response) {
            recordUserConflictReponseForEffect(topicInfo, effectDescription, currentUser, response)
          }

          User.findOne({fb_psid: senderId}, function(err, user) {
            user.state = "new";
            user.save();
          })
          break;

        case 'final_round':
          console.log(text);
          var effectDescription = text.split('+./')[0];
          var userResponse = text.split('+./')[1];
          var topicInfo = text.split('+./')[2];
          var response = null;

          if(userResponse == 'drop_conflict') {
            Topic.findOne({topic_name: topicInfo}, function(topic) {
              effects = []
              topic.effects.forEach(function(effect) {
                if(effect.effect_description != effectDescription) {
                  effects.push(effect)
                }
              });
              topic.effects = effects
              topic.system_score = topic.system_score + 1
              topic.save();
            });
            Game.findOne(condition, function(err, doc) {
              doc.system_score = doc.system_score + 1
              doc.save();
            })

            text_hash = {
              "text": "Thanks for cooling down the system status!"
            }
            sendTextMessage(senderId, text_hash)
          }

          else if (userResponse == 'group_decision') {
            groupDecisionFlow(effectDescription, topicInfo, currentUser);
          }
          else if (userResponse == 'agree') {
            castGroupVote(effectDescription, topicInfo, currentUser, 'agree')
          }
          else if(userResponse == 'dis_agree') {
            castGroupVote(effectDescription, topicInfo, currentUser, 'dis_agree')
          }
          else if(userResponse == 'let_conflict_stay') {
            text_hash = {
              "text": "Ok, the conflict will remain."
            }
            sendTextMessage(senderId, text_hash)
          }
          else {
            text_hash = {
              "text": "Please wait until the final round ends."
            }
            sendTextMessage(senderId, text_hash)
          }

          break;

        case 'waiting_for_response':
          console.log(text);
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
            updateStateOfUser(senderId, 'create_state');
            sendTextMessage(senderId, text_hash);
          }
          else if(text == 'existing_topic') {
            Topic.find({}, function(err, topics) {
              var buttons = [];
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
              if(buttons.length > 0 ) {
                updateStateOfUser(senderId, 'create_state')
              }
              sendTextMessage(senderId, text_hash);
            });
          }

          else if(text == 'start') {
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
          else if(text == 'terminate_game') {
            terminateGame(currentUser);
          }
          break;

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
    });
  }
  else {
    formatAndSendMessage(senderId, text);
  }
};
