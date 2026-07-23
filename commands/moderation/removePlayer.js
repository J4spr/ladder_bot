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
		.addStringOption((opt) =>
			opt
				.setName("player_name")
				.setDescription("In-Game Name (IGN) of the player to remove")
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
		const playerName = interaction.options.getString("player_name");

		try {
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

			const userRes = await db.query(
				"SELECT discord_id FROM users WHERE LOWER(ign) = LOWER($1)",
				[playerName],
			);

			if (userRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Player **${playerName}** is not registered in the system.`,
				});
			}

			const targetDiscordId = userRes.rows[0].discord_id;

			const memberRes = await db.query(
				"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE",
				[ladderId, targetDiscordId],
			);

			if (memberRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Player **${playerName}** is not an active participant in **${ladderName}**.`,
				});
			}

			const removedPosition = memberRes.rows[0].position;

			await db.query(
				"UPDATE ladder_members SET is_active = FALSE, position = NULL WHERE ladder_id = $1 AND discord_id = $2",
				[ladderId, targetDiscordId],
			);

			if (removedPosition !== null) {
				await db.query(
					"UPDATE ladder_members SET position = position - 1 WHERE ladder_id = $1 AND position > $2 AND is_active = TRUE",
					[ladderId, removedPosition],
				);
			}

			await interaction.editReply({
				content: `✅ Successfully removed **${playerName}** from **${ladderName}**! Standings have been reordered.`,
			});
		} catch (error) {
			console.error("❌ Error running /remove:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while processing the database query.",
			});
		}
	},
};
