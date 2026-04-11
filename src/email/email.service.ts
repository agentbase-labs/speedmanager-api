import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class EmailService {
  private readonly fromEmail = process.env.JONI_EMAIL_ADDRESS || 'moshiko-staging@agent.joni.ai';

  async sendWelcomeEmail(to: string, username: string) {
    const subject = 'Welcome to Speed Manager! ⚽';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Inter, Arial, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; padding: 40px; background: #1a1a1a; border-radius: 16px; }
          .logo { font-size: 32px; font-weight: 900; color: #00ff88; margin-bottom: 24px; }
          h1 { font-size: 28px; margin: 0 0 16px 0; }
          p { font-size: 16px; line-height: 1.6; color: #cccccc; margin: 16px 0; }
          .cta-button { display: inline-block; background: #00ff88; color: #0a0a0a; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 24px 0; }
          .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #333; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">⚡ SPEED MANAGER</div>
          <h1>Welcome aboard, ${username}! 🎉</h1>
          <p>You're now part of the fastest-growing football management game. Your journey to become a legendary manager starts now!</p>
          
          <h2 style="font-size: 20px; margin-top: 32px;">🎁 Starting Bonuses:</h2>
          <ul style="line-height: 1.8; font-size: 16px;">
            <li>💰 <strong>1,000 Coins</strong> to build your team</li>
            <li>⭐ Your first <strong>player pack</strong> waiting</li>
            <li>🏆 Entry into the <strong>Global League</strong></li>
          </ul>

          <a href="https://speedmanagergame.com" class="cta-button">Start Playing Now</a>

          <h2 style="font-size: 20px; margin-top: 32px;">⚽ Quick Tips:</h2>
          <ul style="line-height: 1.8; font-size: 16px;">
            <li>Build your dream team from over 50 legendary players</li>
            <li>Make split-second decisions during live matches</li>
            <li>Compete in the league and climb the rankings</li>
            <li>Trade players and manage your budget wisely</li>
          </ul>

          <p style="margin-top: 32px;">Good luck, and may your team always score first! ⚡</p>

          <div class="footer">
            <p>Speed Manager - The future of football management</p>
            <p>Questions? Reply to this email anytime.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      // Use joni CLI to send email via agentmail skill
      const htmlEscaped = html.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const command = `joni message send-email --to "${to}" --from "${this.fromEmail}" --subject "${subject}" --html "${htmlEscaped}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      console.log(`📧 Email sent to ${to}: ${subject}`);
      return { success: true, stdout, stderr };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }
}
