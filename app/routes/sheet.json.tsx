import type { Route } from "./+types/home";

// Resource route - only exports loader, no default component
export async function loader({ context, params }: Route.LoaderArgs) {
  const durableObjectId = context.cloudflare.env.SHEET_STORE.idFromName(
    (params as any).id || ""
  );
  const dObj = context.cloudflare.env.SHEET_STORE.get(durableObjectId);

  // @ts-ignore
  const characterData = await dObj.getLatestData();

  // Return the character data as JSON response (without image for cleaner payloads)
  return new Response(
    JSON.stringify(
      {
        success: true,
        data: {
          characterData,
          characterId: params.id,
        },
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Enable CORS for API access
      },
    }
  );
}
