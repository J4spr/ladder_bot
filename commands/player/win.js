const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("win")
		.setDescription("Report that you won your current ladder match")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("The ladder the match was played on")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString("ladder_name");
		const winnerId = interaction.user.id;

		try {
			// 1. Fetch ladder ID
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

			// 2. Find an accepted active match involving this player
			const matchRes = await db.query(
				`SELECT challenger_id, defender_id 
				 FROM active_challenges 
				 WHERE ladder_id = $1 AND status = 'accepted' AND (challenger_id = $2 OR defender_id = $2)`,
				[ladderId, winnerId],
			);

			if (matchRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You do not have an active accepted match on **${ladderName}**!`,
				});
			}

			const { challenger_id: challengerId, defender_id: defenderId } =
				matchRes.rows[0];
			const loserId =
				winnerId === challengerId ? defenderId : challengerId;

			// 3. Build verification button for the opponent (loser)
			const confirmBtn = new ButtonBuilder()
				.setCustomId("btn_confirm_win")
				.setLabel("Confirm Result")
				.setStyle(ButtonStyle.Success);

			const row = new ActionRowBuilder().addComponents(confirmBtn);

			const response = await interaction.editReply({
				content: `🏆 <@${winnerId}> reported winning their match on **${ladderName}** against <@${loserId}>!\n<@${loserId}>, please click below to confirm this result.`,
				components: [row],
			});

			// 4. Listen for button press
			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300_000, // 5 minutes
			});

			collector.on("collect", async (btnInteraction) => {
				// Only the declared opponent/loser can confirm
				if (btnInteraction.user.id !== loserId) {
					return btnInteraction.reply({
						content:
							"❌ Only the opponent can confirm the match result!",
						ephemeral: true,
					});
				}

				await btnInteraction.deferUpdate();

				if (btnInteraction.customId === "btn_confirm_win") {
					// Fetch current positions
					const winnerMem = await db.query(
						"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2",
						[ladderId, winnerId],
					);
					const loserMem = await db.query(
						"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2",
						[ladderId, loserId],
					);

					const winnerPos = winnerMem.rows[0].position;
					const loserPos = loserMem.rows[0].position;

					// Swap positions if lower rank beat higher rank
					if (winnerPos > loserPos) {
						await db.query(
							"UPDATE ladder_members SET position = $1 WHERE ladder_id = $2 AND discord_id = $3",
							[loserPos, ladderId, winnerId],
						);
						await db.query(
							"UPDATE ladder_members SET position = $1 WHERE ladder_id = $2 AND discord_id = $3",
							[winnerPos, ladderId, loserId],
						);
					}

					// Clean up the active challenge
					await db.query(
						"DELETE FROM active_challenges WHERE ladder_id = $1 AND challenger_id = $2 AND defender_id = $3",
						[ladderId, challengerId, defenderId],
					);

					confirmBtn.setDisabled(true);

					await interaction.editReply({
						content: `✅ Result confirmed! <@${winnerId}> won the match! ${winnerPos > loserPos ? `\n🎉 **<@${winnerId}> takes spot #${loserPos}!**` : ""}`,
						components: [row],
					});

					collector.stop();
				}
			});

			collector.on("end", async (_, reason) => {
				if (reason === "time") {
					confirmBtn.setDisabled(true);
					await interaction.editReply({
						content: `⌛ Match result confirmation for <@${winnerId}> vs <@${loserId}> expired without response.`,
						components: [row],
					});
				}
			});
		} catch (error) {
			console.error("Error running /win:", error);
			await interaction.editReply({
				content:
					"❌ An error occurred while submitting the win report.",
			});
		}
	},
};
