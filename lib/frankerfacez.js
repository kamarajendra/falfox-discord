const axios = require("axios");

const getEmoteByURL = async (url) => {
  const [_, id] = url.match(/emoticon\/(\d+)-?/);
  console.log(id);
  const response = await axios.get(
    `https://api.frankerfacez.com/v1/emote/${id}`
  );

  return response.data.emote;
};

module.exports = {
  getEmoteByURL,
};
