import express from "express";
import {
  requestPhoneOTPForLogin,
  sendPhoneOTP,
  verifyPhoneOTPForLogin,
  verifyPhoneOTPCode,
  verifySignupOTP,
  resendOTP,
} from "../controllers/otpController.js";

const router = express.Router();

// Public routes - Phone OTP only
router.post("/request-login-otp", requestPhoneOTPForLogin); // Request OTP for login (by email)
router.post("/send-phone", sendPhoneOTP);                   // Send OTP to specific phone
router.post("/verify-login", verifyPhoneOTPForLogin);       // Verify phone OTP and complete login
router.post("/verify-phone", verifyPhoneOTPCode);           // Verify phone OTP only
router.post("/verify-signup", verifySignupOTP);             // Verify phone OTP and complete signup
router.post("/resend", resendOTP);                          // Resend OTP to phone

export default router;
