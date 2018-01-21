const express = require('express');
const bodyParser = require('body-parser');

// mongodb connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://abhi4252:fbbot123@ds157057.mlab.com:57057/gamebot')

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(process.env.PORT || 3000, () => console.log('Webhook server is listening, port 3000'));

const verificationController = require('./controllers/verification');
const messageWebhookController = require('./controllers/messageWebhook');
app.get('/', verificationController);
app.post('/', messageWebhookController);

app.set('view engine', 'ejs');

const Game = require('./models/Game');
const Topic = require('./models/topics');

app.get('/home', function(req, res) {
  Game.findOne({uuid: 1}, function(err, doc) {
    Topic.find({}, function(err, topics) {

      res.render('pages/home',
                 {
                   topics: topics,
                   team1_score: doc.team1_score,
                   team2_score: doc.team2_score
                 });
    });
  });
});

// about page
app.get('/topics', function(req, res) {
  topicId = req.query.topic_id;
  agreed_effects = []
  dis_agreed_effects = []
  partial_dis_agreed_effects = []
  partial_agreed_effects = []
  neutral_effects = []
  conflicted_effects = []
  Topic.findOne({_id: topicId}, function(err, topic) {
    topic.effects.forEach(function(effect) {
      if(effect.state == 'agreed') {
        agreed_effects.push(effect);
      }
      else if(effect.state == 'dis_agreed') {
        dis_agreed_effects.push(effect);
      }
      else if(effect.state == 'partial_upvote') { 
        partial_agreed_effects.push(effect);
      }

      else if(effect.state == 'partial_downvote') {
        partial_dis_agreed_effects.push(effect);
      }

      else if(effect.state == 'neutral') {
        neutral_effects.push(effect);
      }
      else if(effect.state == 'conflicted_effect') {
        conflicted_effects.push(effect);
      }
    });
    res.render('pages/topics',
               {
                 topic: topic,
                 team1_score: topic.team1_score,
                 team2_score: topic.team2_score,
                 agreed_effects: agreed_effects,
                 dis_agreed_effects: dis_agreed_effects,
                 partial_dis_agreed_effects: partial_dis_agreed_effects,
                 partial_agreed_effects: partial_agreed_effects,
                 neutral_effects: neutral_effects,
                 conflicted_effects: conflicted_effects

               })
  });
});



/*
 *
 *  const entry = new Game({
 *      uuid: 1,
 *      topics: [],
 *      team1_members: [],
 *      team2_members: [],
 *      team1_score: 0,
 *      team2_score: 0,
 *      system_score: 0
 *  });
 * 
 *entry.save();
 * 
 */


