const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("addplayer")
		.setDescription("Add a player to a specific ladder")
		.addStringOption((opt) =>
			opt
				.setName("ladder_name")
				.setDescription("Name of the ladder")
				.setRequired(true),
		)
		.addUserOption((opt) =>
			opt
				.setName("user")
				.setDescription("Select the Discord user to add")
				.setRequired(true),
		)
		.addStringOption((opt) =>
			opt
				.setName("ign")
				.setDescription("In-Game Name (IGN) for this player")
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
		const ign = interaction.options.getString("ign");

		try {
			// 1. Fetch ladder info
			const ladderRes = await db.query(
				"SELECT ladder_id, ladder_count FROM ladders WHERE ladder_name = $1 AND is_active = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const { ladder_id: ladderId, ladder_count: maxCapacity } =
				ladderRes.rows[0];

			await db.query(
				`INSERT INTO users (discord_id, ign, ladder_id)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (discord_id) 
				 DO UPDATE SET ign = EXCLUDED.ign, ladder_id = EXCLUDED.ladder_id`,
				[targetUser.id, ign, ladderId],
			);

			const activeCountRes = await db.query(
				"SELECT COUNT(*) FROM ladder_members WHERE ladder_id = $1 AND is_active = TRUE",
				[ladderId],
			);
			const currentCount = parseInt(activeCountRes.rows[0].count, 10);

			if (currentCount >= maxCapacity) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** is full! (${currentCount}/${maxCapacity} players)`,
				});
			}

			const nextPosition = currentCount + 1;

			const memberCheck = await db.query(
				"SELECT is_active FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2",
				[ladderId, targetUser.id],
			);

			if (memberCheck.rows.length > 0) {
				if (memberCheck.rows[0].is_active) {
					return interaction.editReply({
						content: `❌ <@${targetUser.id}> is already in **${ladderName}**!`,
					});
				} else {
					await db.query(
						`UPDATE ladder_members 
						 SET is_active = TRUE, position = $1, joined_at = CURRENT_TIMESTAMP 
						 WHERE ladder_id = $2 AND discord_id = $3`,
						[nextPosition, ladderId, targetUser.id],
					);
				}
			} else {
				await db.query(
					`INSERT INTO ladder_members (ladder_id, discord_id, position, is_active)
					 VALUES ($1, $2, $3, TRUE)`,
					[ladderId, targetUser.id, nextPosition],
				);
			}

			await interaction.editReply({
				content: `✅ Successfully added <@${targetUser.id}> (**${ign}**) to **${ladderName}** at spot **#${nextPosition}**!`,
			});
		} catch (error) {
			console.error("❌ Error running /addplayer:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while adding the player to the database.",
			});
		}
	},
};
