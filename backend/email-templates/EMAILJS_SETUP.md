# EmailJS Setup Guide for SyncOps

This guide explains how to configure EmailJS for sending OTP and invitation emails in SyncOps.

## Quick Start

1. Sign up at [emailjs.com](https://www.emailjs.com/)
2. Create an Email Service (Gmail, Outlook, etc.)
3. Create Email Templates (copy HTML from templates in this folder)
4. Get your API keys and add to `.env`

---

## 1. Create Email Service

1. Go to **Email Services** → **Add New Service**
2. Choose your email provider (Gmail recommended for testing)
3. Connect your email account
4. Note the **Service ID** (e.g., `service_syncops`)

---

## 2. Create OTP Email Template

### Template Settings

| Setting | Value |
|---------|-------|
| Template Name | `SyncOps OTP Verification` |
| Template ID | `template_otp` (or your choice) |

### Template Variables (to_email, otp_code, user_name, expiry_time, year, company_name, support_email)

Copy the HTML from `otp-email.html` in this folder and paste it into the EmailJS template editor.

**Important**: Replace the template variables with EmailJS syntax:
- `{{user_name}}` → `{{user_name}}` (keep same)
- `{{otp_code}}` → `{{otp_code}}`
- `{{expiry_time}}` → `{{expiry_time}}`
- `{{year}}` → `{{year}}`
- `{{support_email}}` → `{{support_email}}`

### Subject Line
```
Your SyncOps Verification Code is {{otp_code}}
```

---

## 3. Create Invitation Email Template

### Template Settings

| Setting | Value |
|---------|-------|
| Template Name | `SyncOps Team Invitation` |
| Template ID | `template_invite` (or your choice) |

### Template Variables

- `{{to_email}}` - Recipient email
- `{{inviter_name}}` - Name of person sending invite
- `{{organization_name}}` - Organization name
- `{{role}}` - Role (manager/employee)
- `{{invite_link}}` - Full acceptance URL
- `{{invite_token}}` - Short token code
- `{{year}}` - Current year
- `{{support_email}}` - Support email
- `{{company_name}}` - "SyncOps"
- `{{company_logo}}` - Logo URL

Copy the HTML from `invite-email.html` in this folder.

### Subject Line
```
{{inviter_name}} invited you to join {{organization_name}} on SyncOps
```

---

## 4. Get API Keys

1. Go to **Account** → **General**
2. Copy **Public Key** (starts with your user ID)
3. Go to **Account** → **Security** → **API Keys**
4. Generate **Private Key** (for server-side)

---

## 5. Environment Variables

Add to your `.env` file:

```env
# EmailJS Configuration
EMAILJS_SERVICE_ID=service_syncops
EMAILJS_TEMPLATE_ID_OTP=template_otp
EMAILJS_TEMPLATE_ID_INVITE=template_invite
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_PRIVATE_KEY=your_private_key_here

# Fast2SMS Configuration (for SMS OTP)
FAST2SMS_API_KEY=your_fast2sms_api_key_here

# Frontend URL (for invitation links)
FRONTEND_URL=http://localhost:5173
```

---

## 6. Template Design Features

### OTP Email Template
- 🎨 Modern gradient header (cyan → blue → violet)
- 🔢 Large, clear OTP code display
- ⏱️ Expiry time indicator
- 🔒 Security warning banner
- 📱 Mobile-responsive design
- 🌙 Professional dark/light aesthetic

### Invitation Email Template
- 🎉 Celebratory gradient header
- 👤 Inviter info with avatar
- 🏢 Organization name & role badge
- ✨ Feature highlights (3-column grid)
- 🎯 Large CTA button
- 🔢 Fallback invitation code
- 📱 Fully responsive

---

## 7. Testing in Development

In development mode (`NODE_ENV=development`):
- OTP emails are logged to console (not actually sent)
- Dev OTP is always `123456` (configurable via `DEV_OTP`)
- No EmailJS credits are used

To test actual email sending:
1. Set `NODE_ENV=production` temporarily
2. Use valid EmailJS credentials
3. Send to your own email address

---

## 8. Fast2SMS Setup (SMS)

1. Sign up at [fast2sms.com](https://www.fast2sms.com/)
2. Get API key from dashboard
3. Add balance for SMS credits
4. Add `FAST2SMS_API_KEY` to `.env`

### SMS Message Format
Messages are built in code (notificationService.js) with these templates:
- **Signup**: `{{otp}} is your SyncOps verification code for account creation. Valid for 10 minutes. Do not share this code with anyone.`
- **Login**: `{{otp}} is your SyncOps login verification code. Valid for 10 minutes. If you didn't request this, please ignore.`
- **Phone Verification**: `{{otp}} is your SyncOps phone verification code. Valid for 10 minutes.`

---

## Template Preview

To preview templates before configuring in EmailJS:
1. Open the HTML files in this folder in a browser
2. Replace template variables with sample data
3. Check responsive design (resize browser window)

---

## Troubleshooting

### Emails not sending?
- Check EmailJS service is connected
- Verify template IDs match `.env`
- Confirm API keys are correct
- Check EmailJS dashboard for errors

### SMS not sending?
- Verify Fast2SMS API key
- Check account has SMS credits
- Ensure phone number is 10 digits (without +91)
- Check Fast2SMS dashboard for delivery reports

### Template variables not working?
- Ensure variable names match exactly (case-sensitive)
- Check for typos in template configuration
- Verify variables are passed in code

---

## Support

- EmailJS Docs: https://www.emailjs.com/docs/
- Fast2SMS API Docs: https://docs.fast2sms.com/
- SyncOps Support: support@syncops.io
