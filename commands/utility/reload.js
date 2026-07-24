const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const commandName = interaction.options
			.getString('command', true)
			.toLowerCase();
		const command = interaction.client.commands.get(commandName);

		if (!command) {
			return interaction.editReply(
				`❌ There is no command with the name \`${commandName}\`!`,
			);
		}

		// 1. Locate the exact file path across subfolders
		const commandsPath = path.join(__dirname, '..');
		let commandFilePath = null;

		const commandFolders = fs.readdirSync(commandsPath);
		for (const folder of commandFolders) {
			const folderPath = path.join(commandsPath, folder);
			if (fs.statSync(folderPath).isDirectory()) {
				const filePath = path.join(
					folderPath,
					`${command.data.name}.js`,
				);
				if (fs.existsSync(filePath)) {
					commandFilePath = filePath;
					break;
				}
			}
		}

		if (!commandFilePath) {
			return interaction.editReply(
				`❌ Could not find the file for command \`${command.data.name}\`.`,
			);
		}

		// 2. Clear Node's require cache and re-require the file
		delete require.cache[require.resolve(commandFilePath)];

		try {
			const newCommand = require(commandFilePath);
			interaction.client.commands.set(newCommand.data.name, newCommand);

			await interaction.editReply(
				`✅ Command \`${newCommand.data.name}\` was successfully reloaded!`,
			);
		}
		catch (error) {
			console.error(error);
			await interaction.editReply(
				`❌ Error reloading \`${command.data.name}\`:\n\`\`\`js\n${error.message}\n\`\`\``,
			);
		}
	},
};
