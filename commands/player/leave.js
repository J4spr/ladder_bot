const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leave a ladder you are currently participating in')
		.addStringOption((option) =>
			option
				.setName('ladder_name')
				.setDescription('Enter the ladder name you want to leave')
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString('ladder_name');
		const discordId = interaction.user.id;

		try {
			// 1. Fetch ladder_id
			const ladderRes = await db.query(
				'SELECT ladder_id FROM ladders WHERE ladder_name = $1 AND is_active = TRUE',
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const ladderId = ladderRes.rows[0].ladder_id;

			// 2. Check if the user is in this ladder and get their position
			const memberRes = await db.query(
				'SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE',
				[ladderId, discordId],
			);

			if (memberRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You are not an active member of **${ladderName}**.`,
				});
			}

			const leavingPosition = memberRes.rows[0].position;

			// 3. Deactivate user in ladder_members (soft delete)
			await db.query(
				'UPDATE ladder_members SET is_active = FALSE, position = NULL WHERE ladder_id = $1 AND discord_id = $2',
				[ladderId, discordId],
			);

			// 4. Shift everyone positioned below them up by 1 place
			if (leavingPosition !== null) {
				await db.query(
					'UPDATE ladder_members SET position = position - 1 WHERE ladder_id = $1 AND position > $2 AND is_active = TRUE',
					[ladderId, leavingPosition],
				);
			}

			await interaction.editReply({
				content: `✅ You have left **${ladderName}**. The standings have been reordered!`,
			});
		}
		catch (error) {
			console.error('Error running /leave:', error);
			await interaction.editReply({
				content:
					'❌ An error occurred while trying to leave the ladder.',
			});
		}
	},
};
