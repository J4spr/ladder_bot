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
			// 1. Fetch ladder info
			const ladderRes = await db.query(
				"SELECT ladderid, laddercount FROM ladders WHERE laddername = $1 AND isactive = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const { ladderid: ladderId, laddercount: maxCapacity } =
				ladderRes.rows[0];

			const nickname = targetUser.globalName || targetUser.username;

			// 2. Upsert into users table
			await db.query(
				`INSERT INTO users (discordid, nickname, ladderid)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (discordid) 
				 DO UPDATE SET 
					nickname = EXCLUDED.nickname,
					ladderid = EXCLUDED.ladderid`,
				[targetUser.id, nickname, ladderId],
			);

			const activeCountRes = await db.query(
				"SELECT COUNT(*) FROM laddermembers WHERE ladderid = $1 AND isactive = TRUE",
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
				"SELECT isactive FROM laddermembers WHERE ladderid = $1 AND discordid = $2",
				[ladderId, targetUser.id],
			);

			if (memberCheck.rows.length > 0) {
				if (memberCheck.rows[0].isactive) {
					return interaction.editReply({
						content: `❌ <@${targetUser.id}> is already in **${ladderName}**!`,
					});
				} else {
					await db.query(
						`UPDATE laddermembers 
						 SET isactive = TRUE, position = $1, joinedat = CURRENT_TIMESTAMP 
						 WHERE ladderid = $2 AND discordid = $3`,
						[nextPosition, ladderId, targetUser.id],
					);
				}
			} else {
				await db.query(
					`INSERT INTO laddermembers (ladderid, discordid, position, isactive)
					 VALUES ($1, $2, $3, TRUE)`,
					[ladderId, targetUser.id, nextPosition],
				);
			}

			await interaction.editReply({
				content: `✅ Successfully added <@${targetUser.id}> (**${nickname}**) to **${ladderName}** at spot **#${nextPosition}**!`,
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
