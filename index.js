const express = require('express');
const bodyParser = require('body-parser');

// mongodb connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://rev4nth:fbbot123@ds057234.mlab.com:57234/game')

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(process.env.PORT || 3000, () => console.log('Webhook server is listening, port 3000'));

const verificationController = require('./controllers/verification');
const messageWebhookController = require('./controllers/messageWebhook');
app.get('/', verificationController);
app.post('/', messageWebhookController);


const Game = require('./models/Game');

// const entry = new Game({
    // uuid: 1,
    // topics: [],
    // team1_score: 2,
    // team2_score: 4,
// });

// entry.save();
const condition = { uuid: 1 };
const update = {system_score: 4, team1_score: 100};

Game.findOne(condition, function(err, doc){
    doc.system_score = 4;
    doc.team1_score = 100;
    doc.save();
});



