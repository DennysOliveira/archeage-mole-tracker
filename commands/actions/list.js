// Command that will list all moles and their respective status (killed, alive or unknown) - if dead, shows how much time is left until it's alive again
const { SlashCommandBuilder } = require("discord.js");
const { getMolesList } = require('../../molesService');

module.exports = {
  data: new SlashCommandBuilder().setName('listar').setDescription('Lista o status de todas as moles.'),
  async execute(interaction) {
    const [embed] = await getMolesList(interaction.guildId);

    await interaction.reply({
      files: ['https://cdn.discordapp.com/attachments/1160385399160582185/1162117430018056295/image.png?ex=653ac532&is=65285032&hm=cbb9ada5d8a732b8825408a224492bc62fee43be417b314a3e27c0e3172c2f21&'],
      embeds: [embed]
    })
  }
}