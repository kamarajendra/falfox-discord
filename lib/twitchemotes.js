const axios = require("axios");

const getEmoteByURL = async (url) => {
  const [_, id] = url.match(/emotes\/(\d+)/);
  console.log(id);
  const response = await axios.get(
    `https://api.twitchemotes.com/api/v4/emotes?id=${id}`
  );

  return response.data[0];
};

module.exports = {
  getEmoteByURL,
};