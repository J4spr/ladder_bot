const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ladders")
		.setDescription("View a list of all available ladders"),

	async execute(interaction) {
		await interaction.deferReply();

		try {
			// Query all active ladders and count current active members in each
			const ladderRes = await db.query(
				`SELECT 
					l.laddername, 
					l.laddercount, 
					l.challengecount,
					COUNT(lm.discordid) FILTER (WHERE lm.isactive = TRUE) AS activeplayers
				 FROM ladders l
				 LEFT JOIN laddermembers lm ON l.ladderid = lm.ladderid
				 WHERE l.isactive = TRUE
				 GROUP BY l.ladderid, l.laddername, l.laddercount, l.challengecount
				 ORDER BY l.laddername ASC`,
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content:
						"❌ There are currently no active ladders created.",
				});
			}

			let descriptionText = "";
			ladderRes.rows.forEach((row) => {
				descriptionText += `🏆 **${row.laddername}**\n`;
				descriptionText += `└ 👥 **Players:** ${row.active_players}/${row.laddercount} | ⚔️ **Challenge Range:** ${row.challengecount} spots\n\n`;
			});

			const embed = new EmbedBuilder()
				.setTitle("🎮 Available Ladders")
				.setColor(0x5865f2)
				.setDescription(descriptionText)
				.setTimestamp()
				.setFooter({
					text: "Use /ranking <ladder_name> to view standings!",
				});

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error running /ladders:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while fetching the list of ladders.",
			});
		}
	},
};
