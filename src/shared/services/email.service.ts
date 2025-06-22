import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerService } from './logger.service';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('EmailService');
    this.initializeTransporter();
    this.verifyEmailConfig();
  }

  private initializeTransporter(): void {
    const emailHost = this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com';
    const emailPort = parseInt(this.configService.get<string>('EMAIL_PORT') || '587', 10);
    const emailSecure = this.configService.get<boolean>('EMAIL_SECURE') || false;
    
    let emailConfig: any;

    // Configuración específica para Gmail
    if (emailHost === 'smtp.gmail.com') {
      emailConfig = {
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASS'),
        },
      };
    } else {
      // Configuración genérica para otros servidores SMTP
      emailConfig = {
        host: emailHost,
        port: emailPort,
        secure: emailSecure,
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASS'),
        },
        tls: {
          rejectUnauthorized: false,
        },
      };
    }

    // Opciones de debug para desarrollo
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      emailConfig.debug = true;
      emailConfig.logger = true;
    }

    this.transporter = nodemailer.createTransport(emailConfig);
    
    this.logger.log(`Email service initialized with host: ${emailHost}:${emailPort}`);
  }

  private verifyEmailConfig(): void {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    
    if (!emailUser || !emailPass) {
      this.logger.warn('Email configuration incomplete. EMAIL_USER and EMAIL_PASS are required.');
      this.logger.warn('Password reset functionality will not work without proper email configuration.');
    } else {
      this.logger.log('Email configuration verified successfully');
    }
  }

  /**
   * Enviar email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Verificar configuración antes de enviar
      const emailUser = this.configService.get<string>('EMAIL_USER');
      const emailPass = this.configService.get<string>('EMAIL_PASS');
      
      if (!emailUser || !emailPass) {
        this.logger.error('Cannot send email: Email configuration is incomplete');
        return false;
      }

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM') || this.configService.get<string>('EMAIL_USER'),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      this.logger.debug(`Attempting to send email to: ${options.to}`);
      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      
      // Proporcionar información más específica sobre el error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('EAUTH')) {
        this.logger.error('Authentication failed. Check EMAIL_USER and EMAIL_PASS');
      } else if (errorMessage.includes('ECONNECTION')) {
        this.logger.error('Connection failed. Check EMAIL_HOST and EMAIL_PORT');
      } else if (errorMessage.includes('ETIMEDOUT')) {
        this.logger.error('Connection timeout. Check your internet connection');
      }
      
      return false;
    }
  }

  /**
   * Verificar conexión del servicio de email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection verification failed:', error);
      return false;
    }
  }

  /**
   * Generar template HTML para recuperación de contraseña
   */
  generatePasswordResetTemplate(userName: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - Biblioteca Escolar</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          }
          
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
          }
          
          .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(79, 70, 229, 0.4);
            background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
          }
          
          .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            position: relative;
          }
          
          .warning-box::before {
            content: '⚠️';
            position: absolute;
            top: -15px;
            left: 20px;
            background: #ffffff;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          
          .warning-title {
            color: #92400e;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 15px;
            margin-top: 10px;
          }
          
          .warning-list {
            color: #92400e;
            padding-left: 20px;
          }
          
          .warning-list li {
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .link-section {
            background: #f7fafc;
            border-radius: 15px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
          }
          
          .link-text {
            color: #4a5568;
            font-size: 14px;
            margin-bottom: 15px;
          }
          
          .manual-link {
            color: #4f46e5;
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
            padding: 10px;
            background: #ffffff;
            border-radius: 8px;
            display: inline-block;
            border: 1px solid #e2e8f0;
          }
          
          .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer-text {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer-text:last-child {
            margin-bottom: 0;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
            margin: 20px 0;
          }
          
          @media (max-width: 600px) {
            .email-container {
              margin: 10px;
              border-radius: 15px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .logo {
              font-size: 28px;
            }
            
            .title {
              font-size: 20px;
            }
            
            .reset-button {
              padding: 14px 30px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">📚 Biblioteca Escolar</div>
            <h1 class="title">Recuperación de Contraseña</h1>
            <p class="subtitle">Tu cuenta está a un paso de ser recuperada</p>
          </div>
          
          <div class="content">
            <p class="greeting">¡Hola <strong>${userName}</strong>! 👋</p>
            
            <p class="message">
              Hemos recibido una solicitud para restablecer tu contraseña en el Sistema de Gestión de Biblioteca Escolar. 
              Si fuiste tú quien realizó esta solicitud, puedes continuar con el proceso haciendo clic en el botón de abajo.
            </p>
            
            <div class="button-container">
              <a href="${resetLink}" class="reset-button">
                🔐 Restablecer Contraseña
              </a>
            </div>
            
            <div class="warning-box">
              <h3 class="warning-title">Información Importante</h3>
              <ul class="warning-list">
                <li>⏰ Este enlace es válido por 1 hora</li>
                <li>🔒 Si no solicitaste este cambio, puedes ignorar este email</li>
                <li>🛡️ Por seguridad, no compartas este enlace con nadie</li>
                <li>📧 Si tienes problemas, contacta al administrador del sistema</li>
              </ul>
            </div>
            
            <div class="link-section">
              <p class="link-text">
                <strong>¿El botón no funciona?</strong><br>
                Copia y pega el siguiente enlace en tu navegador:
              </p>
              <a href="${resetLink}" class="manual-link">${resetLink}</a>
            </div>
            
            <div class="divider"></div>
            
            <p class="message" style="text-align: center; font-size: 14px; color: #718096;">
              Este es un email automático del Sistema de Gestión de Biblioteca Escolar.<br>
              Por favor, no respondas a este mensaje.
            </p>
          </div>
          
          <div class="footer">
            <p class="footer-text">📚 Sistema de Gestión de Biblioteca Escolar</p>
            <p class="footer-text">🏫 Institución Educativa Luis Carlos Galán</p>
            <p class="footer-text">📧 Soporte: admin@biblioteca.edu.co</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
} 