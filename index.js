require('dotenv').config()
const fs = require('node:fs');
const path = require('node:path');
// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { getMolesList } = require('./molesService');
const cron = require('node-cron')
const createRedisClient = require('./createRedisClient');
const { DateTime } = require('luxon');
const token = process.env.DISCORD_BOT_AUTH;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
      console.log(`[INFO] Loading command ${command.data.name} from ${filePath}`)
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		console.log(`User ${interaction.user.tag} executed command ${interaction.commandName}`);
		await command.execute(interaction);
	} catch (error) {
		console.log(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'Houve um erro ao executar o comando. Tente novamente por favor.', ephemeral: true });
		} else {
			await interaction.reply({ content: 'Houve um erro ao executar o comando. Tente novamente por favor.', ephemeral: true });
		}
	}
});


// Log in to Discord with your client's token
client.login(token);

const getMolesToNotify = async (timeInMinutes) => {
	// Time in minutes refers to how much time is left until the mole is alive again
	// If a mole time to live is less than timeInMinutes, we return the mole in the return array

	console.log('[getMolesToNotify] Running verification for moles with less than', timeInMinutes, 'minutes to spawn');
	const redisClient = await createRedisClient();

	const guilds = client.guilds.cache.map(guild => guild);
	const now = DateTime.now();


	const molesList = await Promise.all(guilds.map(async guild => {
		const [embed, molesList] = await getMolesList(guild.id);

		return {
			guildId: guild.id,
			moles: molesList,
			channel: await redisClient.get(`${guild.id}:channel`),
			role: await redisClient.get(`${guild.id}:role`)
		}
	}));


	const embedsToSend = {};

	molesList.forEach(async moleList => {
		const { guildId, moles, channel } = moleList;

		if (channel) {

			const channelToSend = client.channels.cache.get(channel);

			if (channelToSend) {
				// From the moles list, check if there's any mole that will be alive in less than 10 minutes

				// 5th element in the array of a mole is the unix timestamp
				// if there are any moles with less than 10 minutes to live, send a message to the channel warning with the time left and mole name
				const molesToNotify = moles.filter(mole => mole[4] && mole[4] < now.plus({ minutes: timeInMinutes }).toUnixInteger());

				

				if (molesToNotify.length === 0) {
					return;
				}

				const embed = new EmbedBuilder();

				embed.setTitle('Moles Nascendo');

				const roleMention = moleList.role ? `<@&${moleList.role}>` : '@here';
				embed.setDescription(`${roleMention}, as moles abaixo estão para nascer em menos de ${timeInMinutes} minutos.`);

				embed.addFields(
					{
						name: 'Mole',
						value: molesToNotify.map(mole => mole[1]).join('\n'),
						inline: true
					},
					{
						name: 'Tempo restante',
						value: molesToNotify.map(mole => mole[3]).join('\n'),
						inline: true
					}
				);

				embed.setFooter({
					text: 'Aviso Automático',
				});
				embed.setTimestamp();

				embedsToSend[guildId] = {
					embed,
					channel: channelToSend
				};
			} else {
				console.log(`Channel ${channel} not found in guild cache ${guildId} - not sending message.`);
			}
		} else {
			console.log(`Channel not found for guild ${guildId} in redis - not sending message.`);
		}
	})

	redisClient.disconnect();

	return embedsToSend;
}


// Cron every minute
cron.schedule('* * * * *', async () => {
	// Every minute, we fetch moles that will spawn in: 5, 10 & 30 minutes
	// We will send embeds returned but only once for the same period
	// To check if the message is already sent, we will store the notification in redis
	// The key will be: guildId:notificationSent:timeInMinutes
	console.log('[Scheduler] Running verification for moles with less than 5 minutes to spawn');

	const molesInformation = [
		getMolesToNotify(5),
		getMolesToNotify(10),
		getMolesToNotify(30)
	]

	const molesInformationArr = await Promise.all(molesInformation);

	const embedsToSendArr = [
		{
			timeInMinutes: 30,
			embeds: molesInformationArr[2]
		},
		{
			timeInMinutes: 10,
			embeds: molesInformationArr[1]
		},
		{
			timeInMinutes: 5,
			embeds: molesInformationArr[0]
		}
	]

	console.log('Embeds to send:', embedsToSendArr)
	const redisClient = await createRedisClient();

	for(let i = 0; i < embedsToSendArr.length; i++) {
		const { timeInMinutes, embeds } = embedsToSendArr[i];

		console.log(timeInMinutes, embeds)
		for(const guildId in embeds) {
			const { embed, channel } = embeds[guildId];

			const key = `${guildId}:notificationSent:${timeInMinutes}`;

			const notificationSent = await redisClient.get(key);

			if (notificationSent) {
				console.log(`[Scheduler] Notification already sent for guild ${guildId} with ${timeInMinutes} minutes to spawn`);
				continue;
			}

			const moleKilled = await redisClient.set(key, 'true');
			const expire = await redisClient.expire(key, 60 * timeInMinutes);

			await channel.send({
				embeds: [embed]
			});

		}
	}


	redisClient.disconnect();
})