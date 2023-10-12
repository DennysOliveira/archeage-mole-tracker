// Command that will list all moles and their respective status (killed, alive or unknown) - if dead, shows how much time is left until it's alive again

const existingMoles = require('../../domain/moles')
const { SlashCommandBuilder } = require("discord.js");
const createRedisClient = require('../../createRedisClient')

module.exports = {
  data: new SlashCommandBuilder().setName('listar').setDescription('Lista o status de todas as moles.'),
  async execute(interaction) {
    const redisClient = await createRedisClient();
    const cachedMoles = await redisClient.keys('mole:*');

    const moles = [1,2,3,4,5,6,7,8,9,10,11];

    const getMoleStatusMessage = async (moleIdentifier) => {
      const moleKilled = cachedMoles.find(mole => mole === `mole:${moleIdentifier}`);
      const moleStatus = moleKilled ? 'Morta' : 'Desconhecida';
      const moleTimeLeft = moleKilled ? 
        await redisClient.ttl(`mole:${moleIdentifier}`)
        : 'N/A';

      // Mole time left is in seconds, so we convert it to: "XX hours, XX minutes"
      // After mole status, add difference of spaces between "Morta" and "Desconhecida" so that the mole time left is aligned
      return `${moleKilled ? '💀' : '✅'} Mole ${moleIdentifier < 10 ? '0':''}${moleIdentifier} - ${moleStatus}${moleStatus === 'Morta' ? ' '.repeat('Desconhecida'.length - 'Morta'.length) : ''}    ${moleTimeLeft === 'N/A' ? moleTimeLeft : `${Math.floor(moleTimeLeft / 3600)} horas, ${Math.floor((moleTimeLeft % 3600) / 60)} minutos`}`;
    };

    const moleStatusMessages = [];

    for (const mole of moles) {
      moleStatusMessages.push(await getMoleStatusMessage(mole));
    }

    const thingy = '```'
    const separator = '------------------'
    const deadMoles = cachedMoles.length;
    const aliveMoles = moles.length - cachedMoles.length;

    // add an icon for moles vivas
    const header = `[${deadMoles} mortas, ${aliveMoles} vivas ou sem status]`

    // Table header for statuses
    const statusHeader = `Mole         Status          Tempo restante`;
    const molesStatusMessage = moleStatusMessages.join('\n');

    await redisClient.disconnect();

    await interaction.reply({
      files: ['https://cdn.discordapp.com/attachments/1160385399160582185/1162117430018056295/image.png?ex=653ac532&is=65285032&hm=cbb9ada5d8a732b8825408a224492bc62fee43be417b314a3e27c0e3172c2f21&'],
      content: `${thingy}${header}\n${separator}\n${statusHeader}\n${molesStatusMessage}${thingy}`
    })
  }
}