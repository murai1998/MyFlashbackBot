
require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});
var sqlite = require('sqlite-sync'); 
sqlite.connect('dbase.db'); 

const dbase= {
"2020-12-03": {"id":41, "from_id": 558626907},
"20-12-31": {"id":44, "from_id": 558626907}
}

sqlite.run(`CREATE TABLE IF NOT EXISTS  flashback(
    id  INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, from_id INTEGER NOT NULL, message_id INTEGER NOT NULL);`,function(res){
    if(res.error)
        throw res.error;
    console.log(res);
});
sqlite.insert("flashback",
{
key: "2020-12-03",
from_id: 558626907,
message_id: 41,

});
sqlite.insert("flashback",
{
key: "20-12-31",
from_id: 558626907,
message_id: 44,

});
console.log('DBASE', sqlite.run('SELECT * FROM flashback'))
bot.onText(/\/get ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1]; 
  const message = getMessage(key)
if (message.exists) {
    console.log('key', key)
    bot.forwardMessage(chatId, message.from_id, message.message_id)
}

 
});
const addMode = {}
bot.onText(/\/add ([^;'\"]+)/, (msg, match) => {
    const chatId = msg.chat.id;
  const key = match[1]; 
  addMode[chatId] = {key: key, from: msg.from.id, id: msg.id}
var command = `What are you celebrating on this day?`
bot.sendMessage(chatId, command);
})
// bot.onText(/\/echo (.+)/, (msg, match) => {
//     // 'msg' is the received Message from Telegram
//     // 'match' is the result of executing the regexp above on the text content
//     // of the message
  
//     const chatId = msg.chat.id;
//     const resp = match[1]; // the captured "whatever"
  
//     // send back the matched "whatever" to the chat
//     bot.sendMessage(chatId, resp);
//   });
// // Listen for any kind of message. There are different kinds of
// // messages.

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
if(!(chatId in addMode)) return 
const row = addMode[chatId]
sqlite.insert("flashback",
{
key: row.key,
from_id: row.from,
message_id: msg.message_id
}, function(res){
    if(res.error)
    {
        bot.sendMessage(chatId, "Something went wrong!");
        throw res.error
    }
    bot.sendMessage(chatId, "Just added this event!");
});
console.log('We received your message', addMode[chatId])
delete addMode[chatId]
  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, JSON.stringify(msg));
});

function isMessage(key){
    return sqlite.run("SELECT COUNT(*) as cnt FROM flashback WHERE `key` = ?", [key])[0].cnt !== 0
}
const tessst = sqlite.run("SELECT * FROM flashback WHERE key = '2020-12-03' ")
console.log('list', tessst)
function getMessage(key){
    const data = sqlite.run("SELECT * FROM flashback WHERE `key` = ? LIMIT 1", [key])
    if (data.length == 0) {return {exists: false}}
    data[0].exists = true
    return data[0]
}