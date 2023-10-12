const { SlashCommandBuilder } = require("discord.js");
const createRedisClient = require('../../createRedisClient')
const moles = require('../../domain/moles');

module.exports = {
  data: new SlashCommandBuilder().setName('matei').setDescription('Chame esse comando quando matar uma mole.')
  .addIntegerOption(option => option.setName('identificador').setDescription('Qual mole foi morta?').setRequired(true)),
  async execute(interaction) {

    const redisClient = await createRedisClient();

    const moleIdentifier = interaction.options.getInteger('identificador')
    

    if(moles.find(mole => mole.moleIdentifier === moleIdentifier) === undefined) {
      await interaction.reply({
        content: `Mole ${moleIdentifier} não existe.`
      })
      return;
    }

    // Kill mole for 3 hours
    const redisClientKey = `mole:${moleIdentifier}`;
    const moleKilled = await redisClient.set(redisClientKey, 'true');
    const expire = await redisClient.expire(redisClientKey, 60 * 60 * 3)
    
    console.log(moleKilled);


    console.log(`User ${interaction.user.tag} killed a mole.`);

    redisClient.disconnect();


    await interaction.reply({
      content: `Morte da mole ${interaction.options.getInteger('identificador')} registrada.`
    })
  }
}