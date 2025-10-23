// Main bot file with integrated rules engine
import { Hono } from "hono";
import { handle, streamHandle } from "hono/aws-lambda";
import {
  InteractionResponseType,
  InteractionResponseFlags,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { DynamoDB } from "itty-aws/dynamodb";
import { Credentials } from "itty-aws/credentials";
import { DefaultCredentials } from "itty-aws/credential.service";
import { Effect, Schedule, Random } from "effect";

// Import rules engine
import { rulesEngine, type EnhancedCombatState } from "./rules";
import {
  createCombatEncounter,
  formatEnhancedRoundTracker,
} from "./commands/start-combat-v2";
import { processActV2 } from "./commands/act-v2";
import { processEditActV2 } from "./commands/edit-act-v2";

// Environment variables
const TOKEN = process.env.DISCORD_BOT_TOKEN!;
const PUBLIC_KEY =
  "e3da1cbddbda61bb443c7eabd6af1e9e2fbb999a816a6366d8cfdd14bbcdb476";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DISCORD_APP_ID = "1430659486711812307";
const GM_USER_ID = "123743747052666880";
const AWS_REGION = "eu-west-1";

// Initialize DynamoDB client
const ddb = new DynamoDB({
  region: AWS_REGION,
});

// Create Hono app
const app = new Hono();

// Discord API helpers
async function discordApiRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Discord API error on ${path}:`, error);
    console.error("Request options:", options);
    throw new Error(`Discord API error: ${error}`);
  }

  return response.json();
}

async function editMessage(
  channelId: string,
  messageId: string,
  content: string,
  embeds?: any[]
): Promise<any> {
  return discordApiRequest(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content, embeds }),
  });
}

async function sendMessage(
  channelId: string,
  content: string,
  embeds?: any[]
): Promise<any> {
  return discordApiRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, embeds }),
  });
}

async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<any> {
  return discordApiRequest(`/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

async function editOriginalResponse(
  interactionToken: string,
  content: string,
  embeds?: any[]
): Promise<any> {
  return discordApiRequest(
    `/webhooks/${DISCORD_APP_ID}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      body: JSON.stringify({ content, embeds }),
    }
  );
}

async function sendFollowUp(
  interactionToken: string,
  data: { content: string; embeds?: any[]; flags?: number }
): Promise<any> {
  return discordApiRequest(`/webhooks/${DISCORD_APP_ID}/${interactionToken}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Replace placeholder mentions in content
function applyMentionsToContent(content: string): string {
  if (!content) return content;
  return content.replace("@GM", `<@${GM_USER_ID}>`);
}

// Gemini AI integration with system prompts
async function callGemini(
  prompt: string,
  roll?: number,
  schema?: any,
  systemPrompt?: string
): Promise<any> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const fullPrompt =
    roll !== undefined
      ? `${prompt}\n\nIMPORTANT: Use this exact d100 roll result for any enemy defense rolls: ${roll}`
      : prompt;

  const body: any = {
    contents: [
      {
        parts: [{ text: fullPrompt }],
      },
    ],
  };

  // Add system instruction if provided
  if (systemPrompt) {
    body.system_instruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  // Add structured output if schema provided
  if (schema) {
    body.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema,
    };
  }

  // Define the models to try in order
  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];

  // Create an effect that tries each model with retries
  const tryModel = (model: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": GEMINI_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Gemini API error (${model}): ${error}`);
        }

        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // If structured output, parse JSON, otherwise return raw text
        if (schema && result) {
          try {
            return JSON.parse(result);
          } catch {
            return result;
          }
        }

        return result || "No response";
      },
      catch: (error) => new Error(String(error)),
    });

  // Try each model with exponential backoff + jitter
  const retrySchedule = Schedule.exponential("100 millis", 2).pipe(
    Schedule.jittered,
    Schedule.compose(Schedule.recurs(2)) // Max 2 retries per model
  );

  // Try each model in sequence
  const tryAllModels = models.reduce<Effect.Effect<any, Error, never>>(
    (prev, model) => {
      return Effect.orElse(prev, () => {
        console.log(`Trying Gemini model: ${model}`);
        return tryModel(model).pipe(Effect.retry(retrySchedule));
      });
    },
    Effect.fail(new Error("No models configured"))
  );

  try {
    return await Effect.runPromise(tryAllModels);
  } catch (error) {
    console.error("All Gemini models failed:", error);
    // Return a fallback response
    return schema ? { description: "AI unavailable" } : "AI unavailable";
  }
}

// Combat state management with DynamoDB
async function getCombatState(
  channelId: string
): Promise<EnhancedCombatState | null> {
  const result = await Effect.runPromise(
    ddb
      .getItem({
        TableName: "combot",
        Key: { id: { S: `combat_${channelId}` } },
      })
      .pipe(Effect.provideService(Credentials, DefaultCredentials))
  );

  if (!result.Item?.state?.S) return null;
  return JSON.parse(result.Item.state.S) as EnhancedCombatState;
}

async function saveCombatState(state: EnhancedCombatState): Promise<void> {
  await Effect.runPromise(
    ddb
      .putItem({
        TableName: "combot",
        Item: {
          id: { S: `combat_${state.channelId}` },
          state: { S: JSON.stringify(state) },
        },
      })
      .pipe(Effect.provideService(Credentials, DefaultCredentials))
  );
}

async function deleteCombatState(channelId: string): Promise<void> {
  await Effect.runPromise(
    ddb
      .deleteItem({
        TableName: "combot",
        Key: { id: { S: `combat_${channelId}` } },
      })
      .pipe(Effect.provideService(Credentials, DefaultCredentials))
  );
}

async function saveCharacterMapping(
  userId: string,
  channelId: string,
  url: string
): Promise<void> {
  await Effect.runPromise(
    ddb
      .putItem({
        TableName: "combot",
        Item: {
          id: { S: `char_${userId}_${channelId}` },
          url: { S: url },
        },
      })
      .pipe(Effect.provideService(Credentials, DefaultCredentials))
  );
}

async function getCharacterUrl(
  userId: string,
  channelId: string
): Promise<string | null> {
  const result = await Effect.runPromise(
    ddb
      .getItem({
        TableName: "combot",
        Key: { id: { S: `char_${userId}_${channelId}` } },
      })
      .pipe(Effect.provideService(Credentials, DefaultCredentials))
  );

  return result.Item?.url?.S || null;
}

async function fetchCharacterData(url: string): Promise<any> {
  try {
    console.log("Debug: Fetching character data from:", `${url}/json`);
    const response = await fetch(`${url}/json`);
    if (!response.ok) {
      console.log(
        "Debug: Failed to fetch character data, status:",
        response.status
      );
      return null;
    }
    const data = await response.json();
    console.log("Debug: Raw character data structure:", {
      hasSuccess: "success" in data,
      hasData: "data" in data,
      hasCharacterData: data.data?.characterData ? true : false,
      topLevelKeys: Object.keys(data),
    });
    // Handle wrapped response format
    if (data.success && data.data?.characterData) {
      const characterData = data.data.characterData;
      console.log(
        "Debug: Using wrapped characterData, skills count:",
        characterData.skills?.length
      );
      return characterData;
    }
    console.log("Debug: Using raw data, skills count:", data.skills?.length);
    return data;
  } catch (error) {
    console.error("Debug: Error fetching character data:", error);
    return null;
  }
}

// Roll dice functions
function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

function rollD10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

// Command handlers
async function handleIdentify(interaction: any): Promise<any> {
  const user = interaction.member?.user || interaction.user;
  const channel_id = interaction.channel_id;
  let url = interaction.data.options[0].options.find(
    (opt: any) => opt.name === "url"
  )?.value;

  if (!url) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Please provide a character sheet URL!",
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    };
  }

  // Clean up the URL
  // Remove hash and everything after it
  url = url.split("#")[0];
  // Remove trailing slashes
  url = url.replace(/\/+$/, "");

  // Basic validation
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "❌ Please provide a valid URL starting with http:// or https://",
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    };
  }

  await saveCharacterMapping(user.id, channel_id, url);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ Character sheet linked for ${user.username}!\nStored URL: ${url}`,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  };
}

async function handleStartCombat(interaction: any): Promise<any> {
  const user = interaction.member?.user || interaction.user;

  if (user.id !== GM_USER_ID) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Only the GM can start combat!",
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    };
  }

  // Defer for long-running Gemini operation
  processStartCombatCommand(interaction).catch((error) => {
    console.error("Failed to start combat:", error);
  });

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  };
}

async function processStartCombatCommand(interaction: any): Promise<void> {
  try {
    const channel_id = interaction.channel_id;
    const text = interaction.data.options[0].options.find(
      (opt: any) => opt.name === "text"
    )?.value;

    // Delete any existing combat state first
    await deleteCombatState(channel_id);

    // Create combat encounter using rules engine
    const state = await createCombatEncounter(text, channel_id, callGemini);

    // Save state
    await saveCombatState(state);

    // Format and send the round tracker
    const tracker = formatEnhancedRoundTracker(state);

    // Edit the original deferred response
    const response = await editOriginalResponse(
      interaction.token,
      applyMentionsToContent(tracker.content),
      tracker.embeds
    );

    // Save the message ID for future updates
    if (response?.id) {
      state.messageId = response.id;
      await saveCombatState(state);
    }
  } catch (error) {
    console.error("Error in processStartCombatCommand:", error);
    // Always respond to avoid "thinking" state
    try {
      await editOriginalResponse(
        interaction.token,
        "❌ Failed to start combat. Please try again.\nError: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } catch (followUpError) {
      console.error("Failed to send error response:", followUpError);
    }
  }
}

async function handleInitiative(interaction: any): Promise<any> {
  // Defer as ephemeral and process asynchronously
  processInitiativeCommand(interaction).catch((error) => {
    console.error("Failed to process initiative:", error);
  });

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  };
}

async function processInitiativeCommand(interaction: any): Promise<void> {
  try {
    const user = interaction.member?.user || interaction.user;
    const channel_id = interaction.channel_id;

    const state = await getCombatState(channel_id);
    if (!state) {
      await editOriginalResponse(
        interaction.token,
        "❌ No active combat in this channel!"
      );
      return;
    }

    // Check if already in initiative
    if (state.initiative.find((p) => p.userId === user.id)) {
      await editOriginalResponse(
        interaction.token,
        "You're already in the initiative order!"
      );
      return;
    }

    // Get character data
    const charUrl = await getCharacterUrl(user.id, channel_id);
    const charData = charUrl ? await fetchCharacterData(charUrl) : null;
    const name = charData?.name || user.username;

    // Roll initiative
    const roll = rollD10();
    const bonus = Math.floor((charData?.characteristics?.int || 10) / 10);
    const total = roll + bonus;

    // Add to initiative
    state.initiative.push({
      userId: user.id,
      name,
      roll: total,
      actionPoints: 2,
      maxActionPoints: 2,
    });

    // Sort by initiative
    state.initiative.sort((a, b) => b.roll - a.roll);

    // Log to show in tracker
    state.log.push(
      `🎲 ${name} rolled **${total}** for initiative! (${roll} + ${bonus})`
    );

    await saveCombatState(state);

    // Post a fresh summary message (bump to bottom) and delete previous tracker if any
    try {
      const tracker = formatEnhancedRoundTracker(state);
      const newMsg = await sendMessage(
        channel_id,
        tracker.content,
        tracker.embeds
      );
      if (state.messageId) {
        try {
          await deleteMessage(channel_id, state.messageId);
        } catch (delErr) {
          console.error("Failed to delete previous tracker:", delErr);
        }
      }
      state.messageId = newMsg.id;
      await saveCombatState(state);
    } catch (error) {
      console.error("Failed to update round tracker after initiative:", error);
    }

    // Delete ephemeral original on success
    try {
      await discordApiRequest(
        `/webhooks/${DISCORD_APP_ID}/${interaction.token}/messages/@original`,
        { method: "DELETE" }
      );
    } catch (deleteError) {
      console.error(
        "Failed to delete ephemeral initiative response:",
        deleteError
      );
      await editOriginalResponse(interaction.token, "✓");
    }
  } catch (error) {
    console.error("Error in processInitiativeCommand:", error);
    try {
      await editOriginalResponse(
        interaction.token,
        "❌ Failed to roll initiative. Please try again."
      );
    } catch (responseError) {
      console.error("Failed to send initiative error response:", responseError);
    }
  }
}

async function handleAct(interaction: any): Promise<any> {
  // Defer for long-running operation (ephemeral)
  processActCommand(interaction).catch((error) => {
    console.error("Failed to process act:", error);
  });

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  };
}

async function handleEditAct(interaction: any): Promise<any> {
  // Defer for long-running operation (ephemeral)
  processEditActCommand(interaction).catch((error) => {
    console.error("Failed to process edit-act:", error);
  });

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  };
}

async function processActCommand(interaction: any): Promise<void> {
  console.log(
    "processActCommand called with text:",
    interaction.data.options?.[0]?.options?.find(
      (opt: any) => opt.name === "text"
    )?.value
  );
  try {
    const user = interaction.member?.user || interaction.user;
    const channel_id = interaction.channel_id;
    const actionText = interaction.data.options[0].options.find(
      (opt: any) => opt.name === "text"
    )?.value;
    console.log(
      "Action text:",
      actionText,
      "User:",
      user?.id,
      "Channel:",
      channel_id
    );

    const state = await getCombatState(channel_id);
    if (!state) {
      await editOriginalResponse(interaction.token, "❌ No active combat!");
      return;
    }

    // Check if user is in initiative
    const playerInInitiative = state.initiative.find(
      (p) => p.userId === user.id
    );
    if (!playerInInitiative) {
      await editOriginalResponse(
        interaction.token,
        "❌ You need to roll initiative first! Use `/combot initiative`"
      );
      return;
    }

    // Get character data
    console.log("Getting character URL for user:", user.id);
    const charUrl = await getCharacterUrl(user.id, channel_id);
    console.log("Character URL:", charUrl);
    const charData = charUrl ? await fetchCharacterData(charUrl) : null;
    console.log("Character data loaded:", !!charData);

    // Process action using rules engine
    console.log("Calling processActV2...");
    const result = await processActV2(
      interaction,
      actionText,
      state,
      charData,
      callGemini
    );
    console.log("processActV2 result:", result);

    // Save updated state
    await saveCombatState(result.updatedState);

    // Update round tracker - if pending actions exist, don't bump; just edit in place
    try {
      const tracker = formatEnhancedRoundTracker(result.updatedState);
      const hasPending =
        (result.updatedState.pendingActions &&
          result.updatedState.pendingActions.length > 0) ||
        result.updatedState.initiative.some((p) => !!p.pendingAction);

      if (hasPending && result.updatedState.messageId) {
        await editMessage(
          channel_id,
          result.updatedState.messageId,
          applyMentionsToContent(tracker.content),
          tracker.embeds
        );
      } else {
        const newMsg = await sendMessage(
          channel_id,
          applyMentionsToContent(tracker.content),
          tracker.embeds
        );
        if (result.updatedState.messageId) {
          try {
            await deleteMessage(channel_id, result.updatedState.messageId);
          } catch (delErr) {
            console.error("Failed to delete previous tracker:", delErr);
          }
        }
        // Save new message id
        result.updatedState.messageId = newMsg.id;
      }
      await saveCombatState(result.updatedState);
    } catch (error) {
      console.error("Failed to update round tracker:", error);
    }

    // Always show the blow-by-blow in the ephemeral response for this command
    await editOriginalResponse(interaction.token, result.message);
  } catch (error) {
    console.error("Error in processActCommand:", error);
    // Edit the deferred message to show error (already ephemeral)
    try {
      await editOriginalResponse(
        interaction.token,
        "❌ Failed to process action. Please try again."
      );
    } catch (responseError) {
      console.error("Failed to send error response:", responseError);
    }
  }
}

async function processEditActCommand(interaction: any): Promise<void> {
  try {
    const user = interaction.member?.user || interaction.user;
    const channel_id = interaction.channel_id;
    const actionText = interaction.data.options[0].options.find(
      (opt: any) => opt.name === "text"
    )?.value;

    const state = await getCombatState(channel_id);
    if (!state) {
      await editOriginalResponse(interaction.token, "❌ No active combat!");
      return;
    }

    // Check if user is in initiative
    const playerInInitiative = state.initiative.find(
      (p) => p.userId === user.id
    );
    if (!playerInInitiative) {
      await editOriginalResponse(
        interaction.token,
        "❌ You need to roll initiative first! Use `/combot initiative`"
      );
      return;
    }

    // Get character data
    console.log("Getting character URL for user:", user.id);
    const charUrl = await getCharacterUrl(user.id, channel_id);
    console.log("Character URL:", charUrl);
    const charData = charUrl ? await fetchCharacterData(charUrl) : null;
    console.log("Character data loaded:", !!charData);
    // Process edit action using rules engine (unwinds previous action)
    const result = await processEditActV2(
      interaction,
      actionText,
      state,
      charData,
      callGemini
    );

    // Save updated state
    await saveCombatState(result.updatedState);

    // Update round tracker - if pending actions exist, don't bump; just edit in place
    try {
      const tracker = formatEnhancedRoundTracker(result.updatedState);
      const hasPending =
        (result.updatedState.pendingActions &&
          result.updatedState.pendingActions.length > 0) ||
        result.updatedState.initiative.some((p) => !!p.pendingAction);

      if (hasPending && result.updatedState.messageId) {
        await editMessage(
          channel_id,
          result.updatedState.messageId,
          applyMentionsToContent(tracker.content),
          tracker.embeds
        );
      } else {
        const newMsg = await sendMessage(
          channel_id,
          applyMentionsToContent(tracker.content),
          tracker.embeds
        );
        if (result.updatedState.messageId) {
          try {
            await deleteMessage(channel_id, result.updatedState.messageId);
          } catch (delErr) {
            console.error("Failed to delete previous tracker:", delErr);
          }
        }
        // Save new message id
        result.updatedState.messageId = newMsg.id;
      }
      await saveCombatState(result.updatedState);
    } catch (error) {
      console.error("Failed to update round tracker:", error);
    }

    // Always show the blow-by-blow in the ephemeral response for this command
    await editOriginalResponse(interaction.token, result.message);
  } catch (error) {
    console.error("Error in processEditActCommand:", error);
    // Edit the deferred message to show error (already ephemeral)
    try {
      await editOriginalResponse(
        interaction.token,
        "❌ Failed to edit action. Please try again."
      );
    } catch (responseError) {
      console.error("Failed to send error response:", responseError);
    }
  }
}

async function handleNewRound(interaction: any): Promise<any> {
  const channel_id = interaction.channel_id;

  const state = await getCombatState(channel_id);
  if (!state) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ No active combat in this channel!",
        flags: InteractionResponseFlags.EPHEMERAL,
      },
    };
  }

  // Increment round
  state.round++;

  // Reset action points
  state.initiative.forEach((p) => {
    p.actionPoints = p.maxActionPoints;
  });
  state.enemies.forEach((e) => {
    e.actionPoints = e.maxActionPoints;
  });

  // Reset current turn
  state.currentTurn = 0;

  await saveCombatState(state);

  // Create new round tracker
  const tracker = formatEnhancedRoundTracker(state);
  const message = await sendMessage(
    channel_id,
    applyMentionsToContent(tracker.content),
    tracker.embeds
  );
  state.messageId = message.id;
  await saveCombatState(state);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `🔄 **Round ${state.round} begins!**`,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  };
}

// Main handler
app.post("/interactions", async (c) => {
  console.log("=== Discord interaction received ===");
  const signature = c.req.header("X-Signature-Ed25519");
  const timestamp = c.req.header("X-Signature-Timestamp");
  const body = await c.req.text();
  console.log("Body length:", body.length);

  // Validate required headers exist
  if (!signature || !timestamp) {
    console.error("Missing signature or timestamp headers");
    return c.text("Unauthorized", 401);
  }

  // Validate PUBLIC_KEY is set
  if (!PUBLIC_KEY) {
    console.error("DISCORD_PUBLIC_KEY environment variable is not set!");
    return c.text("Server configuration error", 500);
  }

  // Verify Discord signature
  try {
    const isValidRequest = await verifyKey(
      body,
      signature,
      timestamp,
      PUBLIC_KEY
    );
    if (!isValidRequest) {
      console.error("Invalid request signature");
      return c.text("Bad request signature", 401);
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    return c.text("Bad request signature", 401);
  }

  const interaction = JSON.parse(body);
  console.log(
    "Interaction type:",
    interaction.type,
    "Command:",
    interaction.data?.name
  );

  // Handle ping
  if (interaction.type === InteractionType.PING) {
    console.log("Responding to PING");
    return c.json({ type: InteractionResponseType.PONG });
  }

  // Handle commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;
    console.log(
      "Handling command:",
      name,
      "Subcommand:",
      interaction.data.options?.[0]?.name
    );

    if (name === "combot") {
      const subcommand = interaction.data.options[0].name;

      switch (subcommand) {
        case "identify":
          return c.json(await handleIdentify(interaction));
        case "start-combat":
          return c.json(await handleStartCombat(interaction));
        case "initiative":
          return c.json(await handleInitiative(interaction));
        case "act":
          console.log("Processing act command...");
          return c.json(await handleAct(interaction));
        case "edit-act":
          return c.json(await handleEditAct(interaction));
        case "new-round":
          return c.json(await handleNewRound(interaction));
        default:
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "Unknown command!" },
          });
      }
    }
  }

  return c.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "Unknown interaction type!" },
  });
});

// Export handler for Lambda with response streaming
export const handler = import.meta.main ? handle(app) : streamHandle(app);

// For local development
if (import.meta.main) {
  Bun.serve({
    port: process.env.PORT || 3000,
    fetch: app.fetch,
  });
  console.log(`Server running on port ${process.env.PORT || 3000}`);
}
