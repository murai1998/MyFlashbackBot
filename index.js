require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
var sqlite = require("sqlite-sync");
sqlite.connect("dbase.db");

const dbase = {
  "2020-12-03": { id: 41, from_id: 558626907 },
  "20-12-31": { id: 44, from_id: 558626907 },
};

sqlite.run(`CREATE TABLE IF NOT EXISTS  flashback(
    id  INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, from_id INTEGER NOT NULL, message_id INTEGER NOT NULL, event TEXT NOT NULL);`,function(res){
    if(res.error)
        throw res.error;
    console.log(res);
});
sqlite.insert("flashback",
{
key: "2020-12-03",
from_id: 558626907,
message_id: 41,
event: "My day"
});
//----------------GET EVENT BY KEY---------------
bot.onText(/\/get ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1];
  const message = getMessage(key);
  console.log("message", message);
  if (message.exists) {
    console.log("key", key);
    message.forEach((x) => {
      bot.forwardMessage(chatId, x.from_id, x.message_id);
    });
  }
  else {
    bot.sendMessage(chatId, `You don't have any scheduled events on this day!`);
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
// // Listen for any kind of message. There are different kinds of
// // messages.

//---------------ADD EVENT BY KEY-----------------
const addMode = {};
const deleteMode = {}
bot.onText(/\/add ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1];
  addMode[chatId] = { key: key, from: msg.from.id, id: msg.id };
  var command = `What are you celebrating on this day?`;
  bot.sendMessage(chatId, command);
});

//-----------DELETE EVENT BY KEY------------------
bot.onText(/\/delete ([^;'\"]+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const key = match[1];
    const message = getMessage(key);
if(!message.exists){
    bot.sendMessage(chatId, `You don't have any scheduled events on this day!`);
    return 
}
if ((message.filter(x => x.from_id === msg.from.id).length == 0) && message.exists) {
    bot.sendMessage(chatId, `You don't have any scheduled events on this day!`);
    return 
  }
  if ((message.filter(x => x.from_id === msg.from.id).length == 1) && message.exists) {
      console.log("HERE")
    sqlite.delete(
        "flashback",
        {
         key: key,
         from_id: msg.from.id
        },
        function (res) {
          if (res.error) {
            bot.sendMessage(chatId, "Something went wrong!");
            throw res.error;
          } else {
            bot.sendMessage(chatId, "Just deleted an event!");
          }
        }
      );
  }     
        // sqlite.delete(
        //     "flashback",
        //     {
        //      key: key,
             
        //     },
        //     function (res) {
        //       if (res.error) {
        //         bot.sendMessage(chatId, "Something went wrong!");
        //         throw res.error;
        //       } else {
        //         bot.sendMessage(chatId, "Just deleted all events for this day!");
        //       }
        //     }
        //   );
 else{
    deleteMode[chatId] = { key: key, from: msg.from.id, id: msg.id };
    bot.sendMessage(chatId, "You have several scheduled events for this day:");
    var my_events = []
    var i = 0;
    message.forEach((x) => {
        if(x.from_id === msg.from.id){
            my_events.push(x)
            my_events[i].index = i + 1;
            i++;
        } 
    })

  my_events.forEach((x) => {
        bot.forwardMessage(chatId, x.from_id, x.message_id);
      });
      bot.sendMessage(chatId, `Reply with an index of the event you want to delete, if you want to remove all of them, reply "all"`);
 }

  });
//-----------TYPE MESSAGE------------
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    if(chatId in deleteMode) {
        console.log(msg)
    }
    if (!(chatId in addMode)) {
      return;
    }
    const row = addMode[chatId];
    sqlite.insert(
      "flashback",
      {
        key: row.key,
        from_id: row.from,
        message_id: msg.message_id,
        event: msg.text
      },
      function (res) {
        if (res.error) {
          bot.sendMessage(chatId, "Something went wrong!");
          throw res.error;
        } else {
          bot.sendMessage(chatId, "Just added this event!");
        }
      }
    );
 
    delete addMode[chatId];
   
  });
  
  //------------SHOW ALL EVENTS----------------
  bot.onText(/\/events/, (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const data = sqlite.run("SELECT * FROM flashback WHERE `from_id` = ?", [
      fromId,
    ]);
    if (data.length == 0) {
      bot.sendMessage(chatId, "Your event calendar is still empty");
      return;
    }
    var events = [];
    data.forEach((x) => {
        if(!(events.includes(x.key)))
      events.push(`${x.key}`);
    });
    bot.sendMessage(chatId, events.join("\n"), { parse_mode: "markdown" });
  });

function isMessage(key) {
  return (
    sqlite.run("SELECT COUNT(*) as cnt FROM flashback WHERE `key` = ?", [
      key,
    ])[0].cnt !== 0
  );
}
//-------------EXTRACTING EVENT FROM THE DATABASE---------------
function getMessage(key) {
  const data = sqlite.run("SELECT * FROM flashback WHERE `key` = ? ", [key]);
  if (data.length == 0) {
    return { exists: false };
  }
  data.exists = true;
  return data;
}
