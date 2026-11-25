import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class AppController {
  @Get()
  health() {
    return { status: 'ok', service: 'home-pantry-api', timestamp: new Date().toISOString() }
  }
}
