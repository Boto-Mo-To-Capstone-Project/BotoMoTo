// prisma.config.ts
import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config(); // <-- make sure .env is loaded

export default defineConfig({
  schema: 'src/lib/db/schema.prisma',
});
