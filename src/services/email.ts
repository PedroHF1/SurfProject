import nodemailer from 'nodemailer';
import config from 'config';
import logger from '@src/logger';

export class EmailService {
  public async sendPasswordResetEmail(
    to: string,
    token: string
  ): Promise<void> {

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.EMAIL_HOST || config.get('email.host'), 
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || config.get('email.user'),
          pass: process.env.EMAIL_PASS || config.get('email.pass'),
        },
      });


      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: 'Redefinição de Senha',
        text: `Você está recebendo este e-mail porque você (ou outra pessoa) solicitou a redefinição da senha da sua conta.\n\n
        Por favor, clique no link a seguir ou cole-o no seu navegador para concluir o processo:\n\n
        https://wesurf.netlify.app/reset-password/${token}\n\n
        Se você não solicitou isso, ignore este e-mail e sua senha permanecerá inalterada.\n`,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}:`, error);
      logger.info(`Password reset token for ${to}: ${token}`);
    }
  }
}
