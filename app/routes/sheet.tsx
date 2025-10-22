import type { Route } from "./+types/home";
import MythrasCharacterSheet from "~/components/Sheet";
import { useParams } from "react-router";

export function meta({ matches }: Route.MetaArgs) {
  const charData = matches.filter((x) => x?.id == "routes/sheet")[0];
  // @ts-ignore
  const name = charData?.data?.info?.name;
  if (!charData || !name) {
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
  // @ts-ignore
  const image = await dObj.getImage();
  
  return {
    characterData,
    image,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  
  const durableObjectId = context.cloudflare.env.SHEET_STORE.idFromName(
    (params as any).id || ""
  );
  const dObj = context.cloudflare.env.SHEET_STORE.get(durableObjectId);
  
  if (action === 'saveImage') {
    const imageData = formData.get('imageData') as string;
    // @ts-ignore
    await dObj.saveImage(imageData);
    return { success: true, type: 'image' };
  } else if (action === 'getHistory') {
    // @ts-ignore
    const history = await dObj.getVersionHistory();
    return { history };
  } else if (action === 'getVersion') {
    const versionId = parseInt(formData.get('versionId') as string);
    // @ts-ignore
    const version = await dObj.getVersion(versionId);
    return { version };
  } else {
    // Default save character data
    const data = JSON.parse(formData.get('data') as string);
    await dObj.saveData(data);
    return { success: true, type: 'character' };
  }
}

export default function Sheet({ loaderData }: Route.ComponentProps) {
  const { id } = useParams();
  return <MythrasCharacterSheet key={id} initialData={loaderData?.characterData} initialImage={loaderData?.image} />;
}
