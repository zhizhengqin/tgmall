// Zod 请求校验中间件工厂
// 支持两种调用方式：
//   validate(zodSchema) — 仅校验 req.body（兼容旧用法）
//   validate({ body, params, query }) — 分别校验
import { AppError } from '../utils/AppError.js';

function parseSection(sectionName, schema, data) {
  if (!schema || data === undefined) return {};
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = {};
    result.error.errors.forEach((e) => {
      details[`${sectionName}.${e.path.join('.')}`] = e.message;
    });
    throw new AppError(JSON.stringify(details), 400, 'VALIDATION_ERROR');
  }
  return result.data;
}

export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas?._def || typeof schemas?.parse === 'function') {
        // 旧用法：直接传入 Zod schema，仅校验 body
        req.validatedBody = parseSection('body', schemas, req.body);
      } else {
        const { body, params, query } = schemas || {};
        if (body) req.validatedBody = parseSection('body', body, req.body);
        if (params) req.validatedParams = parseSection('params', params, req.params);
        if (query) req.validatedQuery = parseSection('query', query, req.query);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
