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
		.setName("challenge")
		.setDescription("Challenge another player on a ladder")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("Enter the ladder name")
				.setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName("target")
				.setDescription("Select the player you want to challenge")
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString("ladder_name");
		const defenderUser = interaction.options.getUser("target");
		const challengerId = interaction.user.id;

		if (defenderUser.id === challengerId) {
			return interaction.editReply({
				content: "❌ You cannot challenge yourself!",
			});
		}

		try {
			// 1. Fetch ladder info
			const ladderRes = await db.query(
				"SELECT ladder_id, challenge_count FROM ladders WHERE ladder_name = $1 AND is_active = TRUE",
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const { ladder_id: ladderId, challenge_count: maxRange } =
				ladderRes.rows[0];

			// 2. Fetch Challenger's position
			const challengerRes = await db.query(
				"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE",
				[ladderId, challengerId],
			);

			if (challengerRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You must join **${ladderName}** with \`/join\` before you can challenge anyone!`,
				});
			}

			const challengerPos = challengerRes.rows[0].position;

			// 3. Fetch Defender's position
			const defenderRes = await db.query(
				"SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE",
				[ladderId, defenderUser.id],
			);

			if (defenderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ <@${defenderUser.id}> has not joined **${ladderName}** yet!`,
				});
			}

			const defenderPos = defenderRes.rows[0].position;

			// 4. Validate range
			if (defenderPos >= challengerPos) {
				return interaction.editReply({
					content:
						"❌ You can only challenge players ranked higher than you!",
				});
			}

			if (challengerPos - defenderPos > maxRange) {
				return interaction.editReply({
					content: `❌ <@${defenderUser.id}> is ranked too far ahead (#${defenderPos})! Max range is **${maxRange}** ranks.`,
				});
			}

			// 5. Create challenge record
			await db.query(
				`INSERT INTO active_challenges (ladder_id, challenger_id, defender_id, status, created_at)
				 VALUES ($1, $2, $3, 'pending', $4)
				 ON CONFLICT (ladder_id, challenger_id) 
				 DO UPDATE SET defender_id = EXCLUDED.defender_id, status = 'pending', created_at = EXCLUDED.created_at`,
				[ladderId, challengerId, defenderUser.id, Date.now()],
			);

			// 6. Build Accept / Decline buttons
			const acceptBtn = new ButtonBuilder()
				.setCustomId("btn_accept_challenge")
				.setLabel("Accept")
				.setStyle(ButtonStyle.Success);

			const declineBtn = new ButtonBuilder()
				.setCustomId("btn_decline_challenge")
				.setLabel("Decline")
				.setStyle(ButtonStyle.Danger);

			const row = new ActionRowBuilder().addComponents(
				acceptBtn,
				declineBtn,
			);

			// 7. Send the message with buttons
			const response = await interaction.editReply({
				content: `⚔️ **CHALLENGE ISSUED!** <@${challengerId}> (#${challengerPos}) has challenged <@${defenderUser.id}> (#${defenderPos}) on **${ladderName}**!\n<@${defenderUser.id}>, click below to respond:`,
				components: [row],
			});

			// 8. Create a collector for button clicks (active for 5 minutes)
			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300_000, // 5 minutes
			});

			collector.on("collect", async (btnInteraction) => {
				// 🚫 Security check: block anyone who isn't the defender
				if (btnInteraction.user.id !== defenderUser.id) {
					return btnInteraction.reply({
						content:
							"❌ Only the player who was challenged can press these buttons!",
						ephemeral: true,
					});
				}

				await btnInteraction.deferUpdate();

				if (btnInteraction.customId === "btn_accept_challenge") {
					// Update DB to accepted
					await db.query(
						`UPDATE active_challenges 
						 SET status = 'accepted' 
						 WHERE ladder_id = $1 AND challenger_id = $2 AND defender_id = $3`,
						[ladderId, challengerId, defenderUser.id],
					);

					// Disable buttons and update message
					acceptBtn.setDisabled(true);
					declineBtn.setDisabled(true);

					await interaction.editReply({
						content: `⚔️ <@${defenderUser.id}> **ACCEPTED** the challenge from <@${challengerId}> on **${ladderName}**! Game on!`,
						components: [row],
					});

					collector.stop();
				} else if (
					btnInteraction.customId === "btn_decline_challenge"
				) {
					// Delete challenge from DB
					await db.query(
						`DELETE FROM active_challenges 
						 WHERE ladder_id = $1 AND challenger_id = $2 AND defender_id = $3`,
						[ladderId, challengerId, defenderUser.id],
					);

					acceptBtn.setDisabled(true);
					declineBtn.setDisabled(true);

					await interaction.editReply({
						content: `🛡️ <@${defenderUser.id}> declined the challenge from <@${challengerId}> on **${ladderName}**.`,
						components: [row],
					});

					collector.stop();
				}
			});

			// Disable buttons automatically if time expires
			collector.on("end", async (collected, reason) => {
				if (reason === "time") {
					acceptBtn.setDisabled(true);
					declineBtn.setDisabled(true);
					await interaction.editReply({
						content: `⌛ Challenge from <@${challengerId}> to <@${defenderUser.id}> expired without a response.`,
						components: [row],
					});
				}
			});
		} catch (error) {
			console.error("Error running /challenge:", error);
			await interaction.editReply({
				content: "❌ An error occurred while creating the challenge.",
			});
		}
	},
};
