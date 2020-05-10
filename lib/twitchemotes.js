const axios = require("axios");
const cheerio = require("cheerio");

const getEmoteByURL = async (url) => {
  const response = await axios.get(url);

  const $ = cheerio.load(response.data);

  const code = $(".card-header h2").text().trim();
  const imgURL = $(".card-body p img:nth-child(3)").attr("src");

  return {
    code,
    url: imgURL,
  };
};

module.exports = {
  getEmoteByURL,
};
