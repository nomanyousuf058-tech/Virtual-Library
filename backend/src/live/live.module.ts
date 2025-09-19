import { Module } from '@nestjs/common'
import { LiveGateway } from './live.gateway'
import { LiveService } from './live.service'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [AuthModule, UsersModule, JwtModule],
  providers: [LiveGateway, LiveService],
  exports: [LiveService],
})
export class LiveModule {}