import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RecipesService } from './recipes.service'

class RecipeIngredientDto {
  @IsString() ingredientName!: string
  @IsIn(['REQUIRED', 'OPTIONAL']) kind!: 'REQUIRED' | 'OPTIONAL'
  @IsNumber() @Min(0.001) amount!: number
  @IsString() unit!: string
  @IsOptional() @IsString() categoryName?: string
}
class RecipeStepDto {
  @IsString() instruction!: string
}
class CreateRecipeDto {
  @IsString() householdId!: string
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
  list(@Query('householdId') householdId: string, @Req() req: any) {
    return this.recipes.list(householdId, req.user.sub)
  }

  @Post()
  create(@Body() body: CreateRecipeDto, @Req() req: any) {
    return this.recipes.create(body, req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.recipes.remove(id, req.user.sub)
  }
}
