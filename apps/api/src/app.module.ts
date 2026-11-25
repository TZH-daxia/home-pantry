import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { PrismaModule } from './common/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { RecipesModule } from './modules/recipes/recipes.module'
import { RecommendationsModule } from './modules/recommendations/recommendations.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { HistoryModule } from './modules/history/history.module'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, InventoryModule, RecipesModule, RecommendationsModule, NotificationsModule, HistoryModule, UsersModule],
  controllers: [AppController],
})
export class AppModule {}
