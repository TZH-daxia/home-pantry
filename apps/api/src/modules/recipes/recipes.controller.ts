import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { resolveHouseholdId } from '../../common/http/household'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RecipesService } from './recipes.service'

class RecipeIngredientDto {
  @IsString() ingredientName!: string
  @IsIn(['required', 'optional', 'REQUIRED', 'OPTIONAL']) kind!: string
  @IsNumber() @Min(0.001) amount!: number
  @IsString() unit!: string
  @IsOptional() @IsString() categoryName?: string
}
class RecipeStepDto {
  @IsString() instruction!: string
}
class CreateRecipeDto {
  @IsOptional() @IsString() householdId?: string
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @IsInt() @Min(1) difficulty!: number
  @IsOptional() @IsInt() prepMinutes?: number
  @IsOptional() @IsInt() cookMinutes?: number
  @IsOptional() @IsString() emoji?: string
  @IsOptional() @IsString() theme?: string
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RecipeIngredientDto) ingredients!: RecipeIngredientDto[]
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RecipeStepDto) steps?: RecipeStepDto[]
}

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list(@Query('householdId') householdId: string | undefined, @Req() req: any) {
    return this.recipes.list(resolveHouseholdId(householdId, req.user), req.user.sub)
  }

  @Post()
  create(@Body() body: CreateRecipeDto, @Query('householdId') queryId: string | undefined, @Req() req: any) {
    return this.recipes.create({ ...body, householdId: resolveHouseholdId(body.householdId, req.user, queryId) }, req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.recipes.remove(id, req.user.sub)
  }
}
