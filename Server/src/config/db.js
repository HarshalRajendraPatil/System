const mongoose = require('mongoose');

const connectDatabase = async (mongodbUri) => {
  await mongoose.connect(mongodbUri, {
    autoIndex: true,
  });
};

module.exports = { connectDatabase };
