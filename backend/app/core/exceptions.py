"""Central application exception types and the uniform error envelope.

Every error the API returns has the shape:
    { "error": { "code", "message_en", "message_bn", "details" } }
Routers and services raise `AppError` subclasses; `main.py` registers the
handlers that turn them (and any unexpected exception) into that envelope.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import status


class AppError(Exception):
    """Base class for all application-raised HTTP errors.

    Attributes:
        status_code: HTTP status code to return.
        code: SNAKE_CASE machine-readable error code.
        message_en / message_bn: human-readable messages in both languages.
        details: optional structured extra context (never stack traces).
    """

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "BAD_REQUEST"
    message_en: str = "The request could not be processed."
    message_bn: str = "অনুরোধটি সম্পন্ন করা যায়নি।"

    def __init__(
        self,
        message_en: Optional[str] = None,
        message_bn: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> None:
        self.message_en = message_en or self.message_en
        self.message_bn = message_bn or self.message_bn
        self.details = details or {}
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        super().__init__(self.message_en)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message_en = "The requested resource was not found."
    message_bn = "অনুরোধকৃত রিসোর্সটি পাওয়া যায়নি।"


class ValidationAppError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"
    message_en = "The submitted data is invalid."
    message_bn = "প্রদত্ত তথ্য সঠিক নয়।"


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    message_en = "Authentication is required."
    message_bn = "প্রবেশাধিকার যাচাই প্রয়োজন।"


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"
    message_en = "You are not allowed to perform this action."
    message_bn = "এই কাজটি করার অনুমতি আপনার নেই।"


class LawyerNotApprovedError(ForbiddenError):
    code = "LAWYER_NOT_APPROVED"
    message_en = "Your lawyer account is not yet approved."
    message_bn = "আপনার আইনজীবী অ্যাকাউন্টটি এখনও অনুমোদিত হয়নি।"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    message_en = "The request conflicts with the current state of the resource."
    message_bn = "অনুরোধটি রিসোর্সের বর্তমান অবস্থার সাথে সাংঘর্ষিক।"


class RateLimitedError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "RATE_LIMITED"
    message_en = "Too many requests. Please try again later."
    message_bn = "অনেক বেশি অনুরোধ করা হয়েছে। পরে আবার চেষ্টা করুন।"


class IllegalStateTransitionError(ConflictError):
    code = "ILLEGAL_STATE_TRANSITION"
    message_en = "This action is not valid for the current status."
    message_bn = "বর্তমান অবস্থার জন্য এই কাজটি বৈধ নয়।"


class IdempotencyKeyRequiredError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "IDEMPOTENCY_KEY_REQUIRED"
    message_en = "An Idempotency-Key header is required for this request."
    message_bn = "এই অনুরোধের জন্য Idempotency-Key হেডার আবশ্যক।"


class PaymentMismatchError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "PAYMENT_MISMATCH"
    message_en = "The verified payment does not match the expected amount or currency."
    message_bn = "যাচাইকৃত পেমেন্ট প্রত্যাশিত পরিমাণ বা মুদ্রার সাথে মিলছে না।"


class RefundNotSupportedError(AppError):
    status_code = status.HTTP_501_NOT_IMPLEMENTED
    code = "REFUND_NOT_SUPPORTED"
    message_en = "This payment provider does not support automated refunds."
    message_bn = "এই পেমেন্ট প্রোভাইডার স্বয়ংক্রিয় রিফান্ড সমর্থন করে না।"


class ExternalServiceError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "EXTERNAL_SERVICE_ERROR"
    message_en = "An upstream service failed. Please try again shortly."
    message_bn = "একটি বাহ্যিক সেবা ব্যর্থ হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"


class EmailAlreadyRegisteredError(ConflictError):
    code = "EMAIL_ALREADY_REGISTERED"
    message_en = "An account with this email already exists."
    message_bn = "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।"


class PhoneAlreadyRegisteredError(ConflictError):
    code = "PHONE_ALREADY_REGISTERED"
    message_en = "An account with this phone number already exists."
    message_bn = "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।"


class BarEnrolmentAlreadyRegisteredError(ConflictError):
    code = "BAR_ENROLMENT_ALREADY_REGISTERED"
    message_en = "An account with this Bar Council enrolment number already exists."
    message_bn = "এই বার কাউন্সিল সনদ নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।"


class InvalidCredentialsError(UnauthorizedError):
    code = "INVALID_CREDENTIALS"
    message_en = "Incorrect email or password."
    message_bn = "ইমেইল বা পাসওয়ার্ড সঠিক নয়।"


class AccountLockedError(ForbiddenError):
    code = "ACCOUNT_LOCKED"
    message_en = "Too many failed attempts. Your account is temporarily locked."
    message_bn = "অনেকবার ভুল চেষ্টার কারণে আপনার অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে।"


class EmailNotVerifiedError(ForbiddenError):
    code = "EMAIL_NOT_VERIFIED"
    message_en = "Please verify your email before signing in."
    message_bn = "সাইন ইন করার আগে অনুগ্রহ করে আপনার ইমেইল যাচাই করুন।"


class WrongPasswordError(ValidationAppError):
    code = "WRONG_PASSWORD"
    message_en = "Your current password is incorrect."
    message_bn = "আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়।"


class SamePasswordError(ValidationAppError):
    code = "SAME_PASSWORD"
    message_en = "Choose a new password that is different from your current one."
    message_bn = "বর্তমান পাসওয়ার্ড থেকে ভিন্ন একটি নতুন পাসওয়ার্ড দিন।"


class AlreadyVerifiedError(ConflictError):
    code = "ALREADY_VERIFIED"
    message_en = "This email is already verified. Please sign in."
    message_bn = "এই ইমেইলটি আগেই যাচাই করা হয়েছে। অনুগ্রহ করে সাইন ইন করুন।"


class InvalidOtpError(ValidationAppError):
    code = "INVALID_OTP"
    message_en = "Incorrect verification code."
    message_bn = "ভুল যাচাইকরণ কোড।"


class OtpExpiredError(ValidationAppError):
    code = "OTP_EXPIRED"
    message_en = "This verification code has expired. Please request a new one."
    message_bn = "এই যাচাইকরণ কোডের মেয়াদ শেষ হয়ে গেছে। নতুন কোড অনুরোধ করুন।"
