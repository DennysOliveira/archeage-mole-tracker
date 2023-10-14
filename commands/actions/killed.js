const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const createRedisClient = require('../../createRedisClient')
const moles = require('../../domain/moles');
const { getMolesList } = require("../../molesService");

module.exports = {
  data: new SlashCommandBuilder().setName('matei')
  .setDescription('Chame esse comando quando matar uma mole.')
  .addIntegerOption(option => option.setName('identificador').setDescription('Qual mole foi morta?').setRequired(true)),
  async execute(interaction) {
    const redisClient = await createRedisClient();
    const currentGuildId = interaction.guildId;
    const moleIdentifier = interaction.options.getInteger('identificador')

    if(moles.find(mole => mole.moleIdentifier === moleIdentifier) === undefined) {
      await interaction.reply({
        content: `Mole ${moleIdentifier} não existe.`
      })
      return;
    }

    // Kill mole for 3 hours
    const redisClientKey = `${currentGuildId}:mole:${moleIdentifier}`;
    const moleKilled = await redisClient.set(redisClientKey, 'true');
    const expire = await redisClient.expire(redisClientKey, 60 * 60 * 3)
    
    console.log(moleKilled);

    console.log(`User ${interaction.user.tag} killed a mole.`);

    redisClient.disconnect();

    const listButton = new ButtonBuilder()
      .setCustomId('listar')
      .setLabel('Listar Moles')
      .setStyle(1)
      .setEmoji('📜');

    const row = new ActionRowBuilder()
      .addComponents(listButton);

    const time = new Date();
    const moleKillMessage = `Morte da mole ${interaction.options.getInteger('identificador')} registrada em ${time.toLocaleString('pt-BR')}.`;

    const response = await interaction.reply({
      content: moleKillMessage,
      components: [row]
    });

    try {
      const list = await response.awaitMessageComponent({
        filter: i => i.customId === 'listar'
      });

      if(list) {
        await list.update({
          content: `${moleKillMessage}\n\nListando moles...`,
          components: []
        })

        const [embed] = await getMolesList(interaction.guildId);

        await list.editReply({
          files: ['https://cdn.discordapp.com/attachments/1160385399160582185/1162117430018056295/image.png?ex=653ac532&is=65285032&hm=cbb9ada5d8a732b8825408a224492bc62fee43be417b314a3e27c0e3172c2f21&'],
          embeds: [embed]
        })
      } else {
        await interaction.editReply({
          content: moleKillMessage
        })
      }
    } catch (error) {
      await interaction.editReply({
        content: moleKillMessage
      })
    }
  }
}