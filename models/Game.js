const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const Schema  = mongoose.Schema;

var gameSchema = new Schema({
    uuid: Number,
    team1_members: [String],
    team2_members: [String],
    team1_score: Number,
    team2_score: Number,
    system_score: Number,
});

module.exports = mongoose.model('game', gameSchema);

