import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { LiveService } from './live.service'

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class LiveGateway {
  @WebSocketServer()
  server: Server

  constructor(
    private jwtService: JwtService,
    private liveService: LiveService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token
      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwtService.verify(token)
      client.data.userId = payload.sub
      client.data.role = payload.role
    } catch (error) {
      client.disconnect()
    }
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(client: Socket, data: { sessionId: string }) {
    const canJoin = await this.liveService.canJoinSession(
      data.sessionId,
      client.data.userId
    )
    
    if (canJoin) {
      client.join(data.sessionId)
      this.server.to(data.sessionId).emit('user-joined', {
        userId: client.data.userId
      })
    }
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(client: Socket, data: { sessionId: string; message: string }) {
    const filteredMessage = await this.liveService.filterMessage(data.message)
    
    this.server.to(data.sessionId).emit('chat-message', {
      userId: client.data.userId,
      message: filteredMessage,
      timestamp: new Date(),
    })
  }
}