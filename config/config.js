const config = {
  port: process.env.PORT || 8585,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
  },
  socket: {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  },
  api_key: 'eb3b9c2c-7426-4fed-9d76-1c12abcb2b1c'
};

module.exports = config;
