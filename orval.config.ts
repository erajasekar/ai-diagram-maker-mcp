import { defineConfig } from "orval";

export default defineConfig({
  admApi: {
    input: {
      target: "./apispec/adm-openapi.json",
    },
    output: {
      mode: "single",
      target: "./src/generated/adm-api.ts",
      schemas: "./src/generated/model",
      client: "fetch",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "./src/generated/custom-fetch.ts",
          name: "customFetch",
        },
      },
    },
  },
  admApiZod: {
    input: {
      target: "./apispec/adm-openapi.json",
    },
    output: {
      mode: "single",
      target: "./src/generated/adm-api.zod.ts",
      client: "zod",
    },
  },
});
