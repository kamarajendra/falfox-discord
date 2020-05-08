require("dotenv").config();
const byteSize = require("byte-size");
const axios = require("axios");
const Discord = require("discord.js");
const client = new Discord.Client();

const vultrAPIKey = process.env.VULTR_APIKEY;

const vultr = axios.create({
  headers: {
    "API-Key": vultrAPIKey,
  },
});

const prefix = ".";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user
    .setActivity("you | type .help", { type: "LISTENING" })
    .then((presence) =>
      console.log(`Activity set to ${presence.activities[0].name}`)
    )
    .catch(console.error);
});

client.on("message", async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).split(" ");
  const command = args.shift().toLowerCase();

  if (command === "ping") {
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
    const connection = message.guild.voice && message.guild.voice.connection;

    if (connection) {
      connection.disconnect();
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
