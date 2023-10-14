const { time, ApplicationCommandPermissionType, EmbedBuilder } = require('discord.js');
const createRedisClient = require('./createRedisClient')
const existingMoles = require('./domain/moles');
const { DateTime } = require('luxon');

getMolesList = async (guildId) => {
  const redisClient = await createRedisClient();
  const cachedMoles = await redisClient.keys(`${guildId}:mole:*`);

  const moles = [1,2,3,4,5,6,7,8,9,10,11];

  const now = DateTime.now();

  const getMoleStatusMessage = async (moleIdentifier) => {
    const moleKilled = cachedMoles.find(mole => mole === `${guildId}:mole:${moleIdentifier}`) ? true : false;
    const moleStatus = moleKilled ? 'Morta' : 'Desconhecida';
    const moleTimeLeft = moleKilled ? 
      await redisClient.ttl(`${guildId}:mole:${moleIdentifier}`)
      : 'N/A';

    
    const nowPlusTimeToLive = moleKilled ?  now.plus({
      seconds: moleTimeLeft
    }) : now;
  


    const timeToLive = Date.now() + (moleTimeLeft * 1000);

    const discordTimeString = `<t:${Math.floor(timeToLive/1000)}:R>`;
    

    // Mole time left is in seconds, so we convert it to: "XX hours, XX minutes"
    // After mole status, add difference of spaces between "Morta" and "Desconhecida" so that the mole time left is aligned
    // return `${moleKilled ? '✅' : '💀'} Mole ${moleIdentifier < 10 ? '0':''}${moleIdentifier}     ${moleStatus}${moleStatus === 'Morta' ? ' '.repeat('Desconhecida'.length - 'Morta'.length) : ''}   ${moleKilled ? discordTimeString : ''}`;
    // Return an array with: [Icon, mole name, mole status (desconhecida or morta), mole time left, raw mole time left in seconds unix]
    return [
      moleKilled ? '✅' : '💀',
      `Mole ${moleIdentifier < 10 ? '0':''}${moleIdentifier}`,
      moleStatus,
      moleKilled ? discordTimeString : '',
      moleKilled ? nowPlusTimeToLive.toUnixInteger() : null,
    ]
  };

  const embed = new EmbedBuilder();
  

  const moleStatuses = [];

  for (const mole of moles) {
    moleStatuses.push(await getMoleStatusMessage(mole));
  }

  embed.setTitle('Lista de Moles');

  embed.addFields(
    {
      name: 'Status',
      value: moleStatuses.map(mole => `${mole[0]} ${mole[1]}`).join('\n'),
      inline: true
    },
    {
      name: 'Tempo restante',
      value: moleStatuses.map(mole => mole[3]).join('\n'),
      inline: true
    }
  ).setTimestamp();

  const deadMoles = cachedMoles.length;
  const aliveMoles = moles.length - cachedMoles.length;

  // add an icon for moles vivas
  const header = `[${deadMoles} mortes rastreadas, ${aliveMoles} sem informação]`

  embed.setDescription(header);

  embed.setFooter({
    text: 'Mole Tracker',
  });

  await redisClient.disconnect();

  return [embed, moleStatuses];
}

module.exports = {
  getMolesList
}