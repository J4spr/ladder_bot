const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("create")
		.setDescription("create a new ladder")
		// ladder name
		.addStringOption((opt) =>
			opt
				.setName("ladder_name")
				.setDescription("Enter the ladder name")
				.setRequired(true),
		)
		// ladder count
		.addIntegerOption((opt) =>
			opt
				.setName("ladder_count")
				.setDescription("Enter how many player can join (default 20)")
				.setRequired(false),
		)
		// challenge count
		.addIntegerOption((opt) =>
			opt
				.setName("challengecount")
				.setDescription("Places above you can challenge (default 3)")
				.setRequired(false),
		),

	async execute(interaction) {
		// 1. Role Check: Ensure user has the 'CREW' role
		const hasCrewRole = interaction.member.roles.cache.some(
			(role) => role.name === "CREW",
		);

		if (!hasCrewRole) {
			return interaction.reply({
				content:
					"❌ Only people with the **CREW** role can use that command",
				ephemeral: true,
			});
		}
		// 1. Tell Discord immediately to show "Bot is thinking..." (resets the 3-second timer)
		await interaction.deferReply();

		const ladder_name = interaction.options.getString("ladder_name");
		const ladder_count =
			interaction.options.getInteger("ladder_count") ?? 20;
		const challenge_count =
			interaction.options.getInteger("challengecount") ?? 3;

		try {
			await db.query(
				"INSERT INTO ladders (ladder_name, ladder_count, challenge_count) VALUES ($1, $2, $3)",
				[ladder_name, ladder_count, challenge_count],
			);

			// 2. Use editReply() instead of reply()
			await interaction.editReply({
				content: `✅ Ladder **${ladder_name}** successfully created!`,
			});
		} catch (error) {
			if (error.code === "23505") {
				return interaction.editReply({
					content: "❌ Ladder name already exists!",
				});
			}
			console.error(error);
			await interaction.editReply({
				content: "❌ Failed to create ladder due to a database error.",
			});
		}
	},
};
