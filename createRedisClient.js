require('dotenv').config()

const { createClient } = require('redis');

const createRedisClient = async (clientName = undefined) => {
  const uniqueClientIdentifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const redisClient = await createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: 15892
    }
  }).on('connect', () => {
    console.log(`Redis client ${clientName || uniqueClientIdentifier} connected.`);
  }).connect(); 


  return redisClient;
}




module.exports = createRedisClient;