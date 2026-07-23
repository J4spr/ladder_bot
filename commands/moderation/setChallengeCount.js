const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setchallengecount")
		.setDescription(
			"change the amount of places above you that you can challenge",
		)
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("enter the exact ladder name here")
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName("challenge_count")
				.setDescription("enter the right count here")
				.setRequired(true),
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
		const challenge_count =
			interaction.options.getInteger("challenge_count");

		try {
			const result = await db.query(
				`UPDATE ladders SET challenge_count = $1 WHERE ladder_name = $2`,
				[challenge_count, ladder_name],
			);

			await interaction.editReply(
				`✅ Successfully set challenge count for **${ladder_name}** to **${challenge_count}**.`,
			);
		} catch (error) {
			console.error(error);
			await interaction.editReply(
				`An Error occurred while updating the ladder. Error: ${error.message || error}`,
			);
		}
	},
};
