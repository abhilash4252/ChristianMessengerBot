const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const Schema  = mongoose.Schema;

var reasonSchema = new Schema({
    description: String,
    user_id: String,
});

var effectSchema = new Schema({
    effect_description: String,
    state: String,
    topic_name: String,
    effect_owner: { type: String, required: true},
    effect_verifiers: [String],
    reasons: [ reasonSchema ],
    conflicted_effect_reformulation: String,
    conflicted_reformation_owner: String,
    conflicted_votes: Number,
    agree_group_decision_votes: [String],
    dis_agree_group_decision_votes: [String]

});

var topicSchema = new Schema({
  topic_name: { type: String, required: true, unique: true} ,
  team1_score: Number,
  team2_score: Number,
  team1_members: [String],
  team2_members: [String],
  system_score: Number,
  effects: [effectSchema],
  terminated_players: [String]
});

topicSchema.plugin(uniqueValidator);
effectSchema.plugin(uniqueValidator);

module.exports = mongoose.model('topic', topicSchema);


