import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { generateCharacterId } from "~/util/id-gen";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mythras Star Wars Character Sheet" },
    { name: "description", content: "Character sheet for Mythras Star Wars RPG" },
  ];
}

export function loader() {
  const newId = generateCharacterId();
  return redirect(`${newId}`);
}

export default function Home() {
  return <></>;
}
