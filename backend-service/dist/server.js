"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const app_1 = __importDefault(require("./app"));
const env_1 = __importDefault(require("./lib/env"));
const PORT = env_1.default.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
