const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('challenge')
		.setDescription('Challenge another player on a ladder')
		.addStringOption((option) =>
			option
				.setName('ladder_name')
				.setDescription('Enter the ladder name')
				.setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName('target')
				.setDescription('Select the player you want to challenge')
				.setRequired(true),
		),

	async execute(interaction) {
		await interaction.deferReply();

		const ladderName = interaction.options.getString('ladder_name');
		const defenderUser = interaction.options.getUser('target');
		const challengerId = interaction.user.id;

		if (defenderUser.id === challengerId) {
			return interaction.editReply({
				content: '❌ You cannot challenge yourself!',
			});
		}

		try {
			// Fetch ladder info
			const ladderRes = await db.query(
				'SELECT ladder_id, challenge_count FROM ladders WHERE ladder_name = $1 AND is_active = TRUE',
				[ladderName],
			);

			if (ladderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ Ladder **${ladderName}** was not found.`,
				});
			}

			const { ladder_id: ladderId, challenge_count: maxRange } =
				ladderRes.rows[0];

			// Fetch Challenger's position
			const challengerRes = await db.query(
				'SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE',
				[ladderId, challengerId],
			);

			if (challengerRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ You must join **${ladderName}** with \`/join\` before you can challenge anyone!`,
				});
			}

			const challengerPos = challengerRes.rows[0].position;

			// Fetch Defender's position
			const defenderRes = await db.query(
				'SELECT position FROM ladder_members WHERE ladder_id = $1 AND discord_id = $2 AND is_active = TRUE',
				[ladderId, defenderUser.id],
			);

			if (defenderRes.rows.length === 0) {
				return interaction.editReply({
					content: `❌ <@${defenderUser.id}> has not joined **${ladderName}** yet!`,
				});
			}

			const defenderPos = defenderRes.rows[0].position;

			// Validate range
			if (defenderPos >= challengerPos) {
				return interaction.editReply({
					content:
						'❌ You can only challenge players ranked higher than you!',
				});
			}

			if (challengerPos - defenderPos > maxRange) {
				return interaction.editReply({
					content: `❌ <@${defenderUser.id}> is ranked too far ahead (#${defenderPos})! Max range is **${maxRange}** ranks.`,
				});
			}

			// Create challenge
			await db.query(
				`INSERT INTO active_challenges (ladder_id, challenger_id, defender_id, status, created_at)
				 VALUES ($1, $2, $3, 'pending', $4)`,
				[ladderId, challengerId, defenderUser.id, Date.now()],
			);

			await interaction.editReply({
				content: `⚔️ **CHALLENGE ISSUED!** <@${challengerId}> (#${challengerPos}) has challenged <@${defenderUser.id}> (#${defenderPos}) on **${ladderName}**!`,
			});
		}
		catch (error) {
			console.error('Error running /challenge:', error);
			await interaction.editReply({
				content: '❌ An error occurred while creating the challenge.',
			});
		}
	},
};
