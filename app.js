require("dotenv").config();
const byteSize = require("byte-size");
const axios = require("axios");
const Discord = require("discord.js");
const client = new Discord.Client();
const frankerfacez = require("./lib/frankerfacez");
const bttv = require("./lib/betterttv");
const twitchemotes = require("./lib/twitchemotes");
const playsound = require("./lib/playsounds");

const vultrAPIKey = process.env.VULTR_APIKEY;

const vultr = axios.create({
  headers: {
    "API-Key": vultrAPIKey,
  },
});

const prefix = ".";

let playsounds;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user
    .setActivity("you | type .help", { type: "LISTENING" })
    .then((presence) =>
      console.log(`Activity set to ${presence.activities[0].name}`)
    )
    .catch(console.error);
  playsound.getPlaysounds().then((sounds) => {
    playsounds = sounds;
    console.log("Playsounds successfully loaded");
  });
});

client.on("message", async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).split(" ");
  const command = args.shift().toLowerCase();
  const channel = message.channel;

  if (command === "help") {
    const embed = new Discord.MessageEmbed()
      .setColor("#f57534")
      .setTitle("Command List")
      .addField(
        ".emoji",
        "Add or remove emoji from TwithEmotes, FrankerFaceZ or BetterTTV"
      )
      .addField(
        ".playsound",
        "Playing sounds from https://chatbot.admiralbulldog.live/playsounds"
      );
    channel.send(embed);
  } else if (command === "emoji") {
    const [subcommand, ...params] = args;

    if (!subcommand) {
      const embed = new Discord.MessageEmbed()
        .setColor("#f57534")
        .setDescription(
          "Add or remove emoji from TwithEmotes, FrankerFaceZ or BetterTTV"
        )
        .setTitle(".emoji")
        .addField(
          "How to use",
          `format: \`.emoji [add|remove] <url>\`. Example: \`\`\`.emoji add https://www.frankerfacez.com/emoticon/381875-KEKW\`\`\``
        );
      channel.send(embed);
    } else if (subcommand == "add") {
      if (!params[0]) {
        channel.send(
          "Missing url parameter, example: ```Format: .emoji add <url>\nExample: .emoji add https://www.frankerfacez.com/emoticon/381875-KEKW```"
        );
      } else {
        try {
          const [url] = params;
          const emoji = {
            url: null,
            name: null,
          };

          if (url.includes("frankerfacez.com")) {
            const emote = await frankerfacez.getEmoteByURL(url);
            const urls = Object.keys(emote.urls);
            emoji.url = `https:${emote.urls[urls[urls.length - 1]]}`;
            emoji.name = emote.name;
          } else if (url.includes("betterttv.com")) {
            const emote = await bttv.getEmoteByURL(url);
            emoji.url = `https://cdn.betterttv.net/emote/${emote.id}/3x`;
            emoji.name = emote.code;
          } else if (url.includes("twitchemotes.com")) {
            const emote = await twitchemotes.getEmoteByURL(url);
            emoji.url = emote.url;
            emoji.name = emote.code;
          } else {
            return channel.send("URL not supported");
          }

          const emote = message.guild.emojis.cache.find(
            (e) => e.name.toLowerCase() === emoji.name.toLowerCase()
          );

          if (emote) {
            channel.send(`Emoji "${emoji.name}" already exists`);
          } else {
            await message.guild.emojis.create(emoji.url, emoji.name);
            channel.send(`Emoji "${emoji.name}" has been added`);
          }
        } catch (error) {
          if (error.response) {
            channel.send("Emote url not found");
          } else {
            console.log(error);
            channel.send(error.message);
          }
        }
      }
    } else if (subcommand == "remove") {
      if (!params[0]) {
        channel.send(
          "Missing alias parameter, example: ```Format: .emoji remove <name or alias>\nExample .emoji remove NOP```"
        );
      } else {
        const [alias] = params;
        const emote = message.guild.emojis.cache.find(
          (emoji) => emoji.name.toLowerCase() === alias.toLowerCase()
        );

        if (!emote) {
          channel.send(`Emoji with alias "${alias}" not found`);
        } else {
          await emote.delete();
          channel.send(`Emoji "${emote.name}" has been removed`);
        }
      }
    }
  } else if (command === "ping") {
    message.reply("Pong! " + message.author.tag);
  } else if (command === "bw" || command === "bandwidth") {
    const response = await vultr.get(
      "https://api.vultr.com/v1/server/bandwidth?SUBID=36667259"
    );
    const { incoming_bytes, outgoing_bytes } = response.data;
    const incoming = incoming_bytes.reduce((acc, [date, bytes]) => {
      return acc + parseInt(bytes);
    }, 0);
    const outgoing = outgoing_bytes.reduce((acc, [date, bytes]) => {
      return acc + parseInt(bytes);
    }, 0);

    const usage = Math.max(incoming, outgoing);

    const reply = `${byteSize(usage)} / 1.000 GB (${(
      (usage / Math.pow(10, 12)) *
      100
    ).toFixed(4)} %)`;

    message.reply(reply);
  } else if (command === "wireguard") {
    const [subcommand] = args;

    if (!subcommand) {
    } else {
      if (subcommand === "config") {
        const buffer = Buffer.from("hello world");

        message.author.send(
          "This is your wireguard config file.",
          new Discord.MessageAttachment(buffer, `${message.author.tag}.conf`)
        );
      }
    }
  } else if (command === "bye") {
    const connection = client.voice.connections.find(
      (val) => val.channel.guild.id === message.guild.id
    );

    if (connection) {
      connection.disconnect();
    }
  } else if (command === "playsound" || command === "ps") {
    const [sound] = args;

    if (!sound) {
      const embed = new Discord.MessageEmbed()
        .setColor("#f57534")
        .setDescription(
          "Playing sounds from https://chatbot.admiralbulldog.live/playsounds"
        )
        .setTitle(".playsound")
        .addField("alias", ".ps")
        .addField(
          "How to use",
          `format: \`.playsound <name>\`. Example: \`\`\`.playsound add dingdong2\`\`\``
        );
      channel.send(embed);
    } else {
      const url = playsounds[sound.toLowerCase()];
      if (url) {
        const connection =
          message.guild.voice && message.guild.voice.connection;

        if (connection) {
          connection.play(url, {
            volume: 0.7,
          });
        } else {
          const voiceConnection = await message.member.voice.channel.join();
          voiceConnection.play(url);
        }
      } else {
        channel.send("Playsound not found");
      }
    }
  } else if (command === "trump") {
    const url =
      "http://api.trumped.com/speak?v=trump&vol=3&s=" +
      encodeURIComponent(args.join(" "));
    const connection = message.guild.voice && message.guild.voice.connection;

    if (connection) {
      connection.play(url, {
        volume: 0.5,
      });
    } else {
      const voiceConnection = await message.member.voice.channel.join();
      voiceConnection.play(url);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
