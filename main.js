// main.js
const fs = require("node:fs");
const path = require("node:path");
const {
	Client,
	Collection,
	GatewayIntentBits,
	REST,
	Routes,
} = require("discord.js");
const { token, clientId, guildId } = require("./config.json");

// Ensure the logs directory exists
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true });
}

// Write console.log and console.error output directly to log files
const logStream = fs.createWriteStream(path.join(logDir, "bot.log"), {
	flags: "a",
});
const errorStream = fs.createWriteStream(path.join(logDir, "error.log"), {
	flags: "a",
});

const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
	const message = `[${new Date().toISOString()}] INFO: ${args.join(" ")}\n`;
	logStream.write(message);
	originalLog.apply(console, args);
};

console.error = function (...args) {
	const message = `[${new Date().toISOString()}] ERROR: ${args.join(" ")}\n`;
	errorStream.write(message);
	originalError.apply(console, args);
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. Setup Collection for slash commands
client.commands = new Collection();
const commandsToRegister = [];

// 2. Read the commands directory dynamically
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ("data" in command && "execute" in command) {
			// Save to client collection for executing later when used
			client.commands.set(command.data.name, command);
			// Save command JSON data to send to Discord's API
			commandsToRegister.push(command.data.toJSON());
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

// 3. Register/Sync commands with Discord API automatically on startup
const rest = new REST().setToken(token);

(async () => {
	try {
		console.log(
			`Started refreshing ${commandsToRegister.length} application (/) commands.`,
		);

		// Registers slash commands instantly to your specific test guild/server
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commandsToRegister },
		);

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`,
		);
	} catch (error) {
		console.error("Failed to register slash commands:", error);
	}
})();

// 4. Read and load event files (ready.js, interactionCreate.js, etc.)
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// 5. Log in to Discord
client.login(token);
