const { SlashCommandBuilder } = require("discord.js");
const db = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ladders")
		.setDescription("View all ladders you currently are participating in"),
	async execute(interaction) {
		await interaction.deferReply();
		try {
			const ladderres = await db.query(`SELECT * FROM ladders l
                                            INNER JOIN users u on l.ladder_id = u.ladder_id`);
		} catch (error) {
			console.error(error);
		}
	},
};
