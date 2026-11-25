import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Support both workspace commands (cwd=apps/api) and direct root-level startup.
const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../.env'),
]
const envPath = envCandidates.find((candidate) => existsSync(candidate))
if (envPath) config({ path: envPath })
import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  const port = Number(process.env.API_PORT || 3000)
  await app.listen(port, '0.0.0.0')
  console.log(`home-pantry API listening on http://localhost:${port}/api`)
}
void bootstrap()
