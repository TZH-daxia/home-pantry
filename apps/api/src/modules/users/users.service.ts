import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, nickname: true, avatarKey: true, createdAt: true } })
    if (!user) throw new NotFoundException('用户不存在')
    return user
  }

  async updateProfile(userId: string, input: { nickname?: string; avatarKey?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...(input.nickname ? { nickname: input.nickname.trim() } : {}), ...(input.avatarKey ? { avatarKey: input.avatarKey } : {}) },
      select: { id: true, nickname: true, avatarKey: true, updatedAt: true },
    })
  }
}
