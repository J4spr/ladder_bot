const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("create")
		.setDescription("create a new ladder")
		.addStringOption((opt) =>
			opt
				.setName("ladder_name")
				.setDescription("Enter the ladder name")
				.setRequired(true),
		)
		.addIntegerOption((opt) =>
			opt
				.setName("ladder_count")
				.setDescription("Enter how many players can join (default 20)")
				.setRequired(false),
		)
		.addIntegerOption((opt) =>
			opt
				.setName("challengecount")
				.setDescription("Places above you can challenge (default 3)")
				.setRequired(false),
		),

	async execute(interaction) {
		const hasCrewRole = interaction.member.roles.cache.some(
			(role) => role.name === "CREW",
		);

		if (!hasCrewRole) {
			return interaction.reply({
				content: "❌ You need the **CREW** role to use this command!",
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const ladder_name = interaction.options.getString("ladder_name");
		const ladder_count =
			interaction.options.getInteger("ladder_count") ?? 20;
		const challenge_count =
			interaction.options.getInteger("challengecount") ?? 3;

		try {
			// Insert and return the new auto-incremented ladder_id
			const result = await db.query(
				"INSERT INTO ladders (ladder_name, ladder_count, challenge_count) VALUES ($1, $2, $3) RETURNING ladder_id",
				[ladder_name, ladder_count, challenge_count],
			);

			const newLadderId = result.rows[0].ladder_id;

			await interaction.editReply({
				content: `✅ Ladder **${ladder_name}** created! (ID: \`#${newLadderId}\`)`,
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: "❌ An error occurred while creating the ladder.",
			});
		}
	},
};
