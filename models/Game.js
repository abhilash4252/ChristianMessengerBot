const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

var userSchema = new Schema({
    user_name: String,
    team: String,
});

var reasonSchema = new Schema({
    description: String,
    user: [ userSchema ],
});

var effectSchema = new Schema({
    effect_description: String,
    state: String,
    reasons: [ reasonSchema ],
});

var topicSchema = new Schema({
    topic_name: String,
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

module.exports = mongoose.model('game', gameSchema);
