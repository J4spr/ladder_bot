const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("removeplayer")
		.setDescription("Remove a player from a specific ladder")
		.addStringOption((opt) =>
			opt
				.setName("ladder_name")
				.setDescription("Name of the ladder")
				.setRequired(true),
		)
		.addUserOption((opt) =>
			opt
				.setName("user")
				.setDescription("Discord user to remove")
				.setRequired(true),
		),

	async execute(interaction) {
		const hasCrewRole = interaction.member.roles.cache.some(
			(role) => role.name === "CREW",
		);

		if (!hasCrewRole) {
			return interaction.reply({
				content:
					"❌ You need the **CREW** role to execute this command!",
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const ladderName = interaction.options.getString("ladder_name");
		const targetUser = interaction.options.getUser("user");

		try {
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

			const memberRes = await db.query(
				"SELECT position FROM laddermembers WHERE ladderid = $1 AND discordid = $2 AND isactive = TRUE",
				[ladderId, targetUser.id],
			);

			if (memberRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ <@${targetUser.id}> is not an active participant in **${ladderName}**.`,
				});
			}

			const removedPosition = memberRes.rows[0].position;

			await db.query(
				"UPDATE laddermembers SET isactive = FALSE, position = NULL WHERE ladderid = $1 AND discordid = $2",
				[ladderId, targetUser.id],
			);

			if (removedPosition !== null) {
				await db.query(
					"UPDATE laddermembers SET position = position - 1 WHERE ladderid = $1 AND position > $2 AND isactive = TRUE",
					[ladderId, removedPosition],
				);
			}

			await interaction.editReply({
				content: `✅ Successfully removed <@${targetUser.id}> from **${ladderName}**! Standings have been reordered.`,
			});
		} catch (error) {
			console.error("❌ Error running /removeplayer:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while processing the database query.",
			});
		}
	},
};
