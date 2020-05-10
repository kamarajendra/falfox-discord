const axios = require("axios");

const getEmoteByURL = async (url) => {
  const [_, id] = url.match(/emotes\/(\w+)-?/);
  console.log(id);
  const response = await axios.get(
    `https://api.betterttv.net/3/emotes/${id}`
  );

  return response.data;
};

module.exports = {
  getEmoteByURL,
};
