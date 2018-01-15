const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const Schema  = mongoose.Schema;

var userSchema = new Schema({
    user_name: String,
    fb_psid: { type: String, required: true, unique: true },
    state: String,
    sub_state: String,
    team: String,
    topic_name: String
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('user', userSchema);

