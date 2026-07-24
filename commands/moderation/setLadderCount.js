const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setladdercount')
		.setDescription(
			'update the amount of players that can join this ladder',
		)
		.addStringOption((option) =>
			option
				.setName('ladder_name')
				.setDescription('enter the exact ladder name here')
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('ladder_count')
				.setDescription('enter the right count here')
				.setRequired(true),
		),
	async execute(interaction) {
		const hasCrewRole = interaction.member.roles.cache.some(
			(role) => role.name === 'CREW',
		);

		if (!hasCrewRole) {
			return interaction.reply({
				content: '❌ You need the **CREW** role to use this command!',
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const ladder_name = interaction.options.getString('ladder_name');
		const ladder_count = interaction.options.getInteger('ladder_count');

		try {
			await db.query(
				'UPDATE ladders SET ladder_count = $1 WHERE ladder_name = $2',
				[ladder_count, ladder_name],
			);

			await interaction.editReply(
				`✅ Successfully set player count for **${ladder_name}** to **${ladder_count}**.`,
			);
		}
		catch (error) {
			console.error(error);
			await interaction.editReply(
				`An Error occurred while updating the ladder. Error: ${error.message || error}`,
			);
		}
	},
};
