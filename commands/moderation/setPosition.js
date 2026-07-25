const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setposition")
		.setDescription("Admin: Override a player's position on a ladder")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("The ladder name")
				.setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName("target")
				.setDescription("The player to reposition")
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName("new_position")
				.setDescription("The new rank position number")
				.setRequired(true)
				.setMinValue(1),
		),

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const ladderName = interaction.options.getString("ladder_name");
		const targetUser = interaction.options.getUser("target");
		const newPos = interaction.options.getInteger("new_position");

		try {
			const ladderRes = await db.query(
				"SELECT ladder_id FROM ladders WHERE ladder_name = $1 AND is_active = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply(
					`❌ Ladder **${ladderName}** was not found.`,
				);
			}

			const ladderId = ladderRes.rows[0].ladder_id;

			// Fetch existing player at that target position (if any)
			const targetRes = await db.query(
				"SELECT discord_id, position FROM ladder_members WHERE ladder_id = $1 AND position = $2 AND is_active = TRUE",
				[ladderId, newPos],
			);

			// Fetch moving player's current position
			const moverRes = await db.query(
				"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE",
				[ladderId, targetUser.id],
			);

			if (moverRes.rows.length === 0) {
				return interaction.editReply(
					`❌ <@${targetUser.id}> is not an active member of **${ladderName}**.`,
				);
			}

			const oldPos = moverRes.rows[0].position;

			// If another player occupies that exact spot, swap them
			if (
				targetRes.rows.length > 0 &&
				targetRes.rows[0].discord_id !== targetUser.id
			) {
				const otherPlayerId = targetRes.rows[0].discord_id;
				await db.query(
					"UPDATE ladder_members SET position = $1 WHERE ladder_id = $2 AND discord_id = $3",
					[oldPos, ladderId, otherPlayerId],
				);
			}

			// Move target user to new spot
			await db.query(
				"UPDATE ladder_members SET position = $1 WHERE ladder_id = $2 AND discord_id = $3",
				[newPos, ladderId, targetUser.id],
			);

			await interaction.editReply(
				`✅ Successfully updated <@${targetUser.id}>'s position on **${ladderName}** from **#${oldPos}** to **#${newPos}**!`,
			);
		} catch (error) {
			console.error("Error running /setposition:", error);
			await interaction.editReply(
				"❌ An error occurred while adjusting positions.",
			);
		}
	},
};
