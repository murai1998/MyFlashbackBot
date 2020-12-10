require("dotenv").config();
const Telegraf = require('telegraf');
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true, filepath: false });

var sqlite = require("sqlite-sync");
sqlite.connect("dbase.db");
var delete_events = [];
const dbase = {
  "2020-12-03": { id: 41, from_id: 558626907 },
  "20-12-31": { id: 44, from_id: 558626907 },
};

sqlite.run(
  `CREATE TABLE IF NOT EXISTS  flashback(
    id  INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, from_id INTEGER NOT NULL, message_id INTEGER NOT NULL, event TEXT NOT NULL);`,
  function (res) {
    if (res.error) throw res.error;
    console.log(res);
  }
);
// sqlite.insert("flashback",
// {
// key: "2020-12-03",
// from_id: 558626907,
// message_id: 41,
// event: "My day"
// });
console.log("TABLE", sqlite.run("SELECT * FROM flashback"));
//-----------------START----------------
bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `
     Hey, mate!\nWelcome to <b>MemorableBot</b>, place where you can save all your important events. Sounds great, right? \nIn order to make MemorableBot listening to you, here is the list of <b>helpful commands</b>:\n1)Create a new event: /add date\n2)Display all events on this data: /get date\n3)Display all events in your calendar:  /events\n4) Delete events: /delete day
`,
    { parse_mode: "HTML" }
  );
});
//----------------GET EVENT BY KEY---------------
bot.onText(/\/get ((?:19|20)\d{2}[\-\/\s]?((((0[13578])|(1[02]))[\-\/\s]?(([0-2][0-9])|(3[01])))|(((0[469])|(11))[\-\/\s]?(([0-2][0-9])|(30)))|(02[\-\/\s]?[0-2][0-9])))/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1];
  const message = getMessage(key);
  console.log("message", message);
  if (message.exists) {
    const event_key = sqlite.run(
      "SELECT event FROM flashback WHERE `key` = ? ",
      [key]
    );
    var enents_key = [];
    event_key.forEach((x, i) => {
      enents_key.push(`${i + 1}) ${x.event}`);
    });
    enents_key.unshift(`Events Calendar for ${key}`);
    bot.sendMessage(chatId, enents_key.join("\n"));
  } else {
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
const deleteMode = {};
bot.onText(/\/add ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  console.log('message id ', msg.id)
  console.log("CHAT", chatId)
  const key = match[1];
  addMode[chatId] = { key: key, from: msg.from.id, id: msg.message_id };
  console.log("ADD in funct", addMode)
  var command = `What are you celebrating on this day?\nReply with your event or /cancel to undo this command`;
  bot.sendMessage(chatId, command);
});

//-----------DELETE EVENT BY KEY------------------
bot.onText(/\/delete ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1];
  const message = getMessage(key);
  if (!message.exists) {
    bot.sendMessage(
      chatId,
      `You don't have any scheduled events for this day!`
    );
    return;
  }
  if (
    message.filter((x) => x.from_id === msg.from.id).length == 0 &&
    message.exists
  ) {
    bot.sendMessage(
      chatId,
      `You don't have any scheduled events for this day!`
    );
    return;
  }
  if (
    message.filter((x) => x.from_id === msg.from.id).length == 1 &&
    message.exists
  ) {
    console.log("HERE");
    sqlite.delete(
      "flashback",
      {
        key: key,
        from_id: msg.from.id,
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
  } else {
    deleteMode[chatId] = { key: key, from: msg.from.id, id: msg.id };
    var my_events = [];
    delete_events = [];
    var i = 0;

    message.forEach((x) => {
      if (x.from_id === msg.from.id) {
        i++;
        my_events.push(`${i}) ${x.event}`);
        delete_events.push(x.id);
      }
    });

    my_events.unshift(
      `Reply with an index of the event you want to delete or /cancel to undo this command\nTo remove all events for this day reply "all"`
    );
    my_events.unshift("You have several scheduled events for this day");
    bot.sendMessage(chatId, my_events.join("\n"));
  }
});
//-----------TYPE MESSAGE------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  console.log("CHATID 2", chatId)
  console.log("ADD mode", addMode);
  console.log("message text", msg);
  if (msg.text.toLowerCase() == "/cancel" && typeof msg.text !== undefined) {
    bot.sendMessage(chatId, `Command has been canceled!`);
    delete deleteMode[chatId];
    delete addMode[chatId];
    return;
  }

  if (chatId in deleteMode) {
    const row2 = deleteMode[chatId];
    console.log("typeof", msg.text);
    if (msg.text.toLowerCase() === "all") {
      sqlite.delete(
        "flashback",
        {
          key: row2.key,
          from_id: row2.from,
        },
        function (res) {
          if (res.error) {
            bot.sendMessage(chatId, "Something went wrong!");
            throw res.error;
          } else {
            bot.sendMessage(chatId, "Just deleted all events for this day!");
            return;
          }
        }
      );
      delete deleteMode[chatId];
    } else if (
      Number(msg.text) >= 1 &&
      Number(msg.text) <= delete_events.length + 1
    ) {
      console.log("IN if");
      console.log("MESSSAGES to delete", delete_events);
      console.log("MESSSAGES to delete", delete_events[Number(msg.text) - 1]);
      sqlite.delete(
        "flashback",
        {
          id: delete_events[Number(msg.text) - 1],
        },
        function (res) {
          if (res.error) {
            bot.sendMessage(chatId, "Something went wrong!");
            throw res.error;
          } else {
            bot.sendMessage(
              chatId,
              `Just deleted this event from your calendar`
            );
            delete deleteMode[chatId];
            return;
          }
        }
      );
      delete deleteMode[chatId];
      return;
    } else {
      bot.sendMessage(
        chatId,
        `Haven't received the expected response, try again`
      );
      delete deleteMode[chatId];
      return;
    }
  }
  if ((chatId in addMode)) {
      console.log("HERE")
    const row = addMode[chatId];
    sqlite.insert(
      "flashback",
      {
        key: row.key,
        from_id: row.from,
        message_id: msg.message_id,
        event: msg.text,
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
    my_events = [];
  }
  else{
      return;
  }
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
    if (!events.includes(x.key)) events.push(`${x.key}`);
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




bot.on('message', (msg) => {
    const chatId = msg.chat.id;
  console.log("Any message")
    // send a message to the chat acknowledging receipt of their message
   console.log(msg.text)
  });

  