const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("join")
		.setDescription("Join a ladder as a new player")
		.addStringOption((option) =>
			option
				.setName("ladder_name")
				.setDescription("enter the ladder name here"),
		),
	async execute(interaction) {
		await interaction.reply(`You joined a ladder called ${option}!`);
	},
};
