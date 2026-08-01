const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("accept")
		.setDescription("Accept a pending challenge on a ladder")
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
			// 1. Get ladderid
			const ladderRes = await db.query(
				"SELECT ladderid FROM ladders WHERE laddername = $1 AND isactive = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const ladderId = ladderRes.rows[0].ladderid;

			// 2. Fetch pending challenge where interaction.user is the defender
			const challengeRes = await db.query(
				`SELECT challengerid FROM activechallenges 
				 WHERE ladderid = $1 AND defenderid = $2 AND status = 'pending'`,
				[ladderId, defenderId],
			);

			if (challengeRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You do not have any pending challenges on **${ladderName}**!`,
				});
			}

			const challengerId = challengeRes.rows[0].challengerid;

			// 3. Update status to 'accepted'
			await db.query(
				`UPDATE activechallenges 
				 SET status = 'accepted' 
				 WHERE ladderid = $1 AND challengerid = $2 AND defenderid = $3`,
				[ladderId, challengerId, defenderId],
			);

			await interaction.editReply({
				content: `⚔️ <@${defenderId}> **ACCEPTED** the challenge from <@${challengerId}> on **${ladderName}**! Game on!`,
			});
		} catch (error) {
			console.error("Error running /accept:", error);
			await interaction.editReply({
				content: "❌ An error occurred while accepting the challenge.",
			});
		}
	},
};
