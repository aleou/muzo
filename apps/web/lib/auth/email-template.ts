/**
 * MUZO Email Template
 * Professional HTML email template with brand styling
 */

interface EmailTemplateParams {
  url: string;
  host: string;
  email: string;
}

export function getMuzoEmailTemplate({ url, host, email }: EmailTemplateParams): string {
  // Brand colors
  const brandColor = '#7c3aed'; // Primary purple
  const brandColorLight = '#a78bfa';
  const brandColorDark = '#6d28d9';
  const backgroundColor = '#f9fafb';
  const textColor = '#111827';
  const mutedTextColor = '#6b7280';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Connexion à MUZO</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * {
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${textColor};
      background-color: ${backgroundColor};
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: ${textColor};
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: ${mutedTextColor};
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(124, 58, 237, 0.4);
    }
    .alternative-link {
      margin-top: 30px;
      padding: 20px;
      background-color: ${backgroundColor};
      border-radius: 8px;
      border-left: 4px solid ${brandColor};
    }
    .alternative-link p {
      font-size: 14px;
      color: ${mutedTextColor};
      margin-bottom: 10px;
    }
    .alternative-link a {
      color: ${brandColor};
      word-break: break-all;
      font-size: 13px;
      text-decoration: none;
    }
    .footer {
      background-color: ${backgroundColor};
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      font-size: 14px;
      color: ${mutedTextColor};
      margin-bottom: 10px;
    }
    .footer-links {
      margin-top: 15px;
    }
    .footer-links a {
      color: ${brandColor};
      text-decoration: none;
      margin: 0 10px;
      font-size: 13px;
    }
    .security-notice {
      margin-top: 30px;
      padding: 15px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .security-notice p {
      font-size: 13px;
      color: #92400e;
      margin: 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .greeting {
        font-size: 20px;
      }
      .button {
        padding: 14px 30px;
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor}; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" style="box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="header">
              <div class="logo">MUZO</div>
              <p style="color: #ffffff; margin-top: 10px; font-size: 14px; opacity: 0.9;">
                Vos créations IA personnalisées
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              <h1 class="greeting">🎨 Connexion à votre espace</h1>
              
              <p class="message">
                Bonjour ! Vous avez demandé à vous connecter à votre compte MUZO avec l'adresse 
                <strong>${email}</strong>.
              </p>
              
              <p class="message">
                Cliquez sur le bouton ci-dessous pour accéder instantanément à votre espace client 
                et gérer vos créations IA personnalisées.
              </p>
              
              <!-- CTA Button -->
              <div class="button-container">
                <a href="${url}" class="button">
                  Se connecter à MUZO
                </a>
              </div>
              
              <!-- Alternative Link -->
              <div class="alternative-link">
                <p><strong>Le bouton ne fonctionne pas ?</strong></p>
                <p>Copiez et collez ce lien dans votre navigateur :</p>
                <a href="${url}">${url}</a>
              </div>
              
              <!-- Security Notice -->
              <div class="security-notice">
                <p>
                  <strong>🔒 Sécurité :</strong> Ce lien est valable pendant 24 heures et ne peut être utilisé qu'une seule fois. 
                  Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p class="footer-text">
                Cet email a été envoyé depuis <strong>${host}</strong>
              </p>
              <p class="footer-text">
                © ${new Date().getFullYear()} MUZO. Tous droits réservés.
              </p>
              <div class="footer-links">
                <a href="${host}">Accueil</a>
                <span style="color: #d1d5db;">•</span>
                <a href="${host}/dashboard">Mon espace</a>
                <span style="color: #d1d5db;">•</span>
                <a href="${host}#contact">Support</a>
              </div>
              <p style="font-size: 12px; color: ${mutedTextColor}; margin-top: 20px;">
                MUZO - Créations IA sur-mesure pour votre marque
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plain text version of the email for email clients that don't support HTML
 */
export function getMuzoEmailText({ url, host, email }: EmailTemplateParams): string {
  return `
Connexion à MUZO

Bonjour,

Vous avez demandé à vous connecter à votre compte MUZO avec l'adresse ${email}.

Cliquez sur le lien ci-dessous pour accéder à votre espace client :
${url}

Ce lien est valable pendant 24 heures et ne peut être utilisé qu'une seule fois.

Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.

---
Cet email a été envoyé depuis ${host}
© ${new Date().getFullYear()} MUZO. Tous droits réservés.
  `.trim();
}
