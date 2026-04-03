import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/auth-schema";
import { db } from "./db";
import { BETTER_AUTH_URL, RESEND_API_KEY } from "$env/static/private";
import { testUtils } from "better-auth/plugins"
import { Resend } from 'resend';

const resend = new Resend(RESEND_API_KEY);
const html = (link:string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        /* Basic reset for email clients */
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8f9fa;
            color: #212529;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            border: 1px solid #dee2e6;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .btn-primary {
            background-color: #0d6efd;
            color: #ffffff !important;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 500;
            display: inline-block;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            margin-top: 20px;
        }
        .divider {
            border-top: 1px solid #dee2e6;
            margin: 25px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="text-align: center; padding-bottom: 20px;">
            <h2 style="margin: 0; color: #0d6efd;">Eduscend</h2>
        </div>

        <div class="card">
            <h3 style="margin-top: 0;">Password Reset Request</h3>
            <p>Hi there,</p>
            <p>We received a request to reset the password for your account. Click the button below to choose a new one:</p>
            
            <div style="text-align: center;">
                <a href="${link}" class="btn-primary">Reset Password</a>
            </div>

            <p style="font-size: 14px; color: #6c757d;">
                This link will expire in 60 minutes. If you didn't request a password reset, you can safely ignore this email.
            </p>

            <div class="divider"></div>

            <p style="font-size: 12px; color: #adb5bd;">
                If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:
                <br>
                <a href="${link}" style="color: #0d6efd;">${link}</a>
            </p>
        </div>

        <div class="footer">
            &copy; 2026 Eduscend <br>
        </div>
    </div>
</body>
</html>`
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: ['delivered@resend.dev'],
        subject: 'Reset your password',
        html: html(url)
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    }
  },
  plugins: [
    testUtils()
  ]
});
