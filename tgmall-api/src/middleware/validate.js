// Zod 请求校验中间件工厂
import { AppError } from '../utils/AppError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = {};
      result.error.errors.forEach((e) => {
        details[e.path.join('.')] = e.message;
      });
      return next(new AppError(JSON.stringify(details), 400, 'VALIDATION_ERROR'));
    }
    req.validatedBody = result.data;
    next();
  };
}
