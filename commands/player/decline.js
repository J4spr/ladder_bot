const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("decline")
		.setDescription("Decline a pending challenge on a ladder")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("The ladder the challenge was issued on")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString("ladder_name");
		const defenderId = interaction.user.id;

		try {
			// 1. Get ladder_id
			const ladderRes = await db.query(
				"SELECT ladder_id FROM ladders WHERE ladder_name = $1 AND is_active = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const ladderId = ladderRes.rows[0].ladder_id;

			// 2. Fetch pending challenge
			const challengeRes = await db.query(
				`SELECT challenger_id FROM active_challenges 
				 WHERE ladder_id = $1 AND defender_id = $2 AND status = 'pending'`,
				[ladderId, defenderId],
			);

			if (challengeRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You do not have any pending challenges to decline on **${ladderName}**!`,
				});
			}

			const challengerId = challengeRes.rows[0].challenger_id;

			// 3. Remove the challenge row
			await db.query(
				`DELETE FROM active_challenges 
				 WHERE ladder_id = $1 AND challenger_id = $2 AND defender_id = $3`,
				[ladderId, challengerId, defenderId],
			);

			await interaction.editReply({
				content: `🛡️ <@${defenderId}> declined the challenge from <@${challengerId}> on **${ladderName}**.`,
			});
		} catch (error) {
			console.error("Error running /decline:", error);
			await interaction.editReply({
				content: "❌ An error occurred while declining the challenge.",
			});
		}
	},
};
