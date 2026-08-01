const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ranking")
		.setDescription("View current rankings for a ladder")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("Enter the ladder name to view rankings")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString("ladder_name");
		const currentUserId = interaction.user.id;

		try {
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

			const membersRes = await db.query(
				`SELECT lm.position, lm.discordid, u.nickname 
				 FROM laddermembers lm
				 JOIN users u ON lm.discordid = u.discordid
				 WHERE lm.ladderid = $1 AND lm.isactive = TRUE
				 ORDER BY lm.position ASC`,
				[ladderId],
			);

			if (membersRes.rows.length === 0) {
				return interaction.editReply({
					content: `🏆 Ladder **${ladderName}** currently has no active players. Use \`/join\` to take spot #1!`,
				});
			}

			let leaderboardText = "";
			let userCurrentRank = "Not Ranked";

			membersRes.rows.forEach((member) => {
				const isCurrentUser = member.discordid === currentUserId;
				const rankFormatted = `#${member.position}`.padEnd(4, " ");

				if (isCurrentUser) {
					userCurrentRank = `#${member.position}`;
					leaderboardText += `👉 **${rankFormatted} | ${member.nickname} (YOU)**\n`;
				} else {
					leaderboardText += `\`${rankFormatted}\` | ${member.nickname}\n`;
				}
			});

			const embed = new EmbedBuilder()
				.setTitle(`🏆 ${ladderName.toUpperCase()} Standings`)
				.setColor(0x5865f2)
				.setDescription(leaderboardText)
				.addFields(
					{
						name: "Active Players",
						value: `${membersRes.rows.length} / ${maxCapacity}`,
						inline: true,
					},
					{
						name: "Your Rank",
						value: userCurrentRank,
						inline: true,
					},
				)
				.setTimestamp()
				.setFooter({ text: "Frag-o-Matic Ranking Bot" });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error running /ranking:", error);
			await interaction.editReply({
				content: "❌ An error occurred while loading rankings.",
			});
		}
	},
};
