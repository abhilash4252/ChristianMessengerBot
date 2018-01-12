const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const Schema  = mongoose.Schema;

var userSchema = new Schema({
    user_name: String,
    fb_psid: { type: String, required: true, unique: true },
    team: String,
});

var reasonSchema = new Schema({
    description: String,
    user: [ userSchema ],
});

var effectSchema = new Schema({
    effect_description: String,
    state: String,
    effect_owner: { type: String, required: true, unique: true },
    reasons: [ reasonSchema ],
});

var topicSchema = new Schema({
  topic_name: { type: String, required: true, unique: true} ,
  team1_score: Number,
  team2_score: Number,
  effects: [ effectSchema ],
});

var gameSchema = new Schema({
    uuid: Number,
    topics: [ topicSchema ],
    team1_members: [userSchema],
    team2_members: [userSchema],
    team1_score: Number,
    team2_score: Number,
    system_score: Number,
});

userSchema.plugin(uniqueValidator);
effectSchema.plugin(uniqueValidator);
topicSchema.plugin(uniqueValidator);

module.exports = mongoose.model('game', gameSchema);
