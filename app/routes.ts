import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("package/:name/:version", "routes/package.$name.$version.tsx"),
] satisfies RouteConfig;
