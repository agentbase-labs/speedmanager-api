import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(email: string, username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      username,
      password: hashedPassword,
    });

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(email, username).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    const payload = { sub: user.id, email: user.email, username: user.username };
    
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        coins: user.coins,
        stars: user.stars,
        rank: user.rank,
      },
      token: this.jwtService.sign(payload),
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, username: user.username };
    
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        coins: user.coins,
        stars: user.stars,
        rank: user.rank,
      },
      token: this.jwtService.sign(payload),
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
