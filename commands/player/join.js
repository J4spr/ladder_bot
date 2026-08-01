const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("join")
		.setDescription("Join a ladder as a new player")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("Enter the ladder name here")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladder_name = interaction.options.getString("ladder_name");
		const discord_id = interaction.user.id;
		const username =
			interaction.user.globalName || interaction.user.username;

		try {
			// Fetch ladder info
			const ladderRes = await db.query(
				"SELECT ladderid, laddercount FROM ladders WHERE laddername = $1 AND isactive = TRUE",
				[ladder_name],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladder_name}** does not exist.`,
				});
			}

			const { ladderid, laddercount } = ladderRes.rows[0];

			// Ensure user entry exists using `nickname` column
			await db.query(
				`INSERT INTO users (discordid, nickname, ladderid)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (discordid) 
				 DO UPDATE SET nickname = EXCLUDED.nickname, ladderid = EXCLUDED.ladderid`,
				[discord_id, username, ladderid],
			);

			// Count current active members in ladder
			const countRes = await db.query(
				"SELECT COUNT(*) FROM laddermembers WHERE ladderid = $1 AND isactive = TRUE",
				[ladderid],
			);
			const currentMemberCount = parseInt(countRes.rows[0].count, 10);

			if (currentMemberCount >= laddercount) {
				return interaction.editReply({
					content: `❌ **${ladder_name}** is full! (${currentMemberCount}/${laddercount})`,
				});
			}

			const nextPosition = currentMemberCount + 1;

			// Insert or Reactivate member in laddermembers
			await db.query(
				`INSERT INTO laddermembers (ladderid, discordid, position, isactive)
				 VALUES ($1, $2, $3, TRUE)
				 ON CONFLICT (ladderid, discordid) 
				 DO UPDATE SET isactive = TRUE, position = EXCLUDED.position`,
				[ladderid, discord_id, nextPosition],
			);

			await interaction.editReply({
				content: `✅ You joined **${ladder_name}** at spot **#${nextPosition}**!`,
			});
		} catch (error) {
			console.error("Error running /join:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while attempting to join the ladder.",
			});
		}
	},
};
