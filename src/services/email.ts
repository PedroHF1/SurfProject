import nodemailer from 'nodemailer';
// import config from 'config';
import logger from '@src/logger';

export class EmailService {
  public async sendPasswordResetEmail(
    to: string,
    token: string
  ): Promise<void> {

    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST, 
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
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
