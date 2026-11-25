import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { IsBoolean, IsIn, IsString, Matches } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { NotificationsService } from './notifications.service'

class UpdateNotificationSettingDto {
  @IsString() householdId!: string
  @IsBoolean() enabled!: boolean
  @IsIn(['AUTO', 'MANUAL']) mode!: 'AUTO' | 'MANUAL'
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) preferredTime!: string
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('settings')
  get(@Query('householdId') householdId: string, @Req() req: any) {
    return this.notifications.getSettings(householdId, req.user.sub)
  }

  @Patch('settings')
  update(@Body() body: UpdateNotificationSettingDto, @Req() req: any) {
    return this.notifications.updateSettings(body, req.user.sub)
  }
}
