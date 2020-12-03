
require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});

const dbase= {
"new1": {"id":26, "from_id": 558626907},
"ki": {"id":29, "from_id": 558626907}
}

bot.onText(/\/get (.+)/, (msg, match) => {

  const chatId = msg.chat.id;
  const key = match[1]; 
if (key in dbase) {
    const message = dbase[key]
    console.log('key', key)
    bot.forwardMessage(chatId, message.from_id, message.id)
}

 
});
// bot.onText(/\/echo (.+)/, (msg, match) => {
//     // 'msg' is the received Message from Telegram
//     // 'match' is the result of executing the regexp above on the text content
//     // of the message
  
//     const chatId = msg.chat.id;
//     const resp = match[1]; // the captured "whatever"
  
//     // send back the matched "whatever" to the chat
//     bot.sendMessage(chatId, resp);
//   });
// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, JSON.stringify(msg));
});