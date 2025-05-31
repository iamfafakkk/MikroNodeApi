const config = {
  port: process.env.PORT || 3666,
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
};

module.exports = config;
