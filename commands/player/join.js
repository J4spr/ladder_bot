const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Join a ladder as a new player')
		.addStringOption((option) =>
			option
				.setName('ladder_name')
				.setDescription('Enter the ladder name here')
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladder_name = interaction.options.getString('ladder_name');
		const discord_id = interaction.user.id;
		const username =
			interaction.user.globalName || interaction.user.username;

		try {
			// Fetch ladder info
			const ladderRes = await db.query(
				'SELECT ladder_id, ladder_count FROM ladders WHERE ladder_name = $1 AND is_active = TRUE',
				[ladder_name],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladder_name}** does not exist.`,
				});
			}

			const { ladder_id, ladder_count } = ladderRes.rows[0];

			// Ensure user entry exists using `nickname` column
			await db.query(
				`INSERT INTO users (discord_id, nickname, ladder_id)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (discord_id) 
				 DO UPDATE SET nickname = EXCLUDED.nickname, ladder_id = EXCLUDED.ladder_id`,
				[discord_id, username, ladder_id],
			);

			// Count current active members in ladder
			const countRes = await db.query(
				'SELECT COUNT(*) FROM ladder_members WHERE ladder_id = $1 AND is_active = TRUE',
				[ladder_id],
			);
			const currentMemberCount = parseInt(countRes.rows[0].count, 10);

			if (currentMemberCount >= ladder_count) {
				return interaction.editReply({
					content: `❌ **${ladder_name}** is full! (${currentMemberCount}/${ladder_count})`,
				});
			}

			const nextPosition = currentMemberCount + 1;

			// Insert or Reactivate member in ladder_members
			await db.query(
				`INSERT INTO ladder_members (ladder_id, discord_id, position, is_active)
				 VALUES ($1, $2, $3, TRUE)
				 ON CONFLICT (ladder_id, discord_id) 
				 DO UPDATE SET is_active = TRUE, position = EXCLUDED.position`,
				[ladder_id, discord_id, nextPosition],
			);

			await interaction.editReply({
				content: `✅ You joined **${ladder_name}** at spot **#${nextPosition}**!`,
			});
		}
		catch (error) {
			console.error('Error running /join:', error);
			await interaction.editReply({
				content:
					'❌ An error occurred while attempting to join the ladder.',
			});
		}
	},
};
