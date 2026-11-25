import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { InventoryService } from './inventory.service'

class CreateInventoryDto {
  @IsString() householdId!: string
  @IsString() ingredientName!: string
  @IsString() categoryName!: string
  @IsNumber() @Min(0.001) quantity!: number
  @IsString() unit!: string
  @IsOptional() @IsString() emoji?: string
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query('householdId') householdId: string, @Req() req: any) {
    return this.inventory.list(householdId, req.user.sub)
  }

  @Post()
  create(@Body() body: CreateInventoryDto, @Req() req: any) {
    return this.inventory.create(body, req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.inventory.remove(id, req.user.sub)
  }
}
