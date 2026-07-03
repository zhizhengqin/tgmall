-- 为管理员账号增加手机号，用于 OTP 登录
ALTER TABLE admin_users ADD COLUMN phone VARCHAR(20) UNIQUE;
