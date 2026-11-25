import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { resolveHouseholdId } from '../../common/http/household'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { InventoryService } from './inventory.service'

class CreateInventoryDto {
  @IsOptional() @IsString() householdId?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() ingredientName?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() categoryName?: string
  @IsOptional() @IsNumber() @Min(0) quantity?: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsString() emoji?: string
}

class UpdateInventoryDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsNumber() @Min(0) quantity?: number
  @IsOptional() @IsString() unit?: string
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.inventory.list(resolveHouseholdId(householdId, req.user), req.user.sub)
  }

  @Post()
  create(@Body() body: CreateInventoryDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.inventory.create({ ...body, householdId: resolveHouseholdId(body.householdId, req.user, queryId) }, req.user.sub)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateInventoryDto, @Req() req: any) {
    return this.inventory.update(id, body, req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.inventory.remove(id, req.user.sub)
  }
}
