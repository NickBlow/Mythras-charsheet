import type { RouteConfig } from "@react-router/dev/routes";
import { route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/:id/json", "routes/sheet.json.tsx"),
  route("/:id", "routes/sheet.tsx"),
] satisfies RouteConfig;
