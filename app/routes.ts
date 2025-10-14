import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("package/:name/:version", "routes/package.tsx"),
  route("get_patch/:name/:version", "routes/get_patch.ts"),
] satisfies RouteConfig;
