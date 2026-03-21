from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must contain both letters and numbers")
        return v

    @field_validator("display_name")
    @classmethod
    def sanitize_display_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Display name must be at least 2 characters")
        if len(v) > 50:
            raise ValueError("Display name must be at most 50 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must contain both letters and numbers")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must contain both letters and numbers")
        return v


class UpdateProfileRequest(BaseModel):
    display_name: str

    @field_validator("display_name")
    @classmethod
    def sanitize_display_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Display name must be at least 2 characters")
        if len(v) > 50:
            raise ValueError("Display name must be at most 50 characters")
        return v
