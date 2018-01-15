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
    reasons: [ reasonSchema ],
});

var topicSchema = new Schema({
  topic_name: { type: String, required: true, unique: true} ,
  team1_score: Number,
  team2_score: Number,
  effects: [effectSchema]
});

topicSchema.plugin(uniqueValidator);
effectSchema.plugin(uniqueValidator);

module.exports = mongoose.model('topic', topicSchema);


