// Register the current executed channel
// Command that will list all moles and their respective status (killed, alive or unknown) - if dead, shows how much time is left until it's alive again
const { SlashCommandBuilder } = require("discord.js");
const createRedisClient = require("../../createRedisClient");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra o canal para receber os avisos sobre as moles.')
    .addRoleOption(option => option.setName('cargo').setDescription('Qual cargo receberá os avisos?').setRequired(true)),
  async execute(interaction) {
    console.log('Cargo', interaction.options.getRole('cargo'));
    const currentChannel = interaction.channelId;
    const currentGuild = interaction.guildId;

    const redisClient = await createRedisClient();
    const channel = await redisClient.set(`${currentGuild}:channel`, currentChannel);
    const role = await redisClient.set(`${currentGuild}:role`, interaction.options.getRole('cargo').id);

    await interaction.reply({
      content: `Agora você agora receberá os avisos sobre as moles no canal <#${currentChannel}> para o cargo <@&${interaction.options.getRole('cargo').id}>.`,
    })
  }
}