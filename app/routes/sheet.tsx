import type { Route } from "./+types/home";
import MythrasCharacterSheet from "~/components/Sheet";
import { useParams } from "react-router";

export function meta({ matches }: Route.MetaArgs) {
  const route = matches.find((x) => x?.id === "routes/sheet");
  const data: any = route?.data;
  const name = data?.characterData?.info?.name;
  if (!data || !name) {
    return [
      { title: "New Character" },
      { name: "description", content: "New Mythras Star Wars character!" },
    ];
  }
  return [
    { title: `${name} - Mythras SW` },
    {
      name: "description",
      content: `Mythras Star Wars character sheet for ${name}`,
    },
  ];
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const durableObjectId = context.cloudflare.env.SHEET_STORE.idFromName(
    (params as any).id || ""
  );
  const dObj = context.cloudflare.env.SHEET_STORE.get(durableObjectId);
  // @ts-ignore
  const characterData = await dObj.getLatestData();

  // Get image from R2
  let image = null;
  try {
    const imageObject = await context.cloudflare.env.CHARACTER_IMAGES.get(
      params.id
    );
    if (imageObject) {
      const arrayBuffer = await imageObject.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      image = `data:${imageObject.httpMetadata?.contentType || "image/jpeg"};base64,${base64}`;
    }
  } catch (e) {
    console.error("Error loading image from R2:", e);
  }

  return {
    characterData,
    image,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");

  const durableObjectId = context.cloudflare.env.SHEET_STORE.idFromName(
    (params as any).id || ""
  );
  const dObj = context.cloudflare.env.SHEET_STORE.get(durableObjectId);

  if (action === "saveImage") {
    const imageData = formData.get("imageData") as string;

    // Extract the base64 data and content type
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const contentType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Save to R2 (overwrites if exists)
      await context.cloudflare.env.CHARACTER_IMAGES.put(params.id, bytes, {
        httpMetadata: {
          contentType: contentType,
        },
      });
    }

    return { success: true, type: "image" };
  } else if (action === "getHistory") {
    // @ts-ignore
    const history = await dObj.getVersionHistory();
    return { history };
  } else if (action === "getVersion") {
    const versionId = parseInt(formData.get("versionId") as string);
    // @ts-ignore
    const version = await dObj.getVersion(versionId);
    return { version };
  } else {
    // Default save character data
    const data = JSON.parse(formData.get("data") as string);
    await dObj.saveData(data);
    return { success: true, type: "character" };
  }
}

export default function Sheet({ loaderData }: Route.ComponentProps) {
  const { id } = useParams();
  return (
    <MythrasCharacterSheet
      key={id}
      initialData={loaderData?.characterData}
      initialImage={loaderData?.image}
    />
  );
}
