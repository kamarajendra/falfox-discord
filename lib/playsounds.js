const axios = require("axios");
const cheerio = require("cheerio");

const getPlaysounds = async () => {
  const response = await axios.get(
    "https://chatbot.admiralbulldog.live/playsounds"
  );

  const $ = cheerio.load(response.data);

  const playsounds = {};

  $(".play-in-browser-wrapper").each((i, elm) => {
    const name = $(elm).attr("data-name");
    const url = $(elm).attr("data-link");
    playsounds[name] = url;
  });

  return playsounds;
};

module.exports = {
  getPlaysounds,
};
