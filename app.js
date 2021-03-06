require("dotenv").config();
const { exec } = require("child_process");
const byteSize = require("byte-size");
const axios = require("axios");
const https = require("https");
const Discord = require("discord.js");
const { format, isPast } = require("date-fns");
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
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

const prefix = ".";
const intervals = new Map();

let playsounds;

const updatePlaysounds = async () => {
  const sounds = await playsound.getPlaysounds();
  playsounds = sounds;
  console.log("Playsounds successfully updated");
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user
    .setActivity("you | type .help", { type: "LISTENING" })
    .then((presence) =>
      console.log(`Activity set to ${presence.activities[0].name}`)
    )
    .catch(console.error);

  updatePlaysounds();
  setInterval(() => updatePlaysounds, 15 * 60 * 10000);

  client.users.fetch("210939885002031105").then((owner) => {
    exec("git log -1 --pretty=%B", (err, stdout, stderr) => {
      if (err) return;

      const lastCommit = stdout.replace(/\n/g, "");
      const message = `[Online] ${lastCommit}`;
      owner.send(message);
    });
  });
});

const countBytes = ([date, bytes], acc) => {
  const currentMonth = new Date().getMonth();

  const splitted = date.split("-");
  const byteMonth = parseInt(splitted[1] || -1);

  if (!byteMonth) {
    console.error("byte Month not found, it shouldn't be possible");
    return acc;
  }

  if (byteMonth !== currentMonth + 1) return acc;

  return acc + parseInt(bytes);
};

client.on("message", async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const isGuild = message.guild;
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
      )
      .addField(
        ".epicstore",
        "Show Free Games from Epic Games Store"
      )
      .addField("\u200b", "\u200b")
      .addField(".bye", "Disconnect FalFox from voice channel");
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
          message.guild.emojis.cache.size;
          message.guild.channels.cache.size;

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
            channel.send("Error processing emote");
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

    const url = `https://www.myinstants.com/media/sounds/discord-notification.mp3`;
    const connection = message.guild.voice && message.guild.voice.connection;

    if (connection) {
      connection.play(url);
    } else {
      const voiceConnection = await message.member.voice.channel.join();
      voiceConnection.play(url);
    }

    if (isGuild) {
      const channelID = message.member.voice.channel.id;

      if (intervals.has(channelID)) {
        clearInterval(intervals.get(channelID));
      }

      const idleTimeout = setTimeout(() => {
        const connection = client.voice.connections.find((con) => {
          return con.channel.id === channelID;
        });

        if (connection) {
          connection.play(playsounds["seeya"]).on("finish", () => {
            connection.disconnect();
          });
        }
      }, 10 * 60 * 1000);

      intervals.set(message.member.guild.id, idleTimeout);
    }
  } else if (command === "bw" || command === "bandwidth") {
    const response = await vultr.get(
      "https://api.vultr.com/v1/server/bandwidth?SUBID=36667259"
    );

    const { incoming_bytes, outgoing_bytes } = response.data;
    const incoming = incoming_bytes.reduce(
      (acc, incomingBytes) => countBytes(incomingBytes, acc),
      0
    );
    const outgoing = outgoing_bytes.reduce(
      (acc, outgoingBytes) => countBytes(outgoingBytes, acc),
      0
    );

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
      connection.play(playsounds["seeya"]).on("finish", () => {
        connection.disconnect();
      });
    }
  } else if (command === "playsound" || command === "ps") {
    const [sound] = args;
    ``;
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

        if (isGuild) {
          const channelID = message.member.voice.channel.id;

          if (intervals.has(channelID)) {
            clearInterval(intervals.get(channelID));
          }

          const idleTimeout = setTimeout(() => {
            const connection = client.voice.connections.find((con) => {
              return con.channel.id === channelID;
            });

            if (connection) {
              connection.play(playsounds["seeya"]).on("finish", () => {
                connection.disconnect();
              });
            }
          }, 10 * 60 * 1000);

          intervals.set(message.member.guild.id, idleTimeout);
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
  } else if (command === "permaban") {
    const [subcommand] = args;
    if (subcommand === "all" && message.member.id === "210939885002031105") {
      channel.send("Processing...");
    }
  } else if (command === "epicstore") {
    try {
      const { data } = await axios.default.get(
        "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=ID&allowCountries=ID"
      );

      if (data.data.Catalog.searchStore.elements) {
        for (const game of data.data.Catalog.searchStore.elements) {
          const offers = [
            ...game.promotions.promotionalOffers,
            ...game.promotions.upcomingPromotionalOffers,
          ].flat();
          const freeOffer = offers.find(
            (off) =>
              off.promotionalOffers[0].discountSetting.discountPercentage === 0
          );

          if (!freeOffer) continue;

          const offer = freeOffer.promotionalOffers[0];

          const startDate = new Date(offer.startDate);

          const start = isPast(startDate) ? "NOW" : format(startDate, "MMM d");

          const embed = new Discord.MessageEmbed()
            .setColor("#f57534")
            .setTitle(game.title)
            .setURL(
              `https://www.epicgames.com/store/en-US/product/${game.productSlug}`
            )
            .setDescription(game.description)
            .setImage(game.keyImages[0].url)
            .addField(
              `Free ${start} - ${format(new Date(offer.endDate), "MMM d")}`,
              "\u200b"
            );

          channel.send(embed);
        }
      } else {
        channel.send("Tidak ada promo apapun");
      }
    } catch (error) {
      console.log(error);
      channel.send("Gagal mengambil data dari Epic Store");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
