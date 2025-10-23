// Register Discord slash commands for Mythras Combat Bot
//
// Bot Permissions Required:
// - Read Messages/View Channels
// - Send Messages
// - Read Message History
// - Manage Messages
// - Use Slash Commands
//
// Invite URL with permissions:
// https://discord.com/api/oauth2/authorize?client_id=1430659486711812307&permissions=76864&scope=bot%20applications.commands

const APPLICATION_ID = "1430659486711812307";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

const commands = [
  {
    name: "combot",
    description: "Mythras combat management commands",
    options: [
      {
        name: "identify",
        description: "Link your character sheet to this channel",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "url",
            description: "URL to your character sheet",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "start-combat",
        description: "[GM Only] Start a new combat encounter",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "text",
            description: "Describe the combat encounter",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "initiative",
        description: "Roll initiative and join the combat",
        type: 1, // SUB_COMMAND
      },
      {
        name: "act",
        description: "Perform a combat action",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "text",
            description: "Describe your action and roll result",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "edit-act",
        description: "Edit/redo your last combat action",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "text",
            description: "Your new action and roll result",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "gm-info",
        description: "[GM Only] Update combat state",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "text",
            description: "GM instructions for state change",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "new-round",
        description: "Start a new combat round",
        type: 1, // SUB_COMMAND
      },
    ],
  },
];

async function registerCommands() {
  try {
    console.log("Registering Mythras combat commands...");

    const response = await fetch(
      `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register commands: ${error}`);
    }

    const data = await response.json();
    console.log("✅ Successfully registered commands:");
    console.log("  - /combot identify");
    console.log(
      "  - /combot start-combat [GM] (auto-ends any existing combat)"
    );
    console.log("  - /combot initiative");
    console.log("  - /combot act");
    console.log("  - /combot edit-act");
    console.log("  - /combot gm-info [GM]");
    console.log("  - /combot new-round");

    console.log("\nCommands are now available globally!");
  } catch (error) {
    console.error("Error registering commands:", error);
    process.exit(1);
  }
}

registerCommands();
