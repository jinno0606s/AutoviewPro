import { run } from "./main.js"
import { createMockCtx } from "./mockCtx.js"

const ctx = createMockCtx()

run(ctx).then(console.log)

