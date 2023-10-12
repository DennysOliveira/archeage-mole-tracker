// Sends a map (image) of mole locations
// Command that will list all moles and their respective status (killed, alive or unknown) - if dead, shows how much time is left until it's alive again

const existingMoles = require('../../domain/moles')
const { SlashCommandBuilder } = require("discord.js");
const createRedisClient = require('../../createRedisClient')

module.exports = {
  data: new SlashCommandBuilder().setName('mapa').setDescription('Mostra o mapa das moles.'),
  async execute(interaction) {
    // Replies an image with the map
    await interaction.reply({
      files: ['https://cdn.discordapp.com/attachments/1160385399160582185/1162117430018056295/image.png?ex=653ac532&is=65285032&hm=cbb9ada5d8a732b8825408a224492bc62fee43be417b314a3e27c0e3172c2f21&']
    })
  }
}